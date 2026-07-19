import { describe, expect, test } from "bun:test";
import { estimateBase64DecodedBytes } from "@/lib/interview/screen-capture";
import { optimizedCaptureImageUrl, optimizedImageUrl } from "@/lib/media/cloudinary-url";

describe("estimateBase64DecodedBytes", () => {
  test("decodes unpadded base64 length", () => {
    expect(estimateBase64DecodedBytes("abcd")).toBe(3);
  });

  test("accounts for single padding character", () => {
    expect(estimateBase64DecodedBytes("abc=")).toBe(2);
  });

  test("accounts for double padding characters", () => {
    expect(estimateBase64DecodedBytes("ab==")).toBe(1);
  });
});

describe("optimizedImageUrl", () => {
  const baseUrl =
    "https://res.cloudinary.com/demo/image/upload/v123/folder/frame.webp";

  test("inserts thumbnail transform into cloudinary url", () => {
    expect(optimizedImageUrl(baseUrl, "thumb")).toBe(
      "https://res.cloudinary.com/demo/image/upload/w_256,c_limit,q_auto:eco,f_auto/folder/frame.webp",
    );
  });

  test("inserts detail transform into cloudinary url", () => {
    expect(optimizedImageUrl(baseUrl, "detail")).toContain("w_960,c_limit");
  });

  test("returns non-cloudinary urls unchanged", () => {
    expect(optimizedImageUrl("https://example.com/image.jpg", "thumb")).toBe(
      "https://example.com/image.jpg",
    );
  });

  test("does not duplicate existing transforms", () => {
    const transformed = optimizedImageUrl(baseUrl, "thumb");
    expect(optimizedImageUrl(transformed, "thumb")).toBe(transformed);
  });
});

describe("optimizedCaptureImageUrl", () => {
  const fullUrl =
    "https://res.cloudinary.com/demo/image/upload/v123/folder/frame.webp";

  test("prefers secure url over publicId", () => {
    expect(
      optimizedCaptureImageUrl(
        { url: fullUrl, publicId: "machine-round/user/session/frame" },
        "thumb",
      ),
    ).toContain("w_256,c_limit");
  });

  test("falls back to publicId when url is not http", () => {
    const originalCloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "demo";
    try {
      expect(
        optimizedCaptureImageUrl(
          { url: "", publicId: "folder/frame" },
          "thumb",
        ),
      ).toBe(
        "https://res.cloudinary.com/demo/image/upload/w_256,c_limit,q_auto:eco,f_auto/folder/frame",
      );
    } finally {
      if (originalCloud === undefined) {
        delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      } else {
        process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = originalCloud;
      }
    }
  });
});
