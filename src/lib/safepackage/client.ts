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
  PackageTrackingResponse,
  ShipmentTrackingResponse,
  ApiResponse,
  SafePackageError,
} from "./types";

export type Environment = "sandbox" | "production";

// API configuration for each environment
// Keys are loaded from environment variables - API keys should NOT be hardcoded
export const ENVIRONMENT_CONFIG = {
  sandbox: {
    baseUrl: "https://sandbox.safepackage.com",
  },
  production: {
    baseUrl: "https://api.safepackage.com",
  },
};

/**
 * Get the API key for a given environment
 * Priority: user-provided key > environment variable
 */
export function getApiKey(environment: Environment, userApiKey?: string): string {
  // User-provided key takes priority
  if (userApiKey) {
    return userApiKey;
  }

  // Fall back to environment variables
  if (environment === "sandbox") {
    return process.env.SAFEPACKAGE_SANDBOX_API_KEY || "";
  }
  return process.env.SAFEPACKAGE_PRODUCTION_API_KEY || "";
}

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
    // Use provided apiKey, or fall back to environment variable
    this.apiKey = apiKey || getApiKey(this.environment);

    if (!this.baseUrl || !this.apiKey) {
      throw new Error(`SafePackage API URL and API Key are required for ${this.environment} environment. Please configure SAFEPACKAGE_${this.environment.toUpperCase()}_API_KEY environment variable.`);
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

  // =============================================================================
  // Tracking Endpoints (v1.17 Supplement)
  // =============================================================================

  /**
   * Get tracking events for a package
   * @param packageId - SafePackage package identifier (optional if externalId provided)
   * @param externalId - External package identifier (required if packageId not provided)
   * @param format - Additional tracking data format (optional)
   */
  async getPackageTracking(
    packageId?: string,
    externalId?: string,
    format?: string
  ): Promise<ApiResponse<PackageTrackingResponse>> {
    const params = new URLSearchParams();
    if (externalId) params.append("externalId", externalId);
    if (format) params.append("format", format);

    const queryString = params.toString();
    const path = packageId
      ? `/v1/tracking/package/${packageId}${queryString ? `?${queryString}` : ""}`
      : `/v1/tracking/package${queryString ? `?${queryString}` : ""}`;

    return this.request<PackageTrackingResponse>(path, {
      method: "GET",
    });
  }

  /**
   * Get tracking events for a shipment
   * @param shipmentId - SafePackage shipment identifier (optional if externalId provided)
   * @param externalId - External shipment identifier (required if shipmentId not provided)
   * @param format - Additional tracking data format (optional)
   */
  async getShipmentTracking(
    shipmentId?: string,
    externalId?: string,
    format?: string
  ): Promise<ApiResponse<ShipmentTrackingResponse>> {
    const params = new URLSearchParams();
    if (externalId) params.append("externalId", externalId);
    if (format) params.append("format", format);

    const queryString = params.toString();
    const path = shipmentId
      ? `/v1/tracking/shipment/${shipmentId}${queryString ? `?${queryString}` : ""}`
      : `/v1/tracking/shipment${queryString ? `?${queryString}` : ""}`;

    return this.request<ShipmentTrackingResponse>(path, {
      method: "GET",
    });
  }
}

// Client instances cache - keyed by environment + apiKey hash
const clientInstances: Map<string, SafePackageClient> = new Map();

function getClientKey(environment: Environment, apiKey?: string): string {
  // Use a simple hash to differentiate user-provided keys
  const keyHash = apiKey ? apiKey.substring(0, 8) : "default";
  return `${environment}:${keyHash}`;
}

/**
 * Get or create a SafePackage client for the given environment
 * @param environment - The environment to use (sandbox or production)
 * @param userApiKey - Optional user-provided API key (takes priority over env vars)
 */
export function getSafePackageClient(environment?: Environment, userApiKey?: string): SafePackageClient {
  const env = environment || "sandbox";
  const clientKey = getClientKey(env, userApiKey);

  if (!clientInstances.has(clientKey)) {
    clientInstances.set(clientKey, new SafePackageClient(env, undefined, userApiKey));
  }
  return clientInstances.get(clientKey)!;
}

// Reset client instances (useful for testing or when API keys change)
export function resetSafePackageClients(): void {
  clientInstances.clear();
}
