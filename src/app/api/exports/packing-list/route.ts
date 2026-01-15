import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generatePackingList,
  generateExcelFilename,
  type PackageWithProducts,
} from "@/lib/utils/excel";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get upload_id or shipment_id from query params
    const searchParams = request.nextUrl.searchParams;
    const uploadId = searchParams.get("upload_id");
    const shipmentId = searchParams.get("shipment_id");

    // Query packages with package_products and products joined
    let query = supabase
      .from("packages")
      .select(`
        *,
        package_products (
          id,
          quantity,
          declared_value,
          declared_name,
          product:products (
            id,
            sku,
            name,
            description,
            origin_country,
            hs_code,
            price
          )
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (uploadId) {
      query = query.eq("upload_id", uploadId);
    }

    if (shipmentId) {
      query = query.eq("shipment_id", shipmentId);
    }

    const { data: packages, error } = await query;

    if (error) {
      console.error("Error fetching packages:", error);
      return NextResponse.json(
        { error: "Failed to fetch packages" },
        { status: 500 }
      );
    }

    if (!packages || packages.length === 0) {
      return NextResponse.json(
        { error: "No packages found" },
        { status: 404 }
      );
    }

    // Generate shipment ID for packing list
    const packingShipmentId = shipmentId || `SHIP-${Date.now()}`;
    const packingDate = new Date().toISOString().split("T")[0];

    // Generate Excel file with actual product data
    const excelBuffer = generatePackingList(
      packages as PackageWithProducts[],
      packingShipmentId,
      packingDate
    );

    const filename = generateExcelFilename("Packing_List");

    // Return as downloadable file
    return new NextResponse(Buffer.from(excelBuffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error generating packing list:", error);
    return NextResponse.json(
      { error: "Failed to generate packing list" },
      { status: 500 }
    );
  }
}
