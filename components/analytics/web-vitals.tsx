"use client";

import { useReportWebVitals } from "next/web-vitals";

function sendToAnalytics(metric: {
  id: string;
  name: string;
  value: number;
  rating: string;
}) {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  if (typeof window !== "undefined" && "clarity" in window) {
    const clarity = (
      window as Window & {
        clarity?: (command: string, ...args: unknown[]) => void;
      }
    ).clarity;
    clarity?.("set", "web_vital", metric.name);
    clarity?.("set", "web_vital_value", metric.value);
    clarity?.("set", "web_vital_rating", metric.rating);
  }
}

export function WebVitals() {
  useReportWebVitals(sendToAnalytics);
  return null;
}
