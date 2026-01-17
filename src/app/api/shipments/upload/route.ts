import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSafePackageClient, type Environment } from "@/lib/safepackage/client";
import {
  processShipmentCSVFile,
  groupRowsByShipment,
  type GroupedShipment,
  type ShipmentFileValidationResult,
} from "@/lib/csv/shipment-parser";
import type { ShipmentRegistrationRequest, ShipmentAddress, TransportationInfo } from "@/lib/safepackage/types";

interface ShipmentResult {
  externalId: string;
  success: boolean;
  safepackageShipmentId?: string;
  shipmentDbId?: string;
  packageCount: number;
  error?: string;
}

// POST - Upload and process shipment registration CSV
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const environment = (formData.get("environment") as Environment) || "sandbox";
    const validateOnly = formData.get("validateOnly") === "true";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Parse and validate CSV
    const validationResult = await processShipmentCSVFile(file);

    // If there are missing columns, return error
    if (validationResult.missingColumns.length > 0) {
      return NextResponse.json({
        success: false,
        validation: {
          isValid: false,
          totalRows: validationResult.totalRows,
          validRows: 0,
          invalidRows: validationResult.totalRows,
          missingColumns: validationResult.missingColumns,
        },
        error: `Missing required columns: ${validationResult.missingColumns.join(", ")}`,
      }, { status: 400 });
    }

    // Group rows by shipment external ID
    const groupedShipments = groupRowsByShipment(validationResult);

    // If validate only, return validation results
    if (validateOnly) {
      return NextResponse.json({
        success: validationResult.isValid,
        validation: {
          isValid: validationResult.isValid,
          totalRows: validationResult.totalRows,
          validRows: validationResult.validRows,
          invalidRows: validationResult.invalidRows,
          shipmentCount: groupedShipments.length,
          shipments: groupedShipments.map(s => ({
            externalId: s.externalId,
            packageCount: s.packageIds.length,
            rowNumbers: s.rowNumbers,
          })),
          errors: validationResult.results
            .filter(r => !r.isValid)
            .map(r => ({
              rowNumber: r.rowNumber,
              errors: r.errors,
            })),
        },
      });
    }

    // If validation failed, don't proceed
    if (!validationResult.isValid) {
      return NextResponse.json({
        success: false,
        validation: {
          isValid: false,
          totalRows: validationResult.totalRows,
          validRows: validationResult.validRows,
          invalidRows: validationResult.invalidRows,
          errors: validationResult.results
            .filter(r => !r.isValid)
            .map(r => ({
              rowNumber: r.rowNumber,
              errors: r.errors,
            })),
        },
        error: "CSV validation failed. Please fix the errors and try again.",
      }, { status: 400 });
    }

    // Process each shipment
    const client = getSafePackageClient(environment);
    const results: ShipmentResult[] = [];

    for (const shipment of groupedShipments) {
      try {
        const result = await registerShipment(
          supabase,
          client,
          user.id,
          shipment,
          environment
        );
        results.push(result);
      } catch (error) {
        console.error(`Error registering shipment ${shipment.externalId}:`, error);
        results.push({
          externalId: shipment.externalId,
          success: false,
          packageCount: shipment.packageIds.length,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: failureCount === 0,
      totalShipments: groupedShipments.length,
      successCount,
      failureCount,
      results,
    });
  } catch (error) {
    console.error("Error processing shipment CSV:", error);
    return NextResponse.json(
      { error: "Failed to process shipment CSV" },
      { status: 500 }
    );
  }
}

/**
 * Check if a shipment has all required fields for registration
 */
function validateShipmentForRegistration(shipment: GroupedShipment): string[] {
  const missingFields: string[] = [];

  if (!shipment.masterBillPrefix) missingFields.push("Master Bill Prefix");
  if (!shipment.masterBillSerialNumber) missingFields.push("Master Bill Serial Number");
  if (!shipment.transportation.mode || (shipment.transportation.mode as string) === "") missingFields.push("Transport Mode");
  if (!shipment.transportation.portOfEntry) missingFields.push("Port of Entry");
  if (!shipment.transportation.portOfOrigin) missingFields.push("Port of Origin");
  if (!shipment.transportation.carrierName) missingFields.push("Carrier Name");
  if (!shipment.transportation.carrierCode) missingFields.push("Carrier Code");
  if (!shipment.transportation.lineNumber) missingFields.push("Line Number");
  if (!shipment.transportation.shippingDate) missingFields.push("Shipping Date");
  if (!shipment.transportation.scheduledArrivalDate) missingFields.push("Scheduled Arrival Date");

  return missingFields;
}

