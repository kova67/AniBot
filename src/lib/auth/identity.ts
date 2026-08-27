import type { User } from "@privy-io/react-auth";

const WALLET_PREFIX_LENGTH = 5;
const WALLET_SUFFIX_LENGTH = 4;

export function authIdentity(user: User | null): string {
  const email = user?.email?.address;
  if (email) return email;
  const wallet = user?.wallet?.address;
  if (wallet) {
    return `${wallet.slice(0, WALLET_PREFIX_LENGTH)}…${wallet.slice(-WALLET_SUFFIX_LENGTH)}`;
  }
  return "Signed in";
}
