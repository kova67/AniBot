"use client";

// Adapted from Beautiful UI's MIT-licensed tool-chips pattern.
// Source: https://github.com/ithmz/beautiful-ui

import { Check, ChevronDown, CircleAlert, LoaderCircle } from "lucide-react";
import { useState } from "react";

import { SourceMarkForTool } from "@/components/brand/source-mark";
import type { ToolRun } from "@/lib/agent/types";
import { cn } from "@/lib/utils";

function ToolStatus({ status }: { status: ToolRun["status"] }) {
  if (status === "completed") {
    return <Check className="size-3 text-white/56" strokeWidth={2} />;
  }
  if (status === "error") {
    return <CircleAlert className="size-3 text-red-400" strokeWidth={1.5} />;
  }
  return <LoaderCircle className="size-3 animate-spin text-white/56" strokeWidth={1.5} />;
}

export function BeautifulToolChips({
  renderOutput,
  runs,
}: {
  renderOutput: (run: ToolRun) => React.ReactNode;
  runs: ToolRun[];
}) {
  const [openId, setOpenId] = useState<string | null>(runs[0]?.id ?? null);
  const settled = runs.find((run) => run.id === openId && run.status !== "running") ?? null;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {runs.map((run) => {
          const selected = run.id === openId;
          return (
            <button
              aria-expanded={selected}
              className={cn(
                "inline-flex h-8 items-center gap-2 rounded-[9px] px-3 text-[11px] shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.08)] transition-[background-color,color,box-shadow,scale] duration-150 ease-out active:scale-[0.96]",
                selected
                  ? "ani-pearl-edge bg-white/[0.08] text-white/86"
                  : "bg-white/[0.025] text-white/45 hover:bg-white/[0.055] hover:text-white/72",
              )}
              key={run.id}
              onClick={() => setOpenId(selected ? null : run.id)}
              type="button"
            >
              <SourceMarkForTool size={13} toolName={run.name} />
              <span>{run.label}</span>
              <ToolStatus status={run.status} />
              {run.durationMs > 0 ? (
                <span className="font-mono text-[9px] text-white/24 tabular-nums">{run.durationMs}ms</span>
              ) : null}
              <ChevronDown className={`size-3 transition-transform duration-150 ${selected ? "rotate-180" : ""}`} strokeWidth={1.5} />
            </button>
          );
        })}
      </div>
      {settled ? (
        <div className="mt-3 overflow-hidden rounded-xl bg-white/[0.025] shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.075)]">
          {renderOutput(settled)}
        </div>
      ) : null}
    </div>
  );
}
