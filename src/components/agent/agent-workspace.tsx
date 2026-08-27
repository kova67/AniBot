"use client";

import type { ChatStatus } from "ai";
import {
  AudioLines,
  BarChart3,
  Check,
  Clipboard,
  Cloud,
  ExternalLink,
  History,
  LogOut,
  Menu,
  MessageSquarePlus,
  Network,
  Search,
  Settings2,
  UserRound,
  Volume2,
  VolumeX,
  WalletCards,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { AniAvatar } from "@/components/avatar/ani-avatar";
import { VrmStage } from "@/components/avatar/vrm-stage";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAniAuth } from "@/components/auth/privy-provider";
import {
  BeautifulPromptBar,
  type BeautifulPromptBarHandle,
  type PromptAttachment,
  type PromptSuggestion,
} from "@/components/beautiful-ui/prompt-bar";
import { BeautifulThinkingTrace } from "@/components/beautiful-ui/thinking-trace";
import { BeautifulToolChips } from "@/components/beautiful-ui/tool-chips";
import { AuroraField } from "@/components/atmosphere/aurora-field";
import { AniMark } from "@/components/brand/ani-mark";
import { IMessageMark } from "@/components/brand/imessage-mark";
import { SourceChip, SourceMarkForTool } from "@/components/brand/source-mark";
import { TokenAvatar } from "@/components/brand/token-avatar";
import { Button } from "@/components/ui/button";
import { authIdentity } from "@/lib/auth/identity";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { readAgentStream, SentenceSplitter } from "@/lib/agent/stream";
import { SOURCES } from "@/lib/brand/sources";
import { authenticatedFetch } from "@/lib/auth/client";
import { SpeechQueue } from "@/lib/speech/queue";
import { percent, usd } from "@/lib/format";
import type {
  ChatEntry,
  HolderConcentration,
  PredictionSignal,
  PumpFunLaunch,
  TokenSignal,
  ToolRun,
} from "@/lib/agent/types";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "anibot:conversation:v1";

const greeting: ChatEntry = {
  id: "welcome",
  mode: "live-demo",
  role: "assistant",
  text: "Hey, I’m **Ani**. I can scan live Solana pairs, compare prediction markets, and inspect wallets when Helius is connected. What are we looking at?",
};

/**
 * Each starter is tagged with the service the router will actually reach for
 * it, so the mark on the pill is a promise the answer keeps.
 */
const starterPrompts: readonly PromptSuggestion[] = [
  { label: "What’s moving on Solana?", source: "dexscreener" },
  { label: "Find prediction markets about crypto", source: "polymarket" },
  { label: "Analyze BONK liquidity", source: "dexscreener" },
];

function isTokenSignal(value: unknown): value is TokenSignal {
  return Boolean(
    value &&
      typeof value === "object" &&
      "symbol" in value &&
      "priceUsd" in value &&
      "url" in value,
  );
}

function isPredictionSignal(value: unknown): value is PredictionSignal {
  return Boolean(
    value &&
      typeof value === "object" &&
      "title" in value &&
      "volume" in value &&
      "url" in value &&
      !("symbol" in value),
  );
}

function TokenResults({ tokens }: { tokens: TokenSignal[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {tokens.slice(0, 3).map((token) => {
        const positive = (token.change24h ?? 0) >= 0;
        return (
          <a
            className="group rounded-xl bg-white/[0.03] p-3.5 shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.07)] transition-[background-color,box-shadow,scale] duration-150 ease-out hover:bg-white/[0.055] hover:shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.12)] active:scale-[0.96]"
            href={token.url}
            key={`${token.address}-${token.symbol}`}
            rel="noreferrer"
            target="_blank"
          >
            <div className="flex items-start gap-2.5">
              {/* The token's own artwork when the source published one, a
                  monogram when it did not. Never a stand-in glyph. */}
              <TokenAvatar
                address={token.address}
                imageUrl={token.imageUrl}
                size={30}
                symbol={token.symbol}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium tracking-[-0.02em] text-white">{token.symbol}</p>
                <p className="mt-0.5 truncate text-[10px] text-white/30">{token.name}</p>
              </div>
              <ExternalLink className="size-3.5 shrink-0 text-white/18 transition-colors group-hover:text-white/52" strokeWidth={1.5} />
            </div>
            <p className="mt-3.5 font-mono text-[12px] text-white/78 tabular-nums">{usd(token.priceUsd)}</p>
            <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] tabular-nums">
              <span className={positive ? "text-[color:var(--blush)]" : "text-white/46"}>
                {percent(token.change24h)}
              </span>
              <span className="text-white/27">Liq {usd(token.liquidityUsd)}</span>
            </div>
          </a>
        );
      })}
    </div>
  );
}

function PredictionResults({ markets }: { markets: PredictionSignal[] }) {
  return (
    <div className="divide-y divide-white/[0.06]">
      {markets.slice(0, 3).map((market) => (
        <a
          className="group flex min-h-14 items-center justify-between gap-4 px-1 py-3 transition-colors duration-150 hover:text-white"
          href={market.url}
          key={market.id}
          rel="noreferrer"
          target="_blank"
        >
          <p className="flex min-w-0 items-start gap-2.5 text-[12px] leading-5 text-white/66 group-hover:text-white/86">
            <Image
              alt=""
              aria-hidden="true"
              className="mt-0.5 shrink-0 rounded-[4px]"
              height={14}
              src={SOURCES.polymarket.mark}
              unoptimized
              width={14}
            />
            <span className="line-clamp-2">{market.title}</span>
          </p>
          <div className="shrink-0 text-right font-mono text-[9px] text-white/28 tabular-nums">
            <p>{usd(market.volume)} vol</p>
            <ExternalLink className="ml-auto mt-1 size-3.5 group-hover:text-white/58" strokeWidth={1.5} />
          </div>
        </a>
      ))}
    </div>
  );
}

