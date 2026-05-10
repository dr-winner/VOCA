import { createFileRoute } from "@tanstack/react-router";
import { readEnv } from "@/lib/config/env-bridge";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = readEnv("GROQ_API_KEY");
        if (!apiKey) return new Response("GROQ_API_KEY missing", { status: 500 });
        const body = await request.json();
        const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: body.messages,
            tools: body.tools,
            tool_choice: body.tool_choice ?? "auto",
            stream: true,
            max_tokens: 1024,
            temperature: 0.6,
          }),
        });
        if (!upstream.ok || !upstream.body) {
          const err = await upstream.text();
          return new Response(err, { status: 502 });
        }
        return new Response(upstream.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});
