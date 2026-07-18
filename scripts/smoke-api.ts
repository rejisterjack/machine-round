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

async function main() {
  console.log(`Running API smoke checks against ${baseUrl}`);

  const health = (await check("/api/health")) as {
    ok: boolean;
    db: boolean;
    azureConfigured: boolean;
  };
  console.log("health:", health);

  const roles = (await check("/api/roles")) as { roles: unknown[] };
  if (!Array.isArray(roles.roles) || roles.roles.length === 0) {
    throw new Error("/api/roles returned no roles.");
  }
  console.log(`roles: ${roles.roles.length} found`);

  const firstRole = roles.roles[0] as { id: string };
  const session = (await check("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roleId: firstRole.id }),
  })) as { persisted?: boolean; id?: string };

  if (session.persisted !== false && session.id) {
    await check(`/api/sessions/${session.id}`);
    console.log("session create/get: ok");
  } else {
    console.log("session persistence skipped (database not ready)");
  }

  console.log("Smoke checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
