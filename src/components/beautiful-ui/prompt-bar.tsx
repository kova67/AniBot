"use client";

// Adapted from Beautiful UI's MIT-licensed prompt and chat composer patterns.
// Source: https://github.com/ithmz/beautiful-ui

import { ArrowUp, Mic, Paperclip, Plus, Square, X } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { SourceMark } from "@/components/brand/source-mark";
import { SOURCES, type SourceId } from "@/lib/brand/sources";
import { useSpeechInput } from "@/lib/speech/use-speech-input";
import { cn } from "@/lib/utils";

const MAX_HEIGHT = 160;
const MAX_CONTEXT_CHARS = 20_000;

/**
 * A starter, tagged with the service the question will reach. The mark is not
 * decoration: it says which of Ani's instruments this prompt spends before you
 * press it.
 */
export type PromptSuggestion = {
  label: string;
  source: SourceId;
};

export type PromptAttachment = {
  content: string;
  name: string;
};

export type BeautifulPromptBarHandle = {
  focus: () => void;
  setDraft: (value: string) => void;
};

type BeautifulPromptBarProps = {
  disabled?: boolean;
  onSubmit: (value: string, attachment?: PromptAttachment) => void | Promise<void>;
  suggestions?: readonly PromptSuggestion[];
};

export const BeautifulPromptBar = forwardRef<
  BeautifulPromptBarHandle,
  BeautifulPromptBarProps
>(function BeautifulPromptBar(
  { disabled = false, onSubmit, suggestions = [] },
  ref,
) {
  const [value, setValue] = useState("");
  const [interim, setInterim] = useState("");
  const [attachment, setAttachment] = useState<PromptAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSend = (value.trim().length > 0 || attachment !== null) && !disabled;

  const speech = useSpeechInput({
    onFinal: (text) => {
      if (!text) return;
      setValue((current) => (current ? `${current.trimEnd()} ${text}` : text));
      setInterim("");
    },
    onInterim: setInterim,
  });

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    setDraft: (draft) => {
      setValue(draft);
      window.requestAnimationFrame(() => textareaRef.current?.focus());
    },
  }), []);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, MAX_HEIGHT)}px`;
    element.style.overflowY = element.scrollHeight > MAX_HEIGHT ? "auto" : "hidden";
  }, [value]);

  const send = async () => {
    const clean = value.trim();
    if ((!clean && !attachment) || disabled) return;
    const submittedAttachment = attachment ?? undefined;
    speech.stop();
    setInterim("");
    setValue("");
    setAttachment(null);
    await onSubmit(clean || "Analyze the attached file.", submittedAttachment);
    textareaRef.current?.focus();
  };

  const attachFile = async (file: File | undefined) => {
    if (!file) return;
    const content = (await file.text()).slice(0, MAX_CONTEXT_CHARS);
    setAttachment({ content, name: file.name });
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  };

  return (
    <div className="w-full">
      {suggestions.length > 0 ? (
        <div className="ani-scroll-fade mb-2.5 -ml-1 flex gap-2 overflow-x-auto pb-1 pl-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {suggestions.map((suggestion) => (
            <button
              className="ani-edge-soft ani-edge-hover flex h-10 shrink-0 items-center gap-2 rounded-chip bg-white/[0.028] pr-3.5 pl-2.5 text-[12px] text-white/48 transition-[background-color,color,box-shadow,scale] duration-150 ease-out hover:bg-white/[0.055] hover:text-white/82 active:scale-[0.96]"
              key={suggestion.label}
              onClick={() => {
                setValue(suggestion.label);
                textareaRef.current?.focus();
              }}
              title={`Answered with ${SOURCES[suggestion.source].name}`}
              type="button"
            >
              <SourceMark
                identity={SOURCES[suggestion.source]}
                label={SOURCES[suggestion.source].name}
                size={14}
              />
              {suggestion.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="ani-lit ani-lit-focus overflow-hidden rounded-[15px] bg-composer/96 p-2.5 shadow-[0_18px_60px_rgb(0_0_0_/_0.5)] backdrop-blur-2xl [--ani-bloom:0.25] [--ani-sweep-duration:5s]">
        {attachment ? (
          <div className="mb-1 flex min-h-9 items-center gap-2 rounded-[9px] bg-white/[0.04] pl-2.5 pr-1 text-[11px] text-white/48 shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.065)]">
            <Paperclip className="size-3.5 shrink-0" strokeWidth={1.5} />
            <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
            <button
              aria-label={`Remove ${attachment.name}`}
              className="relative flex size-8 shrink-0 items-center justify-center rounded-[7px] text-white/34 after:absolute after:-inset-1 hover:bg-white/[0.055] hover:text-white/72 active:scale-[0.96]"
              onClick={() => setAttachment(null)}
              type="button"
            >
              <X className="size-3.5" strokeWidth={1.5} />
            </button>
          </div>
        ) : null}
        <textarea
          aria-label="Message Ani"
          className="block min-h-12 w-full resize-none bg-transparent px-2.5 py-2 text-base leading-6 text-white outline-none placeholder:text-white/29 disabled:cursor-not-allowed disabled:opacity-45"
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
          placeholder={speech.listening ? "Listening…" : "Ask Ani"}
          ref={textareaRef}
          rows={1}
          value={value}
        />

        {interim ? (
          <p aria-live="polite" className="px-2.5 pb-1 text-[13px] leading-5 text-white/34">
            {interim}
          </p>
        ) : null}
        {speech.error ? (
          <p className="px-2.5 pb-1 text-[11px] text-white/48" role="alert">
            {speech.error}
          </p>
        ) : null}

        <div className="mt-1 flex items-center gap-1.5">
          <button
            aria-label="Attach text or data"
            className="flex size-10 items-center justify-center rounded-[9px] text-white/38 transition-[background-color,color,scale] duration-150 ease-out hover:bg-white/[0.06] hover:text-white/76 active:scale-[0.96]"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <Plus className="size-[18px]" strokeWidth={1.5} />
          </button>
          {speech.supported ? (
            <button
              aria-label={speech.listening ? "Stop dictating" : "Dictate a message"}
              aria-pressed={speech.listening}
              className={cn(
                "flex size-10 items-center justify-center rounded-chip transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96]",
                speech.listening
                  ? "ani-pearl-edge bg-white/[0.09] text-white"
                  : "text-white/38 hover:bg-white/[0.06] hover:text-white/76",
              )}
              disabled={disabled}
              onClick={speech.toggle}
              title={speech.listening ? "Stop dictating" : "Dictate a message"}
              type="button"
            >
              {speech.listening ? (
                <Square className="size-3.5 fill-current" strokeWidth={0} />
              ) : (
                <Mic className="size-[18px]" strokeWidth={1.5} />
              )}
            </button>
          ) : null}
          <input
            accept=".txt,.md,.json,.csv,text/plain,text/markdown,application/json,text/csv"
            className="hidden"
            onChange={(event) => {
              void attachFile(event.target.files?.[0]);
              event.target.value = "";
            }}
            ref={fileInputRef}
            tabIndex={-1}
            type="file"
          />
          <button
            aria-label="Send message"
            className={cn(
              "ml-auto flex size-10 items-center justify-center rounded-[9px] transition-[background-color,color,scale,opacity] duration-150 ease-out active:scale-[0.96]",
              canSend
                ? "bg-white text-black hover:bg-white/88"
                : "cursor-not-allowed bg-white/[0.07] text-white/22",
            )}
            disabled={!canSend}
            onClick={() => void send()}
            type="button"
          >
            <ArrowUp className="size-[18px]" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
});
