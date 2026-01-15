import { z } from "zod";
import { SUPPORTED_PLATFORMS } from "@/lib/safepackage/platforms";
import { CARRIER_IDS, ENTRY_TYPES, TRANSPORT_MODES } from "@/lib/csv/constants";

// =============================================================================
// Regex Patterns
// =============================================================================

const phoneRegex = /^[0-9\-]+$/;
const postalCodeRegex = /^[A-Za-z0-9]+$/;
const hsCodeRegex = /^[0-9]{6,10}$/;
const iso3Regex = /^[A-Z]{3}$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

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
  name: z.string().min(1).max(50),
  line1: z.string().min(1).max(50),
  line2: z.string().max(50).optional().nullable(),
  city: z.string().min(1).max(50),
  state: z.string().min(1).max(30),
  postalCode: z
    .string()
    .min(1)
    .max(20)
    .regex(postalCodeRegex, "Postal code must be alphanumeric only"),
  country: z.string().regex(iso3Regex, "Country must be ISO3 format"),
  phone: z
    .string()
    .regex(phoneRegex, "Phone must contain only digits and hyphens")
    .optional()
    .nullable(),
  email: z.string().email().max(35).optional().nullable(),
});

// =============================================================================
// Product Schema
// =============================================================================

const productSchema = z.object({
  sku: z.string().min(1).max(50),
  platformId: z.string().refine(
    (val) => SUPPORTED_PLATFORMS.some((p) => p.id === val),
    { message: "Invalid platform ID" }
  ),
  sellerId: z.string().min(1).max(50),
  url: z.string().url(),
  name: z.string().min(1).max(300),
  declaredName: z.string().max(300).optional().nullable(),
  description: z.string().min(1),
  price: z.number().positive(),
  originCountry: z.string().regex(iso3Regex, "Origin country must be ISO3 format"),
  destinationCountry: z
    .string()
    .regex(iso3Regex, "Destination country must be ISO3 format")
    .default("USA"),
  hsCode: z
    .string()
    .regex(hsCodeRegex, "HS code must be 6-10 digits")
    .optional()
    .nullable(),
  ean: z.string().max(20).optional().nullable(),
  categories: z.array(z.string()).optional().nullable(),
  pieces: z.number().int().positive().default(1),
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
  houseBillNumber: z.string().min(1).max(12, "House bill number must be 12 chars max"),
  barcode: z.string().min(1, "Barcode is required"),
  containerId: z.string().optional().nullable(),

  // Platform info
  platformId: z.string().refine(
    (val) => SUPPORTED_PLATFORMS.some((p) => p.id === val.toLowerCase()),
    { message: "Invalid platform ID" }
  ),
  sellerId: z.string().min(1).max(50, "Seller ID must be 50 chars max"),

  // Countries
  exportCountry: z.string().regex(iso3Regex, "Export country must be ISO3 format"),
  destinationCountry: z.string().regex(iso3Regex, "Destination country must be ISO3 format"),

  // Carrier
  carrierId: z
    .enum(CARRIER_IDS)
    .optional()
    .nullable(),

  // Weight
  weightValue: z.number().positive("Weight must be positive"),
  weightUnit: z.enum(["K", "L"], { message: "Weight unit must be K (kg) or L (lbs)" }),

  // Shipper address
  shipperName: z.string().min(1).max(50),
  shipperLine1: z.string().min(1).max(50),
  shipperLine2: z.string().max(50).optional().nullable(),
  shipperCity: z.string().min(1).max(50),
  shipperState: z.string().min(1).max(30),
  shipperPostalCode: z.string().regex(postalCodeRegex, "Postal code must be alphanumeric"),
  shipperCountry: z.string().regex(iso3Regex, "Country must be ISO3 format"),
  shipperPhone: z
    .string()
    .regex(phoneRegex, "Phone must contain only digits and hyphens")
    .optional()
    .nullable(),
  shipperEmail: z.string().email().max(35).optional().nullable(),

  // Consignee address
  consigneeName: z.string().min(1).max(50),
  consigneeLine1: z.string().min(1).max(50),
  consigneeLine2: z.string().max(50).optional().nullable(),
  consigneeCity: z.string().min(1).max(50),
  consigneeState: z.string().min(1).max(30),
  consigneePostalCode: z.string().regex(postalCodeRegex, "Postal code must be alphanumeric"),
  consigneeCountry: z.string().regex(iso3Regex, "Country must be ISO3 format"),
  consigneePhone: z
    .string()
    .regex(phoneRegex, "Phone must contain only digits and hyphens")
    .optional()
    .nullable(),
  consigneeEmail: z.string().email().max(35).optional().nullable(),

  // Product details
  productSku: z.string().min(1).max(50),
  productName: z.string().min(1).max(300),
  productDeclaredName: z.string().max(300).optional().nullable(),
  productDescription: z.string().min(1),
  productUrl: z.string().url(),
  productCategories: z.array(z.string()).optional().nullable(),
  productQuantity: z.number().int().positive(),

  // Pricing
  declaredValue: z.number().positive(),
  listPrice: z.number().positive(),
  originCountry: z.string().regex(iso3Regex, "Origin country must be ISO3 format"),

  // Customs
  hsCode: z
    .string()
    .regex(hsCodeRegex, "HS code must be 6-10 digits")
    .optional()
    .nullable(),
  ean: z.string().max(20).optional().nullable(),
  pieces: z.number().int().positive().default(1),
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
  entryType: z.enum(ENTRY_TYPES).optional().nullable(),
  transportMode: z.enum(TRANSPORT_MODES).optional().nullable(),
  portOfEntry: z.string().optional().nullable(),
  portOfArrival: z.string().optional().nullable(),
  portOfOrigin: z.string().optional().nullable(),
  carrierName: z.string().optional().nullable(),
  carrierCode: z.string().optional().nullable(),
  flightVoyageNumber: z.string().optional().nullable(),
  firmsCode: z.string().optional().nullable(),
  shippingDate: z.string().regex(dateRegex, "Date must be YYYY-MM-DD format").optional().nullable(),
  scheduledArrivalDate: z
    .string()
    .regex(dateRegex, "Date must be YYYY-MM-DD format")
    .optional()
    .nullable(),
  terminalOperator: z.string().optional().nullable(),
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
