"use client";

import { createContext, useContext, type ReactNode } from "react";

import { DEFAULT_AVATAR } from "@/lib/avatar/default-avatar";

type AvatarContextValue = {
  avatar: typeof DEFAULT_AVATAR;
};

const AvatarContext = createContext<AvatarContextValue | null>(null);
const avatarContextValue: AvatarContextValue = { avatar: DEFAULT_AVATAR };

export function AvatarProvider({ children }: { children: ReactNode }) {
  return (
    <AvatarContext.Provider value={avatarContextValue}>
      {children}
    </AvatarContext.Provider>
  );
}

export function useSelectedAvatar() {
  const value = useContext(AvatarContext);
  if (!value) throw new Error("useSelectedAvatar must be used inside AvatarProvider.");
  return value;
}
