import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface PackageRow {
  id: string;
  safepackage_id: string | null;
  external_id: string;
  house_bill_number: string;
  barcode: string;
  container_id: string | null;
  carrier_id: string | null;
  platform_id: string;
  seller_id: string;
  export_country: string;
  destination_country: string;
  weight_value: number;
  weight_unit: "K" | "L";
  shipper_name: string;
  shipper_line1: string;
  shipper_line2: string | null;
  shipper_city: string;
  shipper_state: string;
  shipper_postal_code: string;
  shipper_country: string;
  shipper_phone: string | null;
  shipper_email: string | null;
  consignee_name: string;
  consignee_line1: string;
  consignee_line2: string | null;
  consignee_city: string;
  consignee_state: string;
  consignee_postal_code: string;
  consignee_country: string;
  consignee_phone: string | null;
  consignee_email: string | null;
  status: string;
}

function escapeCSVField(field: string | number | null | undefined): string {
  if (field === null || field === undefined) {
    return "";
  }
  const str = String(field);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const uploadId = searchParams.get("upload_id");

    let query = supabase
      .from("packages")
      .select(`
        id,
        safepackage_id,
        external_id,
        house_bill_number,
        barcode,
        container_id,
        carrier_id,
        platform_id,
        seller_id,
        export_country,
        destination_country,
        weight_value,
        weight_unit,
        shipper_name,
        shipper_line1,
        shipper_line2,
        shipper_city,
        shipper_state,
        shipper_postal_code,
        shipper_country,
        shipper_phone,
        shipper_email,
        consignee_name,
        consignee_line1,
        consignee_line2,
        consignee_city,
        consignee_state,
        consignee_postal_code,
        consignee_country,
        consignee_phone,
        consignee_email,
        status
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
      return NextResponse.json({ error: "No packages found" }, { status: 404 });
    }

    // CSV headers matching ShipmentRegistrationRequest structure
    const headers = [
      // External ID (for grouping into shipments)
      "shipment_external_id",
      // Master Bill
      "master_bill_prefix",
      "master_bill_serial_number",
      // Optional fields
      "originator_code",
      "entry_type",
      // Shipper Address
      "shipper_name",
      "shipper_line1",
      "shipper_line2",
      "shipper_city",
      "shipper_state",
      "shipper_postal_code",
      "shipper_country",
      "shipper_phone",
      "shipper_email",
      // Consignee Address
      "consignee_name",
      "consignee_line1",
      "consignee_line2",
      "consignee_city",
      "consignee_state",
      "consignee_postal_code",
      "consignee_country",
      "consignee_phone",
      "consignee_email",
      // Transportation Info
      "transport_mode",
      "port_of_entry",
      "port_of_origin",
      "port_of_arrival",
      "carrier_name",
      "carrier_code",
      "line_number",
      "shipping_date",
      "scheduled_arrival_date",
      "firms_code",
      "terminal_operator",
      // Package IDs (from SafePackage screening)
      "package_id",
    ];

    const rows: string[][] = [];

    for (const pkg of packages as PackageRow[]) {
      const row = [
        // shipment_external_id - can be grouped by external_id or generate new
        pkg.external_id,
        // master_bill_prefix - needs to be filled by user
        "",
        // master_bill_serial_number - needs to be filled by user
        "",
        // originator_code - optional
        "",
        // entry_type - optional (01, 11, 86, P)
        "",
        // Shipper
        pkg.shipper_name,
        pkg.shipper_line1,
        pkg.shipper_line2 || "",
        pkg.shipper_city,
        pkg.shipper_state,
        pkg.shipper_postal_code,
        pkg.shipper_country,
        pkg.shipper_phone || "",
        pkg.shipper_email || "",
        // Consignee
        pkg.consignee_name,
        pkg.consignee_line1,
        pkg.consignee_line2 || "",
        pkg.consignee_city,
        pkg.consignee_state,
        pkg.consignee_postal_code,
        pkg.consignee_country,
        pkg.consignee_phone || "",
        pkg.consignee_email || "",
        // Transportation - needs to be filled by user
        "", // transport_mode (AIR or TRUCK)
        "", // port_of_entry
        "", // port_of_origin
        "", // port_of_arrival
        "", // carrier_name
        "", // carrier_code (IATA code)
        "", // line_number
        "", // shipping_date (YYYY-MM-DD)
        "", // scheduled_arrival_date (YYYY-MM-DD)
        "", // firms_code
        "", // terminal_operator
        // Package ID from SafePackage
        pkg.safepackage_id || "",
      ];

      rows.push(row);
    }

    // Build CSV content
    const csvContent = [
      headers.map(escapeCSVField).join(","),
      ...rows.map((row) => row.map(escapeCSVField).join(",")),
    ].join("\n");

    const filename = `shipment_register_${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error generating shipment register CSV:", error);
    return NextResponse.json(
      { error: "Failed to generate shipment register CSV" },
      { status: 500 }
    );
  }
}
