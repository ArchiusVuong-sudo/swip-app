import { z } from "zod";
import { SUPPORTED_PLATFORMS, getPlatformById } from "@/lib/safepackage/platforms";
import { CARRIER_IDS, ENTRY_TYPES, TRANSPORT_MODES } from "@/lib/csv/constants";

// =============================================================================
// Regex Patterns
// =============================================================================

const phoneRegex = /^[0-9\-]+$/;
const postalCodeRegex = /^[A-Za-z0-9]+$/;
const hsCodeRegex = /^[0-9]{6,10}$/;
const iso3Regex = /^[A-Z]{3}$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const eanUpcRegex = /^\d{12,13}$/; // EAN-13 (13 digits) or UPC-12 (12 digits)

// =============================================================================
// Sanitization Functions
// =============================================================================

export function sanitizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  // Remove +, (), spaces, and other non-allowed characters
  return phone.replace(/[^\d\-]/g, "") || null;
}

export function sanitizePostalCode(postalCode: string | null | undefined): string | null {
  if (!postalCode) return null;
  // Remove hyphens and non-alphanumeric characters
  return postalCode.replace(/[^A-Za-z0-9]/g, "") || null;
}

export function sanitizeHsCode(hsCode: string | null | undefined): string | null {
  if (!hsCode) return null;
  // Remove periods and non-numeric characters
  return hsCode.replace(/[^0-9]/g, "") || null;
}

export function sanitizeCountryCode(code: string | null | undefined): string | null {
  if (!code) return null;
  return code.toUpperCase().trim() || null;
}

// =============================================================================
// Address Schema
// =============================================================================

const addressSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name must be 50 chars max"),
  line1: z.string().min(1, "Address line 1 is required").max(50, "Address line 1 must be 50 chars max"),
  line2: z.string().max(50, "Address line 2 must be 50 chars max").optional().nullable(),
  city: z.string().min(1, "City is required").max(50, "City must be 50 chars max"),
  state: z.string().min(1, "State is required").max(30, "State must be 30 chars max"),
  postalCode: z
    .string()
    .min(1, "Postal code is required")
    .max(12, "Postal code must be 12 chars max")
    .regex(postalCodeRegex, "Postal code must be alphanumeric only (no hyphens or spaces)"),
  country: z.string().regex(iso3Regex, "Country must be 3-letter ISO code (e.g., USA, CHN, GBR)"),
  phone: z
    .string()
    .regex(phoneRegex, "Phone must contain only digits and hyphens (no +, parentheses, or spaces)")
    .optional()
    .nullable(),
  email: z.string().email("Invalid email format").max(35, "Email must be 35 chars max").optional().nullable(),
});

// =============================================================================
// Helper for platform validation message
// =============================================================================

const supportedPlatformIds = SUPPORTED_PLATFORMS.map((p) => p.id).join(", ");

// =============================================================================
// Product Schema
// =============================================================================

const productSchema = z.object({
  sku: z.string().min(1, "SKU is required").max(50, "SKU must be 50 chars max"),
  platformId: z.string().refine(
    (val) => SUPPORTED_PLATFORMS.some((p) => p.id === val),
    { message: `Invalid platform ID. Supported platforms: ${supportedPlatformIds}` }
  ),
  sellerId: z.string().min(1, "Seller ID is required").max(50, "Seller ID must be 50 chars max"),
  url: z.string().url("Product URL must be a valid URL"),
  name: z.string().min(1, "Product name is required").max(300, "Product name must be 300 chars max"),
  declaredName: z.string().max(300, "Declared name must be 300 chars max").optional().nullable(),
  description: z.string().min(1, "Product description is required"),
  price: z.number().positive("Price must be a positive number"),
  originCountry: z.string().regex(iso3Regex, "Origin country must be 3-letter ISO code (e.g., USA, CHN, GBR)"),
  destinationCountry: z
    .string()
    .regex(iso3Regex, "Destination country must be 3-letter ISO code (e.g., USA, CHN, GBR)")
    .default("USA"),
  hsCode: z
    .string()
    .regex(hsCodeRegex, "HS code must be 6-10 digits only (no periods or dashes)")
    .optional()
    .nullable(),
  ean: z
    .string()
    .regex(eanUpcRegex, "EAN/UPC must be 12 digits (UPC) or 13 digits (EAN)")
    .optional()
    .nullable(),
  categories: z.array(z.string()).optional().nullable(),
  pieces: z.number().int("Pieces must be a whole number").positive("Pieces must be at least 1").default(1),
  normalize: z.boolean().default(false),
  manufacturerId: z.string().optional().nullable(),
  manufacturerName: z.string().optional().nullable(),
  manufacturerAddress: z.string().optional().nullable(),
  images: z.array(z.string()).optional(), // base64 or URLs
});

