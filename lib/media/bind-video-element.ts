/** Attach a MediaStream to a video element and invoke onReady once frames are available. */
export function bindVideoElement(
  video: HTMLVideoElement,
  stream: MediaStream | null,
  onReady?: (video: HTMLVideoElement) => void,
): () => void {
  if (!stream) {
    video.srcObject = null;
    return () => {};
  }

  video.srcObject = stream;

  const notifyReady = () => {
    void video.play().catch(() => {});
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      onReady?.(video);
    }
  };

  const onLoadedMetadata = () => {
    notifyReady();
  };

  video.addEventListener("loadedmetadata", onLoadedMetadata);

  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
    notifyReady();
  }

  return () => {
    video.removeEventListener("loadedmetadata", onLoadedMetadata);
  };
}
