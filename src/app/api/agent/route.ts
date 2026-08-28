import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { stepCountIs, streamText, tool } from "ai";
import { z } from "zod";

import { runDemoAgent, runOfflineDemo } from "@/lib/agent/demo-agent";
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
} from "@/lib/agent/market-tools";
import { aniSystemPrompt } from "@/lib/agent/system-prompt";
import {
  agentEventStream,
  agentStreamResponse,
  type AgentEvent,
} from "@/lib/agent/stream";
import type { AgentReply } from "@/lib/agent/types";
import { authenticateRequest, unauthorizedResponse } from "@/lib/server/auth";
import { recordUsage } from "@/lib/server/db";
import {
  checkRateLimits,
  rateLimitedResponse,
  rateLimitHeaders,
} from "@/lib/server/rate-limit";

export const maxDuration = 30;

const bodySchema = z.object({
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().trim().min(1).max(1_200),
      }),
    )
    .max(10)
    .optional(),
  message: z.string().trim().min(1).max(2_000),
});

const RATE_LIMIT_RULES = [
  { key: "agent:five-minutes", limit: 12, windowMs: 300_000 },
  { key: "agent:day", limit: 120, windowMs: 86_400_000 },
] as const;

const agentTools = {
  getTrendingTokens: tool({
    description: "Get currently boosted/trending Solana tokens with price, volume and liquidity.",
    inputSchema: z.object({}),
    execute: getTrendingTokens,
  }),
  searchTokens: tool({
    description: "Search liquid Solana pairs by token name, symbol, or mint address.",
    inputSchema: z.object({ query: z.string().min(1) }),
    execute: ({ query }) => searchTokens(query),
  }),
  searchPredictionMarkets: tool({
    description: "Search live Polymarket events and return volume, liquidity and URLs.",
    inputSchema: z.object({ query: z.string().min(1) }),
    execute: ({ query }) => searchPredictionMarkets(query),
  }),
  inspectWallet: tool({
    description: "Inspect a Solana wallet using Helius. Use only when an address is supplied.",
    inputSchema: z.object({ address: z.string().min(32).max(44) }),
    execute: ({ address }) => inspectWallet(address),
  }),
  getPumpFunLaunch: tool({
    description:
      "Read launch provenance for a Solana mint from Pump.fun: creator, launch date, whether it graduated off the bonding curve, market cap and all-time-high market cap. Returns null when the mint did not launch there.",
    inputSchema: z.object({ mint: z.string().min(32).max(44) }),
    execute: ({ mint }) => getPumpFunLaunch(mint),
  }),
  getHolderConcentration: tool({
    description:
      "Read what share of a token's supply the largest accounts hold. Use this whenever holder concentration or rug risk comes up. Needs a Helius key; says so when absent.",
    inputSchema: z.object({ mint: z.string().min(32).max(44) }),
    execute: ({ mint }) => getHolderConcentration(mint),
  }),
  getTokenMetadata: tool({
    description:
      "Read canonical Helius DAS metadata, authorities, ownership and token standard for a Solana mint.",
    inputSchema: z.object({ mint: z.string().min(32).max(44) }),
    execute: ({ mint }) => getTokenMetadata(mint),
  }),
  getWalletTransactionHistory: tool({
    description:
      "Read the newest Solana transactions for a wallet, including balance-changing token accounts.",
    inputSchema: z.object({ address: z.string().min(32).max(44) }),
    execute: ({ address }) => getWalletTransactionHistory(address),
  }),
  getSolanaNetworkStatus: tool({
    description: "Read current Solana RPC health, epoch, slot, block height and transaction count.",
    inputSchema: z.object({}),
    execute: getSolanaNetworkStatus,
  }),
  getAniBotToken: tool({
    description:
      "Read the official ANIBOT token identity and, when its canonical mint is configured, its live market, Pump.fun and metadata records. Never infer the official mint from a same-name result.",
    inputSchema: z.object({}),
    execute: getAniBotToken,
  }),
};

const TOOL_LABELS: Record<string, string> = {
  getHolderConcentration: "Reading holder concentration",
  getPumpFunLaunch: "Checking Pump.fun launch",
  getTrendingTokens: "Reading boosted Solana tokens",
  getAniBotToken: "Reading the ANIBOT token",
  getSolanaNetworkStatus: "Reading Solana network status",
  getTokenMetadata: "Reading token metadata",
  getWalletTransactionHistory: "Reading wallet history",
  inspectWallet: "Inspecting wallet",
  searchPredictionMarkets: "Searching prediction markets",
  searchTokens: "Searching Solana pairs",
};

const labelForTool = (name: string) => TOOL_LABELS[name] ?? name;

