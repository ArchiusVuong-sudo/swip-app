// SafePackage API Types
// Based on SafePackage API Specification v1.23

// =============================================================================
// Common Types
// =============================================================================

export interface Address {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string; // ISO3
  phone?: string;
  email?: string;
}

export interface ShipmentAddress extends Address {
  identifiers?: BusinessIdentifier[];
}

export interface ImporterAddress extends Address {
  identifiers?: ImporterIdentifier[];
}

export interface BusinessIdentifier {
  type: "DUNS" | "GLN" | "LEI";
  value: string;
}

export interface ImporterIdentifier {
  type: "DUNS" | "GLN" | "LEI" | "IMPORTER_NUMBER";
  value: string;
}

export interface Weight {
  value: number;
  unit: "K" | "L"; // K = kilograms, L = pounds
}

export interface ScreeningInstruction {
  type: "ExcludeScreeningResult";
  value: string; // e.g., "RBT"
}

export interface ProductAttribute {
  type: "ManufacturerId" | "ManufacturerName" | "ManufacturerAddress";
  value: string;
}

// =============================================================================
// Platform Types
// =============================================================================

export interface Platform {
  id: string;
  url: string;
}

// =============================================================================
// Product Screening Types
// =============================================================================

export interface ProductScreeningRequest {
  sku: string;
  platformId: string;
  sellerId: string;
  url: string;
  name: string;
  description: string;
  price: number;
  images: string[]; // base64 encoded
  originCountry: string; // ISO3
  destinationCountry: string; // ISO3
  declaredName?: string;
  categories?: string[];
  pieces?: number;
  ean?: string;
  hts?: string;
  normalize?: boolean;
  instructions?: ScreeningInstruction[];
  attributes?: ProductAttribute[];
}

export interface ProductScreeningResponse {
  reference: string;
  code: 1 | 2 | 3; // 1=Accepted, 2=Rejected, 3=Inconclusive
  status: "Accepted" | "Rejected" | "Inconclusive";
  reason?: {
    code: string;
    description: string;
  };
}

// =============================================================================
// Package Screening Types
// =============================================================================

export interface TariffIndicator {
  type: string; // e.g., "SPI", "SPI2"
  value?: string; // e.g., "CL" for Chile Free Trade Act, "S" for USMCA
}

export interface PgaProgram {
  code: string; // e.g., "APL", "DRU"
  [key: string]: unknown; // Additional agency-specific fields
}

export interface PgaDataSet {
  agency: string; // e.g., "FDA", "USDA", "APHIS"
  program: PgaProgram;
}

export interface PackageProductDetails {
  sku: string;
  url: string;
  name: string;
  description: string;
  price: number;
  images: string[]; // base64 encoded
  originCountry: string; // ISO3
  categories?: string[];
  pieces?: number;
  ean?: string;
  hts?: string;
  normalize?: boolean;
  instructions?: ScreeningInstruction[];
  attributes?: ProductAttribute[];
}

export interface PackageProduct {
  quantity: number;
  declaredValue: number;
  declaredName?: string;
  weight?: Weight; // Item weight if applicable
  tariffs?: TariffIndicator[]; // PGA, tariff, or special program indicators
  pga?: PgaDataSet[]; // PGA filing data sets
  product: PackageProductDetails;
}

export interface PackageScreeningRequest {
  externalId: string;
  platformId: string;
  sellerId: string;
  exportCountry: string; // ISO3
  destinationCountry: string; // ISO3
  houseBillNumber: string; // max 12 chars, unique within shipment
  barcode: string;
  invoiceNumber?: string; // max 30 chars
  containerId?: string;
  carrierId?: string; // e.g., "usps", "ups", "fedex", "dhl"
  weight: Weight;
  declaredValue?: number; // Package total declared value in USD
  from: Address;
  to: Address;
  products: PackageProduct[];
}

export interface PackageProductResult {
  reference: string;
  sku: string;
  platformId: string;
  code: 1 | 2 | 3; // 1=Accepted, 2=Rejected, 3=Inconclusive
  status: "Accepted" | "Rejected" | "Inconclusive";
  reason?: {
    code: string;
    description: string;
  };
}

export interface PackageScreeningResponse {
  packageId: string;
  externalId: string;
  code: 1 | 2 | 3 | 4; // 1=Accepted, 2=Rejected, 3=Inconclusive, 4=Audit
  status: "Accepted" | "Rejected" | "Inconclusive" | "Audit";
  labelQrCode?: string;
  products: PackageProductResult[];
}

