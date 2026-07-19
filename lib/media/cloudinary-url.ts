const TRANSFORMS = {
  thumb: "w_256,c_limit,q_auto:eco,f_auto",
  detail: "w_960,c_limit,q_auto:eco,f_auto",
} as const;

export type CloudinaryImageVariant = keyof typeof TRANSFORMS;

export type CloudinaryCaptureSource = {
  url: string;
  publicId?: string;
};

function resolveCloudinaryUrl(publicIdOrUrl: string): string {
  if (publicIdOrUrl.startsWith("http")) {
    return publicIdOrUrl;
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  if (!cloudName) {
    return publicIdOrUrl;
  }

  return `https://res.cloudinary.com/${cloudName}/image/upload/${publicIdOrUrl}`;
}

export function optimizedImageUrl(
  publicIdOrUrl: string,
  variant: CloudinaryImageVariant = "thumb",
): string {
  const url = resolveCloudinaryUrl(publicIdOrUrl);

  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url;
  }

  const transform = TRANSFORMS[variant];
  const uploadMarker = "/upload/";
  const uploadIndex = url.indexOf(uploadMarker);
  if (uploadIndex === -1) {
    return url;
  }

  const prefix = url.slice(0, uploadIndex + uploadMarker.length);
  const suffix = url.slice(uploadIndex + uploadMarker.length).replace(/^v\d+\//, "");

  if (suffix.startsWith(transform)) {
    return url;
  }

  return `${prefix}${transform}/${suffix}`;
}

/** Prefer stored secure URL; publicId is only a fallback when url is missing. */
export function optimizedCaptureImageUrl(
  capture: CloudinaryCaptureSource,
  variant: CloudinaryImageVariant = "thumb",
): string {
  const source =
    capture.url.startsWith("http") ? capture.url : (capture.publicId ?? capture.url);
  return optimizedImageUrl(source, variant);
}

const VIDEO_TRANSFORMS = "q_auto:eco,f_auto";

export function optimizedVideoUrl(url: string): string {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url;
  }

  const uploadMarker = "/upload/";
  const uploadIndex = url.indexOf(uploadMarker);
  if (uploadIndex === -1) {
    return url;
  }

  const prefix = url.slice(0, uploadIndex + uploadMarker.length);
  const suffix = url.slice(uploadIndex + uploadMarker.length).replace(/^v\d+\//, "");

  if (suffix.startsWith(VIDEO_TRANSFORMS)) {
    return url;
  }

  const resourceType = url.includes("/video/upload/") ? "video" : "image";
  if (resourceType !== "video") {
    return url;
  }

  return `${prefix}${VIDEO_TRANSFORMS}/${suffix}`;
}
