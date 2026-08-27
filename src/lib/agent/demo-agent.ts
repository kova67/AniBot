import {
  getAniBotToken,
  getHolderConcentration,
  getPumpFunLaunch,
  getSolanaNetworkStatus,
  getTokenMetadata,
  getTrendingTokens,
  getWalletTransactionHistory,
  inspectWallet,
  searchPredictionMarkets,
  searchTokens,
} from "./market-tools";
import type { PendingTool } from "./stream";
import type { AgentReply, ToolRun } from "./types";

/**
 * Called the moment a branch commits to a tool, before the request goes out.
 * The workspace uses it to show the chip spinning against real latency rather
 * than inventing a thinking animation.
 */
export type OnToolStart = (tool: PendingTool) => void;

const offlineSignals = [
  {
    address: "sample-sol",
    change24h: 4.8,
    liquidityUsd: 86_000_000,
    marketCap: null,
    name: "Solana",
    priceUsd: 187.42,
    symbol: "SOL",
    url: "https://dexscreener.com/solana",
    volume24h: 1_200_000_000,
    imageUrl: null,
    buys24h: null,
    sells24h: null,
  },
  {
    address: "sample-bonk",
    change24h: 7.2,
    liquidityUsd: 18_200_000,
    marketCap: null,
    name: "Bonk",
    priceUsd: 0.0000284,
    symbol: "BONK",
    url: "https://dexscreener.com/solana",
    volume24h: 6_700_000,
    imageUrl: null,
    buys24h: null,
    sells24h: null,
  },
  {
    address: "sample-jup",
    change24h: -1.4,
    liquidityUsd: 32_400_000,
    marketCap: null,
    name: "Jupiter",
    priceUsd: 1.18,
    symbol: "JUP",
    url: "https://dexscreener.com/solana",
    volume24h: 42_100_000,
    imageUrl: null,
    buys24h: null,
    sells24h: null,
  },
];

const money = (value: number | null) => {
  if (value === null) return "n/a";
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: value < 1 ? 6 : 0,
    notation: value > 999_999 ? "compact" : "standard",
    style: "currency",
  }).format(value);
};

function completedRun(
  name: string,
  label: string,
  input: unknown,
  output: unknown,
  started: number,
  id: string = crypto.randomUUID(),
): ToolRun {
  return {
    id,
    name,
    label,
    input,
    output,
    durationMs: Date.now() - started,
    status: "completed",
  };
}

export function runOfflineDemo(message: string, reason?: string): AgentReply {
  const query = message.trim();
  return {
    mode: "offline-demo",
    sources: [],
    text: "The live DEX connection timed out in this local runtime, so I switched to the **bundled interface sample**. These cards are illustrative—not current market data. The same tool calls DEX Screener directly when the runtime has outbound access.",
    toolRuns: [
      {
        durationMs: 0,
        id: crypto.randomUUID(),
        input: { query },
        label: "Previewing bundled market sample",
        name: "offline_market_preview",
        output: offlineSignals,
        status: reason ? "error" : "completed",
      },
    ],
  };
}

const dateOnly = (iso: string | null) =>
  iso ? new Date(iso).toISOString().slice(0, 10) : "an unknown date";

