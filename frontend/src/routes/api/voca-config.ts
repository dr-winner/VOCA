import { createFileRoute } from "@tanstack/react-router";
import { readEnv } from "@/lib/config/env-bridge";
import idl from "@/idl/workspace.json";
import { resolveSolanaRpcUrl, solanaClusterLabel } from "@/lib/solana-cluster";

/** Public chain + IDL snapshot so client and worker share one source (synced IDL). */
export const Route = createFileRoute("/api/voca-config")({
  server: {
    handlers: {
      GET: async () => {
        const rpcUrl = resolveSolanaRpcUrl();
        const meta = idl.metadata as { name?: string; version?: string } | undefined;
        return Response.json({
          programId: idl.address,
          idlName: meta?.name ?? "workspace",
          idlVersion: meta?.version ?? "",
          solana: {
            rpcUrl,
            clusterLabel: solanaClusterLabel(rpcUrl),
          },
          voca: {
            programIdOverride: readEnv("VITE_VOCA_PROGRAM_ID", "VOCA_PROGRAM_ID") ?? null,
            configAuthoritySet: Boolean(readEnv("VITE_VOCA_CONFIG_AUTHORITY", "VOCA_CONFIG_AUTHORITY")),
            agentNonceSet: Boolean(readEnv("VITE_VOCA_AGENT_NONCE", "VOCA_AGENT_NONCE")),
          },
          tokens: {
            mintPack: readEnv("VITE_MAINNET_TOKEN_MINTS", "MAINNET_TOKEN_MINTS") === "1" ? "mainnet" : "devnet-usdc",
          },
        });
      },
    },
  },
});
