import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSafePackageClient, type Environment } from "@/lib/safepackage/client";
import type { ShipmentRegistrationRequest, ShipmentAddress, TransportationInfo } from "@/lib/safepackage/types";

// GET - List user's shipments with pagination
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get pagination parameters from query string
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get("pageSize") || "10", 10)));

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Get total count
    const { count, error: countError } = await supabase
      .from("shipments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    // Get paginated data
    const { data: shipments, error } = await supabase
      .from("shipments")
      .select(`
        *,
        packages:packages(id, external_id, status, barcode)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return NextResponse.json({
      shipments,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching shipments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create and register a new shipment
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      externalId,
      masterBillPrefix,
      masterBillSerialNumber,
      originatorCode,
      entryType,
      shipper,
      consignee,
      transportation,
      packageIds, // Array of package UUIDs from our database
      environment: envFromBody,
    } = body;

    const environment = (envFromBody as Environment) || "sandbox";

    // Validate required fields
    if (!externalId || !masterBillPrefix || !masterBillSerialNumber) {
      return NextResponse.json(
        { error: "Missing required fields: externalId, masterBillPrefix, masterBillSerialNumber" },
        { status: 400 }
      );
    }

    if (!packageIds || packageIds.length === 0) {
      return NextResponse.json(
        { error: "At least one package is required" },
        { status: 400 }
      );
    }

    // Fetch the packages to get their SafePackage IDs
    const { data: packages, error: packagesError } = await supabase
      .from("packages")
      .select("id, safepackage_id, status, external_id")
      .eq("user_id", user.id)
      .in("id", packageIds);

    if (packagesError) {
      return NextResponse.json({ error: packagesError.message }, { status: 500 });
    }

    if (!packages || packages.length === 0) {
      return NextResponse.json({ error: "No valid packages found" }, { status: 400 });
    }

    // Check all packages are accepted
    type PackageRecord = { id: string; safepackage_id: string | null; status: string; external_id: string };
    const typedPackages = packages as PackageRecord[];
    const unacceptedPackages = typedPackages.filter(p => p.status !== "accepted" && p.status !== "duty_paid");
    if (unacceptedPackages.length > 0) {
      return NextResponse.json(
        {
          error: "All packages must be accepted before creating a shipment",
          unacceptedPackages: unacceptedPackages.map(p => p.external_id)
        },
        { status: 400 }
      );
    }

    // Get SafePackage IDs
    const safePackageIds = typedPackages
      .map(p => p.safepackage_id)
      .filter((id): id is string => id !== null);

    if (safePackageIds.length === 0) {
      return NextResponse.json(
        { error: "No packages have been screened by SafePackage yet" },
        { status: 400 }
      );
    }

    // Create shipment record in database first
    const { data: shipment, error: createError } = await (supabase
      .from("shipments") as ReturnType<typeof supabase.from>)
      .insert({
        user_id: user.id,
        external_id: externalId,
        master_bill_prefix: masterBillPrefix,
        master_bill_serial_number: masterBillSerialNumber,
        originator_code: originatorCode || null,
        entry_type: entryType || null,
        shipper_name: shipper.name,
        shipper_line1: shipper.line1,
        shipper_line2: shipper.line2 || null,
        shipper_city: shipper.city,
        shipper_state: shipper.state,
        shipper_postal_code: shipper.postalCode,
        shipper_country: shipper.country,
        shipper_phone: shipper.phone || null,
        shipper_email: shipper.email || null,
        shipper_identifiers: shipper.identifiers || null,
        consignee_name: consignee.name,
        consignee_line1: consignee.line1,
        consignee_line2: consignee.line2 || null,
        consignee_city: consignee.city,
        consignee_state: consignee.state,
        consignee_postal_code: consignee.postalCode,
        consignee_country: consignee.country,
        consignee_phone: consignee.phone || null,
        consignee_email: consignee.email || null,
        consignee_identifiers: consignee.identifiers || null,
        transport_mode: transportation.mode,
        port_of_entry: transportation.portOfEntry,
        port_of_arrival: transportation.portOfArrival || null,
        port_of_origin: transportation.portOfOrigin,
        carrier_name: transportation.carrierName,
        carrier_code: transportation.carrierCode,
        line_number: transportation.lineNumber,
        firms_code: transportation.firmsCode || null,
        shipping_date: transportation.shippingDate,
        scheduled_arrival_date: transportation.scheduledArrivalDate,
        terminal_operator: transportation.terminalOperator || null,
        status: "pending",
      } as Record<string, unknown>)
      .select()
      .single();

    if (createError || !shipment) {
      return NextResponse.json({ error: createError?.message || "Failed to create shipment" }, { status: 500 });
    }

    // Build SafePackage registration request
    const shipperAddress: ShipmentAddress = {
      name: shipper.name,
      line1: shipper.line1,
      line2: shipper.line2,
      city: shipper.city,
      state: shipper.state,
      postalCode: shipper.postalCode,
      country: shipper.country,
      phone: shipper.phone,
      email: shipper.email,
      identifiers: shipper.identifiers,
    };

    const consigneeAddress: ShipmentAddress = {
      name: consignee.name,
      line1: consignee.line1,
      line2: consignee.line2,
      city: consignee.city,
      state: consignee.state,
      postalCode: consignee.postalCode,
      country: consignee.country,
      phone: consignee.phone,
      email: consignee.email,
      identifiers: consignee.identifiers,
    };

    const transportInfo: TransportationInfo = {
      mode: transportation.mode,
      portOfEntry: transportation.portOfEntry,
      portOfOrigin: transportation.portOfOrigin,
      portOfArrival: transportation.portOfArrival,
      carrierName: transportation.carrierName,
      carrierCode: transportation.carrierCode,
      lineNumber: transportation.lineNumber,
      shippingDate: transportation.shippingDate,
      scheduledArrivalDate: transportation.scheduledArrivalDate,
      originatorCode: originatorCode,
      entryType: entryType,
      firmsCode: transportation.firmsCode,
      terminalOperator: transportation.terminalOperator,
    };

    const registrationRequest: ShipmentRegistrationRequest = {
      externalId,
      masterBill: {
        prefix: masterBillPrefix,
        serialNumber: masterBillSerialNumber,
      },
      originatorCode,
      entryType,
      shipper: shipperAddress,
      consignee: consigneeAddress,
      transportation: transportInfo,
      packageIds: safePackageIds,
    };

    // Call SafePackage API with the selected environment
    const client = getSafePackageClient(environment);
    const result = await client.registerShipment(registrationRequest);

    // Log API call
    await (supabase.from("api_logs") as ReturnType<typeof supabase.from>).insert({
      user_id: user.id,
      endpoint: "/v1/shipment/register",
      method: "POST",
      request_body: registrationRequest,
      status_code: result.success ? 200 : 500,
      response_body: result.success ? result.data : result.error,
      shipment_id: (shipment as { id: string }).id,
    } as Record<string, unknown>);

    if (!result.success) {
      // Update shipment status to failed
      await (supabase.from("shipments") as ReturnType<typeof supabase.from>)
        .update({ status: "failed" } as Record<string, unknown>)
        .eq("id", (shipment as { id: string }).id);

      return NextResponse.json(
        { error: result.error?.message || "Failed to register shipment" },
        { status: 500 }
      );
    }

    // Update shipment with SafePackage ID and status
    await (supabase.from("shipments") as ReturnType<typeof supabase.from>)
      .update({
        safepackage_shipment_id: result.data?.shipmentId,
        status: "registered",
        registered_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq("id", (shipment as { id: string }).id);

    // Link packages to shipment
    await (supabase.from("packages") as ReturnType<typeof supabase.from>)
      .update({
        shipment_id: (shipment as { id: string }).id,
        status: "registered"
      } as Record<string, unknown>)
      .in("id", packageIds);

    return NextResponse.json({
      success: true,
      shipment: {
        ...shipment,
        safepackage_shipment_id: result.data?.shipmentId,
        status: "registered",
      },
    });
  } catch (error) {
    console.error("Error creating shipment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
