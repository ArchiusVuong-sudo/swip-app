import Papa from "papaparse";
import { CSV_COLUMNS, REQUIRED_COLUMNS } from "./constants";
import {
  packageRowSchema,
  sanitizePhone,
  sanitizePostalCode,
  sanitizeHsCode,
  sanitizeCountryCode,
  type PackageRowData,
  type RowValidationResult,
  type FileValidationResult,
  type ValidationError,
} from "@/lib/validation/schemas";
import type { PackageScreeningRequest } from "@/lib/safepackage/types";

export interface ParsedCSVRow {
  [key: string]: string;
}

export interface CSVParseResult {
  data: ParsedCSVRow[];
  headers: string[];
  errors: Papa.ParseError[];
}

/**
 * Parse a CSV file and return the data
 */
export async function parseCSVFile(file: File): Promise<CSVParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        resolve({
          data: results.data as ParsedCSVRow[],
          headers: results.meta.fields || [],
          errors: results.errors,
        });
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

/**
 * Parse CSV text content
 */
export function parseCSVText(text: string): CSVParseResult {
  const results = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  return {
    data: results.data as ParsedCSVRow[],
    headers: results.meta.fields || [],
    errors: results.errors,
  };
}

/**
 * Check for missing required columns
 */
export function findMissingColumns(headers: string[]): string[] {
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());
  return REQUIRED_COLUMNS.filter(
    (col) => !normalizedHeaders.includes(col.toLowerCase())
  );
}

/**
 * Map CSV column names to internal field names
 */
function mapColumnToField(columnName: string): string | null {
  const mapping: Record<string, string> = {
    [CSV_COLUMNS.EXTERNAL_ID]: "externalId",
    [CSV_COLUMNS.HOUSE_BILL_NUMBER]: "houseBillNumber",
    [CSV_COLUMNS.BARCODE]: "barcode",
    [CSV_COLUMNS.CONTAINER_ID]: "containerId",
    [CSV_COLUMNS.PLATFORM_ID]: "platformId",
    [CSV_COLUMNS.SELLER_ID]: "sellerId",
    [CSV_COLUMNS.EXPORT_COUNTRY]: "exportCountry",
    [CSV_COLUMNS.DESTINATION_COUNTRY]: "destinationCountry",
    [CSV_COLUMNS.CARRIER_ID]: "carrierId",
    [CSV_COLUMNS.GROSS_WEIGHT_VALUE]: "weightValue",
    [CSV_COLUMNS.GROSS_WEIGHT_UNIT]: "weightUnit",
    [CSV_COLUMNS.SHIPPER_NAME]: "shipperName",
    [CSV_COLUMNS.SHIPPER_ADDRESS_1]: "shipperLine1",
    [CSV_COLUMNS.SHIPPER_ADDRESS_2]: "shipperLine2",
    [CSV_COLUMNS.SHIPPER_CITY]: "shipperCity",
    [CSV_COLUMNS.SHIPPER_STATE]: "shipperState",
    [CSV_COLUMNS.SHIPPER_POSTAL_CODE]: "shipperPostalCode",
    [CSV_COLUMNS.SHIPPER_COUNTRY]: "shipperCountry",
    [CSV_COLUMNS.SHIPPER_PHONE]: "shipperPhone",
    [CSV_COLUMNS.SHIPPER_EMAIL]: "shipperEmail",
    [CSV_COLUMNS.CONSIGNEE_NAME]: "consigneeName",
    [CSV_COLUMNS.CONSIGNEE_ADDRESS_1]: "consigneeLine1",
    [CSV_COLUMNS.CONSIGNEE_ADDRESS_2]: "consigneeLine2",
    [CSV_COLUMNS.CONSIGNEE_CITY]: "consigneeCity",
    [CSV_COLUMNS.CONSIGNEE_STATE]: "consigneeState",
    [CSV_COLUMNS.CONSIGNEE_POSTAL_CODE]: "consigneePostalCode",
    [CSV_COLUMNS.CONSIGNEE_COUNTRY]: "consigneeCountry",
    [CSV_COLUMNS.CONSIGNEE_PHONE]: "consigneePhone",
    [CSV_COLUMNS.CONSIGNEE_EMAIL]: "consigneeEmail",
    [CSV_COLUMNS.PRODUCT_SKU]: "productSku",
    [CSV_COLUMNS.PRODUCT_NAME]: "productName",
    [CSV_COLUMNS.PRODUCT_DECLARED_NAME]: "productDeclaredName",
    [CSV_COLUMNS.PRODUCT_DESCRIPTION]: "productDescription",
    [CSV_COLUMNS.PRODUCT_URL]: "productUrl",
    [CSV_COLUMNS.PRODUCT_IMAGE_1]: "productImage1",
    [CSV_COLUMNS.PRODUCT_IMAGE_2]: "productImage2",
    [CSV_COLUMNS.PRODUCT_IMAGE_3]: "productImage3",
    [CSV_COLUMNS.PRODUCT_CATEGORIES]: "productCategories",
    [CSV_COLUMNS.PRODUCT_QUANTITY]: "productQuantity",
    [CSV_COLUMNS.DECLARED_VALUE]: "declaredValue",
    [CSV_COLUMNS.LIST_PRICE]: "listPrice",
    [CSV_COLUMNS.ORIGIN_COUNTRY]: "originCountry",
    [CSV_COLUMNS.HS_CODE]: "hsCode",
    [CSV_COLUMNS.EAN_UPC]: "ean",
    [CSV_COLUMNS.NUMBER_OF_PIECES]: "pieces",
    [CSV_COLUMNS.NORMALIZE_FLAG]: "normalize",
    [CSV_COLUMNS.MANUFACTURER_ID]: "manufacturerId",
    [CSV_COLUMNS.MANUFACTURER_NAME]: "manufacturerName",
    [CSV_COLUMNS.MANUFACTURER_ADDRESS]: "manufacturerAddress",
    [CSV_COLUMNS.MASTER_BILL_PREFIX]: "masterBillPrefix",
    [CSV_COLUMNS.MASTER_BILL_SERIAL_NUMBER]: "masterBillSerialNumber",
    [CSV_COLUMNS.ORIGINATOR_CODE]: "originatorCode",
    [CSV_COLUMNS.ENTRY_TYPE]: "entryType",
    [CSV_COLUMNS.TRANSPORT_MODE]: "transportMode",
    [CSV_COLUMNS.PORT_OF_ENTRY]: "portOfEntry",
    [CSV_COLUMNS.PORT_OF_ARRIVAL]: "portOfArrival",
    [CSV_COLUMNS.PORT_OF_ORIGIN]: "portOfOrigin",
    [CSV_COLUMNS.CARRIER_NAME]: "carrierName",
    [CSV_COLUMNS.CARRIER_CODE]: "carrierCode",
    [CSV_COLUMNS.FLIGHT_VOYAGE_NUMBER]: "flightVoyageNumber",
    [CSV_COLUMNS.FIRMS_CODE]: "firmsCode",
    [CSV_COLUMNS.SHIPPING_DATE]: "shippingDate",
    [CSV_COLUMNS.SCHEDULED_ARRIVAL_DATE]: "scheduledArrivalDate",
    [CSV_COLUMNS.TERMINAL_OPERATOR]: "terminalOperator",
    [CSV_COLUMNS.PRODUCT_IMAGE_URL]: "productImageUrl",
  };

  return mapping[columnName] || null;
}

