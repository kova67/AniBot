/**
 * Identity for the third-party services Ani actually calls.
 *
 * Every mark in `public/brand` is the service's own published icon, downloaded
 * from its own domain, and is used here only to attribute the source of a
 * result. Nothing in this file invents a brand: when a host is unknown the UI
 * falls back to the host's own favicon and then to a plain monogram.
 */

export type SourceId = "dexscreener" | "pumpfun" | "polymarket" | "helius" | "solana";

export interface SourceIdentity {
  /** Short display name, as the service writes it. */
  readonly name: string;
  /** What Ani uses it for — one honest clause, no marketing. */
  readonly role: string;
  /** Local path to the service's own mark. */
  readonly mark: string;
  /** Accent used only for hairlines and hover wash, never large fills. */
  readonly tint: string;
  readonly href: string;
  readonly id: SourceId;
}

export const SOURCES: Record<SourceId, SourceIdentity> = {
  dexscreener: {
    id: "dexscreener",
    name: "DEX Screener",
    role: "Live Solana pairs, liquidity, and 24h flow",
    mark: "/brand/dexscreener.png",
    tint: "255 255 255",
    href: "https://dexscreener.com",
  },
  pumpfun: {
    id: "pumpfun",
    name: "Pump.fun",
    role: "Creator, launch date, and life since the curve",
    mark: "/brand/pumpfun.png",
    tint: "108 214 150",
    href: "https://pump.fun",
  },
  polymarket: {
    id: "polymarket",
    name: "Polymarket",
    role: "Prediction-market volume and open questions",
    mark: "/brand/polymarket.png",
    tint: "142 160 240",
    href: "https://polymarket.com",
  },
  helius: {
    id: "helius",
    name: "Helius",
    role: "Wallet holdings and supply concentration",
    mark: "/brand/helius.svg",
    tint: "232 122 74",
    href: "https://www.helius.dev",
  },
  solana: {
    id: "solana",
    name: "Solana",
    role: "The chain every scan runs against",
    mark: "/brand/solana.svg",
    tint: "196 168 232",
    href: "https://solana.com",
  },
};

/** Host suffix → identity. Ordered longest-first at lookup time. */
const HOST_MAP: ReadonlyArray<readonly [string, SourceId]> = [
  ["dexscreener.com", "dexscreener"],
  ["pump.fun", "pumpfun"],
  ["polymarket.com", "polymarket"],
  ["helius.dev", "helius"],
  ["helius.xyz", "helius"],
  ["helius-rpc.com", "helius"],
  ["solana.com", "solana"],
];

/** Tool name → the service that answered it. */
const TOOL_MAP: Readonly<Record<string, SourceId>> = {
  getTrendingTokens: "dexscreener",
  get_trending_tokens: "dexscreener",
  searchTokens: "dexscreener",
  search_tokens: "dexscreener",
  offline_market_preview: "dexscreener",
  searchPredictionMarkets: "polymarket",
  search_prediction_markets: "polymarket",
  inspectWallet: "helius",
  inspect_wallet: "helius",
  getTokenMetadata: "helius",
  get_token_metadata: "helius",
  getWalletTransactionHistory: "helius",
  get_wallet_transaction_history: "helius",
  getSolanaNetworkStatus: "solana",
  get_solana_network_status: "solana",
  getAniBotToken: "solana",
  get_anibot_token: "solana",
  getHolderConcentration: "helius",
  get_holder_concentration: "helius",
  getPumpFunLaunch: "pumpfun",
  get_pumpfun_launch: "pumpfun",
};

export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function identityForUrl(url: string): SourceIdentity | null {
  const host = hostOf(url);
  if (!host) return null;
  for (const [suffix, id] of HOST_MAP) {
    if (host === suffix || host.endsWith(`.${suffix}`)) return SOURCES[id];
  }
  return null;
}

export function identityForTool(toolName: string): SourceIdentity | null {
  const id = TOOL_MAP[toolName];
  return id ? SOURCES[id] : null;
}

/**
 * A Solana mint minted through Pump.fun ends in the literal string `pump`.
 * That is a property of the address itself, not a claim we are inferring, so
 * it is safe to surface as provenance.
 */
export function isPumpFunMint(address: string | null | undefined): boolean {
  return typeof address === "string" && address.length >= 32 && address.endsWith("pump");
}

/**
 * Initial for a host we carry no local mark for. Deliberately not a favicon
 * service: that would leak every visited source host to a third party for a
 * 16px glyph.
 */
export function monogramFor(value: string): string {
  const clean = value.replace(/^https?:\/\//, "").replace(/^www\./, "");
  return (clean.trim()[0] ?? "?").toUpperCase();
}
