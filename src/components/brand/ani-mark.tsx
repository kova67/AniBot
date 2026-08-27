"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

/** A teammate face first: one puck, two eyes, one small Ani cut. */
export function AniMark({
  className,
  size = 22,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      className={cn("block shrink-0", className)}
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" fill="currentColor" r="9.25" />
      <path d="M10.75 2.9 12 5.25l1.25-2.35Z" fill="#050505" />
      <ellipse cx="8.95" cy="12.15" fill="#050505" rx="1.35" ry="1.72" />
      <ellipse cx="15.05" cy="12.15" fill="#050505" rx="1.35" ry="1.72" />
    </svg>
  );
}

/**
 * Glyph + wordmark. "Ani" carries the character, "bot" carries the agent —
 * the two-tone keeps the name from reading as one generic product noun.
 */
export function AniLockup({
  className,
  href = "/",
  size = 22,
}: {
  className?: string;
  href?: string | null;
  size?: number;
}) {
  const content = (
    <>
      <AniMark className="text-white/88 transition-colors duration-150 group-hover:text-white" size={size} />
      <span className="text-[15px] font-medium tracking-[-0.045em] text-white">
        Ani<span className="text-white/44 transition-colors duration-150 group-hover:text-white/72">Bot</span>
      </span>
    </>
  );

  if (!href) {
    return (
      <span className={cn("group flex items-center gap-2.5", className)}>{content}</span>
    );
  }

  return (
    <Link
      aria-label="AniBot home"
      className={cn(
        "group flex min-h-11 items-center gap-2.5 rounded-lg pr-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60",
        className,
      )}
      href={href}
    >
      {content}
    </Link>
  );
}
