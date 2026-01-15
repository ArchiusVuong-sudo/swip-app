import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateCommercialInvoice,
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

    // Get upload_id from query params (optional)
    const searchParams = request.nextUrl.searchParams;
    const uploadId = searchParams.get("upload_id");

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

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}`;
    const invoiceDate = new Date().toISOString().split("T")[0];

    // Generate Excel file with actual product data
    const excelBuffer = generateCommercialInvoice(
      packages as PackageWithProducts[],
      [], // Legacy products array - not used when package_products is available
      invoiceNumber,
      invoiceDate
    );

    const filename = generateExcelFilename("Commercial_Invoice");

    // Return as downloadable file
    return new NextResponse(Buffer.from(excelBuffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error generating commercial invoice:", error);
    return NextResponse.json(
      { error: "Failed to generate commercial invoice" },
      { status: 500 }
    );
  }
}
