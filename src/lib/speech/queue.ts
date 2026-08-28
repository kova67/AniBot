"use client";

/**
 * Speaks an answer sentence by sentence, as it arrives.
 *
 * The old behaviour waited for the complete reply and then made one long TTS
 * request, so Ani stood silent through the whole research pass. This queue
 * accepts sentences from the stream and plays them in order, holding the
 * speaking state across the whole run so the VRM stays in its speaking
 * animation rather than flickering between clips.
 *
 * The server chooses one configured neural voice. Ani never falls back to a
 * random system voice when that provider is unavailable.
 */

type Mode = "unknown" | "neural" | "silent";

const MAX_CHARS = 600;

/** Markdown is for the eye; strip it before anything gets read aloud. */
export function speakableText(text: string): string {
  return text
    .replaceAll(/```[\s\S]*?```/g, " ")
    .replaceAll(/`([^`]*)`/g, "$1")
    .replaceAll(/[*_#>]/g, "")
    .replaceAll(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replaceAll(/\s+/g, " ")
    .trim();
}

export class SpeechQueue {
  private queue: string[] = [];
  private queueIndex = 0;
  private ended = false;
  private running = false;
  private disposed = false;
  private mode: Mode = "unknown";
  private audio: HTMLAudioElement | null = null;
  private objectUrl: string | null = null;
  private getAccessToken: (() => Promise<string | null>) | null;

  constructor(
    private readonly onSpeakingChange: (speaking: boolean) => void,
    getAccessToken?: () => Promise<string | null>,
  ) {
    this.getAccessToken = getAccessToken ?? null;
  }

  setAccessTokenProvider(getAccessToken: () => Promise<string | null>) {
    this.getAccessToken = getAccessToken;
    if (this.mode === "silent") this.mode = "unknown";
  }

  push(sentence: string) {
    if (this.disposed) return;
    const clean = speakableText(sentence).slice(0, MAX_CHARS);
    if (!clean) return;
    this.queue.push(clean);
    void this.pump();
  }

  /** No more sentences are coming; drain and then report silence. */
  end() {
    this.ended = true;
    if (!this.running && this.queueIndex === this.queue.length) {
      this.onSpeakingChange(false);
    }
  }

  stop() {
    this.queue = [];
    this.queueIndex = 0;
    this.ended = true;
    this.releaseAudio();
    this.running = false;
    this.onSpeakingChange(false);
  }

  dispose() {
    this.disposed = true;
    this.stop();
  }

  private releaseAudio() {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
      this.audio = null;
    }
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }

  private async pump() {
    if (this.running || this.disposed) return;
    this.running = true;
    this.onSpeakingChange(true);

    while (this.queueIndex < this.queue.length && !this.disposed) {
      const sentence = this.queue[this.queueIndex];
      this.queueIndex += 1;
      try {
        if (this.mode === "unknown" || this.mode === "neural") {
          const played = await this.speakWithNeuralVoice(sentence);
          if (played) continue;
        }
      } catch {
        // A sentence that will not play should not take the rest of the
        // answer's audio down with it.
      }
    }
    if (this.queueIndex === this.queue.length) {
      this.queue = [];
      this.queueIndex = 0;
    }

    this.running = false;
    if (this.ended || this.queue.length === 0) this.onSpeakingChange(false);
  }

  private async speakWithNeuralVoice(sentence: string): Promise<boolean> {
    const token = await this.getAccessToken?.();
    if (!token) {
      this.mode = "silent";
      return false;
    }
    const response = await fetch("/api/speech", {
      body: JSON.stringify({ text: sentence }),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    if (!response.ok || response.headers.get("content-type")?.includes("application/json")) {
      this.mode = "silent";
      return false;
    }
    this.mode = "neural";

    const blob = await response.blob();
    if (this.disposed) return true;
    const url = URL.createObjectURL(blob);
    this.objectUrl = url;
    const audio = new Audio(url);
    this.audio = audio;

    await new Promise<void>((resolve) => {
      const finish = () => {
        audio.removeEventListener("ended", finish);
        audio.removeEventListener("error", finish);
        URL.revokeObjectURL(url);
        if (this.objectUrl === url) this.objectUrl = null;
        if (this.audio === audio) this.audio = null;
        resolve();
      };
      audio.addEventListener("ended", finish, { once: true });
      audio.addEventListener("error", finish, { once: true });
      audio.play().catch(finish);
    });
    return true;
  }

}
