import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSafePackageClient, type Environment } from "@/lib/safepackage/client";
import { processProductImages, parseImageField } from "@/lib/utils/image";
import { CSV_COLUMNS } from "@/lib/csv/constants";
import type { PackageScreeningRequest, PackageProduct } from "@/lib/safepackage/types";
import type { Upload } from "@/types/database";

// Status mapping from API code to our status
const codeToStatus: Record<number, string> = {
  1: "accepted",
  2: "rejected",
  3: "inconclusive",
  4: "audit_required",
};

interface RowData {
  external_id?: string;
  house_bill_number?: string;
  barcode?: string;
  container_id?: string;
  carrier_id?: string;
  platform_id?: string;
  seller_id?: string;
  export_country?: string;
  destination_country?: string;
  weight_value?: number;
  weight_unit?: string;
  shipper_name?: string;
  shipper_address_1?: string;
  shipper_address_2?: string;
  shipper_city?: string;
  shipper_state?: string;
  shipper_postal_code?: string;
  shipper_country?: string;
  shipper_phone?: string;
  shipper_email?: string;
  consignee_name?: string;
  consignee_address_1?: string;
  consignee_address_2?: string;
  consignee_city?: string;
  consignee_state?: string;
  consignee_postal_code?: string;
  consignee_country?: string;
  consignee_phone?: string;
  consignee_email?: string;
  product_sku?: string;
  product_name?: string;
  product_description?: string;
  product_url?: string;
  product_images?: string;
  product_image_url?: string;
  product_image_1?: string;
  product_image_2?: string;
  product_image_3?: string;
  product_categories?: string;
  product_quantity?: number;
  declared_value?: number;
  list_price?: number;
  declared_name?: string;
  origin_country?: string;
  hs_code?: string;
  ean_upc?: string;
  pieces?: number;
}

// Raw CSV row with original column names
interface RawCSVRow {
  [key: string]: string | undefined;
}