/**
 * Transform and sanitize a CSV row to the expected format
 */
export function transformRow(row: ParsedCSVRow): Partial<PackageRowData> {
  const transformed: Record<string, unknown> = {};

  for (const [csvColumn, value] of Object.entries(row)) {
    const fieldName = mapColumnToField(csvColumn);
    if (!fieldName) continue;

    let transformedValue: unknown = value?.trim() || null;

    // Apply specific transformations
    switch (fieldName) {
      case "weightValue":
      case "declaredValue":
      case "listPrice":
        transformedValue = parseFloat(value) || 0;
        break;

      case "productQuantity":
      case "pieces":
        transformedValue = parseInt(value, 10) || 1;
        break;

      case "normalize":
        transformedValue = value?.toLowerCase() === "true";
        break;

      case "platformId":
        transformedValue = value?.toLowerCase().trim() || null;
        break;

      case "weightUnit":
        transformedValue = value?.toUpperCase().trim() || null;
        break;

      case "exportCountry":
      case "destinationCountry":
      case "originCountry":
      case "shipperCountry":
      case "consigneeCountry":
        transformedValue = sanitizeCountryCode(value);
        break;

      case "shipperPhone":
      case "consigneePhone":
        transformedValue = sanitizePhone(value);
        break;

      case "shipperPostalCode":
      case "consigneePostalCode":
        transformedValue = sanitizePostalCode(value);
        break;

      case "hsCode":
        transformedValue = sanitizeHsCode(value);
        break;

      case "productCategories":
        transformedValue = value ? value.split("|").map((c) => c.trim()) : null;
        break;

      case "transportMode":
        transformedValue = value?.toUpperCase().trim() || null;
        break;
    }

    transformed[fieldName] = transformedValue;
  }

  return transformed as Partial<PackageRowData>;
}

/**
 * Validate a single row
 */
