import "server-only";

import { PrivyClient } from "@privy-io/node";

import { touchUser } from "@/lib/server/db";

export type AuthenticatedUser = {
  sessionId: string;
  userId: string;
};

let client: PrivyClient | null = null;

function privy(): PrivyClient {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) throw new Error("Privy server credentials are not configured.");
  client ??= new PrivyClient({ appId, appSecret });
  return client;
}

function bearerToken(request: Request): string | null {
  const value = request.headers.get("authorization");
  if (!value?.startsWith("Bearer ")) return null;
  const token = value.slice("Bearer ".length).trim();
  return token || null;
}

export async function authenticateRequest(request: Request): Promise<AuthenticatedUser | null> {
  const token = bearerToken(request);
  if (!token) return null;

  let claims;
  try {
    claims = await privy().utils().auth().verifyAccessToken(token);
  } catch {
    return null;
  }
  await touchUser(claims.user_id);
  return { sessionId: claims.session_id, userId: claims.user_id };
}

export function unauthorizedResponse() {
  return Response.json(
    { code: "AUTH_REQUIRED", error: "Sign in with email or a Solana wallet to ask Ani." },
    {
      headers: { "Cache-Control": "no-store", "WWW-Authenticate": "Bearer" },
      status: 401,
    },
  );
}
