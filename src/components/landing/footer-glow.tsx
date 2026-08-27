"use client";

import { AuroraField } from "@/components/atmosphere/aurora-field";

/**
 * The sign-off: the name standing in its own light at the bottom of the page.
 *
 * Three layers, back to front — the same aurora shader the hero uses but
 * anchored to the bottom edge, a row of blurred lamps for the discrete hotspots
 * that make it read as light sources rather than a wash, and the wordmark
 * masked so it dissolves into them.
 *
 * Both animated layers sleep when the footer is off screen, so this costs
 * nothing until someone scrolls to it — by which point the hero's field has
 * gone to sleep for the same reason.
 */
export function FooterGlow() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative isolate h-[clamp(16rem,38vw,32rem)] w-full select-none overflow-hidden"
    >
      <div className="absolute inset-0">
        <AuroraField anchor="bottom" intensity={1.15} />
      </div>

      {/* The lamps sit on the letters' own baseline and bloom upward past their
          cap height, which is what makes them read as sources behind the type
          rather than a glow under it. */}
      <div className="ani-lamps absolute inset-x-[-8%] bottom-0 h-full" />
      <div className="ani-lamps-core absolute inset-x-[-4%] bottom-0 h-full" />

      {/* Keeps the glow from washing into the content above. */}
      <div className="absolute inset-x-0 top-0 h-24 bg-linear-to-b from-black to-transparent" />

      <p className="ani-footer-mark absolute inset-x-0 bottom-0 translate-y-[9%] text-center text-[clamp(4rem,21.5vw,19.5rem)] whitespace-nowrap">
        AniBot
      </p>
    </div>
  );
}
