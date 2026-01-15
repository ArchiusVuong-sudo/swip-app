import type {
  Platform,
  ProductScreeningRequest,
  ProductScreeningResponse,
  PackageScreeningRequest,
  PackageScreeningResponse,
  PackageAuditRequest,
  PackageAuditResponse,
  DutyPayRequest,
  DutyPayResponse,
  ShipmentRegistrationRequest,
  ShipmentRegistrationResponse,
  ShipmentVerificationRequest,
  ShipmentVerificationResponse,
  ApiResponse,
  SafePackageError,
} from "./types";

export class SafePackageClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl || process.env.SAFEPACKAGE_API_URL!;
    this.apiKey = apiKey || process.env.SAFEPACKAGE_API_KEY!;

    if (!this.baseUrl || !this.apiKey) {
      throw new Error("SafePackage API URL and API Key are required");
    }

    // For sandbox environments with expired SSL certificates, disable TLS verification
    // WARNING: Only use this for sandbox/development environments!
    if (this.baseUrl.includes("sandbox") && process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0") {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      console.warn("SafePackage: Disabled TLS verification for sandbox environment");
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          Authorization: `ApiKey ${this.apiKey}`,
          ...options.headers,
        },
      });

      const duration = Date.now() - startTime;
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: response.status.toString(),
            message: data.message || response.statusText,
            details: data,
          },
        };
      }

      return {
        success: true,
        data: data as T,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: error instanceof Error ? error.message : "Network error occurred",
        },
      };
    }
  }

  // =============================================================================
  // Platform Endpoints
  // =============================================================================

  /**
   * Get list of supported e-commerce platforms
   */
  async getPlatforms(): Promise<ApiResponse<Platform[]>> {
    return this.request<Platform[]>("/v1/platform", {
      method: "GET",
    });
  }

  // =============================================================================
  // Product Screening Endpoints
  // =============================================================================

  /**
   * Screen a single product for customs compliance
   */
  async screenProduct(
    data: ProductScreeningRequest
  ): Promise<ApiResponse<ProductScreeningResponse>> {
    return this.request<ProductScreeningResponse>("/v1/product/screen", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // =============================================================================
  // Package Screening Endpoints
  // =============================================================================

  /**
   * Screen a complete package for customs compliance
   */
  async screenPackage(
    data: PackageScreeningRequest
  ): Promise<ApiResponse<PackageScreeningResponse>> {
    return this.request<PackageScreeningResponse>("/v1/package/screen", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Submit audit images for a package
   */
  async submitAudit(
    data: PackageAuditRequest
  ): Promise<ApiResponse<PackageAuditResponse>> {
    return this.request<PackageAuditResponse>("/v1/package/audit", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // =============================================================================
  // Duty Payment Endpoints
  // =============================================================================

  /**
   * Pay customs duties for a package
   */
  async payDuty(data: DutyPayRequest): Promise<ApiResponse<DutyPayResponse>> {
    return this.request<DutyPayResponse>("/v1/duty/pay", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // =============================================================================
  // Shipment Endpoints
  // =============================================================================

  /**
   * Register a shipment (consolidation) containing multiple packages
   */
  async registerShipment(
    data: ShipmentRegistrationRequest
  ): Promise<ApiResponse<ShipmentRegistrationResponse>> {
    return this.request<ShipmentRegistrationResponse>("/v1/shipment/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Verify a shipment and obtain CBP document
   */
  async verifyShipment(
    data: ShipmentVerificationRequest
  ): Promise<ApiResponse<ShipmentVerificationResponse>> {
    return this.request<ShipmentVerificationResponse>("/v1/shipment/verify", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
}

// Singleton instance for server-side usage
let clientInstance: SafePackageClient | null = null;

export function getSafePackageClient(): SafePackageClient {
  if (!clientInstance) {
    clientInstance = new SafePackageClient();
  }
  return clientInstance;
}
