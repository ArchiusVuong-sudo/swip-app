/**
 * CSV Export Generators
 * Functions to generate commercial invoices and IB SafePackage format exports
 */

import Papa from "papaparse";
import { CSV_COLUMNS, ALL_COLUMNS } from "./constants";
import type { ParsedCSVRow } from "./parser";

/**
 * Generate Commercial Invoice & Packing List CSV
 * Format matches Template_Commercial Invoice & Packing List - Invoice 2 (DDP).csv
 */
export function generateCommercialInvoice(
  rows: ParsedCSVRow[],
  options: {
    invoiceNumber?: string;
    date?: string;
    incoterms?: string;
    currency?: string;
    mawbNumber?: string;
    carrier?: string;
  } = {}
): string {
  if (rows.length === 0) return "";

  const {
    invoiceNumber = `SWIP-INV-${Date.now()}`,
    date = new Date().toISOString().split("T")[0],
    incoterms = "DDP (Los Angeles)",
    currency = "USD",
    mawbNumber = "",
    carrier = "",
  } = options;

  // Get shipper and consignee info from first row
  const firstRow = rows[0];
  const shipperAddress = [
    firstRow[CSV_COLUMNS.SHIPPER_NAME],
    firstRow[CSV_COLUMNS.SHIPPER_ADDRESS_1],
    firstRow[CSV_COLUMNS.SHIPPER_ADDRESS_2],
    [
      firstRow[CSV_COLUMNS.SHIPPER_CITY],
      firstRow[CSV_COLUMNS.SHIPPER_STATE],
      firstRow[CSV_COLUMNS.SHIPPER_POSTAL_CODE],
    ]
      .filter(Boolean)
      .join(", "),
    firstRow[CSV_COLUMNS.SHIPPER_COUNTRY],
  ]
    .filter(Boolean)
    .join(", ");

  const consigneeAddress = [
    firstRow[CSV_COLUMNS.CONSIGNEE_NAME],
    firstRow[CSV_COLUMNS.CONSIGNEE_ADDRESS_1],
    firstRow[CSV_COLUMNS.CONSIGNEE_ADDRESS_2],
    [
      firstRow[CSV_COLUMNS.CONSIGNEE_CITY],
      firstRow[CSV_COLUMNS.CONSIGNEE_STATE],
      firstRow[CSV_COLUMNS.CONSIGNEE_POSTAL_CODE],
    ]
      .filter(Boolean)
      .join(", "),
    firstRow[CSV_COLUMNS.CONSIGNEE_COUNTRY],
  ]
    .filter(Boolean)
    .join(", ");

  // Build header section
  const headerRows = [
    ["", "", "", "", "", "", "", "", ""],
    ["Document Type", "PROFORMA INVOICE", "", "", "", "", "", "", ""],
    ["Invoice Number", invoiceNumber, "", "", "", "", "", "", ""],
    ["Date", date, "", "", "", "", "", "", ""],
    ["Incoterms", incoterms, "", "", "", "", "", "", ""],
    ["Currency", currency, "", "", "", "", "", "", ""],
    ["MAWB Number", mawbNumber, "", "", "", "", "", "", ""],
    ["Carrier", carrier, "", "", "", "", "", "", ""],
    ["SHIPPER (Exporter)", shipperAddress, "", "", "", "", "", "", ""],
    [
      "Shipper Phone",
      firstRow[CSV_COLUMNS.SHIPPER_PHONE] || "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ],
    ["Consigned To:", consigneeAddress, "", "", "", "", "", "", ""],
    [
      "Consignee Phone",
      firstRow[CSV_COLUMNS.CONSIGNEE_PHONE] || "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ],
    ["SHIP TO (Destination)", consigneeAddress, "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", ""],
    ["LINE ITEMS", "", "", "", "", "", "", "", ""],
    [
      "Item #",
      "SKU",
      "Description",
      "HS Code",
      "Origin",
      "Material",
      "Qty",
      "Unit Price (USD)",
      "Total Value (USD)",
    ],
  ];

  // Build line items from rows
  const lineItems: string[][] = [];
  let runningItemCount = 0;
  let totalQuantity = 0;
  let grandTotal = 0;

  rows.forEach((row) => {
    const quantity = parseInt(String(row[CSV_COLUMNS.PRODUCT_QUANTITY] || "1"), 10) || 1;
    const unitPrice = parseFloat(String(row[CSV_COLUMNS.DECLARED_VALUE] || "0")) || 0;
    const totalValue = quantity * unitPrice;

    const startItem = runningItemCount + 1;
    const endItem = runningItemCount + quantity;
    const itemRange = quantity > 1 ? `${startItem}-${endItem}` : String(startItem);

    lineItems.push([
      itemRange,
      String(row[CSV_COLUMNS.PRODUCT_SKU] || ""),
      String(row[CSV_COLUMNS.PRODUCT_DECLARED_NAME] || row[CSV_COLUMNS.PRODUCT_NAME] || ""),
      String(row[CSV_COLUMNS.HS_CODE] || ""),
      String(row[CSV_COLUMNS.ORIGIN_COUNTRY] || ""),
      String(row[CSV_COLUMNS.PRODUCT_DESCRIPTION] || "").substring(0, 100),
      String(quantity),
      unitPrice.toFixed(2),
      totalValue.toFixed(2),
    ]);

    runningItemCount = endItem;
    totalQuantity += quantity;
    grandTotal += totalValue;
  });

  // Add totals row
  lineItems.push(["", "", "", "", "", "", String(totalQuantity), "", grandTotal.toFixed(2)]);

  // Combine all sections
  const allRows = [...headerRows, ...lineItems];

  return Papa.unparse(allRows, {
    quotes: true,
  });
}

/**
 * Generate IB SafePackage API Data CSV
 * Format matches Template_IB SafePackage_API data.xlsx / API_data_template_v2.csv
 * Uses all standard columns in the correct order
 */
export function generateIBSafePackageCSV(rows: ParsedCSVRow[]): string {
  if (rows.length === 0) return "";

  // Map rows to ensure all columns are present in the correct order
  const exportRows = rows.map((row) => {
    const exportRow: Record<string, string> = {};

    // Add all standard columns in order
    for (const column of ALL_COLUMNS) {
      exportRow[column] = String(row[column] || "");
    }

    return exportRow;
  });

  return Papa.unparse(exportRows, {
    quotes: true,
    columns: ALL_COLUMNS,
  });
}

/**
 * Get invoice metadata from rows for display
 */
export function getInvoiceSummary(rows: ParsedCSVRow[]): {
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  uniqueProducts: number;
  shipperName: string;
  consigneeName: string;
} {
  if (rows.length === 0) {
    return {
      totalItems: 0,
      totalQuantity: 0,
      totalValue: 0,
      uniqueProducts: 0,
      shipperName: "",
      consigneeName: "",
    };
  }

  let totalQuantity = 0;
  let totalValue = 0;
  const uniqueSkus = new Set<string>();

  rows.forEach((row) => {
    const quantity = parseInt(String(row[CSV_COLUMNS.PRODUCT_QUANTITY] || "1"), 10) || 1;
    const unitPrice = parseFloat(String(row[CSV_COLUMNS.DECLARED_VALUE] || "0")) || 0;

    totalQuantity += quantity;
    totalValue += quantity * unitPrice;

    const sku = String(row[CSV_COLUMNS.PRODUCT_SKU] || "");
    if (sku) uniqueSkus.add(sku);
  });

  return {
    totalItems: rows.length,
    totalQuantity,
    totalValue,
    uniqueProducts: uniqueSkus.size,
    shipperName: String(rows[0][CSV_COLUMNS.SHIPPER_NAME] || ""),
    consigneeName: String(rows[0][CSV_COLUMNS.CONSIGNEE_NAME] || ""),
  };
}
