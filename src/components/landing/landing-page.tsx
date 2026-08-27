"use client";

import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { AniLockup, AniMark } from "@/components/brand/ani-mark";
import { AsciiHeart } from "@/components/brand/ascii-heart";
import { SourceMark } from "@/components/brand/source-mark";
import { AnswerAnatomy } from "@/components/landing/answer-anatomy";
import { FooterGlow } from "@/components/landing/footer-glow";
import { SiteHeader, type NavItem } from "@/components/landing/site-header";
import { Hero } from "@/components/landing/hero";
import { LiveFeed } from "@/components/landing/live-feed";
import { Reveal, useSpotlight } from "@/components/motion/reveal";
import type { TokenSignal } from "@/lib/agent/types";
import { SOURCES, type SourceId } from "@/lib/brand/sources";

/**
 * What each service is actually asked for, and what actually comes back. The
 * `needsKey` line is not a teaser: Helius genuinely does nothing until a key is
 * present, and saying so is better than a locked-feature badge.
 */
const INSTRUMENTS: ReadonlyArray<{
  id: SourceId;
  ask: string;
  returns: string;
  needsKey?: string;
}> = [
  {
    id: "solana",
    ask: "Is the network healthy, and where are we in the current epoch?",
    returns: "RPC health · slot · block height · epoch progress · transaction count",
    needsKey: "Uses the configured Helius Solana RPC so the status call shares the same production-grade path as wallet research.",
  },
  {
    id: "dexscreener",
    ask: "Which Solana pairs are being boosted, and what does the deepest one look like?",
    returns: "price · 24h change · liquidity · 24h buys and sells · pair link",
  },
  {
    id: "pumpfun",
    ask: "Who launched this mint, and how far has it fallen from its high?",
    returns: "creator · launch date · graduated or still on the curve · market cap vs all-time high",
  },
  {
    id: "helius",
    ask: "What does this wallet hold, and how concentrated is this token's supply?",
    returns: "SOL balance · asset count · holdings · what share the largest accounts hold",
    needsKey: "Needs your own HELIUS_API_KEY. The public Solana RPCs rate-limit the concentration call, so without a key Ani says so instead of guessing.",
  },
  {
    id: "polymarket",
    ask: "Is anyone already pricing this question?",
    returns: "matching events · volume · liquidity · market link",
  },
];

/** A fresh [] on every render would defeat memoisation downstream. */
const NO_TOKENS: readonly TokenSignal[] = [];

const NAV: readonly NavItem[] = [
  { href: "#instruments", label: "Instruments" },
  { href: "#live", label: "Live feed" },
  { href: "#answer", label: "How she answers" },
];

