import type { User } from "@privy-io/react-auth";

export function authIdentity(user: User | null) {
  const email = user?.email?.address;
  if (email) return email;
  const wallet = user?.wallet?.address;
  if (wallet) return `${wallet.slice(0, 5)}…${wallet.slice(-4)}`;
  return "Signed in";
}
