import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSafePackageClient, type Environment } from "@/lib/safepackage/client";
import type { PackageScreeningRequest, PackageScreeningResponse } from "@/lib/safepackage/types";
import type { ApiFailure } from "@/types/database";

// Status mapping from API code to our status
const codeToStatus: Record<number, string> = {
  1: "accepted",
  2: "rejected",
  3: "inconclusive",
  4: "audit_required",
};

// POST /api/failures/[id]/retry - Retry a single failed API call
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: failureId } = await params;
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the failure record
    const { data: failureData, error: fetchError } = await supabase
      .from("api_failures" as never)
      .select("*")
      .eq("id", failureId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !failureData) {
      return NextResponse.json({ error: "Failure not found" }, { status: 404 });
    }

    const failure = failureData as unknown as ApiFailure;

    // Check if already resolved
    if (failure.retry_status === "success") {
      return NextResponse.json({ error: "This failure has already been resolved" }, { status: 400 });
    }

    // Check retry count
    if (failure.retry_count >= failure.max_retries) {
      await supabase
        .from("api_failures" as never)
        .update({
          retry_status: "exhausted",
          resolved_at: new Date().toISOString(),
          resolution_notes: "Maximum retry attempts reached",
        } as never)
        .eq("id", failureId);

      return NextResponse.json({
        error: "Maximum retry attempts reached",
        retry_status: "exhausted",
      }, { status: 400 });
    }

    // Update status to retrying
    await supabase
      .from("api_failures" as never)
      .update({
        retry_status: "retrying",
        last_retry_at: new Date().toISOString(),
      } as never)
      .eq("id", failureId);

    // Get SafePackage client
    const environment = failure.environment as Environment;
    const client = getSafePackageClient(environment);

    // Retry based on endpoint type
    let retryResult: {
      success: boolean;
      data?: PackageScreeningResponse;
      error?: { code?: string; message?: string; details?: Record<string, unknown> };
    };

    if (failure.endpoint === "/v1/package/screen") {
      const requestBody = failure.request_body as unknown as PackageScreeningRequest;
      retryResult = await client.screenPackage(requestBody);
    } else {
      // Unsupported endpoint for retry
      await supabase
        .from("api_failures" as never)
        .update({
          retry_status: "manual_required",
          resolution_notes: "Unsupported endpoint for automatic retry",
        } as never)
        .eq("id", failureId);

      return NextResponse.json({
        error: "Unsupported endpoint for automatic retry",
        retry_status: "manual_required",
      }, { status: 400 });
    }

    // Calculate new retry count
    const newRetryCount = (failure.retry_count || 0) + 1;

    if (retryResult.success && retryResult.data) {
      // Success! Create the package and mark failure as resolved
      const screeningResult = retryResult.data;
      const status = codeToStatus[screeningResult.code] || "pending";
      const requestBody = failure.request_body as unknown as PackageScreeningRequest;

      // Create the package
      const packageData: Record<string, unknown> = {
        user_id: user.id,
        upload_id: failure.upload_id,
        external_id: failure.external_id || "",
        house_bill_number: requestBody.houseBillNumber,
        barcode: requestBody.barcode,
        safepackage_id: screeningResult.packageId,
        screening_code: screeningResult.code,
        screening_status: screeningResult.status,
        status: status,
        label_qr_code: screeningResult.labelQrCode,
        platform_id: requestBody.platformId,
        seller_id: requestBody.sellerId,
        export_country: requestBody.exportCountry,
        destination_country: requestBody.destinationCountry,
        weight_value: requestBody.weight.value,
        weight_unit: requestBody.weight.unit,
        shipper_name: requestBody.from.name,
        shipper_line1: requestBody.from.line1,
        shipper_line2: requestBody.from.line2,
        shipper_city: requestBody.from.city,
        shipper_state: requestBody.from.state,
        shipper_postal_code: requestBody.from.postalCode,
        shipper_country: requestBody.from.country,
        shipper_phone: requestBody.from.phone,
        shipper_email: requestBody.from.email,
        consignee_name: requestBody.to.name,
        consignee_line1: requestBody.to.line1,
        consignee_line2: requestBody.to.line2,
        consignee_city: requestBody.to.city,
        consignee_state: requestBody.to.state,
        consignee_postal_code: requestBody.to.postalCode,
        consignee_country: requestBody.to.country,
        consignee_phone: requestBody.to.phone,
        consignee_email: requestBody.to.email,
        screening_response: screeningResult,
      };
      const { data: newPackage, error: packageError } = await (supabase.from("packages") as ReturnType<typeof supabase.from>)
        .insert(packageData)
        .select("id")
        .single();

      if (packageError) {
        console.error("Error creating package from retry:", packageError);
      }

      // Mark failure as resolved
      await supabase
        .from("api_failures" as never)
        .update({
          retry_status: "success",
          retry_count: newRetryCount,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
          resolution_notes: `Retry successful on attempt ${newRetryCount}`,
          package_id: newPackage?.id,
        } as never)
        .eq("id", failureId);

      // Note: Could update upload failed_count if applicable, but requires RPC function

      return NextResponse.json({
        success: true,
        message: "Retry successful",
        package: {
          id: newPackage?.id,
          safepackageId: screeningResult.packageId,
          status: screeningResult.status,
          code: screeningResult.code,
        },
      });
    } else {
      // Retry failed - update the failure record
      const errorDetails = retryResult.error?.details as Record<string, unknown> | undefined;
      let errorMessage = retryResult.error?.message || "Unknown error";
      if (errorDetails?.errors && Array.isArray(errorDetails.errors)) {
        errorMessage = (errorDetails.errors as Array<{ message?: string }>)
          .map(e => e.message)
          .filter(Boolean)
          .join("; ");
      }

      // Calculate next retry time with exponential backoff
      const retryDelays = [60000, 300000, 900000]; // 1 min, 5 min, 15 min
      const delayIndex = Math.min(newRetryCount, retryDelays.length - 1);
      const nextRetryDelay = retryDelays[delayIndex];
      const nextRetryAt = new Date(Date.now() + nextRetryDelay).toISOString();

      // Check if we've exhausted retries
      const newStatus = newRetryCount >= failure.max_retries ? "exhausted" : "pending";

      await supabase
        .from("api_failures" as never)
        .update({
          retry_status: newStatus,
          retry_count: newRetryCount,
          error_message: errorMessage,
          error_details: errorDetails || null,
          next_retry_at: newStatus === "exhausted" ? null : nextRetryAt,
          ...(newStatus === "exhausted" && {
            resolved_at: new Date().toISOString(),
            resolution_notes: "Maximum retry attempts reached",
          }),
        } as never)
        .eq("id", failureId);

      return NextResponse.json({
        success: false,
        error: errorMessage,
        retry_count: newRetryCount,
        retry_status: newStatus,
        next_retry_at: newStatus === "exhausted" ? null : nextRetryAt,
      }, { status: 200 }); // 200 because the retry itself succeeded, just the API call failed
    }
  } catch (error) {
    console.error("Error retrying failure:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