function isHolderConcentration(value: unknown): value is HolderConcentration {
  return Boolean(
    value && typeof value === "object" && "topShare" in value && "holders" in value,
  );
}

function isPumpFunLaunch(value: unknown): value is PumpFunLaunch {
  return Boolean(
    value && typeof value === "object" && "graduated" in value && "mint" in value,
  );
}

const shortAddress = (address: string) =>
  address.length > 12 ? `${address.slice(0, 5)}…${address.slice(-4)}` : address;

function HolderResult({ result }: { result: HolderConcentration }) {
  if (!result.configured) {
    return (
      <p className="text-[12px] leading-6 text-white/52">
        {result.note ?? "Holder concentration is not configured in this preview."}
      </p>
    );
  }
  if (result.topShare === null || result.holders.length === 0) {
    return (
      <p className="text-[12px] leading-6 text-white/52">
        Helius answered, but returned nothing to turn into a share of supply.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[11px] text-white/44">
          top {result.topCount} accounts
        </p>
        <p className="font-mono text-[16px] text-white/88 tabular-nums">
          {result.topShare.toFixed(1)}%
        </p>
      </div>
      <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-white/[0.09]">
        <div
          className="h-full rounded-full bg-[color:var(--blush)]/70"
          style={{ width: `${Math.min(100, result.topShare).toFixed(1)}%` }}
        />
      </div>
      <ul className="mt-3 space-y-1">
        {result.holders.slice(0, 5).map((holder) => (
          <li
            className="flex items-center justify-between font-mono text-[10px] text-white/38 tabular-nums"
            key={holder.address}
          >
            <span>{shortAddress(holder.address)}</span>
            <span>{holder.share === null ? "—" : `${holder.share.toFixed(2)}%`}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] leading-5 text-white/30">
        Pools and exchange accounts sit in this list too, so read it as an upper
        bound on insider control rather than a verdict.
      </p>
    </div>
  );
}

function PumpFunResult({ launch }: { launch: PumpFunLaunch }) {
  const rows: Array<[string, string]> = [
    ["creator", launch.creator ? shortAddress(launch.creator) : "—"],
    ["launched", launch.createdAt ? launch.createdAt.slice(0, 10) : "—"],
    ["curve", launch.graduated ? "graduated" : "still on it"],
    ["market cap", usd(launch.marketCapUsd)],
    ["all-time high", usd(launch.athMarketCapUsd)],
  ];

  return (
    <div>
      <a
        className="group flex items-center gap-3 rounded-card bg-white/[0.028] p-3 shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.07)] transition-[background-color,scale] duration-150 hover:bg-white/[0.055] active:scale-[0.98]"
        href={launch.url}
        rel="noreferrer"
        target="_blank"
      >
        <TokenAvatar
          address={launch.mint}
          imageUrl={launch.imageUrl}
          size={30}
          symbol={launch.symbol ?? "?"}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-white">
            {launch.name ?? launch.symbol ?? "Unknown mint"}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-white/30">{shortAddress(launch.mint)}</p>
        </div>
        <ExternalLink
          className="size-3.5 shrink-0 text-white/18 transition-colors group-hover:text-white/52"
          strokeWidth={1.5}
        />
      </a>
      <dl className="mt-3 grid gap-1.5">
        {rows.map(([label, value]) => (
          <div className="flex items-baseline justify-between gap-4" key={label}>
            <dt className="font-mono text-[10px] text-white/30">{label}</dt>
            <dd className="font-mono text-[11px] text-white/68 tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ToolOutputPanel({ run }: { run: ToolRun }) {
  const output = Array.isArray(run.output) ? run.output : null;
  const tokens = output?.filter(isTokenSignal) ?? [];
  const markets = output?.filter(isPredictionSignal) ?? [];
  const holders = isHolderConcentration(run.output) ? run.output : null;
  const launch = isPumpFunLaunch(run.output) ? run.output : null;
  const rendered = tokens.length > 0 || markets.length > 0 || holders !== null || launch !== null;

  return (
    <div>
      <div className="flex min-h-11 items-center justify-between border-b border-white/[0.06] px-4">
        <span className="flex items-center gap-2 font-mono text-[10px] text-white/48">
          <SourceMarkForTool size={13} toolName={run.name} />
          {run.name}
        </span>
        <span className={cn("text-[10px]", run.status === "error" ? "text-red-400" : "text-white/44")}>
          {run.status === "completed" ? "Completed" : run.status === "error" ? "Failed" : "Running"}
        </span>
      </div>
      <div className="p-3.5">
        {tokens.length > 0 ? <TokenResults tokens={tokens} /> : null}
        {markets.length > 0 ? <PredictionResults markets={markets} /> : null}
        {holders ? <HolderResult result={holders} /> : null}
        {launch ? <PumpFunResult launch={launch} /> : null}
        {run.output === null && run.status === "completed" ? (
          <p className="text-[12px] leading-6 text-white/52">
            No Pump.fun launch record for that mint — it was created somewhere else.
          </p>
        ) : null}
        {!rendered && run.output !== null ? (
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[10px] leading-5 text-white/44">
            {JSON.stringify(run.output, null, 2)}
          </pre>
        ) : null}
        <details className="mt-3 border-t border-white/[0.055] pt-3">
          <summary className="cursor-pointer text-[10px] text-white/27">View input</summary>
          <pre className="mt-2 overflow-auto whitespace-pre-wrap font-mono text-[9px] leading-4 text-white/32">{JSON.stringify(run.input, null, 2)}</pre>
        </details>
      </div>
    </div>
  );
}

function RailButton({
  active,
  children,
  disabled,
  label,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      aria-current={active ? "page" : undefined}
      aria-label={label}
      className={cn(
        "relative flex size-10 items-center justify-center rounded-lg text-white/36 transition-[background-color,color,scale] duration-150 ease-out hover:bg-white/[0.055] hover:text-white/76 active:scale-[0.96]",
        active && "bg-white/[0.055] text-white/88",
        disabled && "cursor-not-allowed opacity-30",
      )}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {active ? <span className="absolute -left-1 h-4 w-0.5 rounded-full bg-white/72" /> : null}
      {children}
    </button>
  );
}

export function AgentWorkspace() {
  const auth = useAniAuth();
  const [messages, setMessages] = useState<ChatEntry[]>([greeting]);
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"ani" | "chat">("chat");
  const [hydrated, setHydrated] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [conversationSync, setConversationSync] = useState<"local" | "loading" | "ready">("local");
  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);
  const messagesRef = useRef(messages);
  const mutedRef = useRef(muted);
  const pendingSubmissionRef = useRef<{
    attachment?: PromptAttachment;
    text: string;
  } | null>(null);
  const requestIdRef = useRef(0);
  const speechRef = useRef<SpeechQueue | null>(null);
  const syncedUserRef = useRef<string | null>(null);
  const promptBarRef = useRef<BeautifulPromptBarHandle>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  /** One queue for the session, created on first use so SSR never touches it. */
  const speechQueue = useCallback(() => {
    speechRef.current ??= new SpeechQueue(setSpeaking, auth.getAccessToken);
    speechRef.current.setAccessTokenProvider(auth.getAccessToken);
    return speechRef.current;
  }, [auth.getAccessToken]);

  // Reading the saved conversation has to happen after mount: doing it in a
  // lazy initialiser would make the client's first render disagree with the
  // server's, which is a worse problem than the cascading-render the rule
  // guards against. It runs once, on an empty dependency list.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ChatEntry[];
        // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
    } catch {
      // A corrupt local draft should never block the workspace.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || auth.authenticated) return;
    // Never persist a half-streamed answer as if it were settled; JSON.stringify
    // drops the undefined.
    const settled = messages.map((entry) =>
      entry.streaming ? { ...entry, streaming: undefined } : entry,
    );
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settled.slice(-30)));
  }, [auth.authenticated, hydrated, messages]);

  // Once Privy has a user, Neon becomes the source of truth. A pre-auth local
  // draft is migrated only when that account does not have a conversation yet.
  useEffect(() => {
    const userId = auth.user?.id ?? null;
    if (!hydrated || !auth.ready) return;

    if (!auth.authenticated || !userId) {
      if (syncedUserRef.current) {
        syncedUserRef.current = null;
        setConversationSync("local");
        setMessages([greeting]);
        window.localStorage.removeItem(STORAGE_KEY);
      }
      return;
    }
    if (syncedUserRef.current === userId) return;

    syncedUserRef.current = userId;
    setConversationSync("loading");
    const controller = new AbortController();
    let cancelled = false;

    void (async () => {
      try {
        const response = await authenticatedFetch(auth.getAccessToken, "/api/conversation", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Conversation history is temporarily unavailable.");
        const payload = (await response.json()) as { messages?: ChatEntry[] };
        if (Array.isArray(payload.messages) && payload.messages.length > 0) {
          if (!cancelled) setMessages(payload.messages);
        } else {
          const localMessages = messagesRef.current
            .map((entry) => ({ ...entry, streaming: undefined }))
            .slice(-60);
          if (localMessages.length > 1) {
            await authenticatedFetch(auth.getAccessToken, "/api/conversation", {
              body: JSON.stringify({ messages: localMessages }),
              headers: { "Content-Type": "application/json" },
              method: "PUT",
              signal: controller.signal,
            });
          }
        }
        if (!cancelled) window.localStorage.removeItem(STORAGE_KEY);
      } catch (cause) {
        if (!cancelled) {
          console.error("Conversation hydration failed", cause);
        }
      } finally {
        if (!cancelled) setConversationSync("ready");
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      if (syncedUserRef.current === userId) syncedUserRef.current = null;
    };
  }, [auth.authenticated, auth.getAccessToken, auth.ready, auth.user?.id, hydrated]);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const stopSpeech = useCallback(() => {
    speechRef.current?.stop();
    setSpeaking(false);
  }, []);

  useEffect(
    () => () => {
      requestIdRef.current += 1;
      abortRef.current?.abort();
      speechRef.current?.dispose();
    },
    [],
  );

  /** Replay a settled message on demand, from its message action. */
  const speak = useCallback(
    (text: string) => {
      if (muted) return;
      const queue = speechQueue();
      queue.stop();
      queue.push(text);
      queue.end();
    },
    [muted, speechQueue],
  );

  const submit = useCallback(
    async (text: string, attachment?: PromptAttachment) => {
      const clean = text.trim();
      if (!clean || inFlightRef.current) return;
      if (!auth.ready || !auth.authenticated) {
        pendingSubmissionRef.current = { attachment, text: clean };
        setMobileView("chat");
        setAuthGateOpen(true);
        return;
      }
      if (conversationSync !== "ready") {
        pendingSubmissionRef.current = { attachment, text: clean };
        return;
      }

      const controller = new AbortController();
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      abortRef.current = controller;
      inFlightRef.current = true;
      const isCurrentRequest = () => requestIdRef.current === requestId;

      const displayText = attachment
        ? `${clean}\n\nAttachment: **${attachment.name}**`
        : clean;
      const requestText = attachment
        ? `${clean}\n\nContext from ${attachment.name}:\n${attachment.content}`
        : clean;

      const replyId = crypto.randomUUID();
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "user", text: displayText },
      ]);
      setStatus("submitted");
      setMobileView("chat");

      // Ani starts talking on the first completed sentence rather than waiting
      // for the last token, so the answer is being spoken while it is still
      // being written.
      const queue = speechQueue();
      queue.stop();
      const splitter = new SentenceSplitter();
      /** Create the assistant turn the first time anything arrives for it. */
      const ensureReply = () => {
        if (!isCurrentRequest()) return;
        setMessages((current) =>
          current.some((entry) => entry.id === replyId)
            ? current
            : [...current, { id: replyId, role: "assistant", streaming: true, text: "" }],
        );
      };

      const patchReply = (patch: (entry: ChatEntry) => ChatEntry) => {
        if (!isCurrentRequest()) return;
        ensureReply();
        setMessages((current) =>
          current.map((entry) => (entry.id === replyId ? patch(entry) : entry)),
        );
      };

      try {
        const response = await authenticatedFetch(auth.getAccessToken, "/api/agent", {
          body: JSON.stringify({
            history: messagesRef.current.slice(-10).map((entry) => ({
              role: entry.role,
              text: entry.text.slice(0, 1_200),
            })),
            message: requestText,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
          signal: controller.signal,
        });
        if (!response.ok) {
          const contentType = response.headers.get("content-type") ?? "";
          const detail = contentType.includes("application/json")
            ? ((await response.json().catch(() => null)) as { error?: string } | null)?.error
            : (await response.text().catch(() => "")).trim().slice(0, 240);
          throw new Error(detail || `Ani couldn’t complete that pass (${response.status}).`);
        }

        let completed = false;
        let failure: string | null = null;
        await readAgentStream(response, (event) => {
          if (!isCurrentRequest()) return;
          switch (event.type) {
            case "tool-start": {
              setStatus("streaming");
              patchReply((entry) => ({
                ...entry,
                toolRuns: [
                  ...(entry.toolRuns ?? []),
                  {
                    durationMs: 0,
                    id: event.id,
                    input: event.input,
                    label: event.label,
                    name: event.name,
                    output: null,
                    status: "running",
                  },
                ],
              }));
              break;
            }
            case "tool": {
              patchReply((entry) => {
                const runs = entry.toolRuns ?? [];
                const known = runs.some((run) => run.id === event.run.id);
                return {
                  ...entry,
                  toolRuns: known
                    ? runs.map((run) => (run.id === event.run.id ? event.run : run))
                    : [...runs, event.run],
                };
              });
              break;
            }
            case "text": {
              setStatus("streaming");
              patchReply((entry) => ({ ...entry, text: entry.text + event.delta }));
              for (const sentence of splitter.push(event.delta)) {
                if (!mutedRef.current) queue.push(sentence);
              }
              break;
            }
            case "sources": {
              patchReply((entry) => ({ ...entry, sources: event.sources }));
              break;
            }
            case "done": {
              completed = true;
              patchReply((entry) => ({ ...entry, mode: event.mode, streaming: false }));
              break;
            }
            case "error": {
              failure = event.message;
              break;
            }
          }
        });

        if (!failure && !completed) {
          throw new Error("The connection ended before Ani finished the response.");
        }

        if (!mutedRef.current) {
          const tail = splitter.flush();
          if (tail) queue.push(tail);
          queue.end();
        } else {
          queue.stop();
        }

        if (failure) throw new Error(failure);
        patchReply((entry) => ({ ...entry, streaming: false }));
        if (isCurrentRequest()) setStatus("ready");
      } catch (error) {
        queue.stop();
        if (controller.signal.aborted || !isCurrentRequest()) return;
        const detail = error instanceof Error ? error.message : "the research request failed";
        setMessages((current) => {
          const settled = current.map((entry) =>
            entry.id === replyId ? { ...entry, streaming: false } : entry,
          );
          const withoutEmpty = settled.filter(
            (entry) => !(entry.id === replyId && !entry.text && !entry.toolRuns?.length),
          );
          return [
            ...withoutEmpty,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              text: `I hit a snag: **${detail}** Try again in a moment.`,
            },
          ];
        });
        setStatus("error");
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          inFlightRef.current = false;
        }
      }
    },
    [
      auth.authenticated,
      auth.getAccessToken,
      auth.ready,
      conversationSync,
      speechQueue,
    ],
  );

  // The first prompt survives the OTP/wallet round-trip and runs only after
  // that user's persisted thread has been loaded, so the response cannot race
  // with hydration and disappear.
  useEffect(() => {
    if (!auth.authenticated || conversationSync !== "ready") return;
    const pending = pendingSubmissionRef.current;
    if (!pending) return;
    pendingSubmissionRef.current = null;
    setAuthGateOpen(false);
    void submit(pending.text, pending.attachment);
  }, [auth.authenticated, conversationSync, submit]);

  // Save settled turns after streaming completes. The browser copy remains an
  // unauthenticated draft only; signed-in history lives in Neon.
  useEffect(() => {
    if (!auth.authenticated || conversationSync !== "ready" || inFlightRef.current) return;
    const settled = messages
      .map((entry) => ({ ...entry, streaming: undefined }))
      .slice(-60);
    const timer = window.setTimeout(() => {
      void authenticatedFetch(auth.getAccessToken, "/api/conversation", {
        body: JSON.stringify({ messages: settled }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      }).then((response) => {
        if (!response.ok) throw new Error(`Conversation save failed (${response.status}).`);
      }).catch((cause) => console.error("Conversation save failed", cause));
    }, 700);
    return () => window.clearTimeout(timer);
  }, [auth.authenticated, auth.getAccessToken, conversationSync, messages, status]);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    inFlightRef.current = false;
    pendingSubmissionRef.current = null;
    stopSpeech();
    setMessages([greeting]);
    setStatus("ready");
    setHistoryOpen(false);
    setAuthGateOpen(false);
    window.localStorage.removeItem(STORAGE_KEY);
    if (auth.authenticated) {
      void authenticatedFetch(auth.getAccessToken, "/api/conversation", {
        method: "DELETE",
      }).catch((cause) => console.error("Conversation reset failed", cause));
    }
  }, [auth.authenticated, auth.getAccessToken, stopSpeech]);

  const copyMessage = useCallback(async (entry: ChatEntry) => {
    await navigator.clipboard.writeText(entry.text.replaceAll(/[*_#`]/g, ""));
    setCopiedId(entry.id);
    window.setTimeout(() => setCopiedId(null), 1_200);
  }, []);

  const busy = status === "submitted" || status === "streaming";

  const historyItems = messages.filter((entry) => entry.role === "user");
  const identity = authIdentity(auth.user);

  const focusComposer = useCallback((draft?: string) => {
    setMobileView("chat");
    window.requestAnimationFrame(() => {
      if (draft) promptBarRef.current?.setDraft(draft);
      else promptBarRef.current?.focus();
    });
  }, []);

  return (
    <main className="ani-grain relative h-svh min-h-[650px] overflow-hidden bg-black text-white">
      <AuthGate onOpenChange={setAuthGateOpen} open={authGateOpen} />
      <aside className="absolute inset-y-0 left-0 z-40 hidden w-[52px] flex-col items-center border-r border-white/[0.065] bg-black py-2 md:flex">
        <Link aria-label="AniBot home" className="group mb-4 flex size-10 items-center justify-center rounded-lg active:scale-[0.96]" href="/">
          <AniMark className="text-white/70 transition-colors duration-150 group-hover:text-white" size={22} />
        </Link>
        <div className="flex flex-1 flex-col items-center gap-1">
          <RailButton active label="Chat with Ani" onClick={() => focusComposer()}>
            <AniAvatar className="size-6 rounded-[7px]" />
          </RailButton>
          <RailButton label="Search" onClick={() => focusComposer("Search crypto markets for ")}>
            <Search className="size-[17px]" strokeWidth={1.5} />
          </RailButton>
          <RailButton disabled={busy} label="Scan markets" onClick={() => void submit("What’s moving on Solana?")}>
            <BarChart3 className="size-[17px]" strokeWidth={1.5} />
          </RailButton>
          <RailButton label="Inspect wallet" onClick={() => setWalletOpen(true)}>
            <WalletCards className="size-[17px]" strokeWidth={1.5} />
          </RailButton>
          <RailButton label="Conversation history" onClick={() => setHistoryOpen(true)}>
            <History className="size-[17px]" strokeWidth={1.5} />
          </RailButton>
        </div>
        <Dialog>
          <DialogTrigger render={<button aria-label="Settings" className="flex size-10 items-center justify-center rounded-lg text-white/36 transition-[background-color,color,scale] duration-150 hover:bg-white/[0.055] hover:text-white/76 active:scale-[0.96]" type="button" />}>
            <Settings2 className="size-[17px]" strokeWidth={1.5} />
          </DialogTrigger>
          <DialogContent className="rounded-xl border-0 bg-dialog shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.1),0_30px_100px_rgb(0_0_0_/_0.75)] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Workspace settings</DialogTitle>
              <DialogDescription>
                {auth.authenticated
                  ? "History is synced to your private Ani account. ElevenLabs is used when configured; otherwise Ani uses browser speech."
                  : "Sign in to sync history. Until then, this browser keeps your local draft."}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-2 flex items-center justify-between rounded-xl bg-white/[0.035] p-4 shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.07)]">
              <div><p className="text-sm text-white/82">Speak responses</p><p className="mt-1 text-xs text-white/34">Synced to Ani’s mouth movement</p></div>
              <button aria-label={muted ? "Turn voice on" : "Turn voice off"} className="flex size-11 items-center justify-center rounded-xl bg-white/[0.055] text-white/70 active:scale-[0.96]" onClick={() => { setMuted((value) => !value); stopSpeech(); }} type="button">
                {muted ? <VolumeX className="size-[18px]" strokeWidth={1.5} /> : <Volume2 className="size-[18px]" strokeWidth={1.5} />}
              </button>
            </div>
            {auth.authenticated ? (
              <Button
                className="mt-2 h-11 w-full justify-start rounded-lg text-white/54 hover:bg-white/[0.055] hover:text-white/82 active:scale-[0.96]"
                onClick={() => void auth.logout()}
                variant="ghost"
              >
                <LogOut data-icon="inline-start" />
                Sign out of {identity}
              </Button>
            ) : (
              <Button
                className="mt-2 h-11 w-full rounded-lg bg-white text-black hover:bg-white/88 active:scale-[0.96]"
                onClick={() => setAuthGateOpen(true)}
              >
                Sign in to sync
              </Button>
            )}
          </DialogContent>
        </Dialog>
      </aside>

      <Dialog onOpenChange={setWalletOpen} open={walletOpen}>
        <DialogContent className="rounded-xl border-0 bg-dialog p-5 shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.1),0_30px_100px_rgb(0_0_0_/_0.75)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Inspect a Solana wallet</DialogTitle>
            <DialogDescription>
              Ani will use Helius when configured and summarize activity, holdings, and obvious risk signals.
            </DialogDescription>
          </DialogHeader>
          <form
            className="mt-2"
            onSubmit={(event) => {
              event.preventDefault();
              const address = walletAddress.trim();
              if (address.length < 32 || busy) return;
              setWalletOpen(false);
              setWalletAddress("");
              void submit(`Inspect this Solana wallet and summarize its recent activity, holdings, and risk signals: ${address}`);
            }}
          >
            <label className="text-[12px] text-white/52" htmlFor="wallet-address">Wallet address</label>
            <input
              autoComplete="off"
              className="mt-2 h-12 w-full rounded-[10px] bg-black px-3.5 font-mono text-[16px] text-white/82 outline-none shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.1)] transition-[box-shadow] duration-150 placeholder:text-white/24 focus:shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.22)] sm:text-[13px]"
              id="wallet-address"
              maxLength={64}
              minLength={32}
              onChange={(event) => setWalletAddress(event.target.value)}
              placeholder="Paste a Solana address"
              required
              spellCheck={false}
              value={walletAddress}
            />
            <DialogFooter className="mx-0 mt-5 -mb-0 gap-2 border-0 bg-transparent p-0">
              <Button className="h-11 rounded-lg text-white/54 hover:bg-white/[0.05] hover:text-white/80 active:scale-[0.96]" onClick={() => setWalletOpen(false)} type="button" variant="ghost">Cancel</Button>
              <Button className="h-11 rounded-lg bg-white px-4 text-black hover:bg-white/88 active:scale-[0.96]" disabled={walletAddress.trim().length < 32 || busy} type="submit">Inspect wallet</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Sheet onOpenChange={setHistoryOpen} open={historyOpen}>
        <SheetContent className="border-white/[0.08] bg-sheet sm:max-w-[420px]">
          <SheetHeader className="border-b border-white/[0.07] px-5 py-5">
            <SheetTitle>Conversation history</SheetTitle>
            <SheetDescription>
              {auth.authenticated ? "Synced privately across your sessions." : "This draft stays in this browser until you sign in."}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
            {historyItems.length ? (
              <div className="space-y-1">
                {historyItems.slice().reverse().map((entry, index) => {
                  const prompt = entry.text.replace(/\n\nAttachment:[\s\S]*$/, "");
                  return (
                    <button
                      className="group flex min-h-14 w-full items-start gap-3 rounded-[10px] px-3 py-3 text-left transition-[background-color,scale] duration-150 hover:bg-white/[0.045] active:scale-[0.96]"
                      key={entry.id}
                      onClick={() => {
                        setHistoryOpen(false);
                        focusComposer(prompt);
                      }}
                      type="button"
                    >
                      <span className="mt-0.5 font-mono text-[10px] text-white/22 tabular-nums">{historyItems.length - index}</span>
                      <span className="line-clamp-2 text-[13px] leading-5 text-white/52 transition-colors group-hover:text-white/78">{prompt}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="px-3 py-10">
                <p className="text-[13px] text-white/48">No prompts yet.</p>
                <p className="mt-1 text-[12px] text-white/26">Your conversation will appear here.</p>
              </div>
            )}
          </div>
          <div className="mt-auto border-t border-white/[0.07] p-4">
            <Button className="h-11 w-full justify-start rounded-lg text-white/64 hover:bg-white/[0.055] active:scale-[0.96]" onClick={reset} variant="ghost"><MessageSquarePlus data-icon="inline-start" />New conversation</Button>
          </div>
        </SheetContent>
      </Sheet>

      <div className="relative flex h-full flex-col md:ml-[52px]">
        <header className="ani-hairline-fade relative z-30 flex h-[58px] shrink-0 items-center justify-between gap-3 px-3.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link
              aria-label="AniBot home"
              className="group flex size-9 shrink-0 items-center justify-center rounded-lg transition-[background-color,scale] duration-150 hover:bg-white/[0.05] active:scale-[0.96] md:hidden"
              href="/"
            >
              <AniMark className="text-white/70 transition-colors duration-150 group-hover:text-white" size={22} />
            </Link>
            <h1 className="text-[14px] font-medium tracking-[-0.025em]">Ani</h1>
          </div>

          <div className="absolute left-1/2 flex -translate-x-1/2 items-center rounded-lg bg-white/[0.035] p-1 shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.07)] lg:hidden">
            {(["ani", "chat"] as const).map((view) => (
              <button
                className={cn("flex h-8 min-w-16 items-center justify-center rounded-md px-3 text-[11px] text-white/36 transition-[background-color,color,scale] duration-150 active:scale-[0.96]", mobileView === view && "bg-white/[0.085] text-white/88")}
                key={view}
                onClick={() => setMobileView(view)}
                type="button"
              >
                {view === "chat" ? "Agent" : "Ani"}
              </button>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              aria-label={auth.authenticated ? `Account: ${identity}` : "Sign in"}
              className={cn(
                "flex h-9 items-center gap-2 rounded-chip px-3 text-[11px] transition-[background-color,color,scale] duration-150 active:scale-[0.96]",
                auth.authenticated
                  ? "bg-white/[0.045] text-white/52 hover:bg-white/[0.075] hover:text-white/80"
                  : "bg-white text-black hover:bg-white/88",
              )}
              onClick={() => auth.authenticated ? setMenuOpen(true) : setAuthGateOpen(true)}
              type="button"
            >
              <UserRound className="size-3.5" strokeWidth={1.6} />
              <span className="hidden max-w-36 truncate sm:inline">
                {auth.authenticated ? identity : "Sign in"}
              </span>
            </button>

            <span aria-hidden="true" className="mx-1 hidden h-4 w-px bg-white/10 sm:block" />

            {/* the most-used action, no longer two levels deep in a sheet */}
            <button
              aria-label="New conversation"
              className="flex size-9 items-center justify-center rounded-lg text-white/36 transition-[background-color,color,scale] duration-150 hover:bg-white/[0.05] hover:text-white/72 active:scale-[0.96]"
              onClick={reset}
              title="New conversation"
              type="button"
            >
              <MessageSquarePlus className="size-[17px]" strokeWidth={1.5} />
            </button>

            <Sheet onOpenChange={setMenuOpen} open={menuOpen}>
              <SheetTrigger render={<button aria-label="Open workspace menu" className="flex size-9 items-center justify-center rounded-lg text-white/36 transition-[background-color,color,scale] duration-150 hover:bg-white/[0.05] hover:text-white/72 active:scale-[0.96]" type="button" />}><Menu className="size-[18px]" strokeWidth={1.5} /></SheetTrigger>
              <SheetContent className="border-white/10 bg-sheet p-5">
                <SheetHeader><SheetTitle>Workspace</SheetTitle><SheetDescription>Conversation and research controls</SheetDescription></SheetHeader>
                <div className="mt-7 rounded-xl bg-white/[0.035] p-3.5 shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.065)]">
                  {auth.authenticated ? (
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-white/[0.055] text-white/58">
                        <UserRound className="size-[17px]" strokeWidth={1.5} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] text-white/76">{identity}</p>
                        <p className="mt-0.5 text-[10px] text-white/28">
                          {conversationSync === "loading" ? "Loading history…" : "History synced"}
                        </p>
                      </div>
                      <button
                        aria-label="Sign out"
                        className="flex size-9 items-center justify-center rounded-lg text-white/30 transition-[background-color,color,scale] duration-150 hover:bg-white/[0.055] hover:text-white/72 active:scale-[0.96]"
                        onClick={() => { setMenuOpen(false); void auth.logout(); }}
                        type="button"
                      >
                        <LogOut className="size-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  ) : (
                    <button
                      className="flex min-h-11 w-full items-center justify-between text-left text-[12px] text-white/68"
                      onClick={() => { setMenuOpen(false); setAuthGateOpen(true); }}
                      type="button"
                    >
                      Sign in to save your history
                      <UserRound className="size-4 text-white/36" strokeWidth={1.5} />
                    </button>
                  )}
                </div>
                <div className="mt-4 space-y-1">
                  <Button className="h-11 w-full justify-start rounded-lg bg-white/[0.045] text-white/70 hover:bg-white/[0.075] active:scale-[0.96]" onClick={() => { setMenuOpen(false); focusComposer("Search crypto markets for "); }} variant="ghost"><Search data-icon="inline-start" />Search markets</Button>
                  <Button className="h-11 w-full justify-start rounded-lg text-white/70 hover:bg-white/[0.075] active:scale-[0.96]" disabled={busy} onClick={() => { setMenuOpen(false); void submit("What’s moving on Solana?"); }} variant="ghost"><BarChart3 data-icon="inline-start" />Scan Solana</Button>
                  <Button className="h-11 w-full justify-start rounded-lg text-white/70 hover:bg-white/[0.075] active:scale-[0.96]" onClick={() => { setMenuOpen(false); setWalletOpen(true); }} variant="ghost"><WalletCards data-icon="inline-start" />Inspect wallet</Button>
                  <Button className="h-11 w-full justify-start rounded-lg text-white/70 hover:bg-white/[0.075] active:scale-[0.96]" onClick={() => { setMenuOpen(false); setHistoryOpen(true); }} variant="ghost"><History data-icon="inline-start" />History</Button>
                  <Button className="h-11 w-full justify-start rounded-lg text-white/70 hover:bg-white/[0.075] active:scale-[0.96]" onClick={() => { setMenuOpen(false); reset(); }} variant="ghost"><MessageSquarePlus data-icon="inline-start" />New conversation</Button>
                </div>
                <div className="mt-5 border-t border-white/[0.07] pt-4">
                  <p className="mb-1.5 px-3 text-[11px] font-medium text-white/28">Connections</p>
                  <div className="space-y-1">
                    <Button className="h-11 w-full justify-start rounded-lg text-white/32 disabled:opacity-100" disabled variant="ghost">
                      <Cloud data-icon="inline-start" strokeWidth={1.5} />
                      Cloud computer
                      <span className="ml-auto rounded-md bg-white/[0.045] px-2 py-1 text-[10px] font-medium text-white/24">Soon</span>
                    </Button>
                    <Button className="h-11 w-full justify-start rounded-lg text-white/32 disabled:opacity-100" disabled variant="ghost">
                      <Network data-icon="inline-start" strokeWidth={1.5} />
                      Gateway
                      <span className="ml-auto rounded-md bg-white/[0.045] px-2 py-1 text-[10px] font-medium text-white/24">Soon</span>
                    </Button>
                    <Button className="h-11 w-full justify-start rounded-lg text-white/32 disabled:opacity-100" disabled variant="ghost">
                      <IMessageMark className="size-4" />
                      iMessage
                      <span className="ml-auto rounded-md bg-white/[0.045] px-2 py-1 text-[10px] font-medium text-white/24">Soon</span>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(360px,0.9fr)_minmax(560px,1.1fr)]">
          <section className={cn("relative min-h-0 overflow-hidden border-r border-white/[0.065]", mobileView !== "ani" && "hidden lg:block")} aria-label="Ani avatar">
            {/* Atmosphere is confined to Ani's side of the workspace. The
                conversation is a working surface — nothing drifts behind the
                answer, the tool output, or the numbers. */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%]">
              <AuroraField anchor="bottom" intensity={0.34} />
            </div>
            <div className="ani-stage-light pointer-events-none absolute inset-0" />

            <VrmStage className="absolute inset-0 bg-transparent" speaking={speaking} />
            <button aria-label={speaking ? "Stop Ani speaking" : muted ? "Turn Ani voice on" : "Turn Ani voice off"} className="absolute right-5 bottom-5 flex size-11 items-center justify-center rounded-full bg-white text-black shadow-[0_12px_38px_rgb(0_0_0_/_0.5)] transition-[background-color,scale] duration-150 hover:bg-white/88 active:scale-[0.96]" onClick={speaking ? stopSpeech : () => setMuted((value) => !value)} type="button">
              {speaking ? <AudioLines className="size-5" strokeWidth={2} /> : muted ? <VolumeX className="size-5" strokeWidth={2} /> : <Volume2 className="size-5" strokeWidth={2} />}
            </button>
          </section>

          <section className={cn("relative flex min-h-0 flex-col bg-black", mobileView !== "chat" && "hidden lg:flex")} aria-label="Ani conversation">
            <Conversation className="min-h-0">
              <ConversationContent className="mx-auto w-full max-w-[760px] gap-8 px-4 pb-44 pt-8 sm:px-8 sm:pt-11">
                {messages.map((entry) => (
                  <Message className={entry.role === "assistant" ? "max-w-full" : "max-w-[82%]"} from={entry.role} key={entry.id}>
                    {entry.role === "assistant" ? (
                      <div className="flex items-start gap-3">
                        <AniAvatar className="mt-0.5" reveal />
                        <div className="min-w-0 flex-1">
                          <p className="mb-1.5 text-[12px] font-medium text-white/62">Ani</p>
                          {entry.toolRuns?.length ? (
                            <div className="mb-4">
                              <BeautifulToolChips renderOutput={(run) => <ToolOutputPanel run={run} />} runs={entry.toolRuns} />
                            </div>
                          ) : null}
                          {entry.text || !entry.streaming ? (
                            <MessageContent className="text-[15px] leading-7 text-white/75">
                              <MessageResponse>{entry.text}</MessageResponse>
                              {entry.streaming ? (
                                <span
                                  aria-hidden="true"
                                  className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.15em] bg-[color:var(--blush)] motion-safe:animate-pulse"
                                />
                              ) : null}
                            </MessageContent>
                          ) : null}
                          {entry.sources?.length ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {entry.sources.slice(0, 4).map((source) => (
                                <SourceChip key={`${source.title}-${source.url}`} title={source.title} url={source.url} />
                              ))}
                            </div>
                          ) : null}
                          <MessageActions className="mt-1 opacity-60 transition-opacity duration-150 hover:opacity-100">
                            <MessageAction className="size-10 rounded-lg text-white/29 hover:bg-white/[0.045] hover:text-white/66 active:scale-[0.96]" label="Copy response" onClick={() => void copyMessage(entry)} tooltip="Copy response">{copiedId === entry.id ? <Check className="size-3.5" strokeWidth={1.5} /> : <Clipboard className="size-3.5" strokeWidth={1.5} />}</MessageAction>
                            <MessageAction className="size-10 rounded-lg text-white/29 hover:bg-white/[0.045] hover:text-white/66 active:scale-[0.96]" label="Speak response" onClick={() => void speak(entry.text)} tooltip="Speak response"><Volume2 className="size-3.5" strokeWidth={1.5} /></MessageAction>
                          </MessageActions>
                        </div>
                      </div>
                    ) : (
                      <MessageContent className="rounded-[14px] rounded-br-[5px] bg-white/[0.075] px-4 py-3 text-[14px] leading-6 text-white/82 shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.07)]">
                        <MessageResponse>{entry.text}</MessageResponse>
                      </MessageContent>
                    )}
                  </Message>
                ))}
                {status === "submitted" ? <BeautifulThinkingTrace /> : null}
              </ConversationContent>
              <ConversationScrollButton aria-label="Scroll to latest message" className="bottom-32 size-10 border-0 bg-field text-white/56 shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.1)] hover:bg-field-hover active:scale-[0.96]" />
            </Conversation>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-linear-to-t from-black via-black/97 to-transparent px-3 pb-3 pt-16 sm:px-7 sm:pb-5">
              <div className="pointer-events-auto mx-auto max-w-[760px]">
                <BeautifulPromptBar ref={promptBarRef} disabled={busy} onSubmit={submit} suggestions={messages.length <= 1 ? starterPrompts : []} />
                <p className="mt-2 text-center text-[10px] text-white/20">Check important market data before trading.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
