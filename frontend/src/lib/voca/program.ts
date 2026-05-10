import { AnchorProvider, BN, Idl, Program } from "@coral-xyz/anchor";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import { Connection } from "@solana/web3.js";
import idlJson from "@/idl/workspace.json";
import { vocaProgramId } from "./env";
import type { VocaProgram } from "./pdas";

const VOCA_IDL = idlJson as Idl;

export function createVocaProvider(connection: Connection, wallet: AnchorWallet): AnchorProvider {
  return new AnchorProvider(connection, wallet, { commitment: "confirmed" });
}

export function createVocaProgram(connection: Connection, wallet: AnchorWallet): VocaProgram {
  const provider = createVocaProvider(connection, wallet);
  const programId = vocaProgramId();
  return new Program(VOCA_IDL, programId, provider) as VocaProgram;
}

export { BN, VOCA_IDL };
