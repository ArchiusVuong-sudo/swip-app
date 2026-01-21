import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSafePackageClient, type Environment } from "@/lib/safepackage/client";
import type { PackageAuditRequest } from "@/lib/safepackage/types";
import type { Package as PackageType } from "@/types/database";

// POST /api/packages/[id]/audit - Submit audit images for a package
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: packageId } = await params;
    const body = await request.json();
    const { images, remark, environment: envFromBody } = body as {
      images: string[]; // base64 encoded images
      remark?: string;
      environment?: Environment;
    };

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

    // Validate package status
    if (packageData.status !== "audit_required") {
      return NextResponse.json({
        error: "Package is not in audit_required status",
        currentStatus: packageData.status,
      }, { status: 400 });
    }

    // Validate images
    if (!images || images.length < 2) {
      return NextResponse.json({
        error: "At least 2 images are required for audit",
      }, { status: 400 });
    }

    // Validate remark length
    if (remark && remark.length > 100) {
      return NextResponse.json({
        error: "Remark must be 100 characters or less",
      }, { status: 400 });
    }

    // Build audit request
    const auditRequest: PackageAuditRequest = {
      packageId: packageData.safepackage_id || undefined,
      externalId: packageData.external_id,
      images,
      remark,
    };

    // Get SafePackage client - environment comes from request body
    const environment = envFromBody || "sandbox";
    const client = getSafePackageClient(environment);

    // Submit audit
    const response = await client.submitAudit(auditRequest);

    // Log the API call
    await supabase.from("api_logs" as never).insert({
      user_id: user.id,
      endpoint: "/v1/package/audit",
      method: "POST",
      request_body: { ...auditRequest, images: `[${images.length} images]` },
      status_code: response.success ? 200 : 400,
      response_body: response,
      package_id: packageId,
    } as never);

    if (response.success && response.data) {
      const auditResult = response.data;

      // Map audit code to status
      const auditStatusMap: Record<number, string> = {
        1: "passed",
        2: "failed",
        3: "pending",
      };

      // Update package with audit result
      await supabase
        .from("packages" as never)
        .update({
          status: auditResult.code === 1 ? "accepted" : auditResult.code === 2 ? "rejected" : "audit_submitted",
          audit_status: auditStatusMap[auditResult.code] || "pending",
          audit_images: images,
          audit_remark: remark,
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
          type: "audit_submission",
          auditCode: auditResult.code,
          auditStatus: auditResult.status,
          imageCount: images.length,
          remark,
        },
        notes: `Audit submitted: ${auditResult.status}`,
      } as never);

      return NextResponse.json({
        success: true,
        audit: {
          packageId: auditResult.packageId,
          externalId: auditResult.externalId,
          code: auditResult.code,
          status: auditResult.status,
        },
      });
    } else {
      // Log failure
      await supabase.from("api_failures" as never).insert({
        user_id: user.id,
        package_id: packageId,
        upload_id: packageData.upload_id,
        endpoint: "/v1/package/audit",
        method: "POST",
        request_body: { ...auditRequest, images: `[${images.length} images]` },
        status_code: response.error?.code ? parseInt(response.error.code, 10) : null,
        error_code: response.error?.code,
        error_message: response.error?.message,
        error_details: response.error?.details,
        environment: environment,
        external_id: packageData.external_id,
        retry_status: "manual_required", // Audit failures typically need manual review
        max_retries: 1,
      } as never);

      return NextResponse.json({
        error: response.error?.message || "Audit submission failed",
        details: response.error?.details,
      }, { status: 400 });
    }
  } catch (error) {
    console.error("Error submitting audit:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
