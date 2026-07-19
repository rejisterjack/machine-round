import { describe, expect, test } from "bun:test";
import {
  isAuthConfigured,
  isCloudinaryConfigured,
  isRealtimeConfigured,
} from "@/lib/ops/readiness";

describe("readiness helpers", () => {
  test("isAuthConfigured is false without secrets", () => {
    const secret = process.env.AUTH_SECRET;
    const googleId = process.env.AUTH_GOOGLE_ID;
    const googleSecret = process.env.AUTH_GOOGLE_SECRET;
    delete process.env.AUTH_SECRET;
    delete process.env.AUTH_GOOGLE_ID;
    delete process.env.AUTH_GOOGLE_SECRET;
    expect(isAuthConfigured()).toBe(false);
    if (secret) process.env.AUTH_SECRET = secret;
    if (googleId) process.env.AUTH_GOOGLE_ID = googleId;
    if (googleSecret) process.env.AUTH_GOOGLE_SECRET = googleSecret;
  });

  test("isCloudinaryConfigured reads CLOUDINARY_URL", () => {
    const previous = process.env.CLOUDINARY_URL;
    process.env.CLOUDINARY_URL = "cloudinary://key:secret@cloud";
    expect(isCloudinaryConfigured()).toBe(true);
    if (previous === undefined) {
      delete process.env.CLOUDINARY_URL;
    } else {
      process.env.CLOUDINARY_URL = previous;
    }
  });

  test("isRealtimeConfigured requires deployment", () => {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const key = process.env.AZURE_OPENAI_API_KEY;
    const deployment = process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT;
    delete process.env.AZURE_OPENAI_ENDPOINT;
    delete process.env.AZURE_OPENAI_API_KEY;
    delete process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT;
    expect(isRealtimeConfigured()).toBe(false);
    if (endpoint) process.env.AZURE_OPENAI_ENDPOINT = endpoint;
    if (key) process.env.AZURE_OPENAI_API_KEY = key;
    if (deployment) process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT = deployment;
  });
});
