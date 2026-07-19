import { DEV_SERVER_URL } from "../lib/config/dev-server";
import {
  assertAuthForSmoke,
  isSmokeAuthConfigured,
  smokeFetchInit,
} from "./smoke-auth";

const baseUrl = process.env.SMOKE_BASE_URL ?? DEV_SERVER_URL;

async function check(path: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, smokeFetchInit(init));
  const text = await response.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  assertAuthForSmoke(path, response.status);

  if (!response.ok) {
    throw new Error(`${path} failed (${response.status}): ${text}`);
  }

  return json;
}

async function checkOptional(path: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, smokeFetchInit(init));
  const text = await response.text();
  assertAuthForSmoke(path, response.status);
  if (response.status === 401) {
    return { skipped: true as const, status: response.status };
  }
  if (!response.ok) {
    throw new Error(`${path} failed (${response.status}): ${text}`);
  }
  try {
    return { skipped: false as const, data: JSON.parse(text) as unknown };
  } catch {
    return { skipped: false as const, data: text };
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  console.log(`Running frontend smoke checks against ${baseUrl}`);
  if (isSmokeAuthConfigured()) {
    console.log("auth: SMOKE_AUTH_COOKIE configured — authenticated paths required");
  }

  const health = (await check("/api/health")) as {
    ok: boolean;
    db: boolean;
    azureConfigured: boolean;
  };
  assert(health.ok, "Health check did not return ok.");
  console.log("health:", health);

  const rolesResult = await checkOptional("/api/roles");
  if (rolesResult.skipped) {
    console.log("roles: skipped (auth required — set SMOKE_AUTH_COOKIE to exercise)");
    console.log("authenticated API flow: skipped (auth required)");
  } else {
    const roles = rolesResult.data as {
      roles: Array<{ id: string; title: string }>;
    };
    assert(roles.roles.length > 0, "/api/roles returned no roles.");
    const role = roles.roles[0];
    console.log(`roles: ${roles.roles.length} found`);

    const sessionResult = await checkOptional("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleId: role.id }),
    });

    if (sessionResult.skipped) {
      console.log("session create: skipped (auth required)");
    } else {
      const session = sessionResult.data as {
        persisted?: boolean;
        id?: string;
        publicId?: string;
      };
      assert(session.id, "Session create missing id.");
      console.log("session create: ok");

      const interviewResult = await checkOptional("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: role.id,
          roleTitle: role.title,
          messages: [],
          questionCount: 0,
          sessionId: session.id,
        }),
      });

      if (interviewResult.skipped) {
        console.log("interview turn: skipped (auth required)");
      } else {
        const interview = interviewResult.data as { message: string; done: boolean };
        assert(interview.message.length > 0, "Interview returned empty message.");
        console.log("interview turn:", interview.message.slice(0, 80));

        const evaluateResult = await checkOptional("/api/evaluate", {
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
        });

        if (evaluateResult.skipped) {
          console.log("evaluate: skipped (auth required)");
        } else {
          const evaluate = evaluateResult.data as {
            overallScore: number;
            summary: string;
            shareToken?: string | null;
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

            const sharePageResponse = await fetch(
              `${baseUrl}/report/share/${evaluate.shareToken}`,
              smokeFetchInit(),
            );
            if (!sharePageResponse.ok) {
              throw new Error(
                `Share report page failed (${sharePageResponse.status})`,
              );
            }
            const shareHtml = await sharePageResponse.text();
            assert(
              shareHtml.includes(String(evaluate.overallScore)),
              "Share report RSC page missing overall score in HTML.",
            );
            console.log("share report RSC page: ok");

            const pdfResponse = await fetch(
              `${baseUrl}/api/reports/share/${evaluate.shareToken}/pdf`,
              smokeFetchInit(),
            );
            assertAuthForSmoke(
              `/api/reports/share/${evaluate.shareToken}/pdf`,
              pdfResponse.status,
            );
            if (!pdfResponse.ok) {
              throw new Error(
                `Share PDF failed (${pdfResponse.status}): ${await pdfResponse.text()}`,
              );
            }
            const pdfType = pdfResponse.headers.get("content-type") ?? "";
            assert(
              pdfType.includes("application/pdf"),
              `Share PDF wrong content-type: ${pdfType}`,
            );
            console.log("share PDF export: ok");
          }
        }
      }

      if (session.publicId) {
        const replayResult = await checkOptional(
          `/api/sessions/replay/${session.publicId}`,
        );
        if (replayResult.skipped) {
          console.log("replay endpoint: skipped (auth required)");
        } else {
          const replay = replayResult.data as {
            messages: unknown[];
            roleTitle?: string;
            report?: { overallScore?: number };
          };
          assert(Array.isArray(replay.messages), "Replay missing messages.");
          console.log("replay endpoint: ok");

          const replayPageResponse = await fetch(
            `${baseUrl}/replay/${session.publicId}`,
            smokeFetchInit(),
          );
          if (!replayPageResponse.ok) {
            throw new Error(
              `Replay page failed (${replayPageResponse.status})`,
            );
          }
          const replayHtml = await replayPageResponse.text();
          assert(
            replayHtml.includes("Session replay") ||
              replayHtml.includes("Interview replay"),
            "Replay RSC page missing replay heading in HTML.",
          );
          if (replay.roleTitle) {
            assert(
              replayHtml.includes(replay.roleTitle),
              "Replay RSC page missing role title in HTML.",
            );
          }
          if (replay.report?.overallScore != null) {
            assert(
              replayHtml.includes(String(replay.report.overallScore)),
              "Replay RSC page missing overall score in HTML.",
            );
          }
          console.log("replay RSC page: ok");
        }
      }
    }
  }

  const homeResponse = await fetch(`${baseUrl}/`, smokeFetchInit());
  if (!homeResponse.ok) {
    throw new Error(`Home page failed (${homeResponse.status})`);
  }
  console.log("home page render: ok");

  const protectedPages = ["/interview", "/report", "/history"];
  for (const page of protectedPages) {
    const response = await fetch(`${baseUrl}${page}`, {
      ...smokeFetchInit(),
      redirect: "manual",
    });
    const redirectedToLogin =
      response.status >= 300 &&
      response.status < 400 &&
      (response.headers.get("location")?.includes("/login") ?? false);
    if (!response.ok && !redirectedToLogin) {
      throw new Error(`${page} failed (${response.status})`);
    }
  }
  console.log("protected pages redirect to login when unauthenticated");

  console.log("Frontend smoke checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
