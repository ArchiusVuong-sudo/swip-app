import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SafePackageClient } from "@/lib/safepackage/client";
import type { Package, ApiConfiguration, Product, PackageProduct } from "@/types/database";

// Type for package with products joined
interface PackageWithProducts extends Package {
  package_products: Array<
    PackageProduct & {
      product: Product | null;
    }
  >;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: packageId } = await params;
    const body = await request.json();
    const { corrections, notes } = body;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the original package with products
    const { data: pkgData, error: fetchError } = await supabase
      .from("packages")
      .select(`
        *,
        package_products (
          *,
          product:products (*)
        )
      `)
      .eq("id", packageId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !pkgData) {
      return NextResponse.json(
        { error: "Package not found" },
        { status: 404 }
      );
    }

    const originalPackage = pkgData as PackageWithProducts;

    // Check if package can be resubmitted
    const resubmittableStatuses = ["rejected", "inconclusive", "audit_required"];
    if (!resubmittableStatuses.includes(originalPackage.status)) {
      return NextResponse.json(
        { error: `Package with status '${originalPackage.status}' cannot be resubmitted` },
        { status: 400 }
      );
    }

    // Apply corrections to the package data
    const correctedData = {
      ...originalPackage,
      ...corrections,
    };

    // Update the package with corrections
    const { error: updateError } = await (supabase
      .from("packages") as ReturnType<typeof supabase.from>)
      .update({
        ...corrections,
        status: "pending",
        screening_code: null,
        screening_status: null,
        correction_notes: notes,
        corrected_at: new Date().toISOString(),
        corrected_by: user.id,
        resubmission_count: (originalPackage.resubmission_count || 0) + 1,
        original_package_id: originalPackage.original_package_id || originalPackage.id,
      } as Record<string, unknown>)
      .eq("id", packageId);

    if (updateError) {
      console.error("Error updating package:", updateError);
      return NextResponse.json(
        { error: "Failed to update package" },
        { status: 500 }
      );
    }

    // Create audit log
    await (supabase.from("audit_logs") as ReturnType<typeof supabase.from>).insert({
      user_id: user.id,
      package_id: packageId,
      upload_id: originalPackage.upload_id,
      action: "package_resubmitted",
      entity_type: "package",
      entity_id: packageId,
      changes: {
        corrections,
        previousStatus: originalPackage.status,
        previousScreeningCode: originalPackage.screening_code,
        resubmissionCount: (originalPackage.resubmission_count || 0) + 1,
      },
      notes,
    } as Record<string, unknown>);

    // Get API configuration
    const { data: configData, error: configError } = await supabase
      .from("api_configurations")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (configError || !configData) {
      // Package updated but not resubmitted to API yet
      return NextResponse.json({
        success: true,
        message: "Package updated. Please configure API settings to resubmit.",
        packageId,
        status: "pending",
        requiresApiConfig: true,
      });
    }

    const apiConfig = configData as ApiConfiguration;

    // Resubmit to SafePackage API
    try {
      const safePackageClient = new SafePackageClient(
        apiConfig.base_url,
        apiConfig.api_key
      );

      // Build products array from package_products in the format expected by SafePackage API
      // PackageProduct expects: { quantity, unit?, declaredValue, declaredName?, product: { sku, url, name, ... } }
      const products = (originalPackage.package_products || [])
        .filter((pp) => pp.product)
        .map((pp) => ({
          quantity: pp.quantity,
          declaredValue: pp.declared_value,
          declaredName: pp.declared_name || pp.product!.declared_name || undefined,
          product: {
            sku: pp.product!.sku,
            url: pp.product!.url,
            name: pp.product!.name,
            description: pp.product!.description,
            price: pp.product!.price,
            images: pp.product!.image_urls || [],
            originCountry: pp.product!.origin_country,
            categories: pp.product!.categories || undefined,
            pieces: pp.product!.pieces,
            ean: pp.product!.ean || undefined,
            hts: pp.product!.hs_code || undefined,
          },
        }));

      const screeningResponse = await safePackageClient.screenPackage({
        externalId: correctedData.external_id,
        houseBillNumber: correctedData.house_bill_number,
        barcode: correctedData.barcode,
        containerId: correctedData.container_id || undefined,
        carrierId: correctedData.carrier_id || undefined,
        platformId: correctedData.platform_id,
        sellerId: correctedData.seller_id,
        exportCountry: correctedData.export_country,
        destinationCountry: correctedData.destination_country,
        weight: {
          value: correctedData.weight_value,
          unit: correctedData.weight_unit as "K" | "L",
        },
        from: {
          name: correctedData.shipper_name,
          line1: correctedData.shipper_line1,
          line2: correctedData.shipper_line2 || undefined,
          city: correctedData.shipper_city,
          state: correctedData.shipper_state,
          postalCode: correctedData.shipper_postal_code,
          country: correctedData.shipper_country,
          phone: correctedData.shipper_phone || undefined,
          email: correctedData.shipper_email || undefined,
        },
        to: {
          name: correctedData.consignee_name,
          line1: correctedData.consignee_line1,
          line2: correctedData.consignee_line2 || undefined,
          city: correctedData.consignee_city,
          state: correctedData.consignee_state,
          postalCode: correctedData.consignee_postal_code,
          country: correctedData.consignee_country,
          phone: correctedData.consignee_phone || undefined,
          email: correctedData.consignee_email || undefined,
        },
        products,
      });

      if (!screeningResponse.success || !screeningResponse.data) {
        throw new Error(screeningResponse.error?.message || "Screening failed");
      }

      const screeningResult = screeningResponse.data;

      // Determine new status based on screening result
      let newStatus = "pending";
      if (screeningResult.code === 1) {
        newStatus = "accepted";
      } else if (screeningResult.code === 2) {
        newStatus = "rejected";
      } else if (screeningResult.code === 3) {
        newStatus = "inconclusive";
      } else if (screeningResult.code === 4) {
        newStatus = "audit_required";
      }

      // Update package with screening results
      await (supabase
        .from("packages") as ReturnType<typeof supabase.from>)
        .update({
          status: newStatus,
          screening_code: screeningResult.code,
          screening_status: screeningResult.status,
          safepackage_id: screeningResult.packageId,
          label_qr_code: screeningResult.labelQrCode,
          screened_at: new Date().toISOString(),
          screening_response: screeningResult,
        } as Record<string, unknown>)
        .eq("id", packageId);

      // Log the API call
      await (supabase.from("api_logs") as ReturnType<typeof supabase.from>).insert({
        user_id: user.id,
        endpoint: "/v1/package/screen",
        method: "POST",
        request_body: { packageId, isResubmission: true },
        status_code: 200,
        response_body: screeningResult,
        package_id: packageId,
      } as Record<string, unknown>);

      return NextResponse.json({
        success: true,
        message: "Package resubmitted successfully",
        packageId,
        status: newStatus,
        screeningCode: screeningResult.code,
        screeningStatus: screeningResult.status,
      });
    } catch (apiError) {
      console.error("API Error during resubmission:", apiError);

      // Update package status to reflect failed resubmission
      await (supabase
        .from("packages") as ReturnType<typeof supabase.from>)
        .update({
          status: "failed",
          screening_status: "API Error during resubmission",
        } as Record<string, unknown>)
        .eq("id", packageId);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to resubmit to SafePackage API",
          packageId,
          status: "failed",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in package resubmission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
