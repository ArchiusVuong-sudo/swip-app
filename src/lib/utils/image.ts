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
        const base64 = Buffer.from(arrayBuffer).toString("base64");

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
