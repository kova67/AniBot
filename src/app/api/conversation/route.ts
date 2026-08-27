import { z } from "zod";

import { authenticateRequest, unauthorizedResponse } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import {
  checkRateLimits,
  rateLimitedResponse,
  rateLimitHeaders,
} from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

const sourceSchema = z.object({
  title: z.string().max(240),
  url: z.url().max(2_000),
});

const toolRunSchema = z.object({
  durationMs: z.number().nonnegative(),
  id: z.string().min(1).max(128),
  input: z.unknown(),
  label: z.string().min(1).max(160),
  name: z.string().min(1).max(120),
  output: z.unknown(),
  status: z.enum(["running", "completed", "error"]),
});

const messageSchema = z.object({
  id: z.string().min(1).max(128),
  mode: z.enum(["openrouter", "live-demo", "offline-demo"]).optional(),
  role: z.enum(["user", "assistant"]),
  sources: z.array(sourceSchema).max(8).optional(),
  streaming: z.boolean().optional(),
  text: z.string().max(30_000),
  toolRuns: z.array(toolRunSchema).max(12).optional(),
});

const payloadSchema = z.object({ messages: z.array(messageSchema).min(1).max(60) });

const rules = [
  { key: "conversation:minute", limit: 60, windowMs: 60_000 },
  { key: "conversation:day", limit: 2_000, windowMs: 86_400_000 },
] as const;

async function authorize(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return { response: unauthorizedResponse() } as const;
  const decision = await checkRateLimits(auth.userId, rules);
  if (!decision.allowed) return { response: rateLimitedResponse(decision) } as const;
  return { auth, decision } as const;
}

export async function GET(request: Request) {
  const access = await authorize(request);
  if ("response" in access) return access.response;

  const sql = db();
  const rows = await sql`
    SELECT messages
    FROM conversations
    WHERE user_id = ${access.auth.userId}
    LIMIT 1
  ` as Array<{ messages: unknown }>;

  const parsed = z.array(messageSchema).safeParse(rows[0]?.messages ?? []);
  return Response.json(
    { messages: parsed.success ? parsed.data : [] },
    {
      headers: {
        "Cache-Control": "private, no-store",
        ...rateLimitHeaders(access.decision),
      },
    },
  );
}

export async function PUT(request: Request) {
  const access = await authorize(request);
  if ("response" in access) return access.response;

  const raw = await request.text();
  if (raw.length > 512_000) {
    return Response.json({ error: "Conversation is too large to save." }, { status: 413 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(raw || "null");
  } catch {
    return Response.json({ error: "Conversation payload is invalid." }, { status: 400 });
  }
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ error: "Conversation payload is invalid." }, { status: 400 });
  }

  const settled = parsed.data.messages.map((message) => ({
    ...message,
    streaming: undefined,
  }));
  const sql = db();
  await sql`
    INSERT INTO conversations (user_id, messages)
    VALUES (${access.auth.userId}, ${JSON.stringify(settled)}::jsonb)
    ON CONFLICT (user_id)
    DO UPDATE SET messages = EXCLUDED.messages, updated_at = now()
  `;

  return new Response(null, {
    headers: { "Cache-Control": "no-store", ...rateLimitHeaders(access.decision) },
    status: 204,
  });
}

export async function DELETE(request: Request) {
  const access = await authorize(request);
  if ("response" in access) return access.response;

  const sql = db();
  await sql`DELETE FROM conversations WHERE user_id = ${access.auth.userId}`;
  return new Response(null, {
    headers: { "Cache-Control": "no-store", ...rateLimitHeaders(access.decision) },
    status: 204,
  });
}
