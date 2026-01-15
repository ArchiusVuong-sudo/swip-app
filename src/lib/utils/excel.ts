/**
 * Excel export utilities for Commercial Invoice and Packing List
 */

import * as XLSX from "xlsx";

interface PackageData {
  id: string;
  external_id: string;
  house_bill_number: string;
  barcode: string;
  platform_id: string;
  seller_id: string;
  export_country: string;
  destination_country: string;
  weight_value: number;
  weight_unit: string;
  shipper_name: string;
  shipper_line1: string;
  shipper_line2?: string;
  shipper_city: string;
  shipper_state: string;
  shipper_postal_code: string;
  shipper_country: string;
  shipper_phone?: string;
  shipper_email?: string;
  consignee_name: string;
  consignee_line1: string;
  consignee_line2?: string;
  consignee_city: string;
  consignee_state: string;
  consignee_postal_code: string;
  consignee_country: string;
  consignee_phone?: string;
  consignee_email?: string;
  status: string;
  screening_status?: string;
  screening_code?: number;
  safepackage_id?: string;
  created_at: string;
}

interface ProductData {
  sku: string;
  name: string;
  description: string;
  quantity: number;
  declared_value: number;
  origin_country: string;
  hs_code?: string;
}

// Extended package data with products joined from package_products table
export interface PackageWithProducts extends PackageData {
  package_products?: Array<{
    id: string;
    quantity: number;
    declared_value: number;
    declared_name: string | null;
    product: {
      id: string;
      sku: string;
      name: string;
      description: string;
      origin_country: string;
      hs_code: string | null;
      price: number;
    } | null;
  }>;
}

/**
 * Generate Commercial Invoice Excel file
 * Uses actual product data from package_products join when available
 */
export function generateCommercialInvoice(
  packages: PackageWithProducts[],
  products: ProductData[],
  invoiceNumber: string,
  invoiceDate: string
): Uint8Array {
  const workbook = XLSX.utils.book_new();

  // Invoice Header Sheet
  const headerData = [
    ["COMMERCIAL INVOICE"],
    [],
    ["Invoice Number:", invoiceNumber],
    ["Invoice Date:", invoiceDate],
    ["Terms of Sale:", "DDP (Delivered Duty Paid)"],
    ["Currency:", "USD"],
    [],
  ];

  // Get first package for shipper/consignee (assuming consolidated shipment)
  const firstPackage = packages[0];
  if (firstPackage) {
    headerData.push(
      ["SHIPPER/EXPORTER:"],
      [firstPackage.shipper_name],
      [firstPackage.shipper_line1],
      [firstPackage.shipper_line2 || ""],
      [`${firstPackage.shipper_city}, ${firstPackage.shipper_state} ${firstPackage.shipper_postal_code}`],
      [firstPackage.shipper_country],
      [firstPackage.shipper_phone || ""],
      [],
      ["CONSIGNEE/IMPORTER:"],
      [firstPackage.consignee_name],
      [firstPackage.consignee_line1],
      [firstPackage.consignee_line2 || ""],
      [`${firstPackage.consignee_city}, ${firstPackage.consignee_state} ${firstPackage.consignee_postal_code}`],
      [firstPackage.consignee_country],
      [firstPackage.consignee_phone || ""],
      []
    );
  }

  const headerSheet = XLSX.utils.aoa_to_sheet(headerData);
  XLSX.utils.book_append_sheet(workbook, headerSheet, "Invoice Header");

  // Line Items Sheet
  const lineItemsHeader = [
    "Item #",
    "House Bill",
    "External ID",
    "SKU",
    "Description",
    "HS Code",
    "Origin Country",
    "Quantity",
    "Unit Value (USD)",
    "Total Value (USD)",
  ];

  const lineItemsData: (string | number)[][] = [lineItemsHeader];

  let itemNumber = 1;
  let grandTotal = 0;

  for (const pkg of packages) {
    // Check if package has products from join
    if (pkg.package_products && pkg.package_products.length > 0) {
      // Use actual product data from package_products join
      for (const pp of pkg.package_products) {
        const quantity = pp.quantity || 1;
        const unitValue = pp.declared_value || pp.product?.price || 0;
        const totalValue = quantity * unitValue;
        grandTotal += totalValue;

        const productName = pp.declared_name || pp.product?.name || "Unknown Product";
        const sku = pp.product?.sku || "-";
        const hsCode = pp.product?.hs_code || "";
        const originCountry = pp.product?.origin_country || pkg.export_country;

        lineItemsData.push([
          itemNumber++,
          pkg.house_bill_number,
          pkg.external_id,
          sku,
          productName,
          hsCode,
          originCountry,
          quantity,
          Number(unitValue.toFixed(2)),
          Number(totalValue.toFixed(2)),
        ]);
      }
    } else {
      // Fallback: Use legacy products array or package-level data
      const matchingProducts = products.filter(
        (p) => p.sku && packages.some((pkg) => pkg.platform_id === p.sku)
      );

      if (matchingProducts.length > 0) {
        for (const product of matchingProducts) {
          const quantity = product.quantity || 1;
          const unitValue = product.declared_value || 0;
          const totalValue = quantity * unitValue;
          grandTotal += totalValue;

          lineItemsData.push([
            itemNumber++,
            pkg.house_bill_number,
            pkg.external_id,
            product.sku,
            product.description || product.name,
            product.hs_code || "",
            product.origin_country,
            quantity,
            Number(unitValue.toFixed(2)),
            Number(totalValue.toFixed(2)),
          ]);
        }
      } else {
        // Last resort fallback for packages without product data
        // Use package-level info with minimal line item
        lineItemsData.push([
          itemNumber++,
          pkg.house_bill_number,
          pkg.external_id,
          pkg.platform_id,
          `Package from ${pkg.shipper_name}`,
          "",
          pkg.export_country,
          1,
          0,
          0,
        ]);
      }
    }
  }

  // Add totals row
  lineItemsData.push([]);
  lineItemsData.push([
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "TOTAL:",
    "",
    Number(grandTotal.toFixed(2)),
  ]);

  const lineItemsSheet = XLSX.utils.aoa_to_sheet(lineItemsData);

  // Set column widths
  lineItemsSheet["!cols"] = [
    { wch: 8 },  // Item #
    { wch: 15 }, // House Bill
    { wch: 15 }, // External ID
    { wch: 15 }, // SKU
    { wch: 40 }, // Description
    { wch: 12 }, // HS Code
    { wch: 15 }, // Origin Country
    { wch: 10 }, // Quantity
    { wch: 15 }, // Unit Value
    { wch: 15 }, // Total Value
  ];

  XLSX.utils.book_append_sheet(workbook, lineItemsSheet, "Line Items");

  // Generate buffer
  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  return new Uint8Array(excelBuffer);
}

