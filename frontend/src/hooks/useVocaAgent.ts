import { useCallback, useEffect, useRef } from "react";
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import { useVoiceRecorder } from "./useVoiceRecorder";
import { useVocaStore } from "@/lib/store";
import { ElevenLabsTTS } from "@/lib/voice/elevenlabs";
import { VOCA_TOOLS } from "@/lib/ai/tools";
import { streamChat } from "@/lib/ai/stream";
import { fetchHoldings } from "@/lib/balances";
import { getPrices, getSwapQuote, executeSwap } from "@/lib/jupiter";
import { buildAndSendTransfer } from "@/lib/transfer";
import { lookupToken } from "@/lib/tokens";
import { PublicKey } from "@solana/web3.js";
import { tryLogVocaSend, tryLogVocaSwap } from "@/lib/voca/interaction-log";
import { stripLeakedToolXml } from "@/lib/chat-sanitize";
import { agentChatSession } from "@/lib/agent-chat-session";

function asToolArgs(v: unknown): Record<string, unknown> {
  if (v !== null && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return {};
}

function errMessage(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

export function useVocaAgent() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const anchorWallet = useAnchorWallet();
  const ttsRef = useRef<ElevenLabsTTS | null>(null);
  const setStatus = useVocaStore((s) => s.setStatus);
  const addMessage = useVocaStore((s) => s.addMessage);
  const updateMessage = useVocaStore((s) => s.updateMessage);
  const setInputLevel = useVocaStore((s) => s.setInputLevel);
  const recorder = useVoiceRecorder(setInputLevel);

  // initialize TTS lazily
  const ensureTTS = useCallback(async () => {
    if (ttsRef.current) {
      await ttsRef.current.ensureConnected();
      return ttsRef.current;
    }
    const cfg = await fetch("/api/voice-config").then((r) => r.json());
    if (!cfg.apiKey || !cfg.voiceId) throw new Error("Voice config not set");
    const tts = new ElevenLabsTTS(cfg.apiKey, cfg.voiceId, (speaking) => {
      setStatus(speaking ? "speaking" : "idle");
    });
    await tts.ensureConnected();
    ttsRef.current = tts;
    return tts;
  }, [setStatus]);

  // Run a tool call client-side
  const runTool = useCallback(
    async (name: string, args: unknown): Promise<string> => {
      if (!wallet.publicKey) return JSON.stringify({ error: "Wallet not connected" });
      const owner = wallet.publicKey;
      const a = asToolArgs(args);

      if (name === "get_balance") {
        const holdings = await fetchHoldings(connection, owner);
        const symbols = [...new Set(holdings.map((h) => h.symbol))];
        const prices = await getPrices(symbols);
        const enriched = holdings.map((h) => ({
          symbol: h.symbol,
          amount: Number(h.amount.toFixed(6)),
          usd: prices[h.symbol] ? Number((h.amount * prices[h.symbol]).toFixed(2)) : null,
        }));
        const total = enriched.reduce((a, b) => a + (b.usd ?? 0), 0);
        return JSON.stringify({ holdings: enriched, total_usd: Number(total.toFixed(2)) });
      }

      if (name === "get_token_price") {
        const sym = String(a.token_symbol ?? "").toUpperCase();
        const prices = await getPrices([sym]);
        const price = prices[sym];
        return JSON.stringify(
          price ? { symbol: sym, usd: price } : { error: `No price for ${sym}` },
        );
      }

      if (name === "swap_tokens") {
        const from_token = String(a.from_token ?? "");
        const to_token = String(a.to_token ?? "");
        const amount = Number(a.amount);
        const confirmed = Boolean(a.confirmed);
        const quote = await getSwapQuote(from_token, to_token, Number(amount));
        if (!confirmed) {
          return JSON.stringify({
            quoted: true,
            from: { symbol: from_token, amount },
            to: { symbol: to_token, amount: Number(quote.outAmount.toFixed(6)) },
            note: "Quote only. Need user confirmation before executing.",
          });
        }
        if (!wallet.signTransaction) return JSON.stringify({ error: "Wallet cannot sign" });
        try {
          setStatus("executing");
          const sig = await executeSwap(
            quote.quote,
            owner.toBase58(),
            wallet.signTransaction,
            connection,
          );
          addMessage({
            role: "tx",
            text: `Swapped ${amount} ${from_token} → ${quote.outAmount.toFixed(4)} ${to_token}`,
            tx: {
              kind: "swap",
              fromSymbol: from_token,
              toSymbol: to_token,
              fromAmount: Number(amount),
              toAmount: quote.outAmount,
              signature: sig,
            },
          });
          if (anchorWallet) {
            void tryLogVocaSwap({
              connection,
              wallet: anchorWallet,
              quote: quote.quote as { inAmount?: string },
              fromSymbol: from_token,
              toSymbol: to_token,
              signature: sig,
            });
          }
          return JSON.stringify({ success: true, signature: sig, received: quote.outAmount });
        } catch (e: unknown) {
          return JSON.stringify({ error: errMessage(e, "swap failed") });
        }
      }

      if (name === "send_token") {
        const token_symbol = String(a.token_symbol ?? "");
        const amount = Number(a.amount);
        const recipient = String(a.recipient ?? "");
        const confirmed = Boolean(a.confirmed);
        if (!lookupToken(token_symbol)) return JSON.stringify({ error: "Unknown token" });
        let recipientPk: string;
        try {
          recipientPk = new PublicKey(recipient).toBase58();
        } catch {
          return JSON.stringify({ error: "Invalid recipient address" });
        }
        if (!confirmed) {
          return JSON.stringify({
            quoted: true,
            token: token_symbol,
            amount,
            recipient: `${recipientPk.slice(0, 4)}...${recipientPk.slice(-4)}`,
            note: "Need user confirmation before executing.",
          });
        }
        if (!wallet.signTransaction) return JSON.stringify({ error: "Wallet cannot sign" });
        try {
          setStatus("executing");
          const sig = await buildAndSendTransfer(
            connection,
            owner,
            wallet.signTransaction,
            token_symbol,
            Number(amount),
            recipientPk,
          );
          addMessage({
            role: "tx",
            text: `Sent ${amount} ${token_symbol} to ${recipientPk.slice(0, 4)}...${recipientPk.slice(-4)}`,
            tx: {
              kind: "send",
              fromSymbol: token_symbol,
              fromAmount: Number(amount),
              recipient: recipientPk,
              signature: sig,
            },
          });
          if (anchorWallet) {
            void tryLogVocaSend({
              connection,
              wallet: anchorWallet,
              tokenSymbol: token_symbol,
              amount: Number(amount),
              recipient: recipientPk,
              signature: sig,
            });
          }
          return JSON.stringify({ success: true, signature: sig });
        } catch (e: unknown) {
          return JSON.stringify({ error: errMessage(e, "send failed") });
        }
      }

      return JSON.stringify({ error: `Unknown tool ${name}` });
    },
    [connection, wallet, anchorWallet, addMessage, setStatus],
  );

  // Streaming TTS sentence buffering
  const speakStream = useCallback(async () => {
    const tts = await ensureTTS();
    let pending = "";
    const flushIfReady = (force = false) => {
      const sentenceMatch = pending.match(/^(.+?[.!?,])\s/);
      if (sentenceMatch) {
        tts.streamText(sentenceMatch[1] + " ");
        pending = pending.slice(sentenceMatch[0].length);
        return true;
      }
      if (force && pending.trim()) {
        tts.streamText(pending + " ");
        pending = "";
        return true;
      }
      return false;
    };
    return {
      push: (t: string) => {
        pending += t;
        while (flushIfReady());
      },
      done: () => {
        flushIfReady(true);
        tts.endOfInput();
      },
    };
  }, [ensureTTS]);

  const runConversation = useCallback(
    async (assistantMsgId: string) => {
      // Multi-step tool flows (send/swap often need several assistant→tool rounds)
      for (let round = 0; round < 6; round++) {
        setStatus("thinking");
        let assistantText = "";
        let ttsSanitizedLen = 0;
        const tts = await speakStream();
        const { toolCalls } = await streamChat(
          "/api/chat",
          { messages: agentChatSession.turns, tools: VOCA_TOOLS },
          {
            onTextDelta: (t) => {
              assistantText += t;
              const shown = stripLeakedToolXml(assistantText);
              updateMessage(assistantMsgId, { text: shown });
              const vocal = shown.slice(ttsSanitizedLen);
              ttsSanitizedLen = shown.length;
              if (vocal) tts.push(vocal);
            },
          },
        );

        assistantText = stripLeakedToolXml(assistantText);

        if (toolCalls.length === 0) {
          tts.done();
          agentChatSession.turns.push({ role: "assistant", content: assistantText });
          setStatus("speaking");
          return;
        }

        // Push assistant turn with tool_calls
        agentChatSession.turns.push({
          role: "assistant",
          content: assistantText || null,
          tool_calls: toolCalls.map((t) => ({
            id: t.id,
            type: "function" as const,
            function: { name: t.name, arguments: t.args },
          })),
        });
        tts.done();

        // Execute tools
        setStatus("executing");
        for (const tc of toolCalls) {
          let parsed: Record<string, unknown> = {};
          try {
            parsed = asToolArgs(JSON.parse(tc.args || "{}"));
          } catch {
            /* */
          }
          const result = await runTool(tc.name, parsed);
          agentChatSession.turns.push({
            role: "tool",
            tool_call_id: tc.id,
            name: tc.name,
            content: result,
          });
        }
      }
    },
    [runTool, setStatus, speakStream, updateMessage],
  );

  const submitText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      addMessage({ role: "user", text: trimmed });
      agentChatSession.turns.push({ role: "user", content: trimmed });
      const assistantId = addMessage({ role: "assistant", text: "" });
      try {
        await runConversation(assistantId);
      } catch (e: unknown) {
        console.error(e);
        toast.error(errMessage(e, "Something went wrong"));
        updateMessage(assistantId, {
          text: "Sorry, that didn't go through. Want me to try again?",
        });
        setStatus("error");
        setTimeout(() => setStatus("idle"), 1500);
      }
    },
    [addMessage, runConversation, setStatus, updateMessage],
  );

  const startListening = useCallback(async () => {
    if (recorder.isRecording) return;
    setStatus("listening");
    await recorder.startRecording(async (blob) => {
      if (!blob || blob.size < 200) {
        setStatus("idle");
        setInputLevel(0);
        return;
      }
      setStatus("transcribing");
      setInputLevel(0);
      try {
        const fd = new FormData();
        fd.append("audio", blob, "audio.webm");
        const res = await fetch("/api/stt", { method: "POST", body: fd });
        if (!res.ok) throw new Error(`STT ${res.status}`);
        const { text } = await res.json();
        if (text?.trim()) await submitText(text);
        else setStatus("idle");
      } catch (e: unknown) {
        console.error(e);
        toast.error("Couldn't hear that — try again?");
        setStatus("idle");
      }
    });
  }, [recorder, setInputLevel, setStatus, submitText]);

  const stopListening = useCallback(async () => {
    if (!recorder.isRecording) return;
    await recorder.stopRecording();
  }, [recorder]);

  useEffect(
    () => () => {
      ttsRef.current?.disconnect();
    },
    [],
  );

  return { startListening, stopListening, submitText, isRecording: recorder.isRecording };
}
