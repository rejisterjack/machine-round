"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, startTransition } from "react";
import { NdCourseCard } from "@/components/brand/nd-course-card";
import { RoleCardSkeleton } from "@/components/brand/role-card-skeleton";
import { JobDescriptionPanel } from "@/components/interview/job-description-panel";
import { PanelistPicker } from "@/components/interview/panelist-picker";
import { RoundPicker } from "@/components/interview/round-picker";
import {
  TrackModeTabs,
  type InterviewTrackMode,
} from "@/components/interview/track-mode-tabs";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { ApiErrorCard } from "@/components/ui/api-error-card";
import { useRoles } from "@/hooks/use-roles";
import type { PanelistMode } from "@/lib/ai/personas/panelists";
import type {
  JobInterviewPlan,
  PlannedInterviewRound,
} from "@/lib/courses/jd-rounds";
import { buildRoundPromptContext } from "@/lib/jd/plan-from-jd";
import type { InterviewDuration } from "@/lib/interview/duration-profiles";
import { createSession, saveSession } from "@/lib/session/interview-store";

export default function InterviewRolePage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <div className="mx-auto max-w-5xl">
            <p className="text-sm text-muted-foreground">Loading tracks...</p>
          </div>
        </PageShell>
      }
    >
      <InterviewRoleContent />
    </Suspense>
  );
}

function InterviewRoleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { roles, loading } = useRoles();
  const [trackMode, setTrackMode] = useState<InterviewTrackMode>("course");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedPanelistMode, setSelectedPanelistMode] =
    useState<PanelistMode | null>("both");
  const [jobPlan, setJobPlan] = useState<JobInterviewPlan | null>(null);
  const [jobSummary, setJobSummary] = useState<string>();
  const [selectedRound, setSelectedRound] = useState<PlannedInterviewRound | null>(
    null,
  );
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string>();

  useEffect(() => {
    if (loading) return;
    const roleParam = searchParams.get("role");
    if (!roleParam) return;
    const match = roles.find((role) => role.id === roleParam);
    if (match) {
      startTransition(() => {
        setTrackMode("course");
        setSelectedRole(match.id);
      });
    }
  }, [loading, roles, searchParams]);

  const canStartCourse =
    trackMode === "course" && selectedRole && selectedPanelistMode;
  const canStartJd =
    trackMode === "job_description" &&
    selectedRound &&
    jobPlan &&
    selectedPanelistMode;

  async function handleBegin() {
    if ((!canStartCourse && !canStartJd) || starting) return;

    setStarting(true);
    setStartError(undefined);

    let roleId: string;
    let roleTitle: string;
    let interviewDuration: InterviewDuration = "minutes_30";
    let trackModeValue: "namaste_course" | "job_description" = "namaste_course";
    let promptContext: string | undefined;
    let interviewRoundId: string | undefined;
    let interviewRoundTitle: string | undefined;

    if (trackMode === "job_description" && selectedRound && jobPlan) {
      roleId = "job-custom";
      roleTitle = `${jobPlan.roleTitle} — ${selectedRound.title}`;
      interviewDuration = selectedRound.recommendedDuration;
      trackModeValue = "job_description";
      promptContext = buildRoundPromptContext(jobPlan, selectedRound);
      interviewRoundId = selectedRound.id;
      interviewRoundTitle = selectedRound.title;
    } else {
      const role = roles.find((item) => item.id === selectedRole);
      if (!role) return;
      roleId = role.id;
      roleTitle = role.title;
    }

    const session = createSession(
      roleId,
      roleTitle,
      selectedPanelistMode!,
      interviewDuration,
      {
        trackMode: trackModeValue,
        promptContext,
        jobDescriptionSummary: jobSummary,
        interviewRoundId,
        interviewRoundTitle,
      },
    );

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId,
          inputMode: "voice",
          panelistMode: selectedPanelistMode,
          interviewDuration,
          trackMode: trackModeValue,
          promptContext,
          jobDescriptionSummary: jobSummary,
          interviewRoundId,
          interviewRoundTitle,
        }),
      });

      if (response.status === 401) {
        router.push(`/login?callbackUrl=${encodeURIComponent("/interview")}`);
        return;
      }

      if (!response.ok) {
        throw new Error("Could not create your interview session.");
      }

      const data = (await response.json()) as {
        persisted?: boolean;
        id?: string;
        publicId?: string;
      };

      if (data.persisted === false || !data.id || !data.publicId) {
        throw new Error(
          "Database not ready. Run db:deploy && db:seed on the server, then retry.",
        );
      }

      session.dbSessionId = data.id;
      session.publicId = data.publicId;
      saveSession(session);
      router.push("/interview/session");
    } catch (error) {
      setStartError(
        error instanceof Error
          ? error.message
          : "Could not start your interview. Please try again.",
      );
    } finally {
      setStarting(false);
    }
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl">
        <Breadcrumb items={[{ label: "Choose track" }]} />
        <p className="nd-section-heading mb-3 mt-6">Namaste Machine Round</p>
        <h1 className="font-heading text-3xl font-medium sm:text-4xl">
          Practice for your next interview
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
          Pick a NamasteDev course track or upload a job description. Each path
          uses voice interviews with Akshay, Archy, or both — tailored to what
          you are preparing for.
        </p>

        <TrackModeTabs
          mode={trackMode}
          onChange={(mode) => {
            setTrackMode(mode);
            setStartError(undefined);
          }}
        />

        {trackMode === "course" ? (
          <div className="nd-card-grid mt-8">
            {loading
              ? Array.from({ length: 6 }).map((_, index) => (
                  <RoleCardSkeleton key={index} />
                ))
              : roles.map((role) => (
                  <NdCourseCard
                    key={role.id}
                    title={role.title}
                    description={role.description}
                    imageUrl={role.imageUrl}
                    rating={role.rating}
                    tier={role.tier}
                    language={role.language}
                    href={role.href}
                    selected={selectedRole === role.id}
                    onSelect={() => setSelectedRole(role.id)}
                  />
                ))}
          </div>
        ) : (
          <>
            <JobDescriptionPanel
              onPlanReady={(plan, summary) => {
                setJobPlan(plan);
                setJobSummary(summary);
                setSelectedRound(null);
              }}
            />
            {jobPlan ? (
              <RoundPicker
                plan={jobPlan}
                selectedRoundId={selectedRound?.id ?? null}
                onSelect={setSelectedRound}
              />
            ) : null}
          </>
        )}

        <p className="nd-section-heading mb-3 mt-12">Choose your interviewer</p>
        <h2 className="font-heading text-2xl font-medium sm:text-3xl">
          Who do you want to practice with?
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Select one panelist or the full dual-panel experience. All sessions are
          voice-only.
        </p>

        <PanelistPicker
          selected={selectedPanelistMode}
          onSelect={setSelectedPanelistMode}
        />

        {startError ? (
          <ApiErrorCard
            className="mt-8"
            message={startError}
            onRetry={() => setStartError(undefined)}
          />
        ) : null}

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            variant="ndFilled"
            size="lg"
            disabled={(!canStartCourse && !canStartJd) || starting}
            onClick={() => void handleBegin()}
          >
            {starting ? "Starting..." : "Begin voice round"}
          </Button>
          <Button variant="ndGhost" size="lg" render={<Link href="/" />}>
            Back
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
