import { createFileRoute } from "@tanstack/react-router";
import { readEnv } from "@/lib/config/env-bridge";

export const Route = createFileRoute("/api/stt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = readEnv("GROQ_API_KEY");
        if (!apiKey) return new Response("GROQ_API_KEY missing", { status: 500 });
        const incoming = await request.formData();
        const audio = incoming.get("audio");
        if (!(audio instanceof Blob)) return new Response("no audio", { status: 400 });

        const fd = new FormData();
        fd.append("file", audio, "audio.webm");
        fd.append("model", "whisper-large-v3-turbo");
        fd.append("response_format", "json");
        fd.append("language", "en");

        const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: fd,
        });
        if (!res.ok) {
          const err = await res.text();
          return new Response(err, { status: 502 });
        }
        const json = await res.json();
        return Response.json({ text: json.text ?? "" });
      },
    },
  },
});
