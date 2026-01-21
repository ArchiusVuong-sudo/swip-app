import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSafePackageClient, type Environment } from "@/lib/safepackage/client";
import type { DutyPayRequest } from "@/lib/safepackage/types";
import type { Package as PackageType } from "@/types/database";

// POST /api/packages/[id]/duty - Pay customs duties for a package
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: packageId } = await params;
    const body = await request.json().catch(() => ({}));
    const { environment: envFromBody } = body as { environment?: Environment };
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the package
    const { data: pkg, error: pkgError } = await supabase
      .from("packages")
      .select("*")
      .eq("id", packageId)
      .eq("user_id", user.id)
      .single();

    if (pkgError || !pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    const packageData = pkg as PackageType;

    // Validate package has SafePackage ID
    if (!packageData.safepackage_id) {
      return NextResponse.json({
        error: "Package has no SafePackage ID - cannot pay duty",
      }, { status: 400 });
    }

    // Validate package status
    if (packageData.status !== "accepted" && packageData.status !== "duty_pending") {
      return NextResponse.json({
        error: "Package must be accepted or duty_pending to pay duty",
        currentStatus: packageData.status,
      }, { status: 400 });
    }

    // Check if duty already paid
    if (packageData.ddpn) {
      return NextResponse.json({
        error: "Duty has already been paid for this package",
        ddpn: packageData.ddpn,
        totalDuty: packageData.total_duty,
      }, { status: 400 });
    }

    // Build duty pay request
    const dutyRequest: DutyPayRequest = {
      packageId: packageData.safepackage_id,
      barcode: packageData.barcode,
    };

    // Get SafePackage client - environment comes from request body
    const environment = envFromBody || "sandbox";
    const client = getSafePackageClient(environment);

    // Update status to duty_pending
    await supabase
      .from("packages" as never)
      .update({ status: "duty_pending", updated_by: user.id } as never)
      .eq("id", packageId);

    // Pay duty
    const response = await client.payDuty(dutyRequest);

    // Log the API call
    await supabase.from("api_logs" as never).insert({
      user_id: user.id,
      endpoint: "/v1/duty/pay",
      method: "POST",
      request_body: dutyRequest,
      status_code: response.success ? 200 : 400,
      response_body: response,
      package_id: packageId,
    } as never);

    if (response.success && response.data) {
      const dutyResult = response.data;

      // Update package with duty result
      await supabase
        .from("packages" as never)
        .update({
          status: "duty_paid",
          ddpn: dutyResult.ddpn,
          total_duty: dutyResult.totalDuty,
          duty_paid_at: new Date().toISOString(),
          updated_by: user.id,
        } as never)
        .eq("id", packageId);

      // Create audit log entry
      await supabase.from("audit_logs" as never).insert({
        user_id: user.id,
        package_id: packageId,
        upload_id: packageData.upload_id,
        action: "api_submission_confirmed",
        entity_type: "package",
        entity_id: packageId,
        changes: {
          type: "duty_payment",
          ddpn: dutyResult.ddpn,
          totalDuty: dutyResult.totalDuty,
        },
        notes: `Duty paid: $${dutyResult.totalDuty} (DDPN: ${dutyResult.ddpn})`,
      } as never);

      return NextResponse.json({
        success: true,
        duty: {
          packageId: dutyResult.packageId,
          externalId: dutyResult.externalId,
          ddpn: dutyResult.ddpn,
          totalDuty: dutyResult.totalDuty,
        },
      });
    } else {
      // Revert status on failure
      await supabase
        .from("packages" as never)
        .update({ status: "accepted", updated_by: user.id } as never)
        .eq("id", packageId);

      // Log failure
      await supabase.from("api_failures" as never).insert({
        user_id: user.id,
        package_id: packageId,
        upload_id: packageData.upload_id,
        endpoint: "/v1/duty/pay",
        method: "POST",
        request_body: dutyRequest,
        status_code: response.error?.code ? parseInt(response.error.code, 10) : null,
        error_code: response.error?.code,
        error_message: response.error?.message,
        error_details: response.error?.details,
        environment: environment,
        external_id: packageData.external_id,
        retry_status: "manual_required", // Duty failures typically need manual review
        max_retries: 1,
      } as never);

      return NextResponse.json({
        error: response.error?.message || "Duty payment failed",
        details: response.error?.details,
      }, { status: 400 });
    }
  } catch (error) {
    console.error("Error paying duty:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
