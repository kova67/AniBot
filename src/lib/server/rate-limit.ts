import "server-only";

import { db } from "@/lib/server/db";

export type RateLimitRule = {
  key: string;
  limit: number;
  windowMs: number;
};

export type RateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
};

async function applyRule(userId: string, rule: RateLimitRule): Promise<RateLimitDecision> {
  const sql = db();
  const windowStartedAt = new Date(Math.floor(Date.now() / rule.windowMs) * rule.windowMs);
  const resetAt = new Date(windowStartedAt.getTime() + rule.windowMs);
  const rows = await sql`
    INSERT INTO rate_limit_state (user_id, rule, window_started_at, count)
    VALUES (${userId}, ${rule.key}, ${windowStartedAt.toISOString()}, 1)
    ON CONFLICT (user_id, rule)
    DO UPDATE SET
      window_started_at = CASE
        WHEN rate_limit_state.window_started_at < EXCLUDED.window_started_at
          THEN EXCLUDED.window_started_at
        ELSE rate_limit_state.window_started_at
      END,
      count = CASE
        WHEN rate_limit_state.window_started_at < EXCLUDED.window_started_at THEN 1
        ELSE rate_limit_state.count + 1
      END,
      updated_at = now()
    RETURNING count
  ` as Array<{ count: number }>;
  const count = Number(rows[0]?.count ?? rule.limit + 1);

  return {
    allowed: count <= rule.limit,
    limit: rule.limit,
    remaining: Math.max(0, rule.limit - count),
    resetAt,
  };
}

export async function checkRateLimits(userId: string, rules: readonly RateLimitRule[]) {
  let narrowest: RateLimitDecision | null = null;
  for (const rule of rules) {
    const decision = await applyRule(userId, rule);
    if (!decision.allowed) return decision;
    if (!narrowest || decision.remaining < narrowest.remaining) narrowest = decision;
  }
  if (!narrowest) throw new Error("At least one rate-limit rule is required.");
  return narrowest;
}

export function rateLimitHeaders(decision: RateLimitDecision) {
  return {
    "RateLimit-Limit": String(decision.limit),
    "RateLimit-Remaining": String(decision.remaining),
    "RateLimit-Reset": String(Math.ceil(decision.resetAt.getTime() / 1_000)),
  };
}

export function rateLimitedResponse(decision: RateLimitDecision) {
  const retryAfter = Math.max(1, Math.ceil((decision.resetAt.getTime() - Date.now()) / 1_000));
  return Response.json(
    { code: "RATE_LIMITED", error: "Ani needs a minute before the next research pass." },
    {
      headers: { ...rateLimitHeaders(decision), "Retry-After": String(retryAfter) },
      status: 429,
    },
  );
}

