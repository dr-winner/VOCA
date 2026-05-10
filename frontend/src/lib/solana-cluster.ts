import { clusterApiUrl } from "@solana/web3.js";
import { readEnv } from "@/lib/config/env-bridge";

/** RPC endpoint: explicit URL, local validator, or Solana public devnet. */
export function resolveSolanaRpcUrl(): string {
  const explicit = readEnv("VITE_SOLANA_RPC_URL", "SOLANA_RPC_URL");
  if (explicit) return explicit;
  const local = readEnv("VITE_USE_LOCAL_SOLANA", "USE_LOCAL_SOLANA");
  if (local === "1") return "http://127.0.0.1:8899";
  return clusterApiUrl("devnet");
}

/** Short label for UI (portfolio, footer). */
export function solanaClusterLabel(rpcUrl: string): string {
  const u = rpcUrl.toLowerCase();
  if (u.includes("127.0.0.1") || u.includes("localhost")) return "localnet";
  if (u.includes("api.mainnet-beta") || u.includes("mainnet")) return "mainnet-beta";
  if (u.includes("devnet")) return "devnet";
  if (u.includes("testnet")) return "testnet";
  return "custom";
}
