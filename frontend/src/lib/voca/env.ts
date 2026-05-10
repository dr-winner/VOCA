import { PublicKey } from "@solana/web3.js";
import { readEnv } from "@/lib/config/env-bridge";
import idl from "@/idl/workspace.json";

/** On-chain program id (must match `declare_id!` / Anchor.toml after deploy). */
export function vocaProgramId(): PublicKey {
  const override = readEnv("VITE_VOCA_PROGRAM_ID", "VOCA_PROGRAM_ID");
  if (override) return new PublicKey(override);
  return new PublicKey(idl.address);
}

/**
 * Config PDA is seeded with the authority that called `initialize_config`.
 * Required to fetch global config or derive related PDAs from the frontend.
 */
export function vocaConfigAuthority(): PublicKey | null {
  const raw = readEnv("VITE_VOCA_CONFIG_AUTHORITY", "VOCA_CONFIG_AUTHORITY");
  if (!raw?.trim()) return null;
  try {
    return new PublicKey(raw.trim());
  } catch {
    console.warn("[VOCA] Invalid VITE_VOCA_CONFIG_AUTHORITY");
    return null;
  }
}

/**
 * Agent vault nonce used for this wallet's on-chain agent PDA and optional interaction logging.
 * Omit or leave empty to skip chain logging (swap/send still work).
 */
export function vocaAgentNonce(): bigint | null {
  const raw = readEnv("VITE_VOCA_AGENT_NONCE", "VOCA_AGENT_NONCE");
  if (raw === undefined || raw === "") return null;
  try {
    return BigInt(raw);
  } catch {
    console.warn("[VOCA] Invalid VITE_VOCA_AGENT_NONCE");
    return null;
  }
}

export function vocaChainLoggingEnabled(): boolean {
  return vocaConfigAuthority() !== null && vocaAgentNonce() !== null;
}
