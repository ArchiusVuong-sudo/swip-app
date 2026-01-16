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

export type Environment = "sandbox" | "production";

// API credentials for each environment
export const ENVIRONMENT_CONFIG = {
  sandbox: {
    baseUrl: "https://sandbox.safepackage.com",
    apiKey: "qmHpZv4dDPBqYOtnMfdv5H3SXAiUYRRCGHsOeDV3paQ1WdqET6RbytnCB0Sa14LR",
  },
  production: {
    baseUrl: "https://api.safepackage.com",
    apiKey: "KYBty0Gp8c9EwGbEvz32OXxYA76NEosvGSYPuqG6KeCKsBfBAxqIEKVDkusjkoXj",
  },
};

export class SafePackageClient {
  private baseUrl: string;
  private apiKey: string;
  private environment: Environment;

  constructor(environment?: Environment, baseUrl?: string, apiKey?: string) {
    // Determine environment
    this.environment = environment || (process.env.NEXT_PUBLIC_SAFEPACKAGE_ENVIRONMENT as Environment) || "sandbox";

    // Get config for the environment
    const envConfig = ENVIRONMENT_CONFIG[this.environment];

    this.baseUrl = baseUrl || envConfig.baseUrl;
    this.apiKey = apiKey || envConfig.apiKey;

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

  getEnvironment(): Environment {
    return this.environment;
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
        console.error(`SafePackage API error [${response.status}] at ${endpoint}:`, JSON.stringify(data, null, 2));
        return {
          success: false,
          error: {
            code: response.status.toString(),
            message: data.message || data.error || response.statusText,
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
    // Log the request payload for debugging (truncate images for readability)
    const debugData = {
      ...data,
      products: data.products.map(p => ({
        ...p,
        product: {
          ...p.product,
          images: p.product.images?.map(img => `[base64: ${img.length} chars]`) || [],
        },
      })),
    };
    console.log("SafePackage screenPackage request:", JSON.stringify(debugData, null, 2));

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

// Client instances for each environment
const clientInstances: Record<Environment, SafePackageClient | null> = {
  sandbox: null,
  production: null,
};

export function getSafePackageClient(environment?: Environment): SafePackageClient {
  const env = environment || "sandbox";
  if (!clientInstances[env]) {
    clientInstances[env] = new SafePackageClient(env);
  }
  return clientInstances[env]!;
}

// Reset client instances (useful for testing)
export function resetSafePackageClients(): void {
  clientInstances.sandbox = null;
  clientInstances.production = null;
}
