export type DisplaySurface = "monitor" | "window" | "browser";

type DisplayMediaTrackSettings = MediaTrackSettings & {
  displaySurface?: DisplaySurface;
};

type DisplayMediaStreamOptionsExtended = DisplayMediaStreamOptions & {
  preferCurrentTab?: boolean;
  selfBrowserSurface?: "include" | "exclude";
  monitorTypeSurfaces?: "include" | "exclude";
  systemAudio?: "include" | "exclude";
};

const MONITOR_FIRST_OPTIONS: DisplayMediaStreamOptionsExtended = {
  video: {
    displaySurface: "monitor",
    frameRate: { ideal: 5, max: 15 },
  },
  audio: false,
  preferCurrentTab: false,
  selfBrowserSurface: "exclude",
  monitorTypeSurfaces: "include",
  systemAudio: "exclude",
};

const BASIC_OPTIONS: DisplayMediaStreamOptions = {
  video: true,
  audio: false,
};

export function getDisplaySurface(
  track: MediaStreamTrack,
): DisplaySurface | undefined {
  const settings = track.getSettings() as DisplayMediaTrackSettings;
  const surface = settings.displaySurface;
  if (surface === "monitor" || surface === "window" || surface === "browser") {
    return surface;
  }
  return undefined;
}

export function isMonitorCapture(surface: DisplaySurface | undefined): boolean {
  return surface === "monitor";
}

export function getScreenShareWarning(
  surface: DisplaySurface | undefined,
): string | undefined {
  if (!surface || isMonitorCapture(surface)) return undefined;

  if (surface === "browser") {
    return "You shared a browser tab — panelists only see that tab. To demo code in another tab, re-share and choose Entire Screen.";
  }

  return "You shared a single window — panelists won't see other apps or tabs. To demo code in another tab, re-share and choose Entire Screen.";
}

export async function requestScreenCapture(): Promise<MediaStream> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
    throw new Error("Screen sharing is not supported in this browser.");
  }

  try {
    return await navigator.mediaDevices.getDisplayMedia(MONITOR_FIRST_OPTIONS);
  } catch {
    return navigator.mediaDevices.getDisplayMedia(BASIC_OPTIONS);
  }
}
