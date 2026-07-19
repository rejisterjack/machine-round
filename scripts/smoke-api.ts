import { DEV_SERVER_URL } from "../lib/config/dev-server";

const baseUrl = process.env.SMOKE_BASE_URL ?? DEV_SERVER_URL;

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

async function main() {
  console.log(`Running API smoke checks against ${baseUrl}`);

  const health = (await check("/api/health")) as {
    ok: boolean;
    db: boolean;
    azureConfigured: boolean;
  };
  console.log("health:", health);

  const rolesResponse = await fetch(`${baseUrl}/api/roles`);
  const rolesText = await rolesResponse.text();
  if (rolesResponse.status === 401) {
    console.log("roles: skipped (auth required)");
    console.log("Smoke checks passed.");
    return;
  }

  if (!rolesResponse.ok) {
    throw new Error(`/api/roles failed (${rolesResponse.status}): ${rolesText}`);
  }

  const roles = JSON.parse(rolesText) as { roles: unknown[] };
  if (!Array.isArray(roles.roles) || roles.roles.length === 0) {
    throw new Error("/api/roles returned no roles.");
  }
  console.log(`roles: ${roles.roles.length} found`);

  const firstRole = roles.roles[0] as { id: string };
  const sessionResponse = await fetch(`${baseUrl}/api/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roleId: firstRole.id }),
  });
  const sessionText = await sessionResponse.text();
  let session: { persisted?: boolean; id?: string };
  try {
    session = JSON.parse(sessionText) as { persisted?: boolean; id?: string };
  } catch {
    session = {};
  }

  if (sessionResponse.status === 401) {
    console.log("session create/get: skipped (auth required)");
  } else if (!sessionResponse.ok) {
    throw new Error(
      `/api/sessions failed (${sessionResponse.status}): ${sessionText}`,
    );
  } else if (session.persisted !== false && session.id) {
    await check(`/api/sessions/${session.id}`);
    console.log("session create/get: ok");
  } else {
    console.log("session persistence skipped (database not ready)");
  }

  const interviewResponse = await fetch(`${baseUrl}/api/interview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roleId: firstRole.id,
      messages: [],
      questionCount: 0,
      sessionId: session.id,
    }),
  });
  const interviewText = await interviewResponse.text();

  if (interviewResponse.status === 401) {
    console.log("interview panelist: skipped (auth required)");
  } else if (!interviewResponse.ok) {
    throw new Error(
      `/api/interview failed (${interviewResponse.status}): ${interviewText}`,
    );
  } else {
    const interview = JSON.parse(interviewText) as {
      speaker?: string;
      message?: string;
    };

    if (interview.speaker !== "akshay") {
      throw new Error(`Expected akshay speaker, got ${interview.speaker ?? "none"}`);
    }
    console.log("interview panelist:", interview.speaker);
  }

  console.log("Smoke checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
