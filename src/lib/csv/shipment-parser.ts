import Papa from "papaparse";
import { z } from "zod";

// Shipment registration CSV columns (matches the export from packages page)
export const SHIPMENT_CSV_COLUMNS = {
  SHIPMENT_EXTERNAL_ID: "shipment_external_id",
  MASTER_BILL_PREFIX: "master_bill_prefix",
  MASTER_BILL_SERIAL_NUMBER: "master_bill_serial_number",
  ORIGINATOR_CODE: "originator_code",
  ENTRY_TYPE: "entry_type",
  // Shipper
  SHIPPER_NAME: "shipper_name",
  SHIPPER_LINE1: "shipper_line1",
  SHIPPER_LINE2: "shipper_line2",
  SHIPPER_CITY: "shipper_city",
  SHIPPER_STATE: "shipper_state",
  SHIPPER_POSTAL_CODE: "shipper_postal_code",
  SHIPPER_COUNTRY: "shipper_country",
  SHIPPER_PHONE: "shipper_phone",
  SHIPPER_EMAIL: "shipper_email",
  // Consignee
  CONSIGNEE_NAME: "consignee_name",
  CONSIGNEE_LINE1: "consignee_line1",
  CONSIGNEE_LINE2: "consignee_line2",
  CONSIGNEE_CITY: "consignee_city",
  CONSIGNEE_STATE: "consignee_state",
  CONSIGNEE_POSTAL_CODE: "consignee_postal_code",
  CONSIGNEE_COUNTRY: "consignee_country",
  CONSIGNEE_PHONE: "consignee_phone",
  CONSIGNEE_EMAIL: "consignee_email",
  // Transportation
  TRANSPORT_MODE: "transport_mode",
  PORT_OF_ENTRY: "port_of_entry",
  PORT_OF_ORIGIN: "port_of_origin",
  PORT_OF_ARRIVAL: "port_of_arrival",
  CARRIER_NAME: "carrier_name",
  CARRIER_CODE: "carrier_code",
  LINE_NUMBER: "line_number",
  SHIPPING_DATE: "shipping_date",
  SCHEDULED_ARRIVAL_DATE: "scheduled_arrival_date",
  FIRMS_CODE: "firms_code",
  TERMINAL_OPERATOR: "terminal_operator",
  // Package ID
  PACKAGE_ID: "package_id",
} as const;

// Required columns for shipment registration CSV structure
// Note: The CSV must have these columns, but values can be empty for some fields
export const SHIPMENT_REQUIRED_COLUMNS = [
  SHIPMENT_CSV_COLUMNS.SHIPMENT_EXTERNAL_ID,
  SHIPMENT_CSV_COLUMNS.SHIPPER_NAME,
  SHIPMENT_CSV_COLUMNS.SHIPPER_LINE1,
  SHIPMENT_CSV_COLUMNS.SHIPPER_CITY,
  SHIPMENT_CSV_COLUMNS.SHIPPER_STATE,
  SHIPMENT_CSV_COLUMNS.SHIPPER_POSTAL_CODE,
  SHIPMENT_CSV_COLUMNS.SHIPPER_COUNTRY,
  SHIPMENT_CSV_COLUMNS.CONSIGNEE_NAME,
  SHIPMENT_CSV_COLUMNS.CONSIGNEE_LINE1,
  SHIPMENT_CSV_COLUMNS.CONSIGNEE_CITY,
  SHIPMENT_CSV_COLUMNS.CONSIGNEE_STATE,
  SHIPMENT_CSV_COLUMNS.CONSIGNEE_POSTAL_CODE,
  SHIPMENT_CSV_COLUMNS.CONSIGNEE_COUNTRY,
  SHIPMENT_CSV_COLUMNS.PACKAGE_ID,
] as const;

