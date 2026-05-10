import { motion } from "framer-motion";
import { Mic, Loader2, AudioLines, Square } from "lucide-react";
import { useVocaStore } from "@/lib/store";
import { useVocaAgent } from "@/hooks/useVocaAgent";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";

const STATUS_LABEL: Record<string, string> = {
  idle: "Tap to speak",
  listening: "Listening…",
  transcribing: "Hearing you…",
  thinking: "Thinking…",
  executing: "Working on it…",
  speaking: "Speaking…",
  error: "Try again",
};

export function MicButton() {
  const status = useVocaStore((s) => s.status);
  const inputLevel = useVocaStore((s) => s.inputLevel);
  const { connected } = useWallet();
  const { startListening, stopListening, isRecording } = useVocaAgent();

  const onClick = async () => {
    if (!connected) {
      toast.error("Connect your wallet first");
      return;
    }
    if (isRecording) await stopListening();
    else await startListening();
  };

  const busy = status === "thinking" || status === "executing" || status === "transcribing";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative grid place-items-center">
        {/* Outer pulse rings */}
        {(status === "listening" || status === "speaking") && (
          <>
            <motion.span
              className="absolute size-32 rounded-full border border-primary/40"
              animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.span
              className="absolute size-32 rounded-full border border-primary/40"
              animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut", delay: 0.6 }}
            />
          </>
        )}

        <motion.button
          onClick={onClick}
          disabled={busy}
          whileTap={{ scale: 0.94 }}
          animate={{
            scale: status === "listening" ? 1 + Math.min(inputLevel * 0.25, 0.25) : 1,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="relative size-32 rounded-full grid place-items-center
            bg-gradient-to-br from-primary to-accent text-primary-foreground
            shadow-[0_20px_60px_-15px_var(--primary-glow)]
            disabled:opacity-80 disabled:cursor-wait"
        >
          {busy ? (
            <Loader2 className="size-10 animate-spin" />
          ) : status === "speaking" ? (
            <AudioLines className="size-10" />
          ) : isRecording ? (
            <Square className="size-9 fill-current" />
          ) : (
            <Mic className="size-10" />
          )}
        </motion.button>
      </div>
      <p className="text-sm text-muted-foreground tabular-nums">
        {STATUS_LABEL[status] ?? "Tap to speak"}
      </p>
    </div>
  );
}
