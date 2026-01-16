import { describe, it, expect } from "vitest";
import {
  sanitizePhone,
  sanitizePostalCode,
  sanitizeHsCode,
  sanitizeCountryCode,
  packageRowSchema,
  addressSchema,
  productSchema,
} from "./schemas";

// =============================================================================
// Sanitization Functions Tests
// =============================================================================

describe("sanitizePhone", () => {
  it("returns null for null/undefined input", () => {
    expect(sanitizePhone(null)).toBeNull();
    expect(sanitizePhone(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(sanitizePhone("")).toBeNull();
  });

  it("removes + and parentheses", () => {
    expect(sanitizePhone("+1(555)123-4567")).toBe("1555123-4567");
  });

  it("removes spaces", () => {
    expect(sanitizePhone("555 123 4567")).toBe("5551234567");
  });

  it("preserves digits and hyphens", () => {
    expect(sanitizePhone("555-123-4567")).toBe("555-123-4567");
  });
});

describe("sanitizePostalCode", () => {
  it("returns null for null/undefined input", () => {
    expect(sanitizePostalCode(null)).toBeNull();
    expect(sanitizePostalCode(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(sanitizePostalCode("")).toBeNull();
  });

  it("removes hyphens", () => {
    expect(sanitizePostalCode("12345-6789")).toBe("123456789");
  });

  it("removes spaces", () => {
    expect(sanitizePostalCode("A1B 2C3")).toBe("A1B2C3");
  });

  it("preserves alphanumeric characters", () => {
    expect(sanitizePostalCode("SW1A1AA")).toBe("SW1A1AA");
  });
});

describe("sanitizeHsCode", () => {
  it("returns null for null/undefined input", () => {
    expect(sanitizeHsCode(null)).toBeNull();
    expect(sanitizeHsCode(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(sanitizeHsCode("")).toBeNull();
  });

  it("removes periods", () => {
    expect(sanitizeHsCode("8471.30.01")).toBe("84713001");
  });

  it("removes dashes", () => {
    expect(sanitizeHsCode("8471-30-01")).toBe("84713001");
  });

  it("preserves only digits", () => {
    expect(sanitizeHsCode("847130")).toBe("847130");
  });
});

describe("sanitizeCountryCode", () => {
  it("returns null for null/undefined input", () => {
    expect(sanitizeCountryCode(null)).toBeNull();
    expect(sanitizeCountryCode(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(sanitizeCountryCode("")).toBeNull();
  });

  it("converts to uppercase", () => {
    expect(sanitizeCountryCode("usa")).toBe("USA");
  });

  it("trims whitespace", () => {
    expect(sanitizeCountryCode("  CHN  ")).toBe("CHN");
  });
});

// =============================================================================
// Address Schema Tests
// =============================================================================

describe("addressSchema", () => {
  const validAddress = {
    name: "John Doe",
    line1: "123 Main St",
    city: "New York",
    state: "NY",
    postalCode: "10001",
    country: "USA",
  };

  it("validates a valid address", () => {
    const result = addressSchema.safeParse(validAddress);
    expect(result.success).toBe(true);
  });

  it("requires name", () => {
    const result = addressSchema.safeParse({ ...validAddress, name: "" });
    expect(result.success).toBe(false);
  });

  it("enforces 50 char max on name", () => {
    const result = addressSchema.safeParse({
      ...validAddress,
      name: "a".repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it("requires line1", () => {
    const result = addressSchema.safeParse({ ...validAddress, line1: "" });
    expect(result.success).toBe(false);
  });

  it("allows optional line2", () => {
    const result = addressSchema.safeParse({
      ...validAddress,
      line2: "Apt 4B",
    });
    expect(result.success).toBe(true);
  });

  it("validates country as 3-letter ISO code", () => {
    const result = addressSchema.safeParse({ ...validAddress, country: "US" });
    expect(result.success).toBe(false);
  });

  it("requires alphanumeric postal code", () => {
    const result = addressSchema.safeParse({
      ...validAddress,
      postalCode: "10001-5678",
    });
    expect(result.success).toBe(false);
  });

  it("requires postal code (min 1 char)", () => {
    const result = addressSchema.safeParse({
      ...validAddress,
      postalCode: "",
    });
    expect(result.success).toBe(false);
  });

  it("enforces 12 char max on postal code", () => {
    const result = addressSchema.safeParse({
      ...validAddress,
      postalCode: "A".repeat(13),
    });
    expect(result.success).toBe(false);
  });

  it("accepts postal code at max length (12 chars)", () => {
    const result = addressSchema.safeParse({
      ...validAddress,
      postalCode: "A".repeat(12),
    });
    expect(result.success).toBe(true);
  });

  it("validates phone format", () => {
    const result = addressSchema.safeParse({
      ...validAddress,
      phone: "+1(555)123-4567",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid phone with digits and hyphens", () => {
    const result = addressSchema.safeParse({
      ...validAddress,
      phone: "555-123-4567",
    });
    expect(result.success).toBe(true);
  });

  it("validates email format", () => {
    const result = addressSchema.safeParse({
      ...validAddress,
      email: "invalid-email",
    });
    expect(result.success).toBe(false);
  });

  it("enforces 35 char max on email", () => {
    const result = addressSchema.safeParse({
      ...validAddress,
      email: "a".repeat(30) + "@test.com",
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// Product Schema Tests
// =============================================================================

describe("productSchema", () => {
  const validProduct = {
    sku: "SKU123",
    platformId: "amazon",
    sellerId: "SELLER001",
    url: "https://amazon.com/product/123",
    name: "Test Product",
    description: "A test product description",
    price: 29.99,
    originCountry: "CHN",
  };

  it("validates a valid product", () => {
    const result = productSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
  });

  it("requires sku", () => {
    const result = productSchema.safeParse({ ...validProduct, sku: "" });
    expect(result.success).toBe(false);
  });

  it("requires valid platform ID", () => {
    const result = productSchema.safeParse({
      ...validProduct,
      platformId: "invalid-platform",
    });
    expect(result.success).toBe(false);
  });

  it("accepts supported platform IDs", () => {
    const platforms = ["amazon", "ebay", "etsy", "aliexpress", "temu", "shopify"];
    platforms.forEach((platformId) => {
      const result = productSchema.safeParse({ ...validProduct, platformId });
      expect(result.success).toBe(true);
    });
  });

  it("requires valid URL format", () => {
    const result = productSchema.safeParse({
      ...validProduct,
      url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("requires positive price", () => {
    const result = productSchema.safeParse({ ...validProduct, price: -10 });
    expect(result.success).toBe(false);
  });

  it("requires price to be positive (not zero)", () => {
    const result = productSchema.safeParse({ ...validProduct, price: 0 });
    expect(result.success).toBe(false);
  });

  it("validates origin country as 3-letter ISO code", () => {
    const result = productSchema.safeParse({
      ...validProduct,
      originCountry: "CN",
    });
    expect(result.success).toBe(false);
  });

  it("validates HS code format (6-10 digits)", () => {
    const result = productSchema.safeParse({
      ...validProduct,
      hsCode: "8471.30",
    });
    expect(result.success).toBe(false);

    const validResult = productSchema.safeParse({
      ...validProduct,
      hsCode: "847130",
    });
    expect(validResult.success).toBe(true);
  });

  it("defaults pieces to 1", () => {
    const result = productSchema.parse(validProduct);
    expect(result.pieces).toBe(1);
  });

  it("defaults normalize to false", () => {
    const result = productSchema.parse(validProduct);
    expect(result.normalize).toBe(false);
  });
});

// =============================================================================
// Package Row Schema Tests
// =============================================================================

describe("packageRowSchema", () => {
  const validPackageRow = {
    externalId: "EXT001",
    houseBillNumber: "HB123456",
    barcode: "BC123456789",
    platformId: "amazon",
    sellerId: "SELLER001",
    exportCountry: "CHN",
    destinationCountry: "USA",
    weightValue: 1.5,
    weightUnit: "K" as const,
    shipperName: "Test Shipper",
    shipperLine1: "123 Shipper St",
    shipperCity: "Shanghai",
    shipperState: "SH",
    shipperPostalCode: "200000",
    shipperCountry: "CHN",
    consigneeName: "Test Consignee",
    consigneeLine1: "456 Consignee Ave",
    consigneeCity: "New York",
    consigneeState: "NY",
    consigneePostalCode: "10001",
    consigneeCountry: "USA",
    productSku: "SKU123",
    productName: "Test Product",
    productDescription: "A test product description",
    productUrl: "https://amazon.com/product/123",
    productQuantity: 2,
    declaredValue: 29.99,
    listPrice: 39.99,
    originCountry: "CHN",
  };

  it("validates a valid package row", () => {
    const result = packageRowSchema.safeParse(validPackageRow);
    expect(result.success).toBe(true);
  });

  describe("Order Identifiers", () => {
    it("requires externalId", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        externalId: "",
      });
      expect(result.success).toBe(false);
    });

    it("requires houseBillNumber", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        houseBillNumber: "",
      });
      expect(result.success).toBe(false);
    });

    it("enforces 12 char max on houseBillNumber", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        houseBillNumber: "1234567890123",
      });
      expect(result.success).toBe(false);
    });

    it("requires barcode", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        barcode: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Platform Validation", () => {
    it("validates platform ID case-insensitively", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        platformId: "AMAZON",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid platform ID", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        platformId: "invalid-platform",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Carrier Validation", () => {
    it("accepts valid carrier IDs", () => {
      const carriers = ["usps", "fedex", "ups", "dhl"];
      carriers.forEach((carrierId) => {
        const result = packageRowSchema.safeParse({
          ...validPackageRow,
          carrierId,
        });
        expect(result.success).toBe(true);
      });
    });

    it("rejects invalid carrier ID", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        carrierId: "invalid-carrier",
      });
      expect(result.success).toBe(false);
    });

    it("allows null carrier ID", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        carrierId: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("Weight Validation", () => {
    it("requires positive weight", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        weightValue: -1,
      });
      expect(result.success).toBe(false);
    });

    it("requires weight unit to be K or L", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        weightUnit: "G",
      });
      expect(result.success).toBe(false);
    });

    it("accepts K for kilograms", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        weightUnit: "K",
      });
      expect(result.success).toBe(true);
    });

    it("accepts L for pounds", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        weightUnit: "L",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("Address Validation", () => {
    it("validates shipper postal code as alphanumeric", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        shipperPostalCode: "200-000",
      });
      expect(result.success).toBe(false);
    });

    it("validates consignee postal code as alphanumeric", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        consigneePostalCode: "10001-5678",
      });
      expect(result.success).toBe(false);
    });

    it("enforces 12 char max on shipper postal code", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        shipperPostalCode: "A".repeat(13),
      });
      expect(result.success).toBe(false);
    });

    it("accepts shipper postal code at max length (12 chars)", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        shipperPostalCode: "A".repeat(12),
      });
      expect(result.success).toBe(true);
    });

    it("enforces 12 char max on consignee postal code", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        consigneePostalCode: "A".repeat(13),
      });
      expect(result.success).toBe(false);
    });

    it("accepts consignee postal code at max length (12 chars)", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        consigneePostalCode: "A".repeat(12),
      });
      expect(result.success).toBe(true);
    });

    it("validates shipper phone format", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        shipperPhone: "+86(21)12345678",
      });
      expect(result.success).toBe(false);
    });

    it("validates consignee phone format", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        consigneePhone: "+1(555)123-4567",
      });
      expect(result.success).toBe(false);
    });

    it("validates country codes as ISO3", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        shipperCountry: "CN",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Product Validation", () => {
    it("requires positive product quantity", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        productQuantity: 0,
      });
      expect(result.success).toBe(false);
    });

    it("requires integer product quantity", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        productQuantity: 1.5,
      });
      expect(result.success).toBe(false);
    });

    it("requires valid product URL", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        productUrl: "not-a-url",
      });
      expect(result.success).toBe(false);
    });

    it("enforces 300 char max on product name", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        productName: "a".repeat(301),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Pricing Validation", () => {
    it("requires positive declared value", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        declaredValue: 0,
      });
      expect(result.success).toBe(false);
    });

    it("requires positive list price", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        listPrice: -10,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("HS Code Validation", () => {
    it("validates HS code as 6-10 digits only", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        hsCode: "8471.30.01",
      });
      expect(result.success).toBe(false);
    });

    it("accepts valid 6-digit HS code", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        hsCode: "847130",
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid 10-digit HS code", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        hsCode: "8471300100",
      });
      expect(result.success).toBe(true);
    });

    it("rejects 5-digit HS code", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        hsCode: "84713",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Shipment Details", () => {
    it("validates entry type", () => {
      const validTypes = ["01", "11", "86", "P"];
      validTypes.forEach((entryType) => {
        const result = packageRowSchema.safeParse({
          ...validPackageRow,
          entryType,
        });
        expect(result.success).toBe(true);
      });
    });

    it("rejects invalid entry type", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        entryType: "99",
      });
      expect(result.success).toBe(false);
    });

    it("validates transport mode", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        transportMode: "AIR",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid transport mode", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        transportMode: "SEA",
      });
      expect(result.success).toBe(false);
    });

    it("validates date format for shipping date", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        shippingDate: "01/15/2024",
      });
      expect(result.success).toBe(false);
    });

    it("accepts valid YYYY-MM-DD format", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        shippingDate: "2024-01-15",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("Platform/URL Domain Matching", () => {
    it("validates product URL matches platform domain", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        platformId: "amazon",
        productUrl: "https://ebay.com/product/123",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const urlError = result.error.issues.find(
          (i) => i.path.includes("productUrl")
        );
        expect(urlError?.message).toContain("domain must match");
      }
    });

    it("accepts matching platform and URL domain", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        platformId: "amazon",
        productUrl: "https://www.amazon.com/product/123",
      });
      expect(result.success).toBe(true);
    });

    it("validates eBay platform with eBay URL", () => {
      const result = packageRowSchema.safeParse({
        ...validPackageRow,
        platformId: "ebay",
        productUrl: "https://www.ebay.com/itm/123456",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("Default Values", () => {
    it("defaults pieces to 1", () => {
      const result = packageRowSchema.parse(validPackageRow);
      expect(result.pieces).toBe(1);
    });

    it("defaults normalize to false", () => {
      const result = packageRowSchema.parse(validPackageRow);
      expect(result.normalize).toBe(false);
    });
  });
});
