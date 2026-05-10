import { useEffect, useState } from "react";
import { Buffer } from "buffer";
import { useVocaStore } from "@/lib/store";
import { agentChatSession } from "@/lib/agent-chat-session";

// Browser-only Buffer polyfill for @solana/web3.js
if (typeof window !== "undefined" && !(window as unknown as { Buffer?: unknown }).Buffer) {
  (window as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
  (globalThis as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
}

export function ClientGate({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    void useVocaStore.persist.rehydrate().then(() => {
      agentChatSession.hydrateFromUiMessages(useVocaStore.getState().messages);
    });
  }, [mounted]);

  if (!mounted) return null;
  return <>{children}</>;
}
