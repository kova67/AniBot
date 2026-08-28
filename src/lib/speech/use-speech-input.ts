"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * Push-to-talk for the composer, on the browser's own recogniser.
 *
 * Deliberately not a server transcription route: this needs no key, no upload,
 * and no audio leaves the machine — which matches the rest of the preview,
 * where the conversation never leaves the browser either. Chrome and Safari
 * expose it; Firefox does not, so the button hides itself rather than sitting
 * there dead.
 */

interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  isFinal: boolean;
  0: RecognitionAlternative;
  length: number;
}
interface RecognitionEvent {
  resultIndex: number;
  results: { length: number; [index: number]: RecognitionResult };
}
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

/** The capability never changes for the life of the page. */
const subscribeNever = () => () => {};
const quietRecognitionErrors = new Set(["no-speech", "aborted"]);
const recognitionErrorMessages: Readonly<Record<string, string>> = {
  "audio-capture": "No microphone was found.",
  "language-not-supported": "Dictation is not available for this language.",
  network: "Dictation needs a network connection to your browser's speech service.",
  "not-allowed": "Microphone access was blocked.",
  "service-not-allowed": "This browser would not start its speech service.",
};

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export function useSpeechInput({
  onFinal,
  onInterim,
}: {
  /** A completed phrase. Append this to the draft. */
  onFinal: (text: string) => void;
  /** The in-progress guess, for live feedback. Replaced on every event. */
  onInterim?: (text: string) => void;
}) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const handlers = useRef({ onFinal, onInterim });

  useEffect(() => {
    handlers.current = { onFinal, onInterim };
  }, [onFinal, onInterim]);

  // Feature detection has to wait for the client; deciding on the server would
  // render a button that does not exist in the browser it lands in. Read as an
  // external value rather than syncing it into state after mount.
  const supported = useSyncExternalStore(
    subscribeNever,
    () => recognitionCtor() !== null,
    () => false,
  );

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor || recognitionRef.current) return;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";

    recognition.onresult = (event) => {
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) handlers.current.onFinal(text.trim());
        else interim += text;
      }
      handlers.current.onInterim?.(interim.trim());
    };
    recognition.onerror = (event) => {
      // Silence is not a failure, and neither is the user stopping it.
      if (quietRecognitionErrors.has(event.error)) {
        setError(null);
        return;
      }
      setError(
        recognitionErrorMessages[event.error] ?? "Dictation stopped unexpectedly.",
      );
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      handlers.current.onInterim?.("");
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setError(null);
      setListening(true);
    } catch {
      setError("Could not start the microphone.");
    }
  }, []);

  const toggle = useCallback(() => {
    if (recognitionRef.current) stop();
    else start();
  }, [start, stop]);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  return { error, listening, start, stop, supported, toggle };
}