// Map CSV column names to internal field names
function transformCSVRow(rawRow: RawCSVRow): RowData {
  return {
    external_id: rawRow[CSV_COLUMNS.EXTERNAL_ID],
    house_bill_number: rawRow[CSV_COLUMNS.HOUSE_BILL_NUMBER],
    barcode: rawRow[CSV_COLUMNS.BARCODE],
    container_id: rawRow[CSV_COLUMNS.CONTAINER_ID],
    carrier_id: rawRow[CSV_COLUMNS.CARRIER_ID],
    platform_id: rawRow[CSV_COLUMNS.PLATFORM_ID],
    seller_id: rawRow[CSV_COLUMNS.SELLER_ID],
    export_country: rawRow[CSV_COLUMNS.EXPORT_COUNTRY],
    destination_country: rawRow[CSV_COLUMNS.DESTINATION_COUNTRY],
    weight_value: rawRow[CSV_COLUMNS.GROSS_WEIGHT_VALUE] ? parseFloat(rawRow[CSV_COLUMNS.GROSS_WEIGHT_VALUE] as string) : undefined,
    weight_unit: rawRow[CSV_COLUMNS.GROSS_WEIGHT_UNIT],
    shipper_name: rawRow[CSV_COLUMNS.SHIPPER_NAME],
    shipper_address_1: rawRow[CSV_COLUMNS.SHIPPER_ADDRESS_1],
    shipper_address_2: rawRow[CSV_COLUMNS.SHIPPER_ADDRESS_2],
    shipper_city: rawRow[CSV_COLUMNS.SHIPPER_CITY],
    shipper_state: rawRow[CSV_COLUMNS.SHIPPER_STATE],
    shipper_postal_code: rawRow[CSV_COLUMNS.SHIPPER_POSTAL_CODE],
    shipper_country: rawRow[CSV_COLUMNS.SHIPPER_COUNTRY],
    shipper_phone: rawRow[CSV_COLUMNS.SHIPPER_PHONE],
    shipper_email: rawRow[CSV_COLUMNS.SHIPPER_EMAIL],
    consignee_name: rawRow[CSV_COLUMNS.CONSIGNEE_NAME],
    consignee_address_1: rawRow[CSV_COLUMNS.CONSIGNEE_ADDRESS_1],
    consignee_address_2: rawRow[CSV_COLUMNS.CONSIGNEE_ADDRESS_2],
    consignee_city: rawRow[CSV_COLUMNS.CONSIGNEE_CITY],
    consignee_state: rawRow[CSV_COLUMNS.CONSIGNEE_STATE],
    consignee_postal_code: rawRow[CSV_COLUMNS.CONSIGNEE_POSTAL_CODE],
    consignee_country: rawRow[CSV_COLUMNS.CONSIGNEE_COUNTRY],
    consignee_phone: rawRow[CSV_COLUMNS.CONSIGNEE_PHONE],
    consignee_email: rawRow[CSV_COLUMNS.CONSIGNEE_EMAIL],
    product_sku: rawRow[CSV_COLUMNS.PRODUCT_SKU],
    product_name: rawRow[CSV_COLUMNS.PRODUCT_NAME],
    product_description: rawRow[CSV_COLUMNS.PRODUCT_DESCRIPTION],
    product_url: rawRow[CSV_COLUMNS.PRODUCT_URL],
    product_image_url: rawRow[CSV_COLUMNS.PRODUCT_IMAGE_URL],
    product_image_1: rawRow[CSV_COLUMNS.PRODUCT_IMAGE_1],
    product_image_2: rawRow[CSV_COLUMNS.PRODUCT_IMAGE_2],
    product_image_3: rawRow[CSV_COLUMNS.PRODUCT_IMAGE_3],
    product_categories: rawRow[CSV_COLUMNS.PRODUCT_CATEGORIES],
    product_quantity: rawRow[CSV_COLUMNS.PRODUCT_QUANTITY] ? parseInt(rawRow[CSV_COLUMNS.PRODUCT_QUANTITY] as string, 10) : undefined,
    declared_value: rawRow[CSV_COLUMNS.DECLARED_VALUE] ? parseFloat(rawRow[CSV_COLUMNS.DECLARED_VALUE] as string) : undefined,
    list_price: rawRow[CSV_COLUMNS.LIST_PRICE] ? parseFloat(rawRow[CSV_COLUMNS.LIST_PRICE] as string) : undefined,
    declared_name: rawRow[CSV_COLUMNS.PRODUCT_DECLARED_NAME],
    origin_country: rawRow[CSV_COLUMNS.ORIGIN_COUNTRY],
    hs_code: rawRow[CSV_COLUMNS.HS_CODE],
    ean_upc: rawRow[CSV_COLUMNS.EAN_UPC],
    pieces: rawRow[CSV_COLUMNS.NUMBER_OF_PIECES] ? parseInt(rawRow[CSV_COLUMNS.NUMBER_OF_PIECES] as string, 10) : undefined,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: uploadId } = await params;
    const body = await request.json();
    const environment = (body.environment as Environment) || "sandbox";

    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the upload record
    const { data: uploadData, error: uploadError } = await supabase
      .from("uploads")
      .select("*")
      .eq("id", uploadId)
      .eq("user_id", user.id)
      .single();

    if (uploadError || !uploadData) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 });
    }

    const upload = uploadData as Upload;

    if (upload.status !== "validated") {
      return NextResponse.json(
        { error: "Upload must be validated before processing" },
        { status: 400 }
      );
    }

    // Update status to processing
    await (supabase
      .from("uploads") as ReturnType<typeof supabase.from>)
      .update({ status: "processing" } as Record<string, unknown>)
      .eq("id", uploadId);

    // Get the raw data rows and transform them
    const rawRows = upload.raw_data as RawCSVRow[];
    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json({ error: "No data to process" }, { status: 400 });
    }

    // Transform CSV rows to internal format
    const rows = rawRows.map(transformCSVRow);
    console.log("Transformed rows:", JSON.stringify(rows[0], null, 2));
    console.log("Using SafePackage environment:", environment);

    // Initialize SafePackage client with the selected environment
    const client = getSafePackageClient(environment);

    // Process each row
    const results = {
      total: rows.length,
      processed: 0,
      accepted: 0,
      rejected: 0,
      inconclusive: 0,
      auditRequired: 0,
      failed: 0,
      packages: [] as Array<{
        externalId: string;
        status: string;
        safepackageId?: string;
        error?: string;
      }>,
    };

    for (const row of rows) {
      try {
        // Build the package screening request (async for image fetching)
        console.log("Building package request for:", row.external_id);
        const packageRequest = await buildPackageRequest(row);
        console.log("Package request built:", JSON.stringify(packageRequest, null, 2).slice(0, 500));

        // Call SafePackage API
        console.log("Calling SafePackage API...");
        const response = await client.screenPackage(packageRequest);
        console.log("SafePackage API response:", JSON.stringify(response, null, 2));

        if (response.success && response.data) {
          const screeningResult = response.data;
          const status = codeToStatus[screeningResult.code] || "pending";

          // Create package record in database
          const { error: packageError } = await (supabase.from("packages") as ReturnType<typeof supabase.from>).insert({
            user_id: user.id,
            upload_id: uploadId,
            external_id: row.external_id,
            house_bill_number: row.house_bill_number,
            barcode: row.barcode,
            safepackage_id: screeningResult.packageId,
            screening_code: screeningResult.code,
            screening_status: screeningResult.status,
            status: status,
            label_qr_code: screeningResult.labelQrCode,
            platform_id: row.platform_id,
            seller_id: row.seller_id,
            export_country: row.export_country,
            destination_country: row.destination_country,
            weight_value: row.weight_value,
            weight_unit: row.weight_unit,
            shipper_name: row.shipper_name,
            shipper_line1: row.shipper_address_1,
            shipper_line2: row.shipper_address_2,
            shipper_city: row.shipper_city,
            shipper_state: row.shipper_state,
            shipper_postal_code: row.shipper_postal_code,
            shipper_country: row.shipper_country,
            shipper_phone: row.shipper_phone,
            shipper_email: row.shipper_email,
            consignee_name: row.consignee_name,
            consignee_line1: row.consignee_address_1,
            consignee_line2: row.consignee_address_2,
            consignee_city: row.consignee_city,
            consignee_state: row.consignee_state,
            consignee_postal_code: row.consignee_postal_code,
            consignee_country: row.consignee_country,
            consignee_phone: row.consignee_phone,
            consignee_email: row.consignee_email,
            screening_response: screeningResult,
          } as Record<string, unknown>);

          if (packageError) {
            console.error("Error creating package:", packageError);
          }

          // Update counters
          results.processed++;
          if (screeningResult.code === 1) results.accepted++;
          else if (screeningResult.code === 2) results.rejected++;
          else if (screeningResult.code === 3) results.inconclusive++;
          else if (screeningResult.code === 4) results.auditRequired++;

          results.packages.push({
            externalId: row.external_id || "",
            status: screeningResult.status,
            safepackageId: screeningResult.packageId,
          });
        } else {
          results.failed++;
          results.packages.push({
            externalId: row.external_id || "",
            status: "failed",
            error: response.error?.message || "Unknown error",
          });
        }
      } catch (error) {
        console.error("Error processing row:", error);
        results.failed++;
        results.packages.push({
          externalId: row.external_id || "",
          status: "failed",
          error: error instanceof Error ? error.message : "Processing error",
        });
      }
    }

    // Update upload status based on results
    const finalStatus =
      results.failed > 0 ? "completed_with_errors" : "completed";

    const { error: updateError } = await (supabase
      .from("uploads") as ReturnType<typeof supabase.from>)
      .update({
        status: finalStatus,
        processing_completed_at: new Date().toISOString(),
        processing_results: results,
      } as Record<string, unknown>)
      .eq("id", uploadId);

    if (updateError) {
      console.error("Error updating upload status:", updateError);
    }

    return NextResponse.json({
      success: true,
      uploadId,
      results,
    });
  } catch (error) {
    console.error("Error processing upload:", error);
    return NextResponse.json(
      { error: "Failed to process upload" },
      { status: 500 }
    );
  }
}

