"use client";

import Image from "next/image";
import { useState } from "react";

import { isPumpFunMint, SOURCES } from "@/lib/brand/sources";
import { cn } from "@/lib/utils";

/**
 * Token identity built only from what the market API actually returned.
 *
 * When DEX Screener carries an image for the mint we show it. When it does
 * not — which is common for fresh mints — we draw a monogram derived from the
 * symbol instead of inventing artwork or repeating a placeholder glyph.
 */
export function TokenAvatar({
  address,
  className,
  imageUrl,
  size = 36,
  symbol,
}: {
  address?: string | null;
  className?: string;
  imageUrl?: string | null;
  size?: number;
  symbol: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !failed;
  const initials = symbol.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 2).toUpperCase() || "?";
  const pumpMinted = isPumpFunMint(address);

  return (
    <span
      className={cn("relative block shrink-0", className)}
      style={{ height: size, width: size }}
    >
      <span
        // The radius tracks the rendered size so a 30px avatar inside a chip and
        // a 38px one inside a card stay on the same curve.
        className="relative block size-full overflow-hidden bg-white/[0.05] outline outline-white/10 -outline-offset-1"
        style={{ borderRadius: Math.max(6, Math.round(size * 0.26)) }}
      >
        {showImage ? (
          <Image
            alt=""
            aria-hidden="true"
            className="size-full object-cover"
            height={size * 2}
            onError={() => setFailed(true)}
            src={imageUrl as string}
            unoptimized
            width={size * 2}
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-full items-center justify-center font-mono font-medium text-white/58"
            style={{ fontSize: Math.max(9, Math.round(size * 0.34)) }}
          >
            {initials}
          </span>
        )}
      </span>

      {pumpMinted ? (
        <Image
          alt=""
          aria-hidden="true"
          className="absolute -right-1 -bottom-1 rounded-full bg-black object-contain p-px outline outline-black"
          height={Math.round(size * 0.42)}
          src={SOURCES.pumpfun.mark}
          title="Minted through Pump.fun"
          unoptimized
          width={Math.round(size * 0.42)}
        />
      ) : null}
    </span>
  );
}