// =============================================================================
// Package Row Schema (CSV Row)
// =============================================================================

export const packageRowSchema = z.object({
  // Order identifiers
  externalId: z.string().min(1, "External ID is required"),
  houseBillNumber: z.string().min(1, "House bill number is required").max(12, "House bill number must be 12 chars max"),
  barcode: z.string().min(1, "Barcode is required"),
  containerId: z.string().optional().nullable(),

  // Platform info
  platformId: z.string().refine(
    (val) => SUPPORTED_PLATFORMS.some((p) => p.id === val.toLowerCase()),
    { message: `Invalid platform ID. Supported platforms: ${supportedPlatformIds}` }
  ),
  sellerId: z.string().min(1, "Seller ID is required").max(50, "Seller ID must be 50 chars max"),

  // Countries
  exportCountry: z.string().regex(iso3Regex, "Export country must be 3-letter ISO code (e.g., USA, CHN, GBR)"),
  destinationCountry: z.string().regex(iso3Regex, "Destination country must be 3-letter ISO code (e.g., USA, CHN, GBR)"),

  // Carrier
  carrierId: z
    .enum(CARRIER_IDS, {
      message: `Invalid carrier ID. Supported carriers: ${CARRIER_IDS.join(", ")}`
    })
    .optional()
    .nullable(),

  // Weight
  weightValue: z.number().positive("Weight must be a positive number"),
  weightUnit: z.enum(["K", "L"], { message: "Weight unit must be 'K' for kilograms or 'L' for pounds" }),

  // Shipper address
  shipperName: z.string().min(1, "Shipper name is required").max(50, "Shipper name must be 50 chars max"),
  shipperLine1: z.string().min(1, "Shipper address line 1 is required").max(50, "Shipper address line 1 must be 50 chars max"),
  shipperLine2: z.string().max(50, "Shipper address line 2 must be 50 chars max").optional().nullable(),
  shipperCity: z.string().min(1, "Shipper city is required").max(50, "Shipper city must be 50 chars max"),
  shipperState: z.string().min(1, "Shipper state is required").max(30, "Shipper state must be 30 chars max"),
  shipperPostalCode: z
    .string()
    .max(12, "Shipper postal code must be 12 chars max")
    .regex(postalCodeRegex, "Shipper postal code must be alphanumeric only (no hyphens or spaces)"),
  shipperCountry: z.string().regex(iso3Regex, "Shipper country must be 3-letter ISO code (e.g., USA, CHN, GBR)"),
  shipperPhone: z
    .string()
    .regex(phoneRegex, "Shipper phone must contain only digits and hyphens (no +, parentheses, or spaces)")
    .optional()
    .nullable(),
  shipperEmail: z.string().email("Invalid shipper email format").max(35, "Shipper email must be 35 chars max").optional().nullable(),

  // Consignee address
  consigneeName: z.string().min(1, "Consignee name is required").max(50, "Consignee name must be 50 chars max"),
  consigneeLine1: z.string().min(1, "Consignee address line 1 is required").max(50, "Consignee address line 1 must be 50 chars max"),
  consigneeLine2: z.string().max(50, "Consignee address line 2 must be 50 chars max").optional().nullable(),
  consigneeCity: z.string().min(1, "Consignee city is required").max(50, "Consignee city must be 50 chars max"),
  consigneeState: z.string().min(1, "Consignee state is required").max(30, "Consignee state must be 30 chars max"),
  consigneePostalCode: z
    .string()
    .max(12, "Consignee postal code must be 12 chars max")
    .regex(postalCodeRegex, "Consignee postal code must be alphanumeric only (no hyphens or spaces)"),
  consigneeCountry: z.string().regex(iso3Regex, "Consignee country must be 3-letter ISO code (e.g., USA, CHN, GBR)"),
  consigneePhone: z
    .string()
    .regex(phoneRegex, "Consignee phone must contain only digits and hyphens (no +, parentheses, or spaces)")
    .optional()
    .nullable(),
  consigneeEmail: z.string().email("Invalid consignee email format").max(35, "Consignee email must be 35 chars max").optional().nullable(),

  // Product details
  productSku: z.string().min(1, "Product SKU is required").max(50, "Product SKU must be 50 chars max"),
  productName: z.string().min(1, "Product name is required").max(300, "Product name must be 300 chars max"),
  productDeclaredName: z.string().max(300, "Product declared name must be 300 chars max").optional().nullable(),
  productDescription: z.string().min(1, "Product description is required"),
  productUrl: z.string().url("Product URL must be a valid URL (e.g., https://example.com/product)"),
  productCategories: z.array(z.string()).optional().nullable(),
  productQuantity: z.number().int("Product quantity must be a whole number").positive("Product quantity must be at least 1"),

  // Pricing
  declaredValue: z.number().positive("Declared value must be a positive number"),
  listPrice: z.number().positive("List price must be a positive number"),
  originCountry: z.string().regex(iso3Regex, "Origin country must be 3-letter ISO code (e.g., USA, CHN, GBR)"),

  // Customs
  hsCode: z
    .string()
    .regex(hsCodeRegex, "HS code must be 6-10 digits only (no periods or dashes)")
    .optional()
    .nullable(),
  ean: z
    .string()
    .regex(eanUpcRegex, "EAN/UPC must be 12 digits (UPC) or 13 digits (EAN)")
    .optional()
    .nullable(),
  pieces: z.number().int("Pieces must be a whole number").positive("Pieces must be at least 1").default(1),
  normalize: z.boolean().default(false),
  manufacturerId: z.string().optional().nullable(),
  manufacturerName: z.string().optional().nullable(),
  manufacturerAddress: z.string().optional().nullable(),

  // Images
  productImage1: z.string().optional().nullable(),
  productImage2: z.string().optional().nullable(),
  productImage3: z.string().optional().nullable(),
  productImageUrl: z.string().url().optional().nullable(),

  // Shipment details (optional for package-level screening)
  masterBillPrefix: z.string().optional().nullable(),
  masterBillSerialNumber: z.string().optional().nullable(),
  originatorCode: z.string().optional().nullable(),
  entryType: z.enum(ENTRY_TYPES, {
    message: `Invalid entry type. Valid values: ${ENTRY_TYPES.join(", ")}`
  }).optional().nullable(),
  transportMode: z.enum(TRANSPORT_MODES, {
    message: `Invalid transport mode. Valid values: ${TRANSPORT_MODES.join(", ")}`
  }).optional().nullable(),
  portOfEntry: z.string().optional().nullable(),
  portOfArrival: z.string().optional().nullable(),
  portOfOrigin: z.string().optional().nullable(),
  carrierName: z.string().optional().nullable(),
  carrierCode: z.string().optional().nullable(),
  flightVoyageNumber: z.string().optional().nullable(),
  firmsCode: z.string().optional().nullable(),
  shippingDate: z.string().regex(dateRegex, "Shipping date must be in YYYY-MM-DD format (e.g., 2024-01-15)").optional().nullable(),
  scheduledArrivalDate: z
    .string()
    .regex(dateRegex, "Scheduled arrival date must be in YYYY-MM-DD format (e.g., 2024-01-15)")
    .optional()
    .nullable(),
  terminalOperator: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  // Validate that Platform ID matches the Product URL domain
  // Supports regional domains like amazon.co.jp, amazon.de, etc.
  if (data.platformId && data.productUrl) {
    const platform = getPlatformById(data.platformId.toLowerCase());
    if (platform) {
      const urlLower = data.productUrl.toLowerCase();
      // Check if URL contains the platform ID (base name) followed by a dot
      // This handles amazon.com, amazon.co.jp, amazon.de, etc.
      const platformBase = platform.id.toLowerCase();
      const urlContainsPlatform = urlLower.includes(`${platformBase}.`) ||
        urlLower.includes(`//${platformBase}/`) ||
        urlLower.includes(`.${platformBase}.`);
      if (!urlContainsPlatform) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Product URL domain must match the platform "${data.platformId}". Expected URL to contain "${platformBase}." (e.g., ${platformBase}.com, ${platformBase}.co.jp)`,
          path: ["productUrl"],
        });
      }
    }
  }
});

export type PackageRowData = z.infer<typeof packageRowSchema>;

// =============================================================================
// Validation Result Types
// =============================================================================

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface RowValidationResult {
  rowNumber: number;
  isValid: boolean;
  errors: ValidationError[];
  sanitizedData?: PackageRowData;
}

export interface FileValidationResult {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  results: RowValidationResult[];
  missingColumns: string[];
  rows?: Record<string, string>[]; // Raw rows for editing
  errors?: ValidationError[]; // Top-level errors
}

// =============================================================================
// Export schemas
// =============================================================================

export { addressSchema, productSchema };
