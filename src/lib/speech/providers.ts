import "server-only";

export type SpeechProvider = "hume-octave-2" | "elevenlabs";

function cleanSpeechText(text: string) {
  return text.replaceAll(/[*_#`]/g, "");
}

export function configuredSpeechProviders(): SpeechProvider[] {
  if (process.env.HUME_API_KEY && process.env.HUME_VOICE_ID) {
    return ["hume-octave-2"];
  }
  return process.env.ELEVENLABS_API_KEY ? ["elevenlabs"] : [];
}

export function speechProviderModel(provider: SpeechProvider) {
  return provider === "hume-octave-2"
    ? "hume-octave-2"
    : (process.env.ELEVENLABS_MODEL ?? "eleven_flash_v2_5");
}

async function requestHume(text: string, signal: AbortSignal) {
  const apiKey = process.env.HUME_API_KEY;
  const voiceId = process.env.HUME_VOICE_ID;
  if (!apiKey || !voiceId) throw new Error("Hume is not configured.");

  return fetch("https://api.hume.ai/v0/tts/stream/file", {
    body: JSON.stringify({
      format: { type: "mp3" },
      instant_mode: true,
      num_generations: 1,
      strip_headers: true,
      utterances: [
        {
          text: cleanSpeechText(text),
          voice: { id: voiceId },
        },
      ],
      version: "2",
    }),
    headers: {
      Accept: "audio/mpeg",
      "Content-Type": "application/json",
      "X-Hume-Api-Key": apiKey,
    },
    method: "POST",
    signal,
  });
}

async function requestElevenLabs(text: string, signal: AbortSignal) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ElevenLabs is not configured.");

  const voiceId = process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";
  const model = process.env.ELEVENLABS_MODEL ?? "eleven_flash_v2_5";
  return fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`,
    {
      body: JSON.stringify({
        model_id: model,
        text: cleanSpeechText(text),
        voice_settings: { similarity_boost: 0.72, stability: 0.42, style: 0.3 },
      }),
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      method: "POST",
      signal,
    },
  );
}

export function requestSpeech(
  provider: SpeechProvider,
  text: string,
  signal: AbortSignal,
) {
  return provider === "hume-octave-2"
    ? requestHume(text, signal)
    : requestElevenLabs(text, signal);
}