export function validateRow(
  row: ParsedCSVRow,
  rowNumber: number
): RowValidationResult {
  const transformedData = transformRow(row);
  const result = packageRowSchema.safeParse(transformedData);

  if (result.success) {
    return {
      rowNumber,
      isValid: true,
      errors: [],
      sanitizedData: result.data,
    };
  }

  const errors: ValidationError[] = result.error.issues.map((err) => ({
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
 * Validate all rows in a CSV file
 */
export function validateCSVData(
  parseResult: CSVParseResult
): FileValidationResult {
  const missingColumns = findMissingColumns(parseResult.headers);

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

  const results: RowValidationResult[] = parseResult.data.map((row, index) =>
    validateRow(row, index + 1)
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
 * Process a CSV file completely: parse and validate
 */
export async function processCSVFile(file: File): Promise<FileValidationResult> {
  const parseResult = await parseCSVFile(file);
  const validationResult = validateCSVData(parseResult);

  // Include the raw rows for editing
  return {
    ...validationResult,
    rows: parseResult.data,
  };
}

/**
 * Re-validate rows after editing
 */
export function revalidateRows(
  rows: ParsedCSVRow[],
  headers: string[]
): FileValidationResult {
  const parseResult: CSVParseResult = {
    data: rows,
    headers,
    errors: [],
  };
  const validationResult = validateCSVData(parseResult);

  return {
    ...validationResult,
    rows,
  };
}

/**
 * Convert a CSV row to SafePackage API payload format
 */
export function rowToApiPayload(row: ParsedCSVRow): PackageScreeningRequest {
  const transformed = transformRow(row);

  // Collect images (base64 or URL)
  const images: string[] = [];
  if (transformed.productImage1) images.push(String(transformed.productImage1));
  if (transformed.productImage2) images.push(String(transformed.productImage2));
  if (transformed.productImage3) images.push(String(transformed.productImage3));
  if (transformed.productImageUrl) images.push(String(transformed.productImageUrl));

  return {
    externalId: String(transformed.externalId || ""),
    platformId: String(transformed.platformId || ""),
    sellerId: String(transformed.sellerId || ""),
    exportCountry: String(transformed.exportCountry || ""),
    destinationCountry: String(transformed.destinationCountry || ""),
    houseBillNumber: String(transformed.houseBillNumber || ""),
    barcode: String(transformed.barcode || ""),
    containerId: transformed.containerId ? String(transformed.containerId) : undefined,
    carrierId: transformed.carrierId ? String(transformed.carrierId) : undefined,
    weight: {
      value: Number(transformed.weightValue) || 0,
      unit: (transformed.weightUnit as "K" | "L") || "K",
    },
    from: {
      name: String(transformed.shipperName || ""),
      line1: String(transformed.shipperLine1 || ""),
      line2: transformed.shipperLine2 ? String(transformed.shipperLine2) : undefined,
      city: String(transformed.shipperCity || ""),
      state: String(transformed.shipperState || ""),
      postalCode: String(transformed.shipperPostalCode || ""),
      country: String(transformed.shipperCountry || ""),
      phone: transformed.shipperPhone ? String(transformed.shipperPhone) : undefined,
      email: transformed.shipperEmail ? String(transformed.shipperEmail) : undefined,
    },
    to: {
      name: String(transformed.consigneeName || ""),
      line1: String(transformed.consigneeLine1 || ""),
      line2: transformed.consigneeLine2 ? String(transformed.consigneeLine2) : undefined,
      city: String(transformed.consigneeCity || ""),
      state: String(transformed.consigneeState || ""),
      postalCode: String(transformed.consigneePostalCode || ""),
      country: String(transformed.consigneeCountry || ""),
      phone: transformed.consigneePhone ? String(transformed.consigneePhone) : undefined,
      email: transformed.consigneeEmail ? String(transformed.consigneeEmail) : undefined,
    },
    products: [
      {
        quantity: Number(transformed.productQuantity) || 1,
        declaredValue: Number(transformed.declaredValue) || 0,
        declaredName: transformed.productDeclaredName ? String(transformed.productDeclaredName) : undefined,
        product: {
          sku: String(transformed.productSku || ""),
          url: String(transformed.productUrl || ""),
          name: String(transformed.productName || ""),
          description: String(transformed.productDescription || ""),
          price: Number(transformed.listPrice) || 0,
          images,
          originCountry: String(transformed.originCountry || ""),
          categories: transformed.productCategories as string[] | undefined,
          pieces: transformed.pieces ? Number(transformed.pieces) : undefined,
          ean: transformed.ean ? String(transformed.ean) : undefined,
          hts: transformed.hsCode ? String(transformed.hsCode) : undefined,
        },
      },
    ],
  };
}

/**
 * Convert all valid CSV rows to API payloads
 */
export function rowsToApiPayloads(
  rows: ParsedCSVRow[],
  validationResults: RowValidationResult[]
): PackageScreeningRequest[] {
  return rows
    .filter((_, index) => validationResults[index]?.isValid)
    .map((row) => rowToApiPayload(row));
}

/**
 * Export rows back to CSV format
 */
export function rowsToCSV(rows: ParsedCSVRow[]): string {
  return Papa.unparse(rows);
}