export async function runDemoAgent(
  message: string,
  onToolStart: OnToolStart = () => {},
): Promise<AgentReply> {
  const lower = message.toLowerCase();
  const wallet = message.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/)?.[0];

  if (/\$?anibot\b|ani bot token/.test(lower)) {
    const started = Date.now();
    const pendingId = crypto.randomUUID();
    onToolStart({ id: pendingId, input: {}, label: "Reading the ANIBOT token", name: "get_anibot_token" });
    const result = await getAniBotToken();
    return {
      mode: "live-demo",
      sources: [],
      text: result.configured
        ? `ANIBOT is AniBot's official Solana community token. Its canonical mint is \`${result.mint}\`; I used that exact configured address for this lookup.`
        : "ANIBOT is AniBot’s official Solana community token, but this runtime does not have its canonical mint configured yet. I won’t point you at a same-name token and pretend it is official.",
      toolRuns: [completedRun("get_anibot_token", "Reading the ANIBOT token", {}, result, started, pendingId)],
    };
  }

  if (/solana (?:network|health|status)|epoch|current slot|block height/.test(lower)) {
    const started = Date.now();
    const pendingId = crypto.randomUUID();
    onToolStart({ id: pendingId, input: {}, label: "Reading Solana network status", name: "get_solana_network_status" });
    const result = await getSolanaNetworkStatus();
    return {
      mode: "live-demo",
      sources: [{ title: "Solana RPC via Helius", url: "https://www.helius.dev" }],
      text: result.configured
        ? `Solana RPC reports **${result.health}** at slot **${result.absoluteSlot?.toLocaleString() ?? "—"}**, in epoch **${result.epoch ?? "—"}**. The latest reported block height is **${result.blockHeight?.toLocaleString() ?? "—"}**.`
        : result.note,
      toolRuns: [completedRun("get_solana_network_status", "Reading Solana network status", {}, result, started, pendingId)],
    };
  }

  if (wallet && /transaction|history|activity|funded|funding/.test(lower)) {
    const started = Date.now();
    const pendingId = crypto.randomUUID();
    const input = { address: wallet };
    onToolStart({ id: pendingId, input, label: "Reading wallet history", name: "get_wallet_transaction_history" });
    const result = await getWalletTransactionHistory(wallet);
    return {
      mode: "live-demo",
      sources: [{ title: "Helius transaction history", url: "https://www.helius.dev" }],
      text: result.configured
        ? `I found **${result.transactions.length} recent transactions** in the first history page, including balance-changing token accounts. Ask for a specific signature or time window if you want a narrower pass.`
        : result.note,
      toolRuns: [completedRun("get_wallet_transaction_history", "Reading wallet history", input, result, started, pendingId)],
    };
  }

  if (wallet && /metadata|mint authority|freeze authority|token standard/.test(lower)) {
    const started = Date.now();
    const pendingId = crypto.randomUUID();
    const input = { mint: wallet };
    onToolStart({ id: pendingId, input, label: "Reading token metadata", name: "get_token_metadata" });
    const result = await getTokenMetadata(wallet);
    return {
      mode: "live-demo",
      sources: [{ title: "Helius DAS", url: "https://www.helius.dev" }],
      text: result.configured
        ? "I pulled the canonical DAS record for that mint, including its token standard, authorities, ownership, and published metadata. The raw record is attached to the tool result."
        : result.note,
      toolRuns: [completedRun("get_token_metadata", "Reading token metadata", input, result, started, pendingId)],
    };
  }

  // Holder concentration is the check Ani keeps telling people to run, so it
  // gets first claim on a message that asks for it.
  if (wallet && /holder|concentration|rug|whale|supply|top ?10/.test(lower)) {
    const started = Date.now();
    const pendingId = crypto.randomUUID();
    onToolStart({ id: pendingId, input: { mint: wallet }, label: "Reading holder concentration", name: "get_holder_concentration" });
    const result = await getHolderConcentration(wallet);
    const share = result.topShare;
    return {
      mode: "live-demo",
      sources: [{ title: "Helius", url: "https://www.helius.dev" }],
      text: !result.configured
        ? "Holder concentration needs a `HELIUS_API_KEY` in this preview — the public Solana RPCs rate-limit that call to the point of being useless. Everything else I run is live."
        : share === null
          ? "Helius answered, but the supply figure came back empty, so I can't turn those balances into a percentage. I'd rather say that than show you a number I can't stand behind."
          : `The largest **${result.topCount} accounts hold ${share.toFixed(1)}%** of supply. Bear in mind some of those are usually pools and exchange accounts rather than individuals, so treat this as an upper bound on insider control, not a verdict.`,
      toolRuns: [
        completedRun("get_holder_concentration", "Reading holder concentration", { mint: wallet }, result, started, pendingId),
      ],
    };
  }

  if (wallet && /pump|launch|creator|graduat|bonding/.test(lower)) {
    const started = Date.now();
    const pendingId = crypto.randomUUID();
    onToolStart({ id: pendingId, input: { mint: wallet }, label: "Checking Pump.fun launch", name: "get_pumpfun_launch" });
    const launch = await getPumpFunLaunch(wallet);
    return {
      mode: "live-demo",
      sources: launch
        ? [{ title: launch.symbol ?? "Pump.fun", url: launch.url }]
        : [{ title: "Pump.fun", url: "https://pump.fun" }],
      text: launch
        ? `**${launch.name ?? launch.symbol ?? "That mint"}** launched on Pump.fun on ${dateOnly(launch.createdAt)}${launch.creator ? `, deployed by \`${launch.creator.slice(0, 6)}…${launch.creator.slice(-4)}\`` : ""}. It has **${launch.graduated ? "graduated off the bonding curve" : "not graduated yet"}**${launch.marketCapUsd ? `, and sits around **${money(launch.marketCapUsd)}** against an all-time high of **${money(launch.athMarketCapUsd)}**` : ""}. The gap between those two is usually the more honest signal.`
        : "That mint has no Pump.fun launch record, so it was created somewhere else. Worth knowing — a token that skipped Pump.fun has a different provenance story entirely.",
      toolRuns: [
        completedRun("get_pumpfun_launch", "Checking Pump.fun launch", { mint: wallet }, launch, started, pendingId),
      ],
    };
  }

  if (wallet && /wallet|hold|portfolio|address/.test(lower)) {
    const started = Date.now();
    const pendingId = crypto.randomUUID();
    onToolStart({ id: pendingId, input: { address: wallet }, label: "Inspecting wallet", name: "inspect_wallet" });
    const result = await inspectWallet(wallet);
    return {
      mode: "live-demo",
      sources: [{ title: "Helius", url: "https://www.helius.dev" }],
      text: result.configured
        ? `I found **${result.assetCount} assets** and approximately **${(result.solBalance ?? 0).toFixed(3)} SOL** in that wallet. I’ve kept the first pass high-level; ask me to isolate fungibles, NFTs, or recent behavior next.`
        : "Wallet intelligence is wired, but this local preview needs a `HELIUS_API_KEY` before I can inspect that address. The public market tools are live right now.",
      toolRuns: [completedRun("inspect_wallet", "Inspecting wallet", { address: wallet }, result, started, pendingId)],
    };
  }

  if (/prediction|polymarket|odds|election|market bet/.test(lower)) {
    const query = message.replace(/polymarket|prediction markets?|odds/gi, "").trim() || "crypto";
    const started = Date.now();
    const pendingId = crypto.randomUUID();
    onToolStart({ id: pendingId, input: { query }, label: "Searching prediction markets", name: "search_prediction_markets" });
    const markets = await searchPredictionMarkets(query);
    const lead = markets[0];
    return {
      mode: "live-demo",
      sources: markets.slice(0, 3).map((market) => ({ title: market.title, url: market.url })),
      text: lead
        ? `The most relevant live market I found is **${lead.title}**. It has roughly **${money(lead.volume)}** in volume${lead.liquidity ? ` and ${money(lead.liquidity)} in liquidity` : ""}. I’d compare the top few markets before treating any one price as consensus.`
        : "I couldn’t find a clean prediction-market match for that query. Try a shorter entity or event name.",
      toolRuns: [completedRun("search_prediction_markets", "Searching prediction markets", { query }, markets, started, pendingId)],
    };
  }

  const named = message.match(/(?:search|analyze|check|look at|about)\s+\$?([a-z0-9]{2,15})/i)?.[1];
  if (named && !/trending|market|today|tokens?/.test(named.toLowerCase())) {
    const started = Date.now();
    const pendingId = crypto.randomUUID();
    onToolStart({ id: pendingId, input: { query: named }, label: "Searching Solana pairs", name: "search_tokens" });
    const tokens = await searchTokens(named);
    const lead = tokens[0];
    return {
      mode: "live-demo",
      sources: tokens.slice(0, 3).map((token) => ({ title: `${token.symbol} on DEX Screener`, url: token.url })),
      text: lead
        ? `The strongest Solana match is **${lead.name} (${lead.symbol})** at **${money(lead.priceUsd)}**. The deepest pair shows **${money(lead.liquidityUsd)} liquidity** and **${money(lead.volume24h)} 24h volume**${lead.change24h === null ? "." : `, with a **${lead.change24h >= 0 ? "+" : ""}${lead.change24h.toFixed(1)}%** 24h move.`}`
        : `I couldn’t find a liquid Solana pair matching **${named}**. A mint address will be more precise than a ticker.`,
      toolRuns: [completedRun("search_tokens", "Searching Solana pairs", { query: named }, tokens, started, pendingId)],
    };
  }

  const started = Date.now();
  const pendingId = crypto.randomUUID();
  onToolStart({ id: pendingId, input: {}, label: "Reading boosted Solana tokens", name: "get_trending_tokens" });
  const tokens = await getTrendingTokens();
  const lead = tokens[0];
  return {
    mode: "live-demo",
    sources: tokens.slice(0, 3).map((token) => ({ title: `${token.symbol} on DEX Screener`, url: token.url })),
    text: lead
      ? `The loudest boosted Solana signal right now is **${lead.name} (${lead.symbol})**. Its deepest tracked pair is around **${money(lead.priceUsd)}**, with **${money(lead.volume24h)}** in 24h volume and **${money(lead.liquidityUsd)}** in liquidity. Boosted visibility is attention—not quality—so I’d verify holder concentration and transaction flow before forming a thesis.`
      : "The live trend source returned no usable Solana pairs just now. I’d retry in a moment or search a specific mint.",
    toolRuns: [completedRun("get_trending_tokens", "Reading boosted Solana tokens", {}, tokens, started, pendingId)],
  };
}
