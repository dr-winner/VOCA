import { createFileRoute } from "@tanstack/react-router";
import { readEnv } from "@/lib/config/env-bridge";

// Returns ElevenLabs creds for client-side WebSocket use.
// Acceptable for hackathon demo per spec — production should proxy.
export const Route = createFileRoute("/api/voice-config")({
  server: {
    handlers: {
      GET: async () => {
        const apiKey = readEnv("ELEVENLABS_API_KEY") ?? "";
        const voiceId = readEnv("ELEVENLABS_VOICE_ID") ?? "";
        return Response.json({ apiKey, voiceId });
      },
    },
  },
});
