import type {
  HolderConcentration,
  PredictionSignal,
  PumpFunLaunch,
  TokenSignal,
} from "./types";

interface DexProfile {
  chainId?: string;
  tokenAddress?: string;
  url?: string;
  /** CMS id for the token's own artwork on DEX Screener. */
  icon?: string;
}

interface DexPair {
  chainId?: string;
  url?: string;
  baseToken?: { address?: string; name?: string; symbol?: string };
  priceUsd?: string | null;
  priceChange?: { h24?: number } | null;
  liquidity?: { usd?: number } | null;
  volume?: { h24?: number } | null;
  marketCap?: number | null;
  info?: { imageUrl?: string | null } | null;
  txns?: { h24?: { buys?: number; sells?: number } | null } | null;
}

interface PolymarketEvent {
  id?: string;
  title?: string;
  slug?: string;
  volume?: number;
  liquidity?: number;
  endDate?: string;
}

const DEX_BASE = "https://api.dexscreener.com";
const POLY_BASE = "https://gamma-api.polymarket.com";
const PUMP_BASE = "https://frontend-api-v3.pump.fun";
const HELIUS_RPC = "https://mainnet.helius-rpc.com";
const TRENDING_PROFILE_LIMIT = 12;

async function heliusRpc<T>(apiKey: string, method: string, params: unknown[]): Promise<T> {
  const response = await fetch(`${HELIUS_RPC}/?api-key=${apiKey}`, {
    body: JSON.stringify({ id: `anibot-${method}`, jsonrpc: "2.0", method, params }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Helius returned ${response.status}`);
  const body = (await response.json()) as { error?: { message?: string }; result?: T };
  if (body.error) throw new Error(body.error.message ?? "Helius rejected the call");
  if (body.result === undefined) throw new Error("Helius returned no result");
  return body.result;
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

async function getJson<T>(url: string, revalidate = 30): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "AniBot/0.1" },
    next: { revalidate },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Market source returned ${response.status}`);
  return response.json() as Promise<T>;
}

/** DEX Screener serves a token's own artwork from its CMS by icon id. */
function cmsImage(icon: string | undefined, size = 128): string | null {
  return icon
    ? `https://cdn.dexscreener.com/cms/images/${icon}?width=${size}&height=${size}&fit=crop&quality=90&format=auto`
    : null;
}

function toTokenSignal(
  pair: DexPair,
  fallbackUrl = "https://dexscreener.com/solana",
  fallbackImage: string | null = null,
): TokenSignal {
  return {
    address: pair.baseToken?.address ?? "unknown",
    symbol: pair.baseToken?.symbol ?? "—",
    name: pair.baseToken?.name ?? "Unknown token",
    priceUsd: finiteNumber(pair.priceUsd),
    change24h: finiteNumber(pair.priceChange?.h24),
    liquidityUsd: finiteNumber(pair.liquidity?.usd),
    volume24h: finiteNumber(pair.volume?.h24),
    marketCap: finiteNumber(pair.marketCap),
    url: pair.url ?? fallbackUrl,
    imageUrl: pair.info?.imageUrl ?? fallbackImage,
    buys24h: finiteNumber(pair.txns?.h24?.buys),
    sells24h: finiteNumber(pair.txns?.h24?.sells),
  };
}

function topSolanaPairs(pairs: readonly DexPair[], limit = 6): DexPair[] {
  const topPairs: DexPair[] = [];
  for (const pair of pairs) {
    if (pair.chainId !== "solana") continue;
    const liquidity = pair.liquidity?.usd ?? 0;
    let insertionIndex = topPairs.length;
    while (
      insertionIndex > 0
      && liquidity > (topPairs[insertionIndex - 1].liquidity?.usd ?? 0)
    ) {
      insertionIndex -= 1;
    }
    if (insertionIndex >= limit) continue;
    topPairs.splice(insertionIndex, 0, pair);
    if (topPairs.length > limit) topPairs.pop();
  }
  return topPairs;
}

export async function getTrendingTokens(): Promise<TokenSignal[]> {
  const profiles = await getJson<DexProfile[]>(`${DEX_BASE}/token-boosts/top/v1`);
  const addresses: string[] = [];
  const profileByAddress = new Map<string, DexProfile>();
  for (const profile of profiles) {
    const address = profile.tokenAddress;
    if (profile.chainId !== "solana" || !address) continue;
    addresses.push(address);
    if (!profileByAddress.has(address)) profileByAddress.set(address, profile);
    if (addresses.length === TRENDING_PROFILE_LIMIT) break;
  }
  if (addresses.length === 0) return [];

  const pairs = await getJson<DexPair[]>(
    `${DEX_BASE}/tokens/v1/solana/${addresses.join(",")}`,
  );
  const bestPairByAddress = new Map<string, DexPair>();
  for (const pair of pairs) {
    const address = pair.baseToken?.address;
    if (!address) continue;
    const current = bestPairByAddress.get(address);
    if (!current || (pair.liquidity?.usd ?? 0) > (current.liquidity?.usd ?? 0)) {
      bestPairByAddress.set(address, pair);
    }
  }

  return addresses
    .map((address) => {
      const pair = bestPairByAddress.get(address);
      if (!pair) return null;
      const profile = profileByAddress.get(address);
      return toTokenSignal(pair, profile?.url, cmsImage(profile?.icon));
    })
    .filter((token): token is TokenSignal => token !== null)
    .slice(0, 6);
}

export async function searchTokens(query: string): Promise<TokenSignal[]> {
  const data = await getJson<{ pairs?: DexPair[] }>(
    `${DEX_BASE}/latest/dex/search?q=${encodeURIComponent(query)}`,
  );
  return topSolanaPairs(data.pairs ?? []).map((pair) => toTokenSignal(pair));
}

export async function searchPredictionMarkets(query: string): Promise<PredictionSignal[]> {
  const data = await getJson<{ events?: PolymarketEvent[] }>(
    `${POLY_BASE}/public-search?q=${encodeURIComponent(query)}&limit_per_type=6`,
    60,
  );
  return (data.events ?? []).slice(0, 6).map((event) => ({
    id: event.id ?? event.slug ?? crypto.randomUUID(),
    title: event.title ?? "Untitled market",
    volume: finiteNumber(event.volume),
    liquidity: finiteNumber(event.liquidity),
    endDate: event.endDate ?? null,
    url: event.slug ? `https://polymarket.com/event/${event.slug}` : "https://polymarket.com",
  }));
}

export async function inspectWallet(address: string) {
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) {
    return {
      address,
      configured: false as const,
      note: "Add HELIUS_API_KEY to enable live wallet intelligence.",
    };
  }

  const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "anibot-wallet",
      method: "getAssetsByOwner",
      params: {
        ownerAddress: address,
        page: 1,
        limit: 20,
        displayOptions: { showFungible: true, showNativeBalance: true },
      },
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Helius returned ${response.status}`);
  const data = (await response.json()) as {
    result?: { total?: number; nativeBalance?: { lamports?: number }; items?: unknown[] };
  };
  return {
    address,
    configured: true,
    assetCount: data.result?.total ?? 0,
    solBalance: (data.result?.nativeBalance?.lamports ?? 0) / 1_000_000_000,
    assets: data.result?.items ?? [],
  };
}

export async function getTokenMetadata(mint: string) {
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) {
    return {
      configured: false,
      mint,
      note: "Add HELIUS_API_KEY to read canonical token metadata and authorities.",
    };
  }

  const asset = await heliusRpc<Record<string, unknown>>(apiKey, "getAsset", [{ id: mint }]);
  return { configured: true as const, mint, asset };
}

export async function getWalletTransactionHistory(address: string) {
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) {
    return {
      address,
      configured: false as const,
      note: "Add HELIUS_API_KEY to read wallet transaction history.",
      transactions: [],
    };
  }

  const result = await heliusRpc<{
    data?: Array<{
      blockTime?: number | null;
      confirmationStatus?: string;
      err?: unknown;
      memo?: string | null;
      signature?: string;
      slot?: number;
    }>;
    paginationToken?: string | null;
  }>(apiKey, "getTransactionsForAddress", [
    address,
    {
      filters: { status: "any", tokenAccounts: "balanceChanged" },
      limit: 12,
      sortOrder: "desc",
      transactionDetails: "signatures",
    },
  ]);

  return {
    address,
    configured: true as const,
    paginationToken: result.paginationToken ?? null,
    transactions: result.data ?? [],
  };
}

export async function getSolanaNetworkStatus() {
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) {
    return {
      configured: false as const,
      note: "Add HELIUS_API_KEY to read live Solana network status.",
    };
  }

  const [health, epoch] = await Promise.all([
    heliusRpc<string>(apiKey, "getHealth", []),
    heliusRpc<{
      absoluteSlot?: number;
      blockHeight?: number;
      epoch?: number;
      slotIndex?: number;
      slotsInEpoch?: number;
      transactionCount?: number;
    }>(apiKey, "getEpochInfo", [{ commitment: "confirmed" }]),
  ]);
  return { configured: true as const, health, ...epoch };
}

export async function getAniBotToken() {
  const mint = process.env.ANIBOT_TOKEN_MINT?.trim();
  if (!mint) {
    return {
      configured: false as const,
      mint: null,
      note: "ANIBOT exists, but its canonical mint is not configured in this runtime. Same-name market results are not treated as official.",
      symbol: "ANIBOT",
    };
  }

  const [pairs, pumpFun, metadata] = await Promise.allSettled([
    searchTokens(mint),
    getPumpFunLaunch(mint),
    getTokenMetadata(mint),
  ]);
  return {
    configured: true as const,
    metadata: metadata.status === "fulfilled" ? metadata.value : null,
    mint,
    pairs: pairs.status === "fulfilled" ? pairs.value : [],
    pumpFun: pumpFun.status === "fulfilled" ? pumpFun.value : null,
    symbol: "ANIBOT",
  };
}

interface PumpCoin {
  mint?: string;
  name?: string;
  symbol?: string;
  creator?: string;
  created_timestamp?: number;
  complete?: boolean;
  pump_swap_pool?: string | null;
  real_sol_reserves?: number;
  usd_market_cap?: number;
  ath_market_cap?: number;
  reply_count?: number;
  image_uri?: string;
}

/**
 * Launch provenance straight from Pump.fun.
 *
 * Only fields the API states outright are surfaced. Bonding-curve progress is
 * deliberately not computed: the graduation threshold is not something the
 * response declares, and a percentage derived from a guessed constant would be
 * a number on screen that nobody can check.
 */
export async function getPumpFunLaunch(mint: string): Promise<PumpFunLaunch | null> {
  const response = await fetch(`${PUMP_BASE}/coins/${encodeURIComponent(mint)}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(8_000),
  });
  // A mint that never launched here is a legitimate answer, not a failure.
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Pump.fun returned ${response.status}`);

  const coin = (await response.json()) as PumpCoin;
  if (!coin.mint) return null;

  const created = finiteNumber(coin.created_timestamp);
  return {
    mint: coin.mint,
    name: coin.name ?? null,
    symbol: coin.symbol ?? null,
    creator: coin.creator ?? null,
    createdAt: created ? new Date(created).toISOString() : null,
    graduated: coin.complete === true,
    poolAddress: coin.pump_swap_pool ?? null,
    solOnCurve: (() => {
      const lamports = finiteNumber(coin.real_sol_reserves);
      return lamports === null ? null : lamports / 1_000_000_000;
    })(),
    marketCapUsd: finiteNumber(coin.usd_market_cap),
    athMarketCapUsd: finiteNumber(coin.ath_market_cap),
    replyCount: finiteNumber(coin.reply_count),
    imageUrl: coin.image_uri ?? null,
    url: `https://pump.fun/coin/${coin.mint}`,
  };
}

