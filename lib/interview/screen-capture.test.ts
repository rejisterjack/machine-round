import { describe, expect, test } from "bun:test";
import {
  computeAverageLuminanceFromImageData,
  estimateBase64DecodedBytes,
  shouldBoostFrameLuminance,
  shouldSampleWhileHidden,
} from "@/lib/interview/screen-capture";
import {
  cloudinaryVideoPosterUrl,
  optimizedCaptureImageUrl,
  optimizedImageUrl,
  optimizedVideoUrl,
} from "@/lib/media/cloudinary-url";

describe("shouldSampleWhileHidden", () => {
  test("returns true so capture continues when the interview tab is backgrounded", () => {
    expect(shouldSampleWhileHidden()).toBe(true);
  });
});

describe("computeAverageLuminanceFromImageData", () => {
  test("returns low luminance for dark pixels", () => {
    const dark = new Uint8ClampedArray([17, 17, 17, 255, 17, 17, 17, 255]);
    expect(computeAverageLuminanceFromImageData(dark)).toBeLessThan(0.2);
  });

  test("returns high luminance for bright pixels", () => {
    const bright = new Uint8ClampedArray([240, 240, 240, 255]);
    expect(computeAverageLuminanceFromImageData(bright)).toBeGreaterThan(0.9);
  });
});

describe("shouldBoostFrameLuminance", () => {
  test("boosts dark frames below threshold", () => {
    expect(shouldBoostFrameLuminance(0.2)).toBe(true);
  });

  test("skips bright frames at or above threshold", () => {
    expect(shouldBoostFrameLuminance(0.35)).toBe(false);
    expect(shouldBoostFrameLuminance(0.9)).toBe(false);
  });
});

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

describe("cloudinaryVideoPosterUrl", () => {
  test("builds a frame grab from a cloudinary video url", () => {
    const url =
      "https://res.cloudinary.com/demo/video/upload/v123/folder/recording.mp4";
    expect(cloudinaryVideoPosterUrl(url, { offsetSeconds: 20 })).toBe(
      "https://res.cloudinary.com/demo/video/upload/so_20,w_1280,h_720,c_fill,q_auto,f_jpg/folder/recording.jpg",
    );
  });
});

describe("optimizedVideoUrl", () => {
  test("inserts delivery transform for cloudinary video", () => {
    const url =
      "https://res.cloudinary.com/demo/video/upload/v123/folder/recording.webm";
    expect(optimizedVideoUrl(url)).toBe(
      "https://res.cloudinary.com/demo/video/upload/q_auto:eco,f_auto/folder/recording.webm",
    );
  });

  test("returns non-cloudinary urls unchanged", () => {
    expect(optimizedVideoUrl("https://example.com/video.webm")).toBe(
      "https://example.com/video.webm",
    );
  });
});
