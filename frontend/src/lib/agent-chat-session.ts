import { VOCA_SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import type { ChatMessage } from "@/lib/store";

/** OpenAI-style turns sent to `/api/chat` (shared across all `useVocaAgent` callers). */
export type AgentChatTurn = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
};

function systemTurn(): AgentChatTurn {
  return { role: "system", content: VOCA_SYSTEM_PROMPT };
}

let turns: AgentChatTurn[] = [systemTurn()];

export const agentChatSession = {
  /** Mutable array reference — same object used for the whole session. */
  get turns(): AgentChatTurn[] {
    return turns;
  },
  reset() {
    turns = [systemTurn()];
  },
  /** Rebuild Groq context from persisted UI messages (user / assistant / tx only). */
  hydrateFromUiMessages(messages: ChatMessage[]) {
    const mapped: AgentChatTurn[] = messages.flatMap((m): AgentChatTurn[] => {
      if (m.role === "user") return [{ role: "user", content: m.text }];
      if (m.role === "assistant") return [{ role: "assistant", content: m.text }];
      if (m.role === "tx") {
        return [{ role: "assistant", content: m.text || `Confirmed ${m.tx?.kind ?? "on-chain"}.` }];
      }
      return [];
    });
    turns = [systemTurn(), ...mapped];
  },
};
