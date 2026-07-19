import { extractText, getDocumentProxy } from "unpdf";

const TEXT_EXTENSIONS = new Set(["txt", "md", "markdown", "json", "csv"]);

export function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? (parts.at(-1)?.toLowerCase() ?? "") : "";
}

export async function extractJobDescriptionText(
  file: File,
): Promise<string> {
  const extension = getFileExtension(file.name);

  if (TEXT_EXTENSIONS.has(extension)) {
    const text = await file.text();
    return text.trim();
  }

  if (extension === "pdf") {
    const buffer = await file.arrayBuffer();
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    const joined = Array.isArray(text) ? text.join("\n") : text;
    return joined.trim();
  }

  throw new Error(
    "Unsupported file type. Upload .txt, .md, or .pdf — or paste the job description.",
  );
}

export function normalizeJobDescriptionText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
