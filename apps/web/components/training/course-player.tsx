"use client";

import { useEffect, useState } from "react";
import { IconCircleCheck, IconX } from "@tabler/icons-react";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { ComplyButton } from "@/components/comply/button";
import { cn } from "@/lib/utils";

type CoursePayload = {
  moduleId: string;
  contentKey: string;
  name: string;
  description: string;
  framework: string;
  durationMin: number;
  acknowledgment: string;
  passRule: string;
  lessons: Array<{ id: string; title: string; minutes: number; body: string }>;
  quiz: Array<{ id: string; prompt: string; choices: string[] }>;
};

export function CoursePlayer({
  assignmentId,
  moduleId,
  onClose,
  onCompleted,
}: {
  assignmentId: string;
  moduleId: string;
  onClose: () => void;
  onCompleted: () => void;
}) {
  const [course, setCourse] = useState<CoursePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0); // 0.lessons-1, then quiz, then ack
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet<CoursePayload>(`/api/v1/training/modules/${moduleId}/course`);
        if (cancelled) return;
        setCourse(data);
        // Mark in progress when opening
        await apiPatch(`/api/v1/training/assignments/${assignmentId}`, {
          status: "IN_PROGRESS",
        }).catch(() => undefined);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load course");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assignmentId, moduleId]);

  const lessonCount = course?.lessons.length ?? 0;
  const quizStep = lessonCount;
  const ackStep = lessonCount + 1;
  const totalSteps = lessonCount + 2;
  const isLesson = step < lessonCount;
  const isQuiz = step === quizStep;
  const isAck = step === ackStep;
  const lesson = isLesson ? course?.lessons[step] : null;

  async function submit() {
    if (!course) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiPost(`/api/v1/training/assignments/${assignmentId}/submit`, {
        answers,
        acknowledged,
      });
      onCompleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
      setStep(quizStep);
    } finally {
      setSubmitting(false);
    }
  }

  const quizReady =
    course != null && course.quiz.every((q) => typeof answers[q.id] === "number");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={course?.name ?? "Course"}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-white/[0.12] bg-comply-elevated shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-comply-purple-border">
              Course
            </p>
            <h2 className="mt-1 text-lg font-medium text-comply-text-primary">
              {course?.name ?? "Loading…"}
            </h2>
            {course ? (
              <p className="mt-1 text-xs text-comply-text-secondary">
                {course.framework} · {course.durationMin} min · step {Math.min(step + 1, totalSteps)}/
                {totalSteps}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-comply-text-tertiary hover:text-comply-text-primary"
            aria-label="Close course"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="text-sm text-comply-text-secondary">Loading course content…</p>
          ) : null}
          {error ? (
            <p className="mb-3 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">
              {error}
            </p>
          ) : null}

          {lesson ? (
            <article>
              <h3 className="text-base font-medium text-comply-text-primary">{lesson.title}</h3>
              <p className="mt-1 text-xs text-comply-text-tertiary">~{lesson.minutes} min</p>
              <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-comply-text-secondary">
                {lesson.body}
              </div>
            </article>
          ) : null}

          {isQuiz && course ? (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-medium text-comply-text-primary">Knowledge check</h3>
                <p className="mt-1 text-xs text-comply-text-secondary">{course.passRule}</p>
              </div>
              {course.quiz.map((q, qi) => (
                <fieldset key={q.id} className="space-y-2">
                  <legend className="text-sm font-medium text-comply-text-primary">
                    {qi + 1}. {q.prompt}
                  </legend>
                  <div className="space-y-1.5">
                    {q.choices.map((choice, ci) => (
                      <label
                        key={ci}
                        className={cn(
                          "flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm",
                          answers[q.id] === ci
                            ? "border-comply-purple-border/50 bg-comply-purple/10 text-comply-text-primary"
                            : "border-white/[0.08] text-comply-text-secondary hover:border-white/[0.16]"
                        )}
                      >
                        <input
                          type="radio"
                          className="mt-1"
                          name={q.id}
                          checked={answers[q.id] === ci}
                          onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: ci }))}
                        />
                        <span>{choice}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          ) : null}

          {isAck && course ? (
            <div className="space-y-4">
              <h3 className="text-base font-medium text-comply-text-primary">Attestation</h3>
              <p className="text-sm leading-relaxed text-comply-text-secondary">
                {course.acknowledgment}
              </p>
              <label className="flex items-start gap-2 text-sm text-comply-text-primary">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                />
                <span>I agree, mark this training complete</span>
              </label>
              <p className="text-xs text-comply-text-tertiary">
                A completion certificate will be available after you finish.
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.08] px-5 py-4">
          <ComplyButton
            variant="secondary"
            className="text-sm"
            disabled={step === 0 || submitting}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Back
          </ComplyButton>
          <div className="flex gap-2">
            {isAck ? (
              <ComplyButton
                variant="primary"
                className="gap-1.5 text-sm"
                disabled={!acknowledged || !quizReady || submitting}
                onClick={() => void submit()}
              >
                <IconCircleCheck size={16} />
                {submitting ? "Submitting…" : "Finish course"}
              </ComplyButton>
            ) : (
              <ComplyButton
                variant="primary"
                className="text-sm"
                disabled={isQuiz && !quizReady}
                onClick={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}
              >
                {isQuiz ? "Continue to attestation" : "Next lesson"}
              </ComplyButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
