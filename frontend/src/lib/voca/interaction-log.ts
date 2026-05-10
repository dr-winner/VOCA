import { BN } from "@coral-xyz/anchor";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { lookupToken } from "@/lib/tokens";
import { vocaAgentNonce, vocaChainLoggingEnabled, vocaConfigAuthority } from "./env";
import { createVocaProgram } from "./program";
import { findAgentPda, findConfigPda, findInteractionPda } from "./pdas";

async function sha256ToU8Array(message: string): Promise<number[]> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
  return Array.from(new Uint8Array(digest));
}

function randomInteractionNonce(): BN {
  const n = (BigInt(Date.now()) << 20n) + BigInt(Math.floor(Math.random() * (1 << 20)));
  return new BN(n.toString());
}

type JupiterQuote = { inAmount?: string };

/**
 * Best-effort on-chain audit log (action_type = 1). Does not throw; failures are logged.
 * Amount uses Jupiter `inAmount` (raw smallest units of the input mint).
 */
export async function tryLogVocaSwap(params: {
  connection: Connection;
  wallet: AnchorWallet;
  quote: JupiterQuote;
  fromSymbol: string;
  toSymbol: string;
  signature: string;
}): Promise<void> {
  if (!vocaChainLoggingEnabled()) return;
  const authority = vocaConfigAuthority()!;
  const nonceBig = vocaAgentNonce()!;
  const agentNonceBn = new BN(nonceBig.toString());

  try {
    const program = createVocaProgram(params.connection, params.wallet);
    const [config] = findConfigPda(program.programId, authority);
    const [agent] = findAgentPda(program.programId, params.wallet.publicKey, agentNonceBn);
    const agentAcc = await program.account.agent.fetchNullable(agent);
    if (!agentAcc?.isActive) return;

    const interactionNonce = randomInteractionNonce();
    const [interaction] = findInteractionPda(program.programId, agent, interactionNonce);
    const rawIn = params.quote?.inAmount;
    if (!rawIn) return;
    const amount = new BN(rawIn);
    const desc = await sha256ToU8Array(
      JSON.stringify({
        kind: "swap",
        from: params.fromSymbol,
        to: params.toSymbol,
        sig: params.signature,
      }),
    );

    await program.methods
      .logInteraction(interactionNonce, 1, amount, desc)
      .accounts({
        config,
        agent,
        interaction,
        owner: params.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  } catch (e) {
    console.warn("[VOCA] logInteraction (swap) skipped:", e);
  }
}

/**
 * Best-effort on-chain audit log (action_type = 2). Same raw units as SPL/SOL transfers in-app.
 */
export async function tryLogVocaSend(params: {
  connection: Connection;
  wallet: AnchorWallet;
  tokenSymbol: string;
  amount: number;
  recipient: string;
  signature: string;
}): Promise<void> {
  if (!vocaChainLoggingEnabled()) return;
  const authority = vocaConfigAuthority()!;
  const nonceBig = vocaAgentNonce()!;
  const agentNonceBn = new BN(nonceBig.toString());

  try {
    const program = createVocaProgram(params.connection, params.wallet);
    const [config] = findConfigPda(program.programId, authority);
    const [agent] = findAgentPda(program.programId, params.wallet.publicKey, agentNonceBn);
    const agentAcc = await program.account.agent.fetchNullable(agent);
    if (!agentAcc?.isActive) return;

    const interactionNonce = randomInteractionNonce();
    const [interaction] = findInteractionPda(program.programId, agent, interactionNonce);

    const sym = params.tokenSymbol.toUpperCase();
    let amount: BN;
    if (sym === "SOL") {
      amount = new BN(Math.floor(params.amount * LAMPORTS_PER_SOL));
    } else {
      const t = lookupToken(sym);
      if (!t) return;
      amount = new BN(Math.floor(params.amount * Math.pow(10, t.decimals)));
    }

    const desc = await sha256ToU8Array(
      JSON.stringify({
        kind: "send",
        token: sym,
        recipient: params.recipient,
        sig: params.signature,
      }),
    );

    await program.methods
      .logInteraction(interactionNonce, 2, amount, desc)
      .accounts({
        config,
        agent,
        interaction,
        owner: params.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  } catch (e) {
    console.warn("[VOCA] logInteraction (send) skipped:", e);
  }
}
