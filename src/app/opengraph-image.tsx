import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "AniBot — The open agent for crypto";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Satori resolves neither CSS custom properties nor Tailwind classes, so the
 * card has to carry literal colours. These mirror the tokens in globals.css —
 * keep them in step with `--pearl`, `--blush` and `--violet` if those move.
 */
const PALETTE = {
  black: "#000000",
  blush: "231,180,192",
  hairline: "rgba(255,255,255,0.10)",
  pearl: "#f6f1ee",
  pearlDim: "rgba(246,241,238,0.52)",
  pearlFaint: "rgba(246,241,238,0.44)",
  pearlSoft: "rgba(246,241,238,0.60)",
  violet: "142,124,200",
} as const;

const OG_DIR = join(process.cwd(), "src/app/_og");
const BRAND_DIR = join(process.cwd(), "public/brand");

async function dataUri(path: string, mime = "image/png") {
  const file = await readFile(path);
  return `data:${mime};base64,${file.toString("base64")}`;
}

/**
 * The share card.
 *
 * Satori draws this, so it is flexbox and plain gradients only — no conic
 * gradients, no backdrop filters, and every font and image has to be handed
 * over as bytes rather than fetched by the renderer. The marks are the same
 * files the product uses, so the card cannot drift from the interface.
 */
export default async function OpengraphImage() {
  const [medium, semibold, dexscreener, pumpfun, helius, polymarket] = await Promise.all([
    readFile(join(OG_DIR, "onest-500.ttf")),
    readFile(join(OG_DIR, "onest-600.ttf")),
    dataUri(join(BRAND_DIR, "dexscreener.png")),
    dataUri(join(BRAND_DIR, "pumpfun.png")),
    dataUri(join(OG_DIR, "helius.png")),
    dataUri(join(BRAND_DIR, "polymarket.png")),
  ]);

  const sources = [
    { mark: dexscreener, name: "DEX Screener" },
    { mark: pumpfun, name: "Pump.fun" },
    { mark: helius, name: "Helius" },
    { mark: polymarket, name: "Polymarket" },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          background: PALETTE.black,
          color: PALETTE.pearl,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          padding: "72px 80px",
          position: "relative",
          width: "100%",
        }}
      >
        {/* Her light, in the same place it sits on the page. */}
        <div
          style={{
            backgroundImage:
              `radial-gradient(760px 420px at 22% 0%, rgba(${PALETTE.blush},0.22), rgba(0,0,0,0) 70%)`,
            display: "flex",
            height: size.height,
            left: 0,
            position: "absolute",
            top: 0,
            width: size.width,
          }}
        />
        <div
          style={{
            backgroundImage:
              `radial-gradient(560px 340px at 90% 100%, rgba(${PALETTE.violet},0.20), rgba(0,0,0,0) 70%)`,
            display: "flex",
            height: size.height,
            left: 0,
            position: "absolute",
            top: 0,
            width: size.width,
          }}
        />

        {/* lockup */}
        <div style={{ alignItems: "center", display: "flex", gap: 16 }}>
          <svg fill="none" height="42" viewBox="0 0 24 24" width="42">
            <circle cx="12" cy="12" fill={PALETTE.pearl} r="9.25" />
            <path d="M10.75 2.9 12 5.25l1.25-2.35Z" fill="#050505" />
            <ellipse cx="8.95" cy="12.15" fill="#050505" rx="1.35" ry="1.72" />
            <ellipse cx="15.05" cy="12.15" fill="#050505" rx="1.35" ry="1.72" />
          </svg>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 600, letterSpacing: "-0.04em" }}>
            <span>Ani</span>
            <span style={{ color: PALETTE.pearlFaint }}>Bot</span>
          </div>
        </div>

        {/* claim */}
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div
            style={{
              display: "flex",
              fontSize: 82,
              fontWeight: 600,
              letterSpacing: "-0.05em",
              lineHeight: 1.02,
              maxWidth: 900,
            }}
          >
            The open agent for crypto.
          </div>
          <div
            style={{
              color: PALETTE.pearlDim,
              display: "flex",
              fontSize: 27,
              lineHeight: 1.4,
              maxWidth: 820,
            }}
          >
            A live character who runs real Solana research, shows the evidence, and
            speaks the answer.
          </div>
        </div>

        {/* what she calls */}
        <div
          style={{
            alignItems: "center",
            borderTop: `1px solid ${PALETTE.hairline}`,
            display: "flex",
            gap: 34,
            paddingTop: 26,
          }}
        >
          {sources.map((source) => (
            <div
              key={source.name}
              style={{
                alignItems: "center",
                color: PALETTE.pearlSoft,
                display: "flex",
                fontSize: 21,
                gap: 10,
              }}
            >
              <img alt="" height={26} src={source.mark} width={26} />
              <span>{source.name}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { data: medium, name: "Onest", style: "normal", weight: 500 },
        { data: semibold, name: "Onest", style: "normal", weight: 600 },
      ],
    },
  );
}
