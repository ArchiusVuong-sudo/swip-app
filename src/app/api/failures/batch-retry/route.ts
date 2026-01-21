import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSafePackageClient, type Environment } from "@/lib/safepackage/client";
import type { PackageScreeningRequest } from "@/lib/safepackage/types";
import type { ApiFailure } from "@/types/database";

// Status mapping from API code to our status
const codeToStatus: Record<number, string> = {
  1: "accepted",
  2: "rejected",
  3: "inconclusive",
  4: "audit_required",
};

interface RetryResult {
  failureId: string;
  externalId: string;
  success: boolean;
  message: string;
  packageId?: string;
  safepackageId?: string;
  newStatus?: string;
}

// POST /api/failures/batch-retry - Retry multiple failed API calls
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { failure_ids, upload_id } = body as {
      failure_ids?: string[];
      upload_id?: string;
    };

    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Build query for failures to retry
    let query = supabase
      .from("api_failures" as never)
      .select("*")
      .eq("user_id", user.id)
      .in("retry_status", ["pending", "manual_required"])
      .lt("retry_count", 3); // Don't retry exhausted failures

    if (failure_ids && failure_ids.length > 0) {
      query = query.in("id", failure_ids);
    } else if (upload_id) {
      query = query.eq("upload_id", upload_id);
    } else {
      return NextResponse.json({
        error: "Must provide either failure_ids or upload_id",
      }, { status: 400 });
    }

    const { data: failuresData, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching failures:", fetchError);
      return NextResponse.json({ error: "Failed to fetch failures" }, { status: 500 });
    }

    const failures = (failuresData || []) as unknown as ApiFailure[];

    if (failures.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No failures to retry",
        results: [],
      });
    }

    // Process retries in batches
    const BATCH_SIZE = 10;
    const results: RetryResult[] = [];

    for (let i = 0; i < failures.length; i += BATCH_SIZE) {
      const batch = failures.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (failure) => {
        try {
          // Update status to retrying
          await supabase
            .from("api_failures" as never)
            .update({
              retry_status: "retrying",
              last_retry_at: new Date().toISOString(),
            } as never)
            .eq("id", failure.id);

          // Get SafePackage client
          const environment = failure.environment as Environment;
          const client = getSafePackageClient(environment);

          // Only support package screen endpoint for now
          if (failure.endpoint !== "/v1/package/screen") {
            return {
              failureId: failure.id,
              externalId: failure.external_id || "",
              success: false,
              message: "Unsupported endpoint for automatic retry",
            };
          }

          const requestBody = failure.request_body as unknown as PackageScreeningRequest;
          const retryResult = await client.screenPackage(requestBody);

          const newRetryCount = (failure.retry_count || 0) + 1;

          if (retryResult.success && retryResult.data) {
            const screeningResult = retryResult.data;
            const status = codeToStatus[screeningResult.code] || "pending";

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

            const { data: newPackage } = await (supabase.from("packages") as ReturnType<typeof supabase.from>)
              .insert(packageData)
              .select("id")
              .single();

            // Mark failure as resolved
            await supabase
              .from("api_failures" as never)
              .update({
                retry_status: "success",
                retry_count: newRetryCount,
                resolved_at: new Date().toISOString(),
                resolved_by: user.id,
                resolution_notes: `Batch retry successful on attempt ${newRetryCount}`,
                package_id: (newPackage as { id?: string })?.id,
              } as never)
              .eq("id", failure.id);

            return {
              failureId: failure.id,
              externalId: failure.external_id || "",
              success: true,
              message: "Retry successful",
              packageId: (newPackage as { id?: string })?.id,
              safepackageId: screeningResult.packageId,
              newStatus: screeningResult.status,
            };
          } else {
            // Retry failed
            const errorDetails = retryResult.error?.details as Record<string, unknown> | undefined;
            let errorMessage = retryResult.error?.message || "Unknown error";
            if (errorDetails?.errors && Array.isArray(errorDetails.errors)) {
              errorMessage = (errorDetails.errors as Array<{ message?: string }>)
                .map(e => e.message)
                .filter(Boolean)
                .join("; ");
            }

            const newStatus = newRetryCount >= (failure.max_retries || 3) ? "exhausted" : "pending";

            await supabase
              .from("api_failures" as never)
              .update({
                retry_status: newStatus,
                retry_count: newRetryCount,
                error_message: errorMessage,
                error_details: errorDetails || null,
                ...(newStatus === "exhausted" && {
                  resolved_at: new Date().toISOString(),
                  resolution_notes: "Maximum retry attempts reached during batch retry",
                }),
              } as never)
              .eq("id", failure.id);

            return {
              failureId: failure.id,
              externalId: failure.external_id || "",
              success: false,
              message: errorMessage,
              newStatus,
            };
          }
        } catch (error) {
          console.error("Error retrying failure:", failure.id, error);
          return {
            failureId: failure.id,
            externalId: failure.external_id || "",
            success: false,
            message: error instanceof Error ? error.message : "Processing error",
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    // Summary
    const summary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    };

    return NextResponse.json({
      success: true,
      summary,
      results,
    });
  } catch (error) {
    console.error("Error in batch retry:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
