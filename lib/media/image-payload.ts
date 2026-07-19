/** ~1.5 MB decoded JPEG cap (base64 expands ~4/3). */
export const MAX_IMAGE_BASE64_CHARS = 2_000_000;

export function assertImageBase64WithinLimit(base64: string, label = "imageBase64") {
  if (base64.length > MAX_IMAGE_BASE64_CHARS) {
    throw new Error(`${label} exceeds maximum allowed size.`);
  }
}

export function isImageBase64WithinLimit(base64: string) {
  return base64.length <= MAX_IMAGE_BASE64_CHARS;
}
