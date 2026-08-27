"use client";

import { PrivyProvider, usePrivy, type User } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { createContext, useContext, useMemo, type ReactNode } from "react";

type AniAuthContextValue = {
  authenticated: boolean;
  configured: boolean;
  getAccessToken: () => Promise<string | null>;
  login: () => void;
  loginWithEmail: () => void;
  loginWithWallet: () => void;
  logout: () => Promise<void>;
  ready: boolean;
  user: User | null;
};

const AniAuthContext = createContext<AniAuthContextValue | null>(null);

const unavailableAuth: AniAuthContextValue = {
  authenticated: false,
  configured: false,
  getAccessToken: async () => null,
  login: () => undefined,
  loginWithEmail: () => undefined,
  loginWithWallet: () => undefined,
  logout: async () => undefined,
  ready: true,
  user: null,
};

function PrivyBridge({ children }: { children: ReactNode }) {
  const auth = usePrivy();
  const value = useMemo<AniAuthContextValue>(
    () => ({
      authenticated: auth.authenticated,
      configured: true,
      getAccessToken: auth.getAccessToken,
      login: () => auth.login({ loginMethods: ["email", "wallet"], walletChainType: "solana-only" }),
      loginWithEmail: () => auth.login({ loginMethods: ["email"] }),
      loginWithWallet: () => auth.login({ loginMethods: ["wallet"], walletChainType: "solana-only" }),
      logout: auth.logout,
      ready: auth.ready,
      user: auth.user,
    }),
    [auth],
  );
  return <AniAuthContext.Provider value={value}>{children}</AniAuthContext.Provider>;
}

export function AniAuthProvider({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) {
    return <AniAuthContext.Provider value={unavailableAuth}>{children}</AniAuthContext.Provider>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          accentColor: "#f6f1ee",
          landingHeader: "Meet Ani",
          loginMessage: "Sign in once. Your research follows you across devices.",
          logo: "/icon.svg",
          showWalletLoginFirst: false,
          theme: "#050505",
          walletChainType: "solana-only",
          walletList: ["detected_wallets", "phantom", "solflare", "wallet_connect"],
        },
        embeddedWallets: {
          solana: { createOnLogin: "users-without-wallets" },
        },
        externalWallets: {
          solana: { connectors: toSolanaWalletConnectors({ shouldAutoConnect: false }) },
        },
        loginMethods: ["email", "wallet"],
      }}
    >
      <PrivyBridge>{children}</PrivyBridge>
    </PrivyProvider>
  );
}

export function useAniAuth() {
  const value = useContext(AniAuthContext);
  if (!value) throw new Error("useAniAuth must be used inside AniAuthProvider.");
  return value;
}