// Sanitize phone number: only alphanumeric and hyphens allowed
function sanitizePhone(phone?: string): string | undefined {
  if (!phone || phone.trim() === "") return undefined;
  // Remove +, parentheses, spaces, and other invalid characters
  return phone.replace(/[^a-zA-Z0-9-]/g, "") || undefined;
}

// Sanitize postal code: only alphanumeric allowed
function sanitizePostalCode(postalCode?: string): string {
  if (!postalCode) return "";
  return postalCode.replace(/[^a-zA-Z0-9]/g, "");
}

// Sanitize HS code: only digits allowed, 6-10 characters
function sanitizeHsCode(hsCode?: string): string | undefined {
  if (!hsCode || hsCode.trim() === "") return undefined;
  const cleaned = hsCode.replace(/[^0-9]/g, "");
  return cleaned.length >= 6 && cleaned.length <= 10 ? cleaned : undefined;
}

// Return undefined for empty strings (API doesn't like empty line2)
function emptyToUndefined(value?: string): string | undefined {
  if (!value || value.trim() === "") return undefined;
  return value;
}

async function buildPackageRequest(row: RowData): Promise<PackageScreeningRequest> {
  // Collect all image sources (URLs or base64)
  const imageSources: string[] = [];

  // Add images from various fields
  if (row.product_images) {
    imageSources.push(...parseImageField(row.product_images));
  }
  if (row.product_image_url) {
    imageSources.push(...parseImageField(row.product_image_url));
  }
  if (row.product_image_1) {
    imageSources.push(row.product_image_1);
  }
  if (row.product_image_2) {
    imageSources.push(row.product_image_2);
  }
  if (row.product_image_3) {
    imageSources.push(row.product_image_3);
  }

  // Fetch URLs and convert to Base64, filter out any null/empty values
  const rawImages = await processProductImages(imageSources);
  const images = rawImages.filter((img) => img && img.trim() !== "");

  // Parse categories
  const categories: string[] = [];
  if (row.product_categories) {
    const catList = row.product_categories.split(",").map((s) => s.trim());
    categories.push(...catList.filter((cat) => cat.length > 0));
  }

  // Build product
  const product: PackageProduct = {
    quantity: row.product_quantity || 1,
    declaredValue: row.declared_value || 0,
    declaredName: emptyToUndefined(row.declared_name),
    product: {
      sku: row.product_sku || "",
      url: row.product_url || "",
      name: row.product_name || "",
      description: row.product_description || "",
      price: row.list_price || row.declared_value || 0,
      images: images.length > 0 ? images : [],
      originCountry: row.origin_country || row.export_country || "",
      categories: categories.length > 0 ? categories : undefined,
      pieces: row.pieces,
      ean: emptyToUndefined(row.ean_upc),
      hts: sanitizeHsCode(row.hs_code),
    },
  };

  return {
    externalId: row.external_id || "",
    platformId: row.platform_id || "",
    sellerId: row.seller_id || "",
    exportCountry: row.export_country || "",
    destinationCountry: row.destination_country || "USA",
    houseBillNumber: row.house_bill_number || "",
    barcode: row.barcode || "",
    containerId: emptyToUndefined(row.container_id),
    carrierId: emptyToUndefined(row.carrier_id),
    weight: {
      value: row.weight_value || 0,
      unit: (row.weight_unit as "K" | "L") || "K",
    },
    from: {
      name: row.shipper_name || "",
      line1: row.shipper_address_1 || "",
      line2: emptyToUndefined(row.shipper_address_2),
      city: row.shipper_city || "",
      state: row.shipper_state || "",
      postalCode: sanitizePostalCode(row.shipper_postal_code),
      country: row.shipper_country || "",
      phone: sanitizePhone(row.shipper_phone),
      email: emptyToUndefined(row.shipper_email),
    },
    to: {
      name: row.consignee_name || "",
      line1: row.consignee_address_1 || "",
      line2: emptyToUndefined(row.consignee_address_2),
      city: row.consignee_city || "",
      state: row.consignee_state || "",
      postalCode: sanitizePostalCode(row.consignee_postal_code),
      country: row.consignee_country || "USA",
      phone: sanitizePhone(row.consignee_phone),
      email: emptyToUndefined(row.consignee_email),
    },
    products: [product],
  };
}