async function registerShipment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  client: ReturnType<typeof getSafePackageClient>,
  userId: string,
  shipment: GroupedShipment,
  environment: Environment
): Promise<ShipmentResult> {
  // Validate shipment has required fields
  const missingFields = validateShipmentForRegistration(shipment);
  if (missingFields.length > 0) {
    return {
      externalId: shipment.externalId,
      success: false,
      packageCount: shipment.packageIds.length,
      error: `Missing required fields: ${missingFields.join(", ")}`,
    };
  }

  // Build shipper address
  const shipperAddress: ShipmentAddress = {
    name: shipment.shipper.name,
    line1: shipment.shipper.line1,
    line2: shipment.shipper.line2,
    city: shipment.shipper.city,
    state: shipment.shipper.state,
    postalCode: shipment.shipper.postalCode,
    country: shipment.shipper.country,
    phone: shipment.shipper.phone,
    email: shipment.shipper.email,
  };

  // Build consignee address
  const consigneeAddress: ShipmentAddress = {
    name: shipment.consignee.name,
    line1: shipment.consignee.line1,
    line2: shipment.consignee.line2,
    city: shipment.consignee.city,
    state: shipment.consignee.state,
    postalCode: shipment.consignee.postalCode,
    country: shipment.consignee.country,
    phone: shipment.consignee.phone,
    email: shipment.consignee.email,
  };

  // Build transportation info (fields validated above)
  const transportInfo: TransportationInfo = {
    mode: shipment.transportation.mode as "AIR" | "TRUCK",
    portOfEntry: shipment.transportation.portOfEntry!,
    portOfOrigin: shipment.transportation.portOfOrigin!,
    portOfArrival: shipment.transportation.portOfArrival,
    carrierName: shipment.transportation.carrierName!,
    carrierCode: shipment.transportation.carrierCode!,
    lineNumber: shipment.transportation.lineNumber!,
    shippingDate: shipment.transportation.shippingDate!,
    scheduledArrivalDate: shipment.transportation.scheduledArrivalDate!,
    firmsCode: shipment.transportation.firmsCode,
    terminalOperator: shipment.transportation.terminalOperator,
    originatorCode: shipment.originatorCode,
    entryType: shipment.entryType === "" ? undefined : shipment.entryType,
  };

  // Build registration request (fields validated above)
  const registrationRequest: ShipmentRegistrationRequest = {
    externalId: shipment.externalId,
    masterBill: {
      prefix: shipment.masterBillPrefix!,
      serialNumber: shipment.masterBillSerialNumber!,
    },
    originatorCode: shipment.originatorCode,
    entryType: shipment.entryType === "" ? undefined : shipment.entryType,
    shipper: shipperAddress,
    consignee: consigneeAddress,
    transportation: transportInfo,
    packageIds: shipment.packageIds,
  };

  // Log request for debugging
  console.log(`Registering shipment ${shipment.externalId}:`, JSON.stringify(registrationRequest, null, 2));

  // Call SafePackage API
  const apiResult = await client.registerShipment(registrationRequest);

  // Log API call
  await (supabase.from("api_logs") as ReturnType<typeof supabase.from>).insert({
    user_id: userId,
    endpoint: "/v1/shipment/register",
    method: "POST",
    request_body: registrationRequest,
    response_body: apiResult,
    status_code: apiResult.success ? 200 : 400,
    environment,
  } as Record<string, unknown>);

  if (!apiResult.success) {
    // Log full error object for debugging
    console.error(`SafePackage API error for shipment ${shipment.externalId}:`, JSON.stringify(apiResult.error, null, 2));

    // Extract detailed error info from API response
    let errorMessage = "API call failed";

    // Check if there are additional details in the error response
    if (apiResult.error?.details) {
      const details = apiResult.error.details as Record<string, unknown>;

      // Try various error message formats from SafePackage API
      if (typeof details.message === "string" && details.message) {
        errorMessage = details.message;
      } else if (typeof details.error === "string" && details.error) {
        errorMessage = details.error;
      } else if (typeof details.detail === "string" && details.detail) {
        errorMessage = details.detail;
      } else if (apiResult.error?.message && apiResult.error.message !== "Bad Request") {
        errorMessage = apiResult.error.message;
      }

      // Handle nested errors - can be array or object with field names as keys
      if (details.errors) {
        let errorDetails = "";

        if (Array.isArray(details.errors)) {
          // Array format: [{field, message}, ...]
          errorDetails = details.errors.map((e: unknown) => {
            const err = e as { field?: string; message?: string; detail?: string };
            if (err.field && (err.message || err.detail)) {
              return `${err.field}: ${err.message || err.detail}`;
            }
            return err.message || err.detail || JSON.stringify(err);
          }).join("; ");
        } else if (typeof details.errors === "object") {
          // Object format: {fieldName: [messages], ...}
          const errorsObj = details.errors as Record<string, string[]>;
          errorDetails = Object.entries(errorsObj)
            .map(([field, messages]) => {
              const msgs = Array.isArray(messages) ? messages.join(", ") : String(messages);
              return `${field}: ${msgs}`;
            })
            .join("; ");
        }

        if (errorDetails) {
          errorMessage = errorDetails;
        }
      }

      // If we still have a generic message, show the title or raw details
      if (errorMessage === "API call failed" || errorMessage === "Bad Request") {
        if (typeof details.title === "string" && details.title) {
          errorMessage = details.title;
        } else {
          errorMessage = JSON.stringify(details);
        }
      }
    } else if (apiResult.error?.message && apiResult.error.message !== "Bad Request") {
      errorMessage = apiResult.error.message;
    }

    return {
      externalId: shipment.externalId,
      success: false,
      packageCount: shipment.packageIds.length,
      error: errorMessage,
    };
  }

  // Create shipment record in database
  const { data: shipmentRecord, error: dbError } = await (
    supabase.from("shipments") as ReturnType<typeof supabase.from>
  ).insert({
    user_id: userId,
    external_id: shipment.externalId,
    safepackage_shipment_id: apiResult.data?.shipmentId,
    master_bill_prefix: shipment.masterBillPrefix,
    master_bill_serial_number: shipment.masterBillSerialNumber,
    originator_code: shipment.originatorCode,
    entry_type: shipment.entryType,
    // Shipper
    shipper_name: shipment.shipper.name,
    shipper_line1: shipment.shipper.line1,
    shipper_line2: shipment.shipper.line2,
    shipper_city: shipment.shipper.city,
    shipper_state: shipment.shipper.state,
    shipper_postal_code: shipment.shipper.postalCode,
    shipper_country: shipment.shipper.country,
    shipper_phone: shipment.shipper.phone,
    shipper_email: shipment.shipper.email,
    // Consignee
    consignee_name: shipment.consignee.name,
    consignee_line1: shipment.consignee.line1,
    consignee_line2: shipment.consignee.line2,
    consignee_city: shipment.consignee.city,
    consignee_state: shipment.consignee.state,
    consignee_postal_code: shipment.consignee.postalCode,
    consignee_country: shipment.consignee.country,
    consignee_phone: shipment.consignee.phone,
    consignee_email: shipment.consignee.email,
    // Transportation
    transport_mode: shipment.transportation.mode,
    port_of_entry: shipment.transportation.portOfEntry,
    port_of_origin: shipment.transportation.portOfOrigin,
    port_of_arrival: shipment.transportation.portOfArrival,
    carrier_name: shipment.transportation.carrierName,
    carrier_code: shipment.transportation.carrierCode,
    line_number: shipment.transportation.lineNumber,
    shipping_date: shipment.transportation.shippingDate,
    scheduled_arrival_date: shipment.transportation.scheduledArrivalDate,
    firms_code: shipment.transportation.firmsCode,
    terminal_operator: shipment.transportation.terminalOperator,
    // Status
    status: "registered",
  } as Record<string, unknown>).select().single();

  if (dbError) {
    console.error("Database error creating shipment:", dbError);
    return {
      externalId: shipment.externalId,
      success: true, // API call succeeded
      safepackageShipmentId: apiResult.data?.shipmentId,
      packageCount: shipment.packageIds.length,
      error: "Shipment registered but failed to save to database",
    };
  }

  // Link packages to shipment if we have the shipment record
  if (shipmentRecord) {
    // Find packages by safepackage_id and link them to the shipment
    for (const packageId of shipment.packageIds) {
      await (supabase.from("packages") as ReturnType<typeof supabase.from>)
        .update({
          shipment_id: shipmentRecord.id,
          status: "registered",
        } as Record<string, unknown>)
        .eq("safepackage_id", packageId)
        .eq("user_id", userId);
    }
  }

  return {
    externalId: shipment.externalId,
    success: true,
    safepackageShipmentId: apiResult.data?.shipmentId,
    shipmentDbId: shipmentRecord?.id,
    packageCount: shipment.packageIds.length,
  };
}
