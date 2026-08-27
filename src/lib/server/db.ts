import "server-only";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let query: NeonQueryFunction<false, false> | null = null;

export function db(): NeonQueryFunction<false, false> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured.");
  query ??= neon(databaseUrl);
  return query;
}

export async function touchUser(userId: string) {
  const sql = db();
  await sql`
    INSERT INTO app_users (id)
    VALUES (${userId})
    ON CONFLICT (id)
    DO UPDATE SET last_seen_at = now()
  `;
}

export async function recordUsage(input: {
  inputChars: number;
  model?: string;
  requestId: string;
  route: string;
  status: "started" | "completed" | "failed";
  userId: string;
}) {
  const sql = db();
  await sql`
    INSERT INTO usage_events (
      user_id,
      route,
      model,
      request_id,
      input_chars,
      status
    )
    VALUES (
      ${input.userId},
      ${input.route},
      ${input.model ?? null},
      ${input.requestId},
      ${input.inputChars},
      ${input.status}
    )
  `;
}