/** Replays a finished reply onto the stream in the order the UI renders it. */
function emitReply(emit: (event: AgentEvent) => void, reply: AgentReply) {
  for (const run of reply.toolRuns) emit({ run, type: "tool" });
  if (reply.text) emit({ delta: reply.text, type: "text" });
  if (reply.sources.length > 0) emit({ sources: reply.sources, type: "sources" });
  emit({ mode: reply.mode, type: "done" });
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();

  const raw = await request.text();
  if (raw.length > 20_000) {
    return Response.json({ error: "Question is too large." }, { status: 413 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(raw || "null");
  } catch {
    return Response.json({ error: "Send a short market question." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ error: "Send a short market question." }, { status: 400 });
  }
  const message = parsed.data.message;
  const history = parsed.data.history ?? [];
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL ?? "x-ai/grok-4.3:nitro";
  const decision = await checkRateLimits(auth.userId, RATE_LIMIT_RULES);
  if (!decision.allowed) return rateLimitedResponse(decision);

  const requestId = crypto.randomUUID();
  await recordUsage({
    inputChars: message.length,
    model: apiKey ? model : "deterministic-live-tools",
    requestId,
    route: "agent",
    status: "started",
    userId: auth.userId,
  });

  return agentStreamResponse(
    agentEventStream(async (emit) => {
      try {
        // --- deterministic router (no model key) -------------------------
        if (!apiKey) {
          try {
            const reply = await runDemoAgent(message, (pending) =>
              emit({ ...pending, type: "tool-start" }),
            );
            emitReply(emit, reply);
          } catch (cause) {
            emitReply(
              emit,
              runOfflineDemo(
                message,
                cause instanceof Error ? cause.message : "Live source unavailable",
              ),
            );
          }
          await recordUsage({
            inputChars: message.length,
            model: "deterministic-live-tools",
            requestId,
            route: "agent",
            status: "completed",
            userId: auth.userId,
          });
          return;
        }

        // --- model-driven agent ------------------------------------------
        const openrouter = createOpenRouter({ apiKey });
        const startedAt = new Map<string, number>();
        const sources: AgentReply["sources"] = [];

        const result = streamText({
          abortSignal: request.signal,
          maxOutputTokens: 1_100,
          messages: [
            ...history.map((entry) => ({ content: entry.text, role: entry.role })),
            { content: message, role: "user" as const },
          ],
          model: openrouter(model),
          instructions: aniSystemPrompt(),
          providerOptions: {
            openrouter: {
              reasoning: { enabled: false, effort: "none", exclude: true },
            },
          },
          tools: agentTools,
          stopWhen: stepCountIs(6),
          temperature: 0.72,
        });

        for await (const part of result.fullStream) {
          switch (part.type) {
          case "tool-call": {
            startedAt.set(part.toolCallId, Date.now());
            emit({
              id: part.toolCallId,
              input: part.input,
              label: labelForTool(part.toolName),
              name: part.toolName,
              type: "tool-start",
            });
            break;
          }
          case "tool-result": {
            const began = startedAt.get(part.toolCallId) ?? Date.now();
            emit({
              run: {
                durationMs: Math.max(1, Date.now() - began),
                id: part.toolCallId,
                input: part.input,
                label: labelForTool(part.toolName),
                name: part.toolName,
                output: part.output,
                status: "completed",
              },
              type: "tool",
            });
            break;
          }
          case "tool-error": {
            const began = startedAt.get(part.toolCallId) ?? Date.now();
            emit({
              run: {
                durationMs: Math.max(1, Date.now() - began),
                id: part.toolCallId,
                input: part.input,
                label: labelForTool(part.toolName),
                name: part.toolName,
                output: {
                  error: part.error instanceof Error ? part.error.message : String(part.error),
                },
                status: "error",
              },
              type: "tool",
            });
            break;
          }
          case "text-delta": {
            if (part.text) emit({ delta: part.text, type: "text" });
            break;
          }
          case "source": {
            if (part.sourceType === "url") {
              sources.push({ title: part.title ?? part.url, url: part.url });
            }
            break;
          }
          case "error": {
            throw part.error instanceof Error ? part.error : new Error("The model stream failed.");
          }
          default:
            break;
          }
        }

        if (sources.length > 0) emit({ sources, type: "sources" });
        emit({ mode: "openrouter", type: "done" });
        await recordUsage({
          inputChars: message.length,
          model,
          requestId,
          route: "agent",
          status: "completed",
          userId: auth.userId,
        });
      } catch (cause) {
        await recordUsage({
          inputChars: message.length,
          model: apiKey ? model : "deterministic-live-tools",
          requestId,
          route: "agent",
          status: "failed",
          userId: auth.userId,
        }).catch(() => undefined);
        throw cause;
      }
    }),
    rateLimitHeaders(decision),
  );
}
