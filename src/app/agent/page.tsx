import type { Metadata } from "next";

import { AgentWorkspace } from "@/components/agent/agent-workspace";

export const metadata: Metadata = {
  description: "A live crypto research workspace with a voice and a face.",
  title: "Ani — Research workspace",
};

export default function AgentPage() {
  return <AgentWorkspace />;
}
