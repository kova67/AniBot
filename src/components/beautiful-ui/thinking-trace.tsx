"use client";

import { AniAvatar } from "@/components/avatar/ani-avatar";

export function BeautifulThinkingTrace({ active = true }: { active?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-1" role={active ? "status" : undefined}>
      <AniAvatar active={active} reveal={!active} />
      <div className="min-w-0 pt-0.5">
        <p className="text-[12px] text-white/54">
          {active ? "Thinking" : "Sources and tool results stay attached."}
        </p>
        {active ? <div className="ani-shimmer-rail mt-2.5 h-px w-32" /> : null}
      </div>
    </div>
  );
}