// Zod schema for shipment row validation
// Note: Many fields are optional because the exported CSV from packages page
// only has shipper/consignee data pre-filled. Shipment-specific fields need to be
// filled in by the user before uploading.
export const shipmentRowSchema = z.object({
  shipmentExternalId: z.string().min(1, "Shipment external ID is required"),
  // Master bill fields - optional, user fills before upload
  masterBillPrefix: z.string().optional().or(z.literal("")),
  masterBillSerialNumber: z.string().optional().or(z.literal("")),
  originatorCode: z.string().optional().or(z.literal("")),
  entryType: z.enum(["01", "11", "86", "P"]).optional().or(z.literal("") as unknown as z.ZodType<"">),
  // Shipper - required
  shipperName: z.string().min(1, "Shipper name is required"),
  shipperLine1: z.string().min(1, "Shipper address is required"),
  shipperLine2: z.string().optional().or(z.literal("")),
  shipperCity: z.string().min(1, "Shipper city is required"),
  shipperState: z.string().min(1, "Shipper state is required"),
  shipperPostalCode: z.string().min(1, "Shipper postal code is required"),
  shipperCountry: z.string().length(3, "Shipper country must be ISO3 format"),
  shipperPhone: z.string().optional().or(z.literal("")),
  shipperEmail: z.string().email("Invalid email format").optional().or(z.literal("")),
  // Consignee - required
  consigneeName: z.string().min(1, "Consignee name is required"),
  consigneeLine1: z.string().min(1, "Consignee address is required"),
  consigneeLine2: z.string().optional().or(z.literal("")),
  consigneeCity: z.string().min(1, "Consignee city is required"),
  consigneeState: z.string().min(1, "Consignee state is required"),
  consigneePostalCode: z.string().min(1, "Consignee postal code is required"),
  consigneeCountry: z.string().length(3, "Consignee country must be ISO3 format"),
  consigneePhone: z.string().optional().or(z.literal("")),
  consigneeEmail: z.string().email("Invalid email format").optional().or(z.literal("")),
  // Transportation - optional, user fills before upload
  transportMode: z.enum(["AIR", "TRUCK"]).optional().or(z.literal("") as unknown as z.ZodType<"">),
  portOfEntry: z.string().optional().or(z.literal("")),
  portOfOrigin: z.string().optional().or(z.literal("")),
  portOfArrival: z.string().optional().or(z.literal("")),
  carrierName: z.string().optional().or(z.literal("")),
  carrierCode: z.string().optional().or(z.literal("")),
  lineNumber: z.string().optional().or(z.literal("")),
  shippingDate: z.string().optional().or(z.literal("")),
  scheduledArrivalDate: z.string().optional().or(z.literal("")),
  firmsCode: z.string().optional().or(z.literal("")),
  terminalOperator: z.string().optional().or(z.literal("")),
  // Package ID from SafePackage - required
  packageId: z.string().min(1, "Package ID is required"),
});

export type ShipmentRowData = z.infer<typeof shipmentRowSchema>;

export interface ShipmentValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ShipmentRowValidationResult {
  rowNumber: number;
  isValid: boolean;
  errors: ShipmentValidationError[];
  data?: ShipmentRowData;
}

export interface ShipmentFileValidationResult {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  results: ShipmentRowValidationResult[];
  missingColumns: string[];
  rows?: Record<string, string>[];
}

export interface ParsedShipmentRow {
  [key: string]: string;
}

export interface ShipmentCSVParseResult {
  data: ParsedShipmentRow[];
  headers: string[];
  errors: Papa.ParseError[];
}

/**
 * Parse a shipment registration CSV file
 * Works in both browser and Node.js environments
 */
export async function parseShipmentCSVFile(file: File): Promise<ShipmentCSVParseResult> {
  // Read file content as text (works in Node.js server environment)
  const text = await file.text();

  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: (results) => {
        resolve({
          data: results.data as ParsedShipmentRow[],
          headers: results.meta.fields || [],
          errors: results.errors,
        });
      },
      error: (error: Error) => {
        reject(error);
      },
    });
  });
}

/**
 * Find missing required columns
 */
export function findMissingShipmentColumns(headers: string[]): string[] {
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());
  return SHIPMENT_REQUIRED_COLUMNS.filter(
    (col) => !normalizedHeaders.includes(col.toLowerCase())
  );
}

/**
 * Sanitize phone: only alphanumeric and dashes allowed (no +, parentheses, spaces)
 */
function sanitizePhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  const cleaned = phone.replace(/[^a-zA-Z0-9-]/g, "");
  return cleaned || undefined;
}

/**
 * Sanitize postal code: only alphanumeric
 */
function sanitizePostalCode(postalCode?: string): string {
  if (!postalCode) return "";
  return postalCode.replace(/[^a-zA-Z0-9]/g, "");
}

/**
 * Sanitize state: only alphanumeric
 */
function sanitizeState(state?: string): string {
  if (!state) return "";
  return state.replace(/[^a-zA-Z0-9]/g, "");
}

/**
 * Transform a CSV row to internal format
 */
export function transformShipmentRow(row: ParsedShipmentRow): Partial<ShipmentRowData> {
  return {
    shipmentExternalId: row.shipment_external_id?.trim() || "",
    masterBillPrefix: row.master_bill_prefix?.trim() || "",
    masterBillSerialNumber: row.master_bill_serial_number?.trim() || "",
    originatorCode: row.originator_code?.trim() || undefined,
    entryType: row.entry_type?.trim() as "01" | "11" | "86" | "P" | undefined,
    // Shipper
    shipperName: row.shipper_name?.trim() || "",
    shipperLine1: row.shipper_line1?.trim() || "",
    shipperLine2: row.shipper_line2?.trim() || undefined,
    shipperCity: row.shipper_city?.trim() || "",
    shipperState: sanitizeState(row.shipper_state),
    shipperPostalCode: sanitizePostalCode(row.shipper_postal_code),
    shipperCountry: row.shipper_country?.trim()?.toUpperCase() || "",
    shipperPhone: sanitizePhone(row.shipper_phone),
    shipperEmail: row.shipper_email?.trim() || undefined,
    // Consignee
    consigneeName: row.consignee_name?.trim() || "",
    consigneeLine1: row.consignee_line1?.trim() || "",
    consigneeLine2: row.consignee_line2?.trim() || undefined,
    consigneeCity: row.consignee_city?.trim() || "",
    consigneeState: sanitizeState(row.consignee_state),
    consigneePostalCode: sanitizePostalCode(row.consignee_postal_code),
    consigneeCountry: row.consignee_country?.trim()?.toUpperCase() || "",
    consigneePhone: sanitizePhone(row.consignee_phone),
    consigneeEmail: row.consignee_email?.trim() || undefined,
    // Transportation
    transportMode: row.transport_mode?.trim()?.toUpperCase() as "AIR" | "TRUCK" | undefined,
    portOfEntry: row.port_of_entry?.trim() || "",
    portOfOrigin: row.port_of_origin?.trim() || "",
    portOfArrival: row.port_of_arrival?.trim() || undefined,
    carrierName: row.carrier_name?.trim() || "",
    carrierCode: row.carrier_code?.trim() || "",
    lineNumber: row.line_number?.trim() || "",
    shippingDate: row.shipping_date?.trim() || "",
    scheduledArrivalDate: row.scheduled_arrival_date?.trim() || "",
    firmsCode: row.firms_code?.trim() || undefined,
    terminalOperator: row.terminal_operator?.trim() || undefined,
    // Package
    packageId: row.package_id?.trim() || "",
  };
}

/**
 * Validate a single shipment row
 */
export function validateShipmentRow(
  row: ParsedShipmentRow,
  rowNumber: number
): ShipmentRowValidationResult {
  const transformedData = transformShipmentRow(row);
  const result = shipmentRowSchema.safeParse(transformedData);

  if (result.success) {
    return {
      rowNumber,
      isValid: true,
      errors: [],
      data: result.data,
    };
  }

  const errors: ShipmentValidationError[] = result.error.issues.map((err) => ({
    field: err.path.join("."),
    message: err.message,
    value: err.path[0] ? (transformedData as Record<string, unknown>)[String(err.path[0])] : undefined,
  }));

  return {
    rowNumber,
    isValid: false,
    errors,
  };
}

/**
 * Validate all rows in a shipment CSV file
 */
