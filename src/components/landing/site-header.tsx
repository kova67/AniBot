"use client";

import { ArrowRight, Info, Menu } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { AniLockup } from "@/components/brand/ani-mark";
import { GitHubMark } from "@/components/brand/github-mark";
import { SourceMark } from "@/components/brand/source-mark";
import { XMark } from "@/components/brand/x-mark";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SOURCES } from "@/lib/brand/sources";
import { cn } from "@/lib/utils";

const X_URL = process.env.NEXT_PUBLIC_ANIBOT_X_URL
  ?? "https://x.com/search?q=ANIBOT&src=typed_query";
const PUMPFUN_URL = process.env.NEXT_PUBLIC_ANIBOT_PUMPFUN_URL ?? SOURCES.pumpfun.href;
const GITHUB_URL = process.env.NEXT_PUBLIC_ANIBOT_GITHUB_URL ?? "https://github.com";

export interface NavItem {
  href: string;
  label: string;
}

/**
 * Watches a 1px sentinel at the very top of the document.
 *
 * A scroll listener would fire hundreds of times a second to answer one boolean;
 * the sentinel answers it twice — once on the way down, once on the way back.
 */
function useScrolledPastTop() {
  const sentinel = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 1 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { scrolled, sentinel };
}

/**
 * Which section is currently under the header. Purely an orientation cue — the
 * links work identically whether or not this resolves.
 */
function useActiveSection(items: readonly NavItem[]) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const ids = items.map((item) => item.href.replace("#", ""));
    const nodes = ids
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => node !== null);
    if (nodes.length === 0) return;

    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visible.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        }
        // The section occupying the most of the viewport wins; below any
        // meaningful coverage nothing is marked, so the hero has no false match.
        let best: string | null = null;
        let bestRatio = 0.08;
        for (const [id, ratio] of visible) {
          if (ratio > bestRatio) {
            best = id;
            bestRatio = ratio;
          }
        }
        setActive(best);
      },
      // Discount the sticky header so a section counts only once it is properly
      // in view rather than the instant its top edge slides under the bar.
      { rootMargin: "-72px 0px -45% 0px", threshold: [0, 0.1, 0.25, 0.5, 0.75] },
    );
    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [items]);

  return active;
}