// =============================================================================
// Package Audit Types
// =============================================================================

export interface PackageAuditRequest {
  packageId?: string;
  externalId?: string;
  images: string[]; // base64 encoded, min 2 per product
  remark?: string; // max 100 chars
}

export interface PackageAuditResponse {
  packageId: string;
  externalId: string;
  code: 1 | 2 | 3; // 1=Passed, 2=Failed, 3=Pending
  status: "Passed" | "Failed" | "Pending";
}

// =============================================================================
// Duty Payment Types
// =============================================================================

export interface DutyPayRequest {
  packageId: string;
  barcode: string;
}

export interface DutyPayResponse {
  packageId: string;
  externalId: string;
  ddpn: string; // Destination Duty Paid Number
  totalDuty: number;
}

// =============================================================================
// Shipment Types
// =============================================================================

export interface TransportationInfo {
  mode: "AIR" | "TRUCK";
  portOfEntry: string;
  portOfOrigin?: string; // Required for AIR mode
  portOfArrival?: string; // If different from portOfEntry (AIR mode)
  portOfLading?: string; // Required for TRUCK mode
  carrierName: string;
  carrierCode: string; // IATA code, 2-characters
  lineNumber: string; // Flight/voyage number, max 14 chars
  shippingDate: string; // YYYY-MM-DD
  scheduledArrivalDate: string; // YYYY-MM-DD
  firmsCode?: string; // Warehouse FIRMS code, max 6 chars
  terminalOperator?: string; // Required for AIR mode
}

export interface ShipmentContainer {
  id: string;
  weight: Weight;
}

export interface ShipmentRegistrationRequest {
  externalId: string;
  masterBill: {
    prefix: string; // max 4 chars
    serialNumber: string; // max 11 chars
  };
  originatorCode?: string; // CBP originator code, max 10 chars
  invoiceNumber?: string; // Shipment invoice number, max 30 chars
  entryType?: "01" | "11" | "86" | "P";
  importer?: ImporterAddress; // If different from consignee
  shipper: ShipmentAddress;
  consignee: ShipmentAddress;
  transportation: TransportationInfo;
  containers?: ShipmentContainer[];
  packageIds: string[];
}

export interface ShipmentRegistrationResponse {
  shipmentId: string;
}

export interface ShipmentVerificationRequest {
  shipmentId: string;
}

export interface ShipmentVerificationResponse {
  shipmentId: string;
  code: 1 | 2; // 1=Accepted, 2=Rejected
  status: "Accepted" | "Rejected";
  reason?: {
    code: string;
    description: string;
  };
  document?: {
    type: "PNG" | "JPEG" | "WEBM";
    content: string; // base64 encoded
  };
}

// =============================================================================
// Error Types
// =============================================================================

export interface SafePackageError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// =============================================================================
// Rejection Reason Codes (v1.23)
// =============================================================================

export type RejectionReasonCode =
  | "RMG" // Transportation security violation
  | "RBT" // Transportation security violation
  | "RDG" // Transportation security violation
  | "RHP" // De-minimis value violation
  | "RIP" // Intellectual property infringement (subcodes: RIC, RIT, RIN)
  | "RCT" // Customs regulations violation (subcodes: RPA, RPW, RPT, RPD, RPS, RPF, RPE, RPL)
  | "RCR" // Customs regulations violation
  | "RBD"; // Bad or incomplete data

export type IntellectualPropertySubcode =
  | "RIC" // Copyright Infringement
  | "RIT" // Trademark Infringement
  | "RIN"; // Patent Infringement

export type ContentViolationSubcode =
  | "RPA" // U.S. Department of Agriculture (USDA) Violation
  | "RPW" // U.S. Fish and Wildlife Service (FWS) Violation
  | "RPT" // U.S. Department of Transportation (DOT) Violation
  | "RPD" // U.S. Food and Drug Administration (FDA) Violation
  | "RPS" // U.S. Consumer Product Safety Commission (CPSC) Violation
  | "RPF" // U.S. Financial Crimes Enforcement Network (FCEN) Violation
  | "RPE" // U.S. Bureau of Alcohol, Tobacco, Firearms and Explosives (ATF) Violation
  | "RPL"; // Forced Labor Violation

// =============================================================================
// API Response Wrapper
// =============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: SafePackageError;
}
