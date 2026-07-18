import { NextResponse } from "next/server";
import { getAzureConfig, getAzureRealtimeConfig } from "@/lib/ai";

export async function POST() {
  try {
    const config = getAzureConfig();
    const realtime = getAzureRealtimeConfig();

    const response = await fetch(realtime.clientSecretsUrl, {
      method: "POST",
      headers: {
        "api-key": config.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: realtime.deployment,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Realtime session error:", errorText);
      return NextResponse.json(
        { error: "Failed to create realtime session." },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json({
      ...data,
      callsUrl: realtime.callsUrl,
      deployment: realtime.deployment,
    });
  } catch (error) {
    console.error("Realtime session route error:", error);
    return NextResponse.json(
      { error: "Failed to create realtime session." },
      { status: 500 },
    );
  }
}
