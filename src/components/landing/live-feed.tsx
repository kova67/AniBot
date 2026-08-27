"use client";

import { ArrowUpRight, RotateCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { SourceMark } from "@/components/brand/source-mark";
import { TokenAvatar } from "@/components/brand/token-avatar";
import { useSpotlight } from "@/components/motion/reveal";
import type { TokenSignal } from "@/lib/agent/types";
import { SOURCES } from "@/lib/brand/sources";
import { count, percent, relativeTime, usd } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The boosted-token feed, straight from the same DEX Screener call the agent
 * makes. Every value on screen came back from that request — there is no
 * sample data path here, so when the source is unreachable the section says so
 * instead of rendering a number nobody can verify.
 */
export function LiveFeed({
  initialError,
  initialFetchedAt,
  initialTokens,
}: {
  initialError: string | null;
  initialFetchedAt: string | null;
  initialTokens: readonly TokenSignal[];
}) {
  const [tokens, setTokens] = useState<readonly TokenSignal[]>(initialTokens);
  const [fetchedAt, setFetchedAt] = useState(initialFetchedAt);
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);
  const [stamp, setStamp] = useState("—");

  // Rendered on the client only: a server-rendered "2 min ago" would be wrong
  // the moment the response is cached.
  useEffect(() => {
    const tick = () => setStamp(relativeTime(fetchedAt));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [fetchedAt]);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/market/pulse", { cache: "no-store" });
      const payload = (await response.json()) as {
        error?: string;
        fetchedAt?: string;
        tokens?: TokenSignal[];
      };
      if (!response.ok) throw new Error(payload.error ?? "Market source unavailable");
      setTokens(payload.tokens ?? []);
      setFetchedAt(payload.fetchedAt ?? new Date().toISOString());
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Market source unavailable");
    } finally {
      setBusy(false);
    }
  }, []);

  const hasTokens = tokens.length > 0;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.07] pb-5">
        <div className="flex items-center gap-2.5">
          <SourceMark identity={SOURCES.dexscreener} label="dexscreener.com" size={18} />
          <p className="text-[13px] text-white/62">Boosted on Solana</p>
          <span className="h-3 w-px bg-white/12" />
          <p className="font-mono text-[11px] text-white/34 tabular-nums">
            {hasTokens ? stamp : "unavailable"}
          </p>
        </div>
        <button
          className="flex h-10 items-center gap-2 ani-edge rounded-chip bg-white/[0.035] px-3.5 text-[12px] text-white/56 transition-[background-color,color,scale] duration-150 ease-out hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-45 active:scale-[0.96]"
          disabled={busy}
          onClick={() => void refresh()}
          type="button"
        >
          <RotateCw className={cn("size-3.5", busy && "motion-safe:animate-spin")} strokeWidth={1.5} />
          {busy ? "Reading" : "Refresh"}
        </button>
      </div>

      {hasTokens ? (
        <ul className="grid gap-px overflow-hidden rounded-card bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-3">
          {tokens.slice(0, 6).map((token) => (
            <TokenCard key={`${token.address}-${token.symbol}`} token={token} />
          ))}
        </ul>
      ) : (
        <div className="mt-6 ani-edge-soft rounded-card bg-white/[0.02] p-8">
          <p className="text-[14px] text-white/72">
            {error ? "The market source did not answer." : "No boosted Solana pairs came back."}
          </p>
          <p className="mt-2 max-w-[38rem] text-[13px] leading-6 text-white/40">
            {error
              ? "This panel only ever shows what DEX Screener returned, so there is nothing to display right now. The workspace will report the same thing rather than guess."
              : "DEX Screener returned an empty boost list for Solana. Try again in a moment."}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              className="flex h-10 items-center gap-2 rounded-chip bg-white px-4 text-[12px] font-medium text-black transition-[background-color,scale] duration-150 hover:bg-white/88 disabled:opacity-45 active:scale-[0.96]"
              disabled={busy}
              onClick={() => void refresh()}
              type="button"
            >
              <RotateCw className={cn("size-3.5", busy && "motion-safe:animate-spin")} strokeWidth={1.75} />
              Try again
            </button>
            <a
              className="flex h-10 items-center gap-2 ani-edge rounded-chip bg-white/[0.035] px-4 text-[12px] text-white/60 transition-[background-color,color,scale] duration-150 hover:bg-white/[0.07] hover:text-white active:scale-[0.96]"
              href={SOURCES.dexscreener.href}
              rel="noreferrer"
              target="_blank"
            >
              Open DEX Screener
              <ArrowUpRight className="size-3.5" strokeWidth={1.5} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function TokenCard({ token }: { token: TokenSignal }) {
  const spotlight = useSpotlight();
  const positive = (token.change24h ?? 0) >= 0;
  const flow = (token.buys24h ?? 0) + (token.sells24h ?? 0);
  const buyShare = flow > 0 ? ((token.buys24h ?? 0) / flow) * 100 : null;

  return (
    <li className="contents">
      <a
        className="ani-spotlight group relative flex flex-col bg-black p-5 transition-[background-color] duration-200 ease-out hover:bg-white/[0.022] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white/60"
        href={token.url}
        rel="noreferrer"
        target="_blank"
        {...spotlight}
      >
        <div className="relative z-1 flex items-start gap-3">
          <TokenAvatar
            address={token.address}
            imageUrl={token.imageUrl}
            size={38}
            symbol={token.symbol}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium tracking-[-0.02em] text-white/92">
              {token.symbol}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-white/34">{token.name}</p>
          </div>
          <ArrowUpRight
            className="size-4 shrink-0 text-white/20 transition-colors duration-150 group-hover:text-white/62"
            strokeWidth={1.5}
          />
        </div>

        <div className="relative z-1 mt-5 flex items-baseline justify-between gap-3">
          <p className="font-mono text-[15px] text-white/88 tabular-nums">{usd(token.priceUsd)}</p>
          <p
            className={cn(
              "font-mono text-[12px] tabular-nums",
              token.change24h === null
                ? "text-white/30"
                : positive
                  ? "text-[color:var(--blush)]"
                  : "text-white/46",
            )}
          >
            {percent(token.change24h)}
          </p>
        </div>

        {/* Real 24h buy/sell split, drawn to scale. No trend line is drawn
            because the endpoint returns no series to draw one from. */}
        {buyShare !== null ? (
          <div className="relative z-1 mt-4">
            <div
              aria-label={`${count(token.buys24h)} buys and ${count(token.sells24h)} sells in 24 hours`}
              className="h-[3px] overflow-hidden rounded-full bg-white/[0.09]"
              role="img"
            >
              <div
                className="h-full rounded-full bg-[color:var(--blush)]/70"
                style={{ width: `${buyShare.toFixed(1)}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between font-mono text-[10px] text-white/32 tabular-nums">
              <span>{count(token.buys24h)} buys</span>
              <span>{count(token.sells24h)} sells · 24h</span>
            </div>
          </div>
        ) : null}

        <p className="relative z-1 mt-auto pt-4 font-mono text-[10px] text-white/26 tabular-nums">
          liq {usd(token.liquidityUsd)} · vol {usd(token.volume24h)}
        </p>
      </a>
    </li>
  );
}
