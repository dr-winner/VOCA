import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { agentChatSession } from "@/lib/agent-chat-session";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system" | "tx";
  text: string;
  ts: number;
  tx?: {
    kind: "swap" | "send";
    fromSymbol?: string;
    toSymbol?: string;
    fromAmount?: number;
    toAmount?: number;
    recipient?: string;
    signature: string;
  };
};

export type AgentStatus =
  | "idle"
  | "listening"
  | "transcribing"
  | "thinking"
  | "executing"
  | "speaking"
  | "error";

type State = {
  messages: ChatMessage[];
  status: AgentStatus;
  inputLevel: number;
  addMessage: (m: Omit<ChatMessage, "id" | "ts">) => string;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
  setStatus: (s: AgentStatus) => void;
  setInputLevel: (n: number) => void;
  /** Clears UI transcript, persisted storage, and Groq session history. */
  clear: () => void;
};

export const useVocaStore = create<State>()(
  persist(
    (set) => ({
      messages: [],
      status: "idle",
      inputLevel: 0,
      addMessage: (m) => {
        const id = crypto.randomUUID();
        set((s) => ({ messages: [...s.messages, { ...m, id, ts: Date.now() }] }));
        return id;
      },
      updateMessage: (id, patch) =>
        set((s) => ({
          messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        })),
      setStatus: (status) => set({ status }),
      setInputLevel: (n) => set({ inputLevel: n }),
      clear: () => {
        agentChatSession.reset();
        set({ messages: [], status: "idle", inputLevel: 0 });
      },
    }),
    {
      name: "voca-chat-v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ messages: s.messages }),
      skipHydration: true,
    },
  ),
);
