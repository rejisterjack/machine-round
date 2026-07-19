import {
  ANALYSIS_MAX_BASE64_CHARS,
  ARCHIVE_MAX_BASE64_CHARS,
} from "@/lib/media/media-optimization";

/** @deprecated Use ANALYSIS_MAX_BASE64_CHARS or ARCHIVE_MAX_BASE64_CHARS. */
export const MAX_IMAGE_BASE64_CHARS = ANALYSIS_MAX_BASE64_CHARS;

export function assertAnalysisImageWithinLimit(
  base64: string,
  label = "imageBase64",
) {
  if (base64.length > ANALYSIS_MAX_BASE64_CHARS) {
    throw new Error(`${label} exceeds maximum allowed size.`);
  }
}

export function isAnalysisImageWithinLimit(base64: string) {
  return base64.length <= ANALYSIS_MAX_BASE64_CHARS;
}

export function assertArchiveImageWithinLimit(
  base64: string,
  label = "imageBase64",
) {
  if (base64.length > ARCHIVE_MAX_BASE64_CHARS) {
    throw new Error(`${label} exceeds maximum allowed size.`);
  }
}

export function isArchiveImageWithinLimit(base64: string) {
  return base64.length <= ARCHIVE_MAX_BASE64_CHARS;
}

/** @deprecated Use isAnalysisImageWithinLimit or isArchiveImageWithinLimit. */
export function assertImageBase64WithinLimit(base64: string, label = "imageBase64") {
  assertAnalysisImageWithinLimit(base64, label);
}

/** @deprecated Use isAnalysisImageWithinLimit or isArchiveImageWithinLimit. */
export function isImageBase64WithinLimit(base64: string) {
  return isAnalysisImageWithinLimit(base64);
}