function HackathonInfo({ mobile = false }: { mobile?: boolean }) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            aria-label="About the Pump.fun Hackathon project"
            className={cn(
              "flex items-center text-white/46 transition-[background-color,color,scale] duration-150 hover:bg-white/[0.05] hover:text-white/86 active:scale-[0.96]",
              mobile
                ? "min-h-12 w-full gap-3 rounded-lg px-3 text-[14px]"
                : "size-10 justify-center rounded-lg",
            )}
            title="Pump.fun Hackathon project"
            type="button"
          />
        }
      >
        <Info className="size-[17px]" strokeWidth={1.5} />
        {mobile ? <span>Pump.fun Hackathon</span> : null}
      </DialogTrigger>
      <DialogContent className="rounded-xl border-0 bg-dialog shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.1),0_30px_100px_rgb(0_0_0_/_0.75)] sm:max-w-md">
        <DialogHeader>
          <div className="mb-3 flex size-10 items-center justify-center rounded-[10px] bg-white/[0.055]">
            <SourceMark identity={SOURCES.pumpfun} label="Pump.fun" size={20} />
          </div>
          <DialogTitle>Built for the Pump.fun Hackathon</DialogTitle>
          <DialogDescription className="text-pretty leading-6">
            AniBot is a Web3-native agent with verifiable crypto tools, an expressive
            3D companion, and an open architecture designed for builders to extend.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <a
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-white text-[13px] font-medium text-black transition-[background-color,scale] duration-150 hover:bg-white/88 active:scale-[0.96]"
            href={PUMPFUN_URL}
            rel="noreferrer"
            target="_blank"
          >
            <SourceMark identity={SOURCES.pumpfun} label="Pump.fun" size={16} />
            Pump.fun
            <ArrowRight className="size-3.5" strokeWidth={2} />
          </a>
          <a
            className="ani-edge ani-edge-hover flex h-11 items-center justify-center gap-2 rounded-lg bg-white/[0.035] text-[13px] text-white/68 transition-[background-color,color,box-shadow,scale] duration-150 hover:bg-white/[0.07] hover:text-white active:scale-[0.96]"
            href={GITHUB_URL}
            rel="noreferrer"
            target="_blank"
          >
            <GitHubMark className="size-4" />
            View source
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SiteHeader({ nav }: { nav: readonly NavItem[] }) {
  const { scrolled, sentinel } = useScrolledPastTop();
  const active = useActiveSection(nav);

  return (
    <>
      <div aria-hidden="true" className="absolute top-0 h-px w-full" ref={sentinel} />

      <header
        className={cn(
          "sticky top-0 z-50 transition-[background-color,backdrop-filter] duration-300 ease-out",
          // Transparent over the hero so the aurora is not sitting under a
          // sheet of frosted black; it only becomes a surface once there is
          // content to separate itself from.
          scrolled
            ? "ani-hairline-fade bg-black/72 backdrop-blur-xl"
            : "bg-transparent",
        )}
      >
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-10">
          <AniLockup />

          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {nav.map((item) => {
              const isActive = active === item.href.replace("#", "");
              return (
                <a
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "relative flex h-10 items-center rounded-lg px-3.5 text-[13px] transition-colors duration-150",
                    isActive
                      ? "text-white"
                      : "text-white/46 hover:bg-white/[0.045] hover:text-white/86",
                  )}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-x-3.5 bottom-1.5 h-px origin-left bg-[color:var(--blush)] transition-[transform,opacity] duration-300 ease-out",
                      isActive ? "scale-x-100 opacity-80" : "scale-x-0 opacity-0",
                    )}
                  />
                </a>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <div className="flex items-center gap-0.5 border-r border-white/10 pr-2">
              <a
                aria-label="AniBot on GitHub"
                className="flex size-10 items-center justify-center rounded-lg text-white/42 transition-[background-color,color,scale] duration-150 hover:bg-white/[0.05] hover:text-white active:scale-[0.96]"
                href={GITHUB_URL}
                rel="noreferrer"
                target="_blank"
                title="AniBot on GitHub"
              >
                <GitHubMark className="size-[17px]" />
              </a>
              <a
                aria-label="AniBot on X"
                className="flex size-10 items-center justify-center rounded-lg text-white/42 transition-[background-color,color,scale] duration-150 hover:bg-white/[0.05] hover:text-white active:scale-[0.96]"
                href={X_URL}
                rel="noreferrer"
                target="_blank"
                title="AniBot on X"
              >
                <XMark className="size-[15px]" />
              </a>
              <a
                aria-label="AniBot on Pump.fun"
                className="flex size-10 items-center justify-center rounded-lg opacity-64 transition-[background-color,opacity,scale] duration-150 hover:bg-white/[0.05] hover:opacity-100 active:scale-[0.96]"
                href={PUMPFUN_URL}
                rel="noreferrer"
                target="_blank"
                title="AniBot on Pump.fun"
              >
                <SourceMark identity={SOURCES.pumpfun} label="Pump.fun" size={17} />
              </a>
              <HackathonInfo />
            </div>
            <Link
              className="group flex h-10 items-center gap-1.5 rounded-chip bg-white pr-3 pl-4 text-[13px] font-medium text-black transition-[background-color,scale] duration-150 ease-out hover:bg-white/88 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.96]"
              href="/agent"
            >
              Open workspace
              <ArrowRight
                className="size-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5"
                strokeWidth={2}
              />
            </Link>
          </div>

          <Sheet>
            <SheetTrigger
              aria-label="Open navigation"
              className="flex size-11 items-center justify-center rounded-lg text-white/56 transition-[background-color,color,scale] duration-150 hover:bg-white/[0.05] hover:text-white active:scale-[0.96] md:hidden"
            >
              <Menu className="size-5" strokeWidth={1.5} />
            </SheetTrigger>
            <SheetContent className="border-white/10 bg-sheet p-6">
              <div className="mt-8 flex flex-col">
                <AniLockup />
                <div className="mt-6 flex flex-col">
                  {nav.map((item) => (
                    <a
                      className="flex min-h-12 items-center rounded-lg px-3 text-[15px] text-white/60 transition-colors duration-150 hover:bg-white/[0.05] hover:text-white"
                      href={item.href}
                      key={item.href}
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
                <div className="mt-5 border-t border-white/[0.07] pt-4">
                  <a
                    className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-[14px] text-white/54 transition-colors duration-150 hover:bg-white/[0.05] hover:text-white"
                    href={GITHUB_URL}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <GitHubMark className="size-[17px]" />
                    GitHub
                  </a>
                  <a
                    className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-[14px] text-white/54 transition-colors duration-150 hover:bg-white/[0.05] hover:text-white"
                    href={X_URL}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <XMark className="size-4" />
                    AniBot on X
                  </a>
                  <a
                    className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-[14px] text-white/54 transition-colors duration-150 hover:bg-white/[0.05] hover:text-white"
                    href={PUMPFUN_URL}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <SourceMark identity={SOURCES.pumpfun} label="Pump.fun" size={17} />
                    Pump.fun
                  </a>
                  <HackathonInfo mobile />
                </div>
                <Link
                  className="mt-6 flex h-12 items-center justify-center gap-2 rounded-control bg-white text-[14px] font-medium text-black active:scale-[0.96]"
                  href="/agent"
                >
                  Open workspace
                  <ArrowRight className="size-4" strokeWidth={2} />
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
    </>
  );
}
