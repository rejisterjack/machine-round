import { describe, expect, it } from "bun:test";
import { assertCronAuthorized, getCronSecret } from "@/lib/cron/auth";

describe("cron auth", () => {
  it("trims CRON_SECRET whitespace", () => {
    const previous = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "  cron-secret  ";
    expect(getCronSecret()).toBe("cron-secret");
    if (previous === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = previous;
    }
  });

  it("authorizes matching bearer tokens using trimmed secret", () => {
    const previous = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "  cron-secret  ";

    const response = assertCronAuthorized(
      new Request("http://localhost/api/cron/test", {
        headers: { authorization: "Bearer cron-secret" },
      }),
    );

    expect(response).toBeNull();

    if (previous === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = previous;
    }
  });

  it("rejects mismatched bearer tokens", () => {
    const previous = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "cron-secret";

    const response = assertCronAuthorized(
      new Request("http://localhost/api/cron/test", {
        headers: { authorization: "Bearer wrong-secret" },
      }),
    );

    expect(response?.status).toBe(401);

    if (previous === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = previous;
    }
  });
});
