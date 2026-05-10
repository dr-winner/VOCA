# VOCA

You shouldn’t need a second monitor and a steady hand to move your own money.

Crypto apps still behave like trading terminals: tiny numbers, long addresses, half a dozen taps to do something your mouth could describe in five seconds. VOCA is the opposite. Connect your wallet, tap the mic (or type if you’re in a quiet room), and **talk to Solana** the way you’d talk to someone who actually works for you—check what you hold, hear prices in dollars, quote a swap, send to an address, and **hear the answer** instead of parsing another modal.

That’s the product: **voice-first, wallet-native, built for real transfers** on Solana—not a slide deck with a fake “AI wallet” that never signs anything.

---

## The problem we’re solving

People leave value on the table because using it is exhausting. Copy-paste errors, wrong networks, jargon stacked on jargon. Mobile makes it worse: you’re not going to squint through Jupiter routes on a bike rack.

VOCA meets you where you already are: **spoken intent → clear confirmation → you approve**. The assistant stays **short** on purpose—this is built for **ears**, not blog posts—so you can use it while you’re doing something else.

---

## What you get

**Voice end to end.** You speak; speech becomes text; an agent reasons over your actual wallet; the reply streams back and is read aloud. If you’d rather not use the mic, the text box runs the **same** session—no “the keyboard forgot what the mic just said.”

**A portfolio you can glance at and drill into.** A hero view of where you stand, a clear read on which chain you’re connected to, and a token grid with live context so you’re not flying blind before you say “send five USDC.”

**Balances and prices that mean something.** Ask what you’re holding or what a symbol is worth; VOCA pulls from your RPC and Jupiter pricing so answers come back in **human amounts** and **USD** when the data is there—not raw lamports and mystery mints.

**Swaps that don’t ambush you.** The agent quotes first, reads the trade in plain language, and only executes after you **clearly** say to go ahead. Same discipline on sends: you get a path to verify before anything hits the chain.

**Sends that survive real conversations.** You might say the amount in one breath and paste the address in the next. VOCA is wired so the agent **carries intent across turns** instead of resetting every message like a bad call center.

**Memory that survives a refresh.** Your transcript sticks around locally; when you come back, the agent’s context is rebuilt from that history so follow-ups still make sense. When you want a clean slate, clear the conversation and you’re reset—UI, storage, and agent state together.

**Optional on-chain footprint.** Behind the scenes there’s an Anchor program for platform config, per-wallet “agents” with spending limits, and interaction logging when you wire it up—so you’re not locked into “trust our server logs only” if you want a verifiable story later.

---

## Under the hood (without drowning you)

Your keys stay in your wallet. VOCA uses the standard Solana wallet adapter, Jupiter for quotes and prices, and Groq for fast streaming chat plus Whisper for transcription. ElevenLabs gives the voice output its body. Server routes hold the API keys so the browser isn’t littered with secrets—just normal product hygiene.

If you’re shipping or auditing: the repo is a **TanStack Start** app (React, Vite), Zustand for UI state, and `contracts/` plus `npm run sync` to keep the on-chain interface and TypeScript client in lockstep.

---

## Run it

```bash
npm install --prefix frontend
cd frontend && npm run env:init
```

Fill in `frontend/.env` from `.env.example`—at minimum **Groq** (chat + speech-to-text) and **ElevenLabs** (voice replies). Then:

```bash
cd .. && npm run dev
```

Working on-chain program features? Build in `contracts/`, then `npm run sync` from the repo root so the frontend picks up the latest IDL.

---

## A word of care

VOCA moves real assets on whatever cluster you point it at. Use devnet for experiments, read confirmations before you approve on mainnet, and treat production hardening (audits, legal, risk limits) as non-optional if you take this beyond personal use.

---

Built on **Solana**, **Jupiter**, **Groq**, **ElevenLabs**, and **Anchor** where the chain piece matters.
