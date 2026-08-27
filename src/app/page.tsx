import { LandingPage } from "@/components/landing/landing-page";
import { getTrendingTokens } from "@/lib/agent/market-tools";
import type { TokenSignal } from "@/lib/agent/types";

// The boosted list turns over slowly; a minute of cache keeps the page fast
// without ever showing a number that is meaningfully stale.
export const revalidate = 60;

export default async function Home() {
  let tokens: TokenSignal[] = [];
  let fetchedAt: string | null = null;
  let error: string | null = null;

  try {
    tokens = await getTrendingTokens();
    // Stamped on the server beside the request it describes. It is never
    // re-derived on the client, so there is nothing for hydration to disagree
    // with; the feed turns it into "4 min ago" inside an effect.
    fetchedAt = new Date().toISOString();
  } catch (cause) {
    // A market source that is down must not take the page down with it. The
    // feed renders its own unavailable state and offers a retry.
    error = cause instanceof Error ? cause.message : "Market source unavailable";
  }

  return (
    <LandingPage
      initialError={error}
      initialFetchedAt={fetchedAt}
      initialTokens={tokens}
    />
  );
}
