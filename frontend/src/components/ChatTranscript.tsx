import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, CheckCircle2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { useVocaStore, type ChatMessage } from "@/lib/store";
import { stripLeakedToolXml } from "@/lib/chat-sanitize";

const explorer = (sig: string) =>
  `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

function TxCard({ m }: { m: ChatMessage }) {
  if (!m.tx) return null;
  return (
    <div className="glass rounded-xl p-4 my-2 border-success/30">
      <div className="flex items-center gap-2 text-success text-sm font-medium">
        <CheckCircle2 className="size-4" />
        {m.tx.kind === "swap" ? "Swap Confirmed" : "Transfer Confirmed"}
      </div>
      <p className="mt-1.5 font-display text-base">{m.text}</p>
      <a
        href={explorer(m.tx.signature)}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline font-mono"
      >
        {m.tx.signature.slice(0, 6)}…{m.tx.signature.slice(-6)} <ExternalLink className="size-3" />
      </a>
    </div>
  );
}

function Bubble({ m }: { m: ChatMessage }) {
  if (m.role === "tx") return <TxCard m={m} />;
  const isUser = m.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-elevated text-foreground rounded-bl-sm"
        }`}
      >
        {(isUser ? m.text : stripLeakedToolXml(m.text)) || <span className="opacity-60">…</span>}
      </div>
    </motion.div>
  );
}

export function ChatTranscript() {
  const messages = useVocaStore((s) => s.messages);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [messages]);
  return (
    <div className="glass rounded-3xl p-5 h-[40vh] md:h-[44vh]">
      <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">
        Conversation
      </div>
      <div ref={ref} className="h-[calc(100%-2rem)] overflow-y-auto pr-1 space-y-2.5">
        {messages.length === 0 && (
          <div className="h-full grid place-items-center text-center text-sm text-muted-foreground">
            <div>
              <p>Tap the mic and try:</p>
              <p className="mt-2 font-display text-foreground/80 italic">
                "What's my balance?"
              </p>
              <p className="font-display text-foreground/80 italic">
                "Swap 0.1 SOL to USDC"
              </p>
            </div>
          </div>
        )}
        <AnimatePresence>
          {messages.map((m) => (
            <Bubble key={m.id} m={m} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
