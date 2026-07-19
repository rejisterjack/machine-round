import { describe, expect, test } from "bun:test";
import { ApiError } from "@/lib/api/errors";
import { parseJson } from "@/lib/api/validate";
import { z } from "zod";

describe("parseJson", () => {
  test("parses valid JSON against schema", async () => {
    const schema = z.object({ name: z.string() });
    const request = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ name: "test" }),
      headers: { "Content-Type": "application/json" },
    });

    const result = await parseJson(request, schema);
    expect(result.name).toBe("test");
  });

  test("throws ApiError for invalid JSON", async () => {
    const schema = z.object({ name: z.string() });
    const request = new Request("http://localhost", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });

    await expect(parseJson(request, schema)).rejects.toBeInstanceOf(ApiError);
  });
});
