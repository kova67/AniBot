"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

/**
 * The AniBot ASCII signature: a shaded heart with a pulse.
 *
 * It replaces the orbital sphere that used to sit here. The sphere was generic —
 * every terminal-flavoured product has one — and it needed a lot of grid to
 * stay legible, which left a hole in the footer. A heart is the character's
 * mark, reads at half the size, and the double-thump gives the page one last
 * sign that something is alive down there.
 *
 * The shape is the implicit heart curve, shaded as if it bulges toward the
 * viewer, so it is lit by the same upper-left key as everything else rather
 * than being a flat silhouette.
 */

const RAMP = " .·:-=+*#%@";

/**
 * A monospace cell is taller than it is wide. IBM Plex Mono advances 0.6em per
 * character against the line-height pinned on the element, so a cell is about
 * 1.58x taller than wide.
 *
 * The line-height is set inline rather than with a class on purpose: a utility
 * for it loses to the font-size utility here, which silently left the real
 * ratio at 2.27 and stretched the drawing into a blob.
 */
const LINE_HEIGHT = 0.95;
/** IBM Plex Mono advances 0.6em per character with tracking zeroed. */
const CELL_ASPECT = LINE_HEIGHT / 0.6;

type Grid = { cols: number; rows: number };

/** The curve is 2.3 units wide against 2.2 tall — very nearly square. */
const HEART_ASPECT = 2.3 / 2.2;

/** Columns follow from rows, so changing the size cannot skew the shape. */
function gridFor(rows: number): Grid {
  return { cols: Math.round(rows * HEART_ASPECT * CELL_ASPECT), rows };
}

const SIZES: Record<"compact" | "full", Grid> = {
  compact: gridFor(10),
  full: gridFor(16),
};

const LIGHT = (() => {
  const [x, y, z] = [-0.42, 0.58, 0.7];
  const length = Math.hypot(x, y, z);
  return { x: x / length, y: y / length, z: z / length };
})();

/**
 * A resting beat with a second, softer thump — the shape of a real pulse rather
 * than a sine wave, which reads as breathing instead of a heartbeat.
 */
function beatScale(time: number): number {
  const period = 1.15;
  const phase = (time % period) / period;
  const thump = (offset: number, width: number) =>
    Math.exp(-width * (phase - offset) ** 2);
  return 1 + 0.075 * (thump(0.06, 340) + 0.55 * thump(0.26, 340));
}

function renderHeart(grid: Grid, time: number) {
  const { cols, rows } = grid;
  const scale = beatScale(time);
  const lines: string[] = [];

  for (let row = 0; row < rows; row += 1) {
    let line = "";
    for (let col = 0; col < cols; col += 1) {
      // Heart space. The curve spans x ∈ [-1.15, 1.15] and y ∈ [-1, 1.2], so
      // the vertical map is offset to that centre — mapping it symmetrically
      // leaves a fifth of the grid empty under the point.
      const sx = ((col + 0.5) / cols) * 2 - 1;
      const sy = ((row + 0.5) / rows) * 2 - 1;
      const x = (sx * 1.25) / scale;
      const y = (-sy * 1.22 + 0.14) / scale;

      // (x² + y² - 1)³ - x²y³ <= 0 is inside the curve.
      const base = x * x + y * y - 1;
      const value = base ** 3 - x * x * y ** 3;
      if (value > 0) {
        line += " ";
        continue;
      }

      // Gradient of the same expression, for both an approximate distance and
      // the direction the surface faces at the edge.
      const dx = 6 * x * base * base - 2 * x * y ** 3;
      const dy = 6 * y * base * base - 3 * x * x * y * y;
      const gradient = Math.hypot(dx, dy);
      if (gradient < 1e-6) {
        line += RAMP[RAMP.length - 1];
        continue;
      }

      // Distance inside the shape, turned into a bulge toward the viewer.
      const depth = -value / gradient;
      const bulge = Math.sqrt(Math.min(1, depth / 0.34));
      const flat = 1 - bulge;
      const nx = (dx / gradient) * flat;
      const ny = (dy / gradient) * flat;
      const length = Math.hypot(nx, ny, bulge) || 1;

      const diffuse =
        (nx * LIGHT.x + ny * LIGHT.y + bulge * LIGHT.z) / length;
      const shade = 0.12 + 0.88 * Math.max(0, diffuse);
      line += RAMP[Math.max(1, Math.round(shade * (RAMP.length - 1)))];
    }
    // No trimming: a frame whose longest line is shorter resizes the <pre>,
    // which shoves the lockup beside it every heartbeat. Each line stays
    // exactly `cols` characters so the block is a fixed rectangle.
    lines.push(line);
  }

  return lines.join("\n");
}

export function AsciiHeart({
  className,
  compact = false,
  label = "AniBot signature",
}: {
  className?: string;
  compact?: boolean;
  label?: string;
}) {
  const nodeRef = useRef<HTMLPreElement>(null);
  const grid = SIZES[compact ? "compact" : "full"];

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frameId = 0;
    let last = performance.now();
    let time = 0;
    let lastPaint = 0;
    let previous = "";
    let visible = true;

    const paint = () => {
      const next = renderHeart(grid, time);
      if (next !== previous) {
        node.textContent = next;
        previous = next;
      }
    };

    const draw = (now: number) => {
      frameId = requestAnimationFrame(draw);
      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (!visible) return;
      // A character grid cannot show more than a few distinct frames a second,
      // and the thump is the only fast part of the cycle.
      if (now - lastPaint < 33) return;
      lastPaint = now;
      time += delta;
      paint();
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(node);

    const start = () => {
      cancelAnimationFrame(frameId);
      if (reduced.matches) {
        // Rest, not mid-thump.
        time = 0.62;
        paint();
        return;
      }
      last = performance.now();
      frameId = requestAnimationFrame(draw);
    };

    reduced.addEventListener("change", start);
    start();

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      reduced.removeEventListener("change", start);
    };
  }, [compact, grid]);

  return (
    <pre
      aria-label={label}
      className={cn(
        "block shrink-0 overflow-hidden font-mono font-medium whitespace-pre text-white/28 select-none",
        compact ? "text-[6px]" : "text-[10px]",
        className,
      )}
      ref={nodeRef}
      role="img"
      style={{
        // Reserved from the grid, not measured from the glyphs, so the beat
        // cannot move anything around it.
        height: `${(grid.rows * LINE_HEIGHT).toFixed(3)}em`,
        letterSpacing: 0,
        lineHeight: LINE_HEIGHT,
        width: `${grid.cols}ch`,
      }}
    />
  );
}
