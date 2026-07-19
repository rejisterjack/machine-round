import { describe, expect, test } from "bun:test";
import {
  formatScreenContextForVoice,
  parseScreenVisionResponse,
} from "@/lib/interview/screen-vision-schema";

describe("parseScreenVisionResponse", () => {
  test("parses full structured JSON", () => {
    const raw = JSON.stringify({
      site: "Perplexity",
      urlHint: "perplexity.ai/search",
      windowTitle: "Perplexity",
      theme: "dark",
      primaryContent: "Search results for React hooks",
      overlays: [],
      cursor: "not visible in capture",
      visibleText: ["Ask anything"],
      confidence: "high",
    });

    const parsed = parseScreenVisionResponse(raw, "full");
    expect(parsed?.site).toBe("Perplexity");
    expect(parsed?.confidence).toBe("high");
  });

  test("parses mini mode without optional fields", () => {
    const raw = JSON.stringify({
      site: "GitHub",
      theme: "dark",
      primaryContent: "Repository file tree",
      overlays: ["Settings modal"],
      confidence: "medium",
    });

    const parsed = parseScreenVisionResponse(raw, "mini");
    expect(parsed?.site).toBe("GitHub");
    expect(parsed).not.toHaveProperty("cursor");
  });

  test("returns null for invalid JSON", () => {
    expect(parseScreenVisionResponse("not json", "full")).toBeNull();
  });
});

describe("formatScreenContextForVoice", () => {
  test("formats structured context for voice injection", () => {
    const formatted = formatScreenContextForVoice({
      site: "Perplexity",
      urlHint: "perplexity.ai",
      theme: "dark",
      primaryContent: "AI search interface",
      overlays: [],
      cursor: "not visible in capture",
      visibleText: ["Ask anything"],
      confidence: "high",
    });

    expect(formatted).toContain("[Screen context]");
    expect(formatted).toContain("Site: Perplexity (high)");
    expect(formatted).toContain("URL: perplexity.ai");
    expect(formatted).toContain("Cursor: not visible in capture");
    expect(formatted).toContain('Visible: "Ask anything"');
  });

  test("prepends scene changed marker when requested", () => {
    const formatted = formatScreenContextForVoice(
      {
        site: "GitHub",
        theme: "light",
        primaryContent: "Pull request diff",
        overlays: ["none"],
        confidence: "high",
      },
      { sceneChanged: true },
    );

    expect(formatted).toContain("Scene changed:");
  });
});
