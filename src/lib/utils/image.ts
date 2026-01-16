/**
 * Image utility functions for fetching and converting images to Base64
 */

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if running in browser environment
 */
function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Convert ArrayBuffer to Base64 (works in both browser and Node.js)
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  if (isBrowser()) {
    // Browser: use btoa
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } else {
    // Node.js: use Buffer
    return Buffer.from(buffer).toString("base64");
  }
}

/**
 * Fetch an image from a URL and convert it to Base64 with retry logic
 * @param url - The URL of the image to fetch
 * @param options - Retry options
 * @returns Base64 encoded image string or null if fetch fails
 */
export async function fetchImageAsBase64(
  url: string,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    timeoutMs?: number;
  } = {}
): Promise<string | null> {
  const { maxRetries = 3, initialDelayMs = 1000, timeoutMs = 30000 } = options;

  // Skip if already base64
  if (url.startsWith("data:image")) {
    return url.split(",")[1] || url;
  }

  // Skip empty URLs
  if (!url || url.trim() === "") {
    return null;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Exponential backoff delay (skip for first attempt)
      if (attempt > 0) {
        const delay = initialDelayMs * Math.pow(2, attempt - 1);
        console.log(`Retry ${attempt}/${maxRetries} for ${url} after ${delay}ms`);
        await sleep(delay);
      }

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          headers: {
            Accept: "image/*",
            "User-Agent": "SWIP-SafePackage/1.0",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Don't retry on 4xx client errors (except 429 rate limit)
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            console.error(`Client error fetching image from ${url}: ${response.status}`);
            return null;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get("content-type");
        if (!contentType?.startsWith("image/")) {
          console.error(`Invalid content type for ${url}: ${contentType}`);
          return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuffer);

        return base64;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      lastError = error as Error;

      // Don't retry on abort (timeout)
      if ((error as Error).name === "AbortError") {
        console.error(`Timeout fetching image from ${url} after ${timeoutMs}ms`);
        // Continue to retry on timeout
      }
    }
  }

  console.error(
    `Failed to fetch image from ${url} after ${maxRetries} attempts:`,
    lastError
  );
  return null;
}

/**
 * Fetch multiple images and convert them to Base64
 * @param urls - Array of image URLs
 * @returns Array of Base64 encoded images (nulls filtered out)
 */
export async function fetchImagesAsBase64(urls: string[]): Promise<string[]> {
  const results = await Promise.all(
    urls.map((url) => fetchImageAsBase64(url))
  );
  return results.filter((img): img is string => img !== null);
}

/**
 * Parse image URLs from a CSV field (comma-separated or single URL)
 * @param imageField - The image field from CSV (could be URL, base64, or comma-separated)
 * @returns Array of image strings
 */
export function parseImageField(imageField: string | undefined): string[] {
  if (!imageField || imageField.trim() === "") {
    return [];
  }

  // If it's a base64 string, return as-is
  if (imageField.startsWith("data:image") || !imageField.includes("http")) {
    return [imageField];
  }

  // Split by comma for multiple URLs
  return imageField
    .split(",")
    .map((url) => url.trim())
    .filter((url) => url.length > 0);
}

/**
 * Process image fields from CSV row - fetch URLs and convert to Base64
 * @param imageUrls - Array of image URLs or base64 strings
 * @returns Array of Base64 encoded images
 */
export async function processProductImages(
  imageUrls: string[]
): Promise<string[]> {
  const results: string[] = [];

  for (const imageUrl of imageUrls) {
    if (!imageUrl || imageUrl.trim() === "") {
      continue;
    }

    // Already base64 - validate it looks like actual base64 data
    if (
      !imageUrl.startsWith("http://") &&
      !imageUrl.startsWith("https://")
    ) {
      // Skip placeholder text or invalid base64
      if (
        imageUrl.includes("INSERT") ||
        imageUrl.includes("BASE64") ||
        imageUrl.includes("HERE") ||
        imageUrl.length < 100 // Real base64 images are much longer
      ) {
        continue;
      }
      results.push(imageUrl);
      continue;
    }

    // Fetch and convert
    const base64 = await fetchImageAsBase64(imageUrl);
    if (base64) {
      results.push(base64);
    }
  }

  return results;
}

/**
 * Check if a string is a URL
 */
function isUrl(str: string): boolean {
  return str.startsWith("http://") || str.startsWith("https://");
}

/**
 * Process a single API payload to convert image URLs to base64
 * @param payload - The package screening request payload
 * @param onProgress - Optional callback for progress updates
 * @returns The payload with images converted to base64
 */
export async function processPayloadImages<T extends { products: Array<{ product: { images?: string[] } }> }>(
  payload: T,
  onProgress?: (message: string) => void
): Promise<T> {
  const processedPayload = JSON.parse(JSON.stringify(payload)) as T;

  for (const packageProduct of processedPayload.products) {
    if (!packageProduct.product.images || packageProduct.product.images.length === 0) {
      continue;
    }

    const processedImages: string[] = [];

    for (const image of packageProduct.product.images) {
      if (!image || image.trim() === "") {
        continue;
      }

      if (isUrl(image)) {
        onProgress?.(`Fetching image from ${image.substring(0, 50)}...`);
        const base64 = await fetchImageAsBase64(image, {
          maxRetries: 2,
          timeoutMs: 15000,
        });
        if (base64) {
          processedImages.push(base64);
        }
      } else if (image.length > 100) {
        // Already base64 and looks valid
        processedImages.push(image);
      }
    }

    packageProduct.product.images = processedImages;
  }

  return processedPayload;
}

/**
 * Process multiple API payloads to convert image URLs to base64
 * @param payloads - Array of package screening request payloads
 * @param onProgress - Optional callback for progress updates (index, total, message)
 * @returns Array of payloads with images converted to base64
 */
export async function processPayloadsWithImages<T extends { products: Array<{ product: { images?: string[] } }> }>(
  payloads: T[],
  onProgress?: (index: number, total: number, message: string) => void
): Promise<T[]> {
  const processedPayloads: T[] = [];

  for (let i = 0; i < payloads.length; i++) {
    onProgress?.(i + 1, payloads.length, `Processing package ${i + 1} of ${payloads.length}...`);

    const processed = await processPayloadImages(payloads[i], (msg) => {
      onProgress?.(i + 1, payloads.length, msg);
    });

    processedPayloads.push(processed);
  }

  return processedPayloads;
}
