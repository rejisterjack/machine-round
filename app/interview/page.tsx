"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { NdCourseCard } from "@/components/brand/nd-course-card";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { roles, type RoleId } from "@/lib/design/tokens";
import { createSession, saveSession } from "@/lib/session/interview-store";

export default function InterviewRolePage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<RoleId | null>(null);
  const [starting, setStarting] = useState(false);

  async function handleBegin() {
    if (!selectedRole || starting) return;
    const role = roles.find((item) => item.id === selectedRole);
    if (!role) return;

    setStarting(true);
    const session = createSession(role.id, role.title);

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: role.id }),
      });

      if (response.ok) {
        const data = (await response.json()) as {
          persisted?: boolean;
          id?: string;
          publicId?: string;
        };
        if (data.persisted !== false && data.id && data.publicId) {
          session.dbSessionId = data.id;
          session.publicId = data.publicId;
        }
      }
    } catch {
      // Keep client-only session as fallback when persistence is unavailable.
    }

    saveSession(session);
    router.push("/interview/session");
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl">
        <Breadcrumb items={[{ label: "Choose track" }]} />
        <p className="nd-section-heading mb-3 mt-6">Choose your track</p>
        <h1 className="font-heading text-3xl font-medium sm:text-4xl">
          Namaste Machine Round tracks
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
          Pick a role preset to start your interview. The AI interviewer adapts
          follow-ups to your specific answers — just like a real screening round.
        </p>

        <div className="nd-card-grid mt-10">
          {roles.map((role) => (
            <NdCourseCard
              key={role.id}
              title={`Namaste ${role.title}`}
              description={role.description}
              imageUrl={role.imageUrl}
              rating={role.rating}
              language={role.language}
              selected={selectedRole === role.id}
              onSelect={() => setSelectedRole(role.id)}
            />
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            variant="ndFilled"
            size="lg"
            disabled={!selectedRole || starting}
            onClick={() => void handleBegin()}
          >
            {starting ? "Starting..." : "Begin Round"}
          </Button>
          <Button variant="ndGhost" size="lg" render={<Link href="/" />}>
            Back
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
