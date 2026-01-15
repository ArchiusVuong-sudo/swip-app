// SafePackage API Types

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

export interface BusinessIdentifier {
  type: "DUNS" | "GLN" | "LEI";
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
  name: string;
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

export interface PackageProduct {
  quantity: number;
  unit?: string;
  declaredValue: number;
  declaredName?: string;
  product: {
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
  };
}

export interface PackageScreeningRequest {
  externalId: string;
  platformId: string;
  sellerId: string;
  exportCountry: string; // ISO3
  destinationCountry: string; // ISO3
  houseBillNumber: string;
  barcode: string;
  containerId?: string;
  carrierId?: string;
  weight: Weight;
  from: Address;
  to: Address;
  products: PackageProduct[];
  instructions?: ScreeningInstruction[];
}

export interface PackageProductResult {
  reference: string;
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
  portOfOrigin: string;
  portOfArrival?: string;
  carrierName: string;
  carrierCode: string; // IATA code
  lineNumber: string;
  shippingDate: string; // YYYY-MM-DD
  scheduledArrivalDate: string; // YYYY-MM-DD
  originatorCode?: string;
  entryType?: "01" | "11" | "86" | "P";
  firmsCode?: string;
  terminalOperator?: string;
}

export interface ShipmentRegistrationRequest {
  externalId: string;
  masterBill: {
    prefix: string;
    serialNumber: string;
  };
  originatorCode?: string;
  entryType?: "01" | "11" | "86" | "P";
  shipper: ShipmentAddress;
  consignee: ShipmentAddress;
  transportation: TransportationInfo;
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
// Rejection Reason Codes
// =============================================================================

export type RejectionReasonCode =
  | "RMG" // Missing or mismatched product images
  | "RBT" // Below threshold
  | "RDG" // Dangerous goods
  | "RHP" // High-risk product
  | "RIP" // Invalid product (subcodes: RIC, RIT, RIN)
  | "RCT" // Content violation (subcodes: RPA, RPW, RPT, RPD, RPS, RPF, RPE, RPL)
  | "RCR" // Compliance review required
  | "RBD"; // Blacklisted destination

export type ContentViolationSubcode =
  | "RPA" // USDA violation
  | "RPW" // FWS violation
  | "RPT" // DOT violation
  | "RPD" // FDA violation
  | "RPS" // CPSC violation
  | "RPF" // FCEN violation
  | "RPE" // ATF violation
  | "RPL"; // Forced Labor violation

// =============================================================================
// API Response Wrapper
// =============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: SafePackageError;
}
