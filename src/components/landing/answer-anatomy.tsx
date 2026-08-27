"use client";

import { ArrowRight, CornerDownRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { AuthGate } from "@/components/auth/auth-gate";
import { useAniAuth } from "@/components/auth/privy-provider";
import { SourceChip, SourceMarkForTool } from "@/components/brand/source-mark";
import { TokenAvatar } from "@/components/brand/token-avatar";
import { readAgentStream } from "@/lib/agent/stream";
import type { AgentReply, ToolRun, TokenSignal } from "@/lib/agent/types";
import { authenticatedFetch } from "@/lib/auth/client";
import { percent, usd } from "@/lib/format";
import { cn } from "@/lib/utils";

const DEMO_PROMPT = "What's moving on Solana?";

type Phase = "idle" | "running" | "streaming" | "done" | "error";

function isTokenSignal(value: unknown): value is TokenSignal {
  return Boolean(
    value && typeof value === "object" && "symbol" in value && "priceUsd" in value,
  );
}

/**
 * A real pass, not a mock-up.
 *
 * Pressing run posts to the same `/api/agent` route the workspace uses, and
 * everything below — the tool call, its duration, the token rows, the sources —
 * is whatever came back. If the request fails the panel says so; it has no
 * sample-data branch to fall back on.
 */
export function AnswerAnatomy() {
  const auth = useAniAuth();
  const [phase, setPhase] = useState<Phase>("idle");
  const [reply, setReply] = useState<AgentReply | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const runAfterAuthRef = useRef(false);

  const run = useCallback(async () => {
    if (!auth.ready || !auth.authenticated) {
      runAfterAuthRef.current = true;
      setAuthGateOpen(true);
      return;
    }
    setPhase("running");
    setMessage(null);
    setReply({ mode: "live-demo", sources: [], text: "", toolRuns: [] });
    try {
      const response = await authenticatedFetch(auth.getAccessToken, "/api/agent", {
        body: JSON.stringify({ message: DEMO_PROMPT }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!response.ok && response.headers.get("content-type")?.includes("application/json")) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "The research pass failed.");
      }

      let failure: string | null = null;
      const patch = (apply: (current: AgentReply) => AgentReply) =>
        setReply((current) => apply(current ?? { mode: "live-demo", sources: [], text: "", toolRuns: [] }));

      await readAgentStream(response, (event) => {
        switch (event.type) {
          case "tool-start":
            patch((current) => ({
              ...current,
              toolRuns: [
                ...current.toolRuns,
                {
                  durationMs: 0,
                  id: event.id,
                  input: event.input,
                  label: event.label,
                  name: event.name,
                  output: null,
                  status: "running",
                } satisfies ToolRun,
              ],
            }));
            setPhase("streaming");
            break;
          case "tool":
            patch((current) => ({
              ...current,
              toolRuns: current.toolRuns.some((run) => run.id === event.run.id)
                ? current.toolRuns.map((run) => (run.id === event.run.id ? event.run : run))
                : [...current.toolRuns, event.run],
            }));
            break;
          case "text":
            setPhase("streaming");
            patch((current) => ({ ...current, text: current.text + event.delta }));
            break;
          case "sources":
            patch((current) => ({ ...current, sources: event.sources }));
            break;
          case "done":
            patch((current) => ({ ...current, mode: event.mode }));
            break;
          case "error":
            failure = event.message;
            break;
        }
      });

      if (failure) throw new Error(failure);
      setPhase("done");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "The research pass failed.");
      setPhase("error");
    }
  }, [auth.authenticated, auth.getAccessToken, auth.ready]);

  useEffect(() => {
    if (!auth.authenticated || !runAfterAuthRef.current) return;
    runAfterAuthRef.current = false;
    void run();
  }, [auth.authenticated, run]);

  const run0 = reply?.toolRuns?.[0];
  const tokens = Array.isArray(run0?.output) ? run0.output.filter(isTokenSignal) : [];

  return (
    <div className="ani-lit overflow-hidden rounded-panel bg-panel [--ani-sweep-duration:13s]">
      <AuthGate onOpenChange={setAuthGateOpen} open={authGateOpen} />
      {/* the ask */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-4 sm:px-7">
        <p className="flex min-w-0 items-center gap-3 text-[14px] text-white/78">
          <CornerDownRight className="size-4 shrink-0 text-white/28" strokeWidth={1.5} />
          <span className="truncate">{DEMO_PROMPT}</span>
        </p>
        <button
          className={cn(
            "flex h-10 shrink-0 items-center gap-2 rounded-chip px-4 text-[12px] font-medium transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96]",
            phase === "running" || phase === "streaming"
              ? "cursor-wait bg-white/[0.07] text-white/50"
              : "bg-white text-black hover:bg-white/88",
          )}
          disabled={phase === "running" || phase === "streaming"}
          onClick={() => void run()}
          type="button"
        >
          {phase === "running" || phase === "streaming"
            ? "Running"
            : !auth.authenticated
              ? "Sign in to run"
            : phase === "idle"
              ? "Run it"
              : "Run again"}
        </button>
      </div>

      <div className="px-5 py-6 sm:px-7 sm:py-7">
        {phase === "idle" ? (
          <div className="py-4">
            <p className="max-w-[40rem] text-pretty text-[14px] leading-7 text-white/44">
              Ani answers in four parts, always in the same order: the call she made,
              what came back, what she thinks it means, and where every number came
              from. Run it and the panel fills with the live response.
            </p>
            <ol className="mt-6 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] text-white/28">
              {["01 the call", "02 the evidence", "03 the read", "04 the sources"].map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        ) : null}

        {phase === "running" ? (
          <div className="space-y-5 py-2" role="status">
            <div className="ani-shimmer-rail h-8 w-56 rounded-chip" />
            <div className="grid gap-2 sm:grid-cols-3">
              {[0, 1, 2].map((index) => (
                <div className="ani-shimmer-rail h-24 rounded-card" key={index} />
              ))}
            </div>
            <div className="space-y-2">
              <div className="ani-shimmer-rail h-3.5 w-full rounded-full" />
              <div className="ani-shimmer-rail h-3.5 w-4/5 rounded-full" />
            </div>
            <p className="sr-only">Running a live market pass</p>
          </div>
        ) : null}

        {phase === "error" ? (
          <div className="py-4">
            <p className="text-[14px] text-white/74">That pass did not complete.</p>
            <p className="mt-2 max-w-[38rem] text-[13px] leading-6 text-white/40">
              {message} Nothing is shown in its place — the panel only ever renders a
              response that actually came back.
            </p>
          </div>
        ) : null}

        {(phase === "streaming" || phase === "done") && reply ? (
          <div className="space-y-7">
            {/* 01 — the call */}
            <Part label="01 the call">
              {run0 ? (
                <div className="ani-pearl-edge inline-flex h-9 items-center gap-2.5 rounded-chip bg-white/[0.05] pr-3.5 pl-2.5 text-[12px] text-white/78">
                  <SourceMarkForTool size={14} toolName={run0.name} />
                  {run0.label}
                  <span className="font-mono text-[10px] text-white/32 tabular-nums">
                    {run0.durationMs}ms
                  </span>
                </div>
              ) : (
                <p className="text-[13px] text-white/40">
                  This answer needed no tool call.
                </p>
              )}
            </Part>

            {/* 02 — the evidence */}
            {tokens.length > 0 ? (
              <Part label="02 the evidence">
                <div className="grid gap-2 sm:grid-cols-3">
                  {tokens.slice(0, 3).map((token) => (
                    <a
                      className="ani-edge-soft ani-edge-hover group flex items-center gap-3 rounded-card bg-white/[0.028] p-3 transition-[background-color,box-shadow,scale] duration-150 ease-out hover:bg-white/[0.055] active:scale-[0.96]"
                      href={token.url}
                      key={`${token.address}-${token.symbol}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <TokenAvatar
                        address={token.address}
                        imageUrl={token.imageUrl}
                        size={32}
                        symbol={token.symbol}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-medium text-white/88">
                          {token.symbol}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-white/44 tabular-nums">
                          {usd(token.priceUsd)}
                          <span className="ml-1.5 text-white/28">{percent(token.change24h)}</span>
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </Part>
            ) : null}

            {/* 03 — the read */}
            {reply.text ? (
            <Part label="03 the read">
              <p className="max-w-[46rem] text-pretty text-[15px] leading-7 text-white/76">
                {reply.text.replaceAll("**", "")}
              </p>
            </Part>
            ) : null}

            {/* 04 — the sources */}
            {reply.sources.length > 0 ? (
              <Part label="04 the sources">
                <div className="flex flex-wrap gap-2">
                  {reply.sources.slice(0, 4).map((source) => (
                    <SourceChip key={`${source.title}-${source.url}`} {...source} />
                  ))}
                </div>
              </Part>
            ) : null}

            {phase === "done" ? (
            <div className="border-t border-white/[0.07] pt-5">
              <Link
                className="group inline-flex min-h-11 items-center gap-2 text-[13px] text-white/58 transition-colors duration-150 hover:text-white"
                href="/agent"
              >
                Ask her your own question
                <ArrowRight
                  className="size-3.5 transition-transform duration-150 ease-out group-hover:translate-x-0.5"
                  strokeWidth={1.75}
                />
              </Link>
            </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Part({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[7rem_1fr] sm:gap-6">
      <p className="pt-1 font-mono text-[10px] tracking-[0.04em] text-white/26">{label}</p>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
