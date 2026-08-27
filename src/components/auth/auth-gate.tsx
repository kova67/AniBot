"use client";

import { ArrowRight, AtSign, ShieldCheck, WalletCards } from "lucide-react";

import { AniAvatar } from "@/components/avatar/ani-avatar";
import { useAniAuth } from "@/components/auth/privy-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function AuthGate({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const auth = useAniAuth();

  const begin = (method: "email" | "wallet") => {
    onOpenChange(false);
    if (method === "email") auth.loginWithEmail();
    else auth.loginWithWallet();
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="overflow-hidden rounded-panel border-0 bg-dialog p-0 shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.11),0_36px_120px_rgb(0_0_0_/_0.82)] sm:max-w-[470px]">
        <div className="relative px-6 pt-6 pb-5 sm:px-7 sm:pt-7">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(ellipse_at_top,rgb(231_180_192_/_0.12),transparent_68%)]" />
          <DialogHeader className="relative text-left">
            <div className="mb-5 flex items-center gap-3">
              <AniAvatar className="size-11 rounded-[13px]" reveal />
              <div>
                <p className="text-[13px] font-medium text-white/84">Ani remembers the thread</p>
                <p className="mt-0.5 text-[11px] text-white/34">Private workspace · synced history</p>
              </div>
            </div>
            <DialogTitle className="text-balance text-[26px] leading-[1.08] font-medium tracking-[-0.045em] text-white">
              Sign in before Ani reaches for a tool.
            </DialogTitle>
            <DialogDescription className="mt-3 max-w-[25rem] text-pretty text-[14px] leading-6 text-white/43">
              The workspace stays visible. Email uses a one-time code; wallet login connects a Solana identity. No password to keep.
            </DialogDescription>
          </DialogHeader>

          <div className="relative mt-6 grid gap-2.5">
            <button
              className="group flex min-h-16 items-center gap-3.5 rounded-control bg-white text-left text-black transition-[background-color,scale] duration-150 ease-out hover:bg-white/88 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!auth.ready || !auth.configured}
              onClick={() => begin("email")}
              type="button"
            >
              <span className="ml-3 flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-black/[0.065]">
                <AtSign className="size-[18px]" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium">Continue with email</span>
                <span className="mt-0.5 block text-[11px] text-black/45">A private one-time code</span>
              </span>
              <ArrowRight className="mr-4 size-[17px] transition-transform duration-150 group-hover:translate-x-0.5" strokeWidth={2} />
            </button>

            <button
              className="group flex min-h-16 items-center gap-3.5 rounded-control bg-white/[0.045] text-left text-white shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.085)] transition-[background-color,box-shadow,scale] duration-150 ease-out hover:bg-white/[0.075] hover:shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.14)] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!auth.ready || !auth.configured}
              onClick={() => begin("wallet")}
              type="button"
            >
              <span className="ml-3 flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-white/[0.055]">
                <WalletCards className="size-[18px]" strokeWidth={1.5} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium">Continue with a wallet</span>
                <span className="mt-0.5 block text-[11px] text-white/34">Phantom, Solflare or WalletConnect</span>
              </span>
              <ArrowRight className="mr-4 size-[17px] text-white/38 transition-[color,transform] duration-150 group-hover:translate-x-0.5 group-hover:text-white/76" strokeWidth={2} />
            </button>
          </div>

          {!auth.configured ? (
            <p className="mt-4 text-[12px] text-red-300/72" role="alert">
              Privy is not configured in this environment.
            </p>
          ) : null}

          <p className="relative mt-5 flex items-center gap-2 text-[10px] leading-5 text-white/26">
            <ShieldCheck className="size-3.5 shrink-0" strokeWidth={1.5} />
            Your access token is verified again on every private API request.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

