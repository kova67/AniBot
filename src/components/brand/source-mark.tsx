"use client";

import Image from "next/image";

import {
  hostOf,
  identityForTool,
  identityForUrl,
  monogramFor,
  type SourceIdentity,
} from "@/lib/brand/sources";
import { cn } from "@/lib/utils";

/**
 * The service mark for a result. Falls back to the host's initial rather than
 * a generic icon, so two different sources never look like the same source.
 */
export function SourceMark({
  className,
  identity,
  label,
  size = 16,
}: {
  className?: string;
  identity: SourceIdentity | null;
  /** URL or host used for the monogram when no mark is known. */
  label: string;
  size?: number;
}) {
  if (!identity) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "flex shrink-0 items-center justify-center rounded-[5px] bg-white/[0.07] font-mono text-[9px] leading-none text-white/50",
          className,
        )}
        style={{ height: size, width: size }}
      >
        {monogramFor(label)}
      </span>
    );
  }

  return (
    <Image
      alt=""
      aria-hidden="true"
      className={cn("shrink-0 rounded-[4px] object-contain", className)}
      height={size}
      src={identity.mark}
      unoptimized
      width={size}
    />
  );
}

export function SourceMarkForTool({
  className,
  size,
  toolName,
}: {
  className?: string;
  size?: number;
  toolName: string;
}) {
  return (
    <SourceMark
      className={className}
      identity={identityForTool(toolName)}
      label={toolName}
      size={size}
    />
  );
}

/**
 * A clickable attribution chip. Used wherever Ani cites where a number came
 * from — the source stays visible and stays a link.
 */
export function SourceChip({ title, url }: { title: string; url: string }) {
  const identity = identityForUrl(url);
  const host = hostOf(url);
  // The mark already says which service answered, so drop a trailing
  // "… on DEX Screener" and keep the part that identifies the actual result.
  const subject = identity
    ? title.replace(new RegExp(`\\s+on\\s+${identity.name}$`, "i"), "").trim()
    : title.trim();
  const display = subject || identity?.name || host || title;

  return (
    <a
      className="group/chip flex h-8 max-w-[15rem] items-center gap-2 ani-edge-soft ani-edge-hover rounded-chip bg-white/[0.028] pr-3 pl-2 text-[11px] text-white/44 transition-[background-color,color,box-shadow,scale] duration-150 ease-out hover:bg-white/[0.06] hover:text-white/82 active:scale-[0.96]"
      href={url}
      rel="noreferrer"
      target="_blank"
      title={`${title} — ${host ?? url}`}
    >
      <SourceMark identity={identity} label={host ?? url} size={14} />
      <span className="truncate">{display}</span>
    </a>
  );
}
