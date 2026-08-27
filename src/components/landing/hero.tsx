"use client";

import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { AuroraField } from "@/components/atmosphere/aurora-field";
import { SourceMark } from "@/components/brand/source-mark";
import { TokenAvatar } from "@/components/brand/token-avatar";
import { VrmStage } from "@/components/avatar/vrm-stage";
import type { TokenSignal } from "@/lib/agent/types";
import { SOURCES, type SourceId } from "@/lib/brand/sources";
import { percent, usd } from "@/lib/format";
import { cn } from "@/lib/utils";

const INSTRUMENT_ORDER: SourceId[] = [
  "solana",
  "dexscreener",
  "pumpfun",
  "helius",
  "polymarket",
];

export function Hero({ lead }: { lead: TokenSignal | null }) {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Light in the air, hugging the top of the page. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[46rem] max-h-[85svh]">
        <AuroraField />
      </div>

      <div
        className={cn(
          "mx-auto grid max-w-[1440px] grid-cols-1",
          "lg:min-h-[calc(100svh-72px)] lg:[grid-template-areas:'stage']",
        )}
      >
        {/* --- the stage ---------------------------------------------------- */}
        <div
          className={cn(
            "relative h-[54svh] min-h-[360px] overflow-hidden",
            "lg:h-auto lg:w-[56%] lg:justify-self-start lg:[grid-area:stage]",
          )}
        >
          {/* Her own light, behind her, warm and localised. The stage itself is
              transparent so the aurora above the fold and this pool read as one
              atmosphere rather than as a panel sitting on top of one. */}
          <div className="ani-stage-light pointer-events-none absolute inset-0" />

          <VrmStage className="absolute inset-0 bg-transparent" compact />

          {/* Contact shadow: gives the full-body framing a floor to stand on. */}
          <div className="ani-floor pointer-events-none absolute bottom-[6%] left-1/2 h-14 w-[52%] -translate-x-1/2 blur-[6px] lg:bottom-[9%]" />

          <div className="ani-stage-scrim pointer-events-none absolute inset-x-0 bottom-0 h-28" />

          {/* A market trace running the seam between her and the copy. */}
          <div className="ani-trace pointer-events-none absolute inset-y-20 right-0 hidden w-px bg-white/[0.06] lg:block" />

          <HeroReadout lead={lead} />
        </div>

        {/* --- the claim ---------------------------------------------------- */}
        <div
          className={cn(
            "relative z-10 flex items-center px-5 pt-14 pb-20 sm:px-8",
            "lg:w-[52%] lg:justify-self-end lg:py-24 lg:pr-[clamp(2.5rem,5vw,5rem)] lg:pl-8 lg:[grid-area:stage]",
          )}
        >
          <div className="w-full max-w-[36rem]">
            <a
              className="ani-enter mb-6 inline-flex h-9 items-center gap-2 rounded-chip bg-white/[0.035] px-3 text-[11px] text-white/46 shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.075)] transition-[background-color,color,scale] duration-150 hover:bg-white/[0.06] hover:text-white/78 active:scale-[0.96]"
              href={SOURCES.solana.href}
              rel="noreferrer"
              target="_blank"
            >
              <SourceMark identity={SOURCES.solana} label="Solana" size={15} />
              Solana-native · Pump.fun Hackathon
            </a>
            <h1 className="ani-enter text-balance text-[clamp(2.75rem,5.4vw,5.25rem)] leading-[0.94] font-medium tracking-[-0.055em] text-white">
              The open agent for crypto. Now she has a face.
            </h1>

            <p className="ani-enter ani-enter-delay-1 mt-7 max-w-[34rem] text-pretty text-[16px] leading-7 text-white/52 sm:text-[17px]">
              Grok Bot-style tool use, rebuilt as an open architecture for Web3 and
              embodied as an expressive 3D companion. Ani researches Solana tokens,
              Pump.fun launches, wallets, on-chain history, and prediction markets—then
              shows her work and speaks the answer.
            </p>

            <div className="ani-enter ani-enter-delay-2 mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                className="group flex h-12 items-center justify-center gap-2 rounded-control bg-white pr-4 pl-5 text-[14px] font-medium text-black transition-[background-color,scale] duration-150 ease-out hover:bg-white/88 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.96]"
                href="/agent"
              >
                Open the workspace
                <ArrowRight
                  className="size-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5"
                  strokeWidth={2}
                />
              </Link>
              <a
                className="flex h-12 items-center justify-center ani-edge ani-edge-hover rounded-control bg-white/[0.035] px-5 text-[14px] text-white/64 transition-[background-color,color,box-shadow,scale] duration-150 ease-out hover:bg-white/[0.07] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 active:scale-[0.96]"
                href="#instruments"
              >
                Explore her Web3 tools
              </a>
            </div>

            {/* Her instruments, named, with each service's own mark. */}
            <div className="ani-enter ani-enter-delay-3 mt-11 border-t border-white/[0.08] pt-5">
              <p className="font-mono text-[10px] tracking-[0.06em] text-white/26">
                she calls
              </p>
              <ul className="mt-3.5 flex flex-wrap gap-x-5 gap-y-3">
                {INSTRUMENT_ORDER.map((id) => {
                  const source = SOURCES[id];
                  return (
                    <li key={id}>
                      <a
                        className="flex min-h-9 items-center gap-2 rounded-lg pr-1.5 text-[12px] text-white/42 transition-colors duration-150 hover:text-white/86 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
                        href={source.href}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <SourceMark identity={source} label={source.name} size={15} />
                        {source.name}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * A lower third in Ani's frame, carrying the loudest pair DEX Screener returned
 * on this request. It is the same object the workspace would put in a tool
 * result, so the character and the tooling read as one thing rather than as a
 * portrait next to a product.
 */
function HeroReadout({ lead }: { lead: TokenSignal | null }) {
  if (!lead) {
    return (
      <p className="absolute right-5 bottom-5 left-5 font-mono text-[10px] text-white/24 sm:left-8">
        market source unavailable · nothing to read
      </p>
    );
  }

  const positive = (lead.change24h ?? 0) >= 0;

  return (
    <a
      className="group absolute right-4 bottom-4 left-4 flex max-w-[27rem] items-center gap-3.5 ani-edge ani-edge-hover rounded-control bg-black/48 p-3 pr-3.5 backdrop-blur-md transition-[background-color,box-shadow,scale] duration-150 ease-out hover:bg-black/68 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 active:scale-[0.98] sm:right-6 sm:bottom-6 sm:left-6"
      href={lead.url}
      rel="noreferrer"
      target="_blank"
    >
      <TokenAvatar
        address={lead.address}
        imageUrl={lead.imageUrl}
        size={34}
        symbol={lead.symbol}
      />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.05em] text-white/34">
          <SourceMark identity={SOURCES.dexscreener} label="dexscreener.com" size={10} />
          loudest boost right now
        </p>
        <p className="mt-1 truncate text-[13px] font-medium tracking-[-0.015em] text-white/90">
          {lead.symbol}
          <span className="ml-2 font-normal text-white/34">{lead.name}</span>
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-mono text-[12px] text-white/86 tabular-nums">{usd(lead.priceUsd)}</p>
        <p
          className={cn(
            "font-mono text-[10px] tabular-nums",
            lead.change24h === null
              ? "text-white/28"
              : positive
                ? "text-[color:var(--blush)]"
                : "text-white/44",
          )}
        >
          {percent(lead.change24h)}
        </p>
      </div>
      <ArrowUpRight
        className="size-4 shrink-0 text-white/20 transition-colors duration-150 group-hover:text-white/62"
        strokeWidth={1.5}
      />
    </a>
  );
}
