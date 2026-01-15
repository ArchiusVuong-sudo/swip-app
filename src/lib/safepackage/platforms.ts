// Supported e-commerce platforms for SafePackage API

export const SUPPORTED_PLATFORMS = [
  { id: "amazon", url: "amazon.com", category: "Major Marketplace" },
  { id: "ebay", url: "ebay.com", category: "Major Marketplace" },
  { id: "etsy", url: "etsy.com", category: "Major Marketplace" },
  { id: "aliexpress", url: "aliexpress.com", category: "Major Marketplace" },
  { id: "temu", url: "temu.com", category: "Major Marketplace" },
  { id: "shopify", url: "shopify.com", category: "E-commerce Platform" },
  { id: "myshopify", url: "myshopify.com", category: "E-commerce Platform" },
  { id: "aloyoga", url: "aloyoga.com", category: "Apparel & Fashion" },
  { id: "bombas", url: "bombas.com", category: "Apparel & Fashion" },
  { id: "mackweldon", url: "mackweldon.com", category: "Apparel & Fashion" },
  { id: "meundies", url: "meundies.com", category: "Apparel & Fashion" },
  { id: "mizzenandmain", url: "mizzenandmain.com", category: "Apparel & Fashion" },
  { id: "tenthousand", url: "tenthousand.com", category: "Apparel & Fashion" },
  { id: "birdygrey", url: "birdygrey.com", category: "Apparel & Fashion" },
  { id: "fairharborclothing", url: "fairharborclothing.com", category: "Apparel & Fashion" },
  { id: "coolibar", url: "coolibar.com", category: "Outdoor & Lifestyle" },
  { id: "coldwatercreek", url: "coldwatercreek.com", category: "Outdoor & Lifestyle" },
  { id: "popsockets", url: "popsockets.com", category: "Accessories" },
  { id: "whoop", url: "whoop.com", category: "Electronics" },
  { id: "myib", url: "myib.com", category: "Other" },
  { id: "ocgsc", url: "ocgsc.com", category: "Other" },
] as const;

export type PlatformId = (typeof SUPPORTED_PLATFORMS)[number]["id"];

export function getPlatformById(id: string) {
  return SUPPORTED_PLATFORMS.find((p) => p.id === id);
}

export function isPlatformSupported(id: string): boolean {
  return SUPPORTED_PLATFORMS.some((p) => p.id === id);
}

export function getPlatformsByCategory(category: string) {
  return SUPPORTED_PLATFORMS.filter((p) => p.category === category);
}

export const PLATFORM_CATEGORIES = [
  "Major Marketplace",
  "E-commerce Platform",
  "Apparel & Fashion",
  "Outdoor & Lifestyle",
  "Accessories",
  "Electronics",
  "Other",
] as const;
