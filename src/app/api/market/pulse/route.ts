import { getTrendingTokens } from "@/lib/agent/market-tools";
import type { TokenSignal } from "@/lib/agent/types";

export const maxDuration = 15;
export const revalidate = 60;

export interface MarketPulse {
  tokens: TokenSignal[];
  fetchedAt: string;
}

/**
 * The landing page's only live data. It is the same DEX Screener call the
 * agent makes, so what a visitor sees before signing in is the real output of
 * a real tool. On failure it returns an error and no tokens — the page then
 * says the feed is unavailable rather than showing invented prices.
 */
export async function GET() {
  try {
    const tokens = await getTrendingTokens();
    return Response.json(
      { tokens, fetchedAt: new Date().toISOString() } satisfies MarketPulse,
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
    );
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Market source unavailable",
        tokens: [],
      },
      { status: 503 },
    );
  }
}
