const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

async function check(path: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  if (!response.ok) {
    throw new Error(`${path} failed (${response.status}): ${text}`);
  }

  return json;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  console.log(`Running frontend smoke checks against ${baseUrl}`);

  const health = (await check("/api/health")) as {
    ok: boolean;
    db: boolean;
    azureConfigured: boolean;
  };
  assert(health.ok, "Health check did not return ok.");
  console.log("health:", health);

  const roles = (await check("/api/roles")) as {
    roles: Array<{ id: string; title: string }>;
  };
  assert(roles.roles.length > 0, "/api/roles returned no roles.");
  const role = roles.roles[0];
  console.log(`roles: ${roles.roles.length} found`);

  const session = (await check("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roleId: role.id }),
  })) as { persisted?: boolean; id?: string; publicId?: string };

  const interview = (await check("/api/interview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roleId: role.id,
      roleTitle: role.title,
      messages: [],
      questionCount: 0,
      sessionId: session.id,
    }),
  })) as { message: string; done: boolean };

  assert(interview.message.length > 0, "Interview returned empty message.");
  console.log("interview turn:", interview.message.slice(0, 80));

  const evaluate = (await check("/api/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roleId: role.id,
      roleTitle: role.title,
      sessionId: session.id,
      messages: [
        { role: "assistant", content: interview.message },
        {
          role: "user",
          content:
            "I led a migration from a monolith to services and measured checkout latency before each cutover.",
        },
      ],
      weakSignals: ["needs concrete metrics"],
    }),
  })) as {
    overallScore: number;
    summary: string;
    shareToken?: string | null;
    improvements: string[];
  };

  assert(typeof evaluate.overallScore === "number", "Evaluate missing score.");
  assert(evaluate.summary.length > 0, "Evaluate missing summary.");
  console.log("evaluate score:", evaluate.overallScore);

  if (evaluate.shareToken) {
    const shared = (await check(
      `/api/reports/share/${evaluate.shareToken}`,
    )) as { overallScore: number };
    assert(
      shared.overallScore === evaluate.overallScore,
      "Share token report score mismatch.",
    );
    console.log("share token round-trip: ok");
  } else {
    console.log("share token skipped (database not ready)");
  }

  if (session.publicId) {
    const replay = (await check(
      `/api/sessions/replay/${session.publicId}`,
    )) as { messages: unknown[] };
    assert(Array.isArray(replay.messages), "Replay missing messages.");
    console.log("replay endpoint: ok");
  }

  const pages = ["/", "/interview", "/report"];
  for (const page of pages) {
    const response = await fetch(`${baseUrl}${page}`);
    if (!response.ok) {
      throw new Error(`${page} failed (${response.status})`);
    }
  }
  console.log("core pages render:", pages.join(", "));

  console.log("Frontend smoke checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