/**
 * Top-holder concentration for a mint.
 *
 * This is the check Ani tells people to run, so she should be able to run it.
 * It needs a Helius key: the public Solana RPCs rate-limit
 * `getTokenLargestAccounts` to the point of being unusable, and guessing at
 * concentration without the call would be worse than saying it is unavailable.
 */
export async function getHolderConcentration(mint: string): Promise<HolderConcentration> {
  const apiKey = process.env.HELIUS_API_KEY;
  const empty = { decimals: null, holders: [], mint, topCount: null, topShare: null };
  if (!apiKey) {
    return {
      ...empty,
      configured: false,
      note: "Add HELIUS_API_KEY to read holder concentration. The public Solana RPCs rate-limit this call.",
    };
  }

  const rpc = async (method: string, params: unknown[]) => {
    const response = await fetch(`${HELIUS_RPC}/?api-key=${apiKey}`, {
      body: JSON.stringify({ id: "anibot-holders", jsonrpc: "2.0", method, params }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`Helius returned ${response.status}`);
    const body = (await response.json()) as { error?: { message?: string }; result?: unknown };
    if (body.error) throw new Error(body.error.message ?? "Helius rejected the call");
    return body.result;
  };

  const [supply, largest] = await Promise.all([
    rpc("getTokenSupply", [mint]) as Promise<{ value?: { amount?: string; decimals?: number } }>,
    rpc("getTokenLargestAccounts", [mint]) as Promise<{
      value?: Array<{ address?: string; amount?: string; decimals?: number }>;
    }>,
  ]);

  const decimals = supply?.value?.decimals ?? null;
  const total = Number(supply?.value?.amount ?? 0);
  const accounts = (largest?.value ?? []).slice(0, 10);

  const holders = accounts.map((account) => {
    const raw = Number(account.amount ?? 0);
    const scale = decimals === null ? 1 : 10 ** decimals;
    return {
      address: account.address ?? "unknown",
      amount: Number.isFinite(raw) ? raw / scale : 0,
      share: total > 0 && Number.isFinite(raw) ? (raw / total) * 100 : null,
    };
  });

  const topShare = total > 0
    ? holders.reduce((sum, holder) => sum + (holder.share ?? 0), 0)
    : null;

  return {
    configured: true,
    decimals,
    holders,
    mint,
    topCount: holders.length,
    topShare,
  };
}