/**
 * Generate Packing List Excel file
 * Includes product contents when package_products data is available
 */
export function generatePackingList(
  packages: PackageWithProducts[],
  shipmentId: string,
  packingDate: string
): Uint8Array {
  const workbook = XLSX.utils.book_new();

  // Header information
  const headerData = [
    ["PACKING LIST"],
    [],
    ["Shipment ID:", shipmentId],
    ["Date:", packingDate],
    ["Total Packages:", packages.length],
    [],
  ];

  // Get first package for shipper info
  const firstPackage = packages[0];
  if (firstPackage) {
    headerData.push(
      ["FROM:"],
      [firstPackage.shipper_name],
      [`${firstPackage.shipper_line1} ${firstPackage.shipper_line2 || ""}`],
      [`${firstPackage.shipper_city}, ${firstPackage.shipper_state} ${firstPackage.shipper_postal_code}`],
      [firstPackage.shipper_country],
      [],
      ["TO:"],
      [firstPackage.consignee_name],
      [`${firstPackage.consignee_line1} ${firstPackage.consignee_line2 || ""}`],
      [`${firstPackage.consignee_city}, ${firstPackage.consignee_state} ${firstPackage.consignee_postal_code}`],
      [firstPackage.consignee_country],
      []
    );
  }

  const headerSheet = XLSX.utils.aoa_to_sheet(headerData);
  XLSX.utils.book_append_sheet(workbook, headerSheet, "Header");

  // Package Details Sheet
  const packageHeader = [
    "Package #",
    "House Bill",
    "External ID",
    "Barcode",
    "Platform",
    "Weight",
    "Origin",
    "Destination",
    "Consignee",
    "Address",
    "City",
    "State",
    "Postal",
    "Status",
    "SafePackage ID",
  ];

  const packageData: (string | number)[][] = [packageHeader];

  let packageNumber = 1;
  let totalWeight = 0;

  for (const pkg of packages) {
    const weight = pkg.weight_value || 0;
    totalWeight += weight;
    const weightStr = `${weight} ${pkg.weight_unit === "K" ? "kg" : "lbs"}`;

    packageData.push([
      packageNumber++,
      pkg.house_bill_number,
      pkg.external_id,
      pkg.barcode,
      pkg.platform_id,
      weightStr,
      pkg.export_country,
      pkg.destination_country,
      pkg.consignee_name,
      pkg.consignee_line1,
      pkg.consignee_city,
      pkg.consignee_state,
      pkg.consignee_postal_code,
      pkg.screening_status || pkg.status,
      pkg.safepackage_id || "",
    ]);
  }

  // Add totals
  packageData.push([]);
  packageData.push([
    "TOTAL",
    "",
    "",
    "",
    "",
    `${totalWeight} ${packages[0]?.weight_unit === "K" ? "kg" : "lbs"}`,
  ]);

  const packageSheet = XLSX.utils.aoa_to_sheet(packageData);

  // Set column widths
  packageSheet["!cols"] = [
    { wch: 10 }, // Package #
    { wch: 15 }, // House Bill
    { wch: 15 }, // External ID
    { wch: 20 }, // Barcode
    { wch: 12 }, // Platform
    { wch: 12 }, // Weight
    { wch: 10 }, // Origin
    { wch: 12 }, // Destination
    { wch: 20 }, // Consignee
    { wch: 30 }, // Address
    { wch: 15 }, // City
    { wch: 10 }, // State
    { wch: 12 }, // Postal
    { wch: 15 }, // Status
    { wch: 20 }, // SafePackage ID
  ];

  XLSX.utils.book_append_sheet(workbook, packageSheet, "Packages");

  // Product Contents Sheet (when package_products data is available)
  const hasProducts = packages.some(
    (pkg) => pkg.package_products && pkg.package_products.length > 0
  );

  if (hasProducts) {
    const productHeader = [
      "Package External ID",
      "House Bill",
      "SKU",
      "Product Name",
      "Description",
      "Quantity",
      "Declared Value (USD)",
      "Total Value (USD)",
      "HS Code",
      "Origin Country",
    ];

    const productData: (string | number)[][] = [productHeader];
    let totalDeclaredValue = 0;

    for (const pkg of packages) {
      if (pkg.package_products && pkg.package_products.length > 0) {
        for (const pp of pkg.package_products) {
          const quantity = pp.quantity || 1;
          const unitValue = pp.declared_value || pp.product?.price || 0;
          const totalValue = quantity * unitValue;
          totalDeclaredValue += totalValue;

          productData.push([
            pkg.external_id,
            pkg.house_bill_number,
            pp.product?.sku || "-",
            pp.declared_name || pp.product?.name || "Unknown",
            pp.product?.description || "-",
            quantity,
            Number(unitValue.toFixed(2)),
            Number(totalValue.toFixed(2)),
            pp.product?.hs_code || "-",
            pp.product?.origin_country || pkg.export_country,
          ]);
        }
      }
    }

    // Add total
    productData.push([]);
    productData.push([
      "",
      "",
      "",
      "",
      "",
      "",
      "TOTAL:",
      Number(totalDeclaredValue.toFixed(2)),
      "",
      "",
    ]);

    const productSheet = XLSX.utils.aoa_to_sheet(productData);

    productSheet["!cols"] = [
      { wch: 18 }, // Package External ID
      { wch: 15 }, // House Bill
      { wch: 15 }, // SKU
      { wch: 30 }, // Product Name
      { wch: 40 }, // Description
      { wch: 10 }, // Quantity
      { wch: 18 }, // Declared Value
      { wch: 18 }, // Total Value
      { wch: 12 }, // HS Code
      { wch: 15 }, // Origin Country
    ];

    XLSX.utils.book_append_sheet(workbook, productSheet, "Product Contents");
  }

  // Summary Sheet
  const summaryData = [
    ["PACKING SUMMARY"],
    [],
    ["Total Packages:", packages.length],
    ["Total Weight:", `${totalWeight} ${packages[0]?.weight_unit === "K" ? "kg" : "lbs"}`],
    [],
    ["Status Breakdown:"],
    ["Accepted:", packages.filter((p) => p.status === "accepted").length],
    ["Rejected:", packages.filter((p) => p.status === "rejected").length],
    ["Inconclusive:", packages.filter((p) => p.status === "inconclusive").length],
    ["Audit Required:", packages.filter((p) => p.status === "audit_required").length],
    ["Pending:", packages.filter((p) => p.status === "pending").length],
  ];

  // Add product summary if available
  if (hasProducts) {
    let totalProducts = 0;
    let totalQuantity = 0;
    let totalValue = 0;

    for (const pkg of packages) {
      if (pkg.package_products) {
        totalProducts += pkg.package_products.length;
        for (const pp of pkg.package_products) {
          totalQuantity += pp.quantity || 1;
          totalValue += (pp.quantity || 1) * (pp.declared_value || pp.product?.price || 0);
        }
      }
    }

    summaryData.push(
      [],
      ["Product Summary:"],
      ["Total Product Lines:", totalProducts],
      ["Total Quantity:", totalQuantity],
      ["Total Declared Value:", `$${totalValue.toFixed(2)}`]
    );
  }

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  // Generate buffer
  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  return new Uint8Array(excelBuffer);
}

/**
 * Generate filename with timestamp
 */
export function generateExcelFilename(prefix: string): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `${prefix}_${timestamp}.xlsx`;
}