export function LandingPage({
  initialError = null,
  initialFetchedAt = null,
  initialTokens = NO_TOKENS,
}: {
  initialError?: string | null;
  initialFetchedAt?: string | null;
  initialTokens?: readonly TokenSignal[];
}) {
  return (
    <div className="ani-grain relative min-h-screen bg-black text-white">
      <SiteHeader nav={NAV} />

      <main>
        <Hero lead={initialTokens[0] ?? null} />

        {/* --- instruments -------------------------------------------------- */}
        <section
          className="mx-auto max-w-[1240px] scroll-mt-24 px-5 pt-24 pb-20 sm:px-8 lg:px-10 lg:pt-32"
          id="instruments"
        >
          <Reveal className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div>
              <p className="font-mono text-[11px] tracking-[0.04em] text-white/32">
                instruments
              </p>
              <h2 className="mt-5 max-w-[22rem] text-balance text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.04] font-medium tracking-[-0.045em]">
                Web3-native tools, with receipts for every claim.
              </h2>
            </div>
            <p className="max-w-[36rem] self-end text-pretty text-[16px] leading-7 text-white/44">
              Ani is an agent, not a themed chatbot. She chooses from live market,
              token, wallet, chain-health, launch-provenance, and prediction-market
              tools; streams the work into the conversation; and leaves every source
              attached so the answer can be checked.
            </p>
          </Reveal>

          <ul className="mt-14 border-t border-white/[0.08]">
            {INSTRUMENTS.map((instrument, index) => (
              <InstrumentRow index={index} instrument={instrument} key={instrument.id} />
            ))}
          </ul>
        </section>

        {/* --- live feed ---------------------------------------------------- */}
        <section
          className="mx-auto max-w-[1240px] scroll-mt-24 px-5 py-20 sm:px-8 lg:px-10 lg:py-28"
          id="live"
        >
          <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="font-mono text-[11px] tracking-[0.04em] text-white/32">
                live feed
              </p>
              <h2 className="mt-5 max-w-[26rem] text-balance text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.04] font-medium tracking-[-0.045em]">
                Live Solana context, not canned cards.
              </h2>
            </div>
            <p className="max-w-[26rem] text-pretty text-[14px] leading-6 text-white/40">
              Boosted visibility is attention, not quality. Ani says that out loud every
              time she reads this list.
            </p>
          </Reveal>

          <Reveal>
            <LiveFeed
              initialError={initialError}
              initialFetchedAt={initialFetchedAt}
              initialTokens={initialTokens}
            />
          </Reveal>
        </section>

        {/* --- how she answers ---------------------------------------------- */}
        <section
          className="mx-auto max-w-[1240px] scroll-mt-24 px-5 py-20 sm:px-8 lg:px-10 lg:py-28"
          id="answer"
        >
          <Reveal className="mb-10 max-w-[42rem]">
            <p className="font-mono text-[11px] tracking-[0.04em] text-white/32">
              how she answers
            </p>
            <h2 className="mt-5 text-balance text-[clamp(1.9rem,3.4vw,2.9rem)] leading-[1.04] font-medium tracking-[-0.045em]">
              Agent work stays visible while Ani stays alive.
            </h2>
            <p className="mt-6 text-pretty text-[16px] leading-7 text-white/44">
              Tool calls, sources, streaming text, voice, and the replaceable VRM
              presentation layer share one interface. Press run—the panel makes the
              same live call the workspace uses.
            </p>
          </Reveal>

          <Reveal delay={80}>
            <AnswerAnatomy />
          </Reveal>
        </section>

        {/* --- close --------------------------------------------------------- */}
        <section className="mx-auto max-w-[1240px] px-5 pt-10 pb-28 sm:px-8 lg:px-10 lg:pb-40">
          <Reveal className="ani-lit relative overflow-hidden rounded-panel bg-panel px-6 py-16 text-center sm:px-12 sm:py-20">
            <div className="ani-stage-light pointer-events-none absolute inset-x-0 top-0 -z-10 h-full opacity-70" />
            <AniMark className="mx-auto text-white/70" size={30} />
            <h2 className="mx-auto mt-8 max-w-[24rem] text-balance text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.03] font-medium tracking-[-0.05em]">
              Ask her something.
            </h2>
            <p className="mx-auto mt-5 max-w-[30rem] text-pretty text-[15px] leading-7 text-white/44">
              Meet Ani before signing in. When you ask her to use a tool, continue
              with email or a Solana wallet and your thread follows you.
            </p>
            <Link
              className="group mx-auto mt-9 flex h-12 w-full max-w-[16rem] items-center justify-center gap-2 rounded-control bg-white text-[14px] font-medium text-black transition-[background-color,scale] duration-150 ease-out hover:bg-white/88 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.96]"
              href="/agent"
            >
              Open the workspace
              <ArrowRight
                className="size-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5"
                strokeWidth={2}
              />
            </Link>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-white/[0.07]">
        <div className="mx-auto grid max-w-[1240px] gap-10 px-5 pt-12 pb-4 sm:px-8 lg:grid-cols-[1fr_auto] lg:px-10">
          <div className="flex items-start gap-4">
            {/* Below sm the lockup's glyph carries the identity on its own. */}
            <AsciiHeart className="mt-0.5 hidden shrink-0 sm:block" />
            <div>
              <AniLockup href={null} />
              <p className="mt-3 max-w-[24rem] text-[12px] leading-6 text-white/32">
                A research interface, not financial advice. Verify anything you would act
                on — Ani leaves the links there for exactly that.
              </p>
            </div>
          </div>

          <div className="lg:text-right">
            <p className="font-mono text-[10px] tracking-[0.05em] text-white/26">
              data sources
            </p>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 lg:justify-end">
              {(Object.keys(SOURCES) as SourceId[]).map((id) => (
                <li key={id}>
                  <a
                    className="flex min-h-8 items-center gap-1.5 text-[12px] text-white/34 transition-colors duration-150 hover:text-white/78"
                    href={SOURCES[id].href}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <SourceMark identity={SOURCES[id]} label={SOURCES[id].name} size={13} />
                    {SOURCES[id].name}
                    <ArrowUpRight className="size-3.5 text-white/20" strokeWidth={1.5} />
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-6 font-mono text-[11px] text-white/22 tabular-nums">
              © 2026 AniBot
            </p>
          </div>
        </div>

        <FooterGlow />
      </footer>
    </div>
  );
}

function InstrumentRow({
  index,
  instrument,
}: {
  index: number;
  instrument: (typeof INSTRUMENTS)[number];
}) {
  const spotlight = useSpotlight();
  const source = SOURCES[instrument.id];

  return (
    <Reveal as="li" delay={index * 70}>
      <div
        className="ani-spotlight group relative grid gap-5 border-b border-white/[0.08] py-8 transition-[background-color] duration-200 ease-out hover:bg-white/[0.016] md:grid-cols-[16rem_1fr] md:gap-10 md:py-9"
        {...spotlight}
      >
        <div className="relative z-1 flex items-start gap-3.5 md:pl-2">
          <SourceMark
            className="mt-0.5"
            identity={source}
            label={source.name}
            size={26}
          />
          <div>
            <h3 className="text-[16px] font-medium tracking-[-0.02em] text-white/92">
              {source.name}
            </h3>
            <p className="mt-1 text-[12px] leading-5 text-white/34">{source.role}</p>
          </div>
        </div>

        <div className="relative z-1 min-w-0 md:pr-2">
          <p className="max-w-[38rem] text-pretty text-[15px] leading-7 text-white/64">
            {instrument.ask}
          </p>
          <p className="mt-3.5 font-mono text-[11px] leading-5 text-white/30">
            → {instrument.returns}
          </p>
          {instrument.needsKey ? (
            <p className="mt-3 max-w-[34rem] text-[12px] leading-5 text-white/28">
              {instrument.needsKey}
            </p>
          ) : null}
        </div>
      </div>
    </Reveal>
  );
}
