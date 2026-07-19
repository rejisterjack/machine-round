import { v2 as cloudinary } from "cloudinary";

export type CloudinaryUploadResult = {
  url: string;
  publicId: string;
  bytes?: number;
  duration?: number;
};

function configureCloudinary() {
  const url = process.env.CLOUDINARY_URL?.trim();
  if (url) {
    cloudinary.config({ secure: true });
    return;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET.",
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_URL?.trim() ||
      (process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
        process.env.CLOUDINARY_API_KEY?.trim() &&
        process.env.CLOUDINARY_API_SECRET?.trim()),
  );
}

export function buildMediaFolder(userId: string, sessionId: string) {
  return `machine-round/${userId}/${sessionId}`;
}

export type UploadImageOptions = {
  mimeType?: string;
  publicId?: string;
};

export async function uploadImage(
  base64: string,
  folder: string,
  options: UploadImageOptions = {},
): Promise<CloudinaryUploadResult> {
  configureCloudinary();

  const mimeType = options.mimeType ?? "image/jpeg";
  const result = await cloudinary.uploader.upload(
    `data:${mimeType};base64,${base64}`,
    {
      folder,
      public_id: options.publicId,
      resource_type: "image",
      overwrite: true,
    },
  );

  return {
    url: result.secure_url,
    publicId: result.public_id,
    bytes: result.bytes,
  };
}

export async function uploadVideo(
  buffer: Buffer,
  folder: string,
  publicId?: string,
): Promise<CloudinaryUploadResult> {
  configureCloudinary();

  const result = await new Promise<{
    secure_url: string;
    public_id: string;
    bytes?: number;
    duration?: number;
  }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: "video",
        overwrite: true,
      },
      (error, uploadResult) => {
        if (error || !uploadResult) {
          reject(error ?? new Error("Cloudinary video upload failed."));
          return;
        }
        resolve(uploadResult);
      },
    );
    stream.end(buffer);
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    bytes: result.bytes,
    duration: result.duration,
  };
}

export async function deleteAsset(
  publicId: string,
  resourceType: "image" | "video" = "image",
) {
  configureCloudinary();
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

export type CloudinaryResourceSummary = {
  publicId: string;
  resourceType: "image" | "video";
};

export async function listResourcesByPrefix(
  prefix: string,
  resourceType: "image" | "video",
): Promise<CloudinaryResourceSummary[]> {
  configureCloudinary();

  const resources: CloudinaryResourceSummary[] = [];
  let nextCursor: string | undefined;

  do {
    const page = await cloudinary.api.resources({
      type: "upload",
      resource_type: resourceType,
      prefix,
      max_results: 500,
      next_cursor: nextCursor,
    });

    for (const resource of page.resources ?? []) {
      resources.push({
        publicId: resource.public_id,
        resourceType,
      });
    }

    nextCursor = page.next_cursor;
  } while (nextCursor);

  return resources;
}
