import { useState } from "react";
import { Send } from "lucide-react";
import { useVocaAgent } from "@/hooks/useVocaAgent";
import { useWallet } from "@solana/wallet-adapter-react";

export function TextInput() {
  const [value, setValue] = useState("");
  const { submitText } = useVocaAgent();
  const { connected } = useWallet();

  const submit = async () => {
    if (!value.trim() || !connected) return;
    const v = value;
    setValue("");
    await submitText(v);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="glass rounded-full flex items-center gap-2 pl-5 pr-2 py-2"
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={connected ? "Or type a message…" : "Connect wallet to chat"}
        disabled={!connected}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={!connected || !value.trim()}
        className="size-9 rounded-full bg-primary text-primary-foreground grid place-items-center disabled:opacity-40"
      >
        <Send className="size-4" />
      </button>
    </form>
  );
}