export function validateShipmentCSVData(
  parseResult: ShipmentCSVParseResult
): ShipmentFileValidationResult {
  const missingColumns = findMissingShipmentColumns(parseResult.headers);

  if (missingColumns.length > 0) {
    return {
      isValid: false,
      totalRows: parseResult.data.length,
      validRows: 0,
      invalidRows: parseResult.data.length,
      results: [],
      missingColumns,
    };
  }

  const results: ShipmentRowValidationResult[] = parseResult.data.map((row, index) =>
    validateShipmentRow(row, index + 1)
  );

  const validRows = results.filter((r) => r.isValid).length;
  const invalidRows = results.filter((r) => !r.isValid).length;

  return {
    isValid: invalidRows === 0,
    totalRows: parseResult.data.length,
    validRows,
    invalidRows,
    results,
    missingColumns: [],
  };
}

/**
 * Process a shipment CSV file completely: parse and validate
 */
export async function processShipmentCSVFile(file: File): Promise<ShipmentFileValidationResult> {
  const parseResult = await parseShipmentCSVFile(file);
  const validationResult = validateShipmentCSVData(parseResult);

  return {
    ...validationResult,
    rows: parseResult.data,
  };
}

/**
 * Group validated rows by shipment external ID
 * Each shipment can have multiple packages
 */
export interface GroupedShipment {
  externalId: string;
  masterBillPrefix?: string;
  masterBillSerialNumber?: string;
  originatorCode?: string;
  entryType?: "01" | "11" | "86" | "P" | "";
  shipper: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
    email?: string;
  };
  consignee: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
    email?: string;
  };
  transportation: {
    mode?: "AIR" | "TRUCK" | "";
    portOfEntry?: string;
    portOfOrigin?: string;
    portOfArrival?: string;
    carrierName?: string;
    carrierCode?: string;
    lineNumber?: string;
    shippingDate?: string;
    scheduledArrivalDate?: string;
    firmsCode?: string;
    terminalOperator?: string;
  };
  packageIds: string[];
  rowNumbers: number[];
}

export function groupRowsByShipment(
  validationResult: ShipmentFileValidationResult
): GroupedShipment[] {
  const shipmentMap = new Map<string, GroupedShipment>();

  for (const result of validationResult.results) {
    if (!result.isValid || !result.data) continue;

    const data = result.data;
    const key = data.shipmentExternalId;

    if (!shipmentMap.has(key)) {
      shipmentMap.set(key, {
        externalId: data.shipmentExternalId,
        masterBillPrefix: data.masterBillPrefix,
        masterBillSerialNumber: data.masterBillSerialNumber,
        originatorCode: data.originatorCode,
        entryType: data.entryType,
        shipper: {
          name: data.shipperName,
          line1: data.shipperLine1,
          line2: data.shipperLine2,
          city: data.shipperCity,
          state: data.shipperState,
          postalCode: data.shipperPostalCode,
          country: data.shipperCountry,
          phone: data.shipperPhone,
          email: data.shipperEmail,
        },
        consignee: {
          name: data.consigneeName,
          line1: data.consigneeLine1,
          line2: data.consigneeLine2,
          city: data.consigneeCity,
          state: data.consigneeState,
          postalCode: data.consigneePostalCode,
          country: data.consigneeCountry,
          phone: data.consigneePhone,
          email: data.consigneeEmail,
        },
        transportation: {
          mode: data.transportMode,
          portOfEntry: data.portOfEntry,
          portOfOrigin: data.portOfOrigin,
          portOfArrival: data.portOfArrival,
          carrierName: data.carrierName,
          carrierCode: data.carrierCode,
          lineNumber: data.lineNumber,
          shippingDate: data.shippingDate,
          scheduledArrivalDate: data.scheduledArrivalDate,
          firmsCode: data.firmsCode,
          terminalOperator: data.terminalOperator,
        },
        packageIds: [],
        rowNumbers: [],
      });
    }

    const shipment = shipmentMap.get(key)!;
    shipment.packageIds.push(data.packageId);
    shipment.rowNumbers.push(result.rowNumber);
  }

  return Array.from(shipmentMap.values());
}
