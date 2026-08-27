"use client";

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Sign in to continue.");
    this.name = "AuthenticationRequiredError";
  }
}

export async function authenticatedFetch(
  getAccessToken: () => Promise<string | null>,
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  const token = await getAccessToken();
  if (!token) throw new AuthenticationRequiredError();

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

