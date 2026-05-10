import type { Idl, Program } from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

export function findConfigPda(programId: PublicKey, authority: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("config"), authority.toBuffer()], programId);
}

export function findAgentPda(
  programId: PublicKey,
  owner: PublicKey,
  agentNonce: BN,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("agent"), owner.toBuffer(), agentNonce.toArrayLike(Buffer, "le", 8)],
    programId,
  );
}

export function findInteractionPda(
  programId: PublicKey,
  agent: PublicKey,
  interactionNonce: BN,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("interaction"), agent.toBuffer(), interactionNonce.toArrayLike(Buffer, "le", 8)],
    programId,
  );
}

export type VocaProgram = Program<Idl>;
