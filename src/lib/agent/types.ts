export type AgentMode = "openrouter" | "live-demo" | "offline-demo";
export type ToolRunStatus = "running" | "completed" | "error";

export interface AgentSource {
  title: string;
  url: string;
}

export interface ToolRun {
  id: string;
  name: string;
  label: string;
  input: unknown;
  output: unknown;
  durationMs: number;
  /** "running" is a live call: the chip spins against real latency. */
  status: ToolRunStatus;
}

export interface AgentReply {
  text: string;
  toolRuns: ToolRun[];
  sources: AgentSource[];
  mode: AgentMode;
}

export interface ChatEntry {
  id: string;
  /** True only while a client is receiving deltas; never persisted as true. */
  streaming?: boolean;
  mode?: AgentReply["mode"];
  role: "user" | "assistant";
  sources?: AgentReply["sources"];
  text: string;
  toolRuns?: ToolRun[];
}

export interface TokenSignal {
  address: string;
  symbol: string;
  name: string;
  priceUsd: number | null;
  change24h: number | null;
  liquidityUsd: number | null;
  volume24h: number | null;
  marketCap: number | null;
  url: string;
  /** Token artwork as published by the market source. Null when it has none. */
  imageUrl: string | null;
  /** Real 24h transaction counts, when the source reports them. */
  buys24h: number | null;
  sells24h: number | null;
}

export interface PredictionSignal {
  id: string;
  title: string;
  volume: number | null;
  liquidity: number | null;
  endDate: string | null;
  url: string;
}

/**
 * Launch provenance for a Pump.fun mint, exactly as the platform reports it.
 * Every field here is copied from the API response — nothing is derived, so
 * there is no percentage on screen that we invented a formula for.
 */
export interface PumpFunLaunch {
  mint: string;
  name: string | null;
  symbol: string | null;
  creator: string | null;
  createdAt: string | null;
  /** Pump.fun's own flag for "left the bonding curve". */
  graduated: boolean;
  /** The AMM pool it graduated into, when it has one. */
  poolAddress: string | null;
  solOnCurve: number | null;
  marketCapUsd: number | null;
  athMarketCapUsd: number | null;
  replyCount: number | null;
  imageUrl: string | null;
  url: string;
}

export interface HolderConcentration {
  mint: string;
  configured: boolean;
  note?: string;
  decimals: number | null;
  /** Share of total supply held by the largest N accounts the RPC returned. */
  topShare: number | null;
  topCount: number | null;
  holders: Array<{ address: string; amount: number; share: number | null }>;
}
