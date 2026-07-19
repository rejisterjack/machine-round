function hashSample(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i += 64) {
    hash = (hash * 31 + data.charCodeAt(i)) | 0;
  }
  return String(hash);
}

export function captureFrame(
  videoEl: HTMLVideoElement,
  quality = 0.7,
  maxWidth = 1280,
): string | null {
  if (!videoEl.videoWidth || !videoEl.videoHeight) return null;

  const scale = Math.min(1, maxWidth / videoEl.videoWidth);
  const width = Math.round(videoEl.videoWidth * scale);
  const height = Math.round(videoEl.videoHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(videoEl, 0, 0, width, height);
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return dataUrl.split(",")[1] ?? null;
}

export function startScreenSampler(
  videoEl: HTMLVideoElement,
  onFrame: (base64: string) => void,
  intervalMs = 5000,
) {
  let lastHash = "";
  let timer: ReturnType<typeof setInterval> | null = null;

  const sample = () => {
    if (document.visibilityState !== "visible") return;
    const base64 = captureFrame(videoEl);
    if (!base64) return;
    const frameHash = hashSample(base64.slice(0, 2000));
    if (frameHash === lastHash) return;
    lastHash = frameHash;
    onFrame(base64);
  };

  timer = setInterval(sample, intervalMs);
  sample();

  return () => {
    if (timer) clearInterval(timer);
  };
}
