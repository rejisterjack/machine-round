import { z } from "zod";

export const screenVisionSchema = z.object({
  site: z.string(),
  urlHint: z.string().optional(),
  windowTitle: z.string().optional(),
  theme: z.enum(["light", "dark", "mixed", "unknown"]),
  primaryContent: z.string(),
  overlays: z.array(z.string()),
  cursor: z.string().optional(),
  visibleText: z.array(z.string()),
  confidence: z.enum(["high", "medium", "low"]),
});

export type ScreenVisionContext = z.infer<typeof screenVisionSchema>;

export const screenVisionMiniSchema = screenVisionSchema.pick({
  site: true,
  urlHint: true,
  theme: true,
  primaryContent: true,
  overlays: true,
  confidence: true,
});

export type ScreenVisionMiniContext = z.infer<typeof screenVisionMiniSchema>;

function extractJsonObject(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  return match?.[0] ?? null;
}

export function parseScreenVisionResponse(
  raw: string,
  mode: "full" | "mini" = "full",
): ScreenVisionContext | ScreenVisionMiniContext | null {
  const jsonText = extractJsonObject(raw);
  if (!jsonText) return null;

  try {
    const parsed = JSON.parse(jsonText) as unknown;
    return mode === "mini"
      ? screenVisionMiniSchema.parse(parsed)
      : screenVisionSchema.parse(parsed);
  } catch {
    return null;
  }
}

export function formatScreenContextForVoice(
  context: ScreenVisionContext | ScreenVisionMiniContext,
  options?: { sceneChanged?: boolean },
): string {
  const lines = ["[Screen context]"];
  if (options?.sceneChanged) {
    lines.push("Scene changed:");
  }
  lines.push(`Site: ${context.site} (${context.confidence})`);
  if (context.urlHint) {
    lines.push(`URL: ${context.urlHint}`);
  }
  if ("windowTitle" in context && context.windowTitle) {
    lines.push(`Window: ${context.windowTitle}`);
  }
  lines.push(`Theme: ${context.theme}`);
  lines.push(`Content: ${context.primaryContent}`);
  const overlays =
    context.overlays.length > 0 ? context.overlays.join("; ") : "none";
  lines.push(`Overlays: ${overlays}`);
  if ("cursor" in context && context.cursor) {
    lines.push(`Cursor: ${context.cursor}`);
  }
  if ("visibleText" in context && context.visibleText.length > 0) {
    lines.push(
      `Visible: ${context.visibleText.map((text) => `"${text}"`).join(", ")}`,
    );
  }
  return lines.join("\n");
}
