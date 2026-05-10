import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { ClientGate } from "@/components/ClientGate";

// Lazy-load wallet provider chain and UI — they pull browser-only code.
const App = lazy(() => import("@/components/VocaApp"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VOCA — voice-first crypto agent on Solana" },
      {
        name: "description",
        content:
          "Talk to your wallet. VOCA is a voice-operated AI agent that swaps, sends, and reads your portfolio on Solana — by listening and speaking back.",
      },
      { property: "og:title", content: "VOCA — voice-first crypto on Solana" },
      {
        property: "og:description",
        content: "Tap the mic. Say it. Done. The future of how people use crypto.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <ClientGate>
      <Suspense
        fallback={
          <div className="min-h-screen grid place-items-center text-muted-foreground">
            Loading VOCA…
          </div>
        }
      >
        <App />
      </Suspense>
    </ClientGate>
  );
}
