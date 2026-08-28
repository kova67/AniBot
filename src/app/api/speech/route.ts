import { z } from "zod";

import { authenticateRequest, unauthorizedResponse } from "@/lib/server/auth";
import { recordUsage } from "@/lib/server/db";
import {
  checkRateLimits,
  rateLimitedResponse,
  rateLimitHeaders,
} from "@/lib/server/rate-limit";
import {
  configuredSpeechProviders,
  requestSpeech,
  speechProviderModel,
} from "@/lib/speech/providers";

export const maxDuration = 30;

const inputSchema = z.object({
  text: z.string().trim().min(1).max(2_000),
});

const RATE_LIMIT_RULES = [
  { key: "speech:ten-minutes", limit: 80, windowMs: 600_000 },
  { key: "speech:day", limit: 600, windowMs: 86_400_000 },
] as const;

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();

  const raw = await request.text();
  if (raw.length > 10_000) {
    return Response.json({ error: "Speech request is too large." }, { status: 413 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(raw || "null");
  } catch {
    return Response.json({ error: "Invalid speech text" }, { status: 400 });
  }
  const parsed = inputSchema.safeParse(payload);
  if (!parsed.success) return Response.json({ error: "Invalid speech text" }, { status: 400 });

  const decision = await checkRateLimits(auth.userId, RATE_LIMIT_RULES);
  if (!decision.allowed) return rateLimitedResponse(decision);

  const providers = configuredSpeechProviders();
  if (providers.length === 0) {
    return Response.json(
      { fallback: "silent" },
      { headers: rateLimitHeaders(decision) },
    );
  }

  for (const provider of providers) {
    const requestId = crypto.randomUUID();
    const model = speechProviderModel(provider);
    await recordUsage({
      inputChars: parsed.data.text.length,
      model,
      requestId,
      route: "speech",
      status: "started",
      userId: auth.userId,
    });

    try {
      const response = await requestSpeech(
        provider,
        parsed.data.text,
        AbortSignal.any([request.signal, AbortSignal.timeout(12_000)]),
      );
      if (!response.ok || !response.body) {
        await response.body?.cancel().catch(() => undefined);
        throw new Error(`${provider} returned ${response.status}`);
      }

      await recordUsage({
        inputChars: parsed.data.text.length,
        model,
        requestId,
        route: "speech",
        status: "completed",
        userId: auth.userId,
      });

      return new Response(response.body, {
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "audio/mpeg",
          "X-Ani-Speech-Provider": provider,
          ...rateLimitHeaders(decision),
        },
      });
    } catch {
      await recordUsage({
        inputChars: parsed.data.text.length,
        model,
        requestId,
        route: "speech",
        status: "failed",
        userId: auth.userId,
      }).catch(() => undefined);
      if (request.signal.aborted) break;
    }
  }

  return Response.json({ error: "Speech is temporarily unavailable." }, { status: 502 });
}
