import { useVocaChain } from "@/hooks/useVocaChain";
import { resolveSolanaRpcUrl, solanaClusterLabel } from "@/lib/solana-cluster";

export function VocaChainStrip() {
  const { envConfigured, partialEnv, configStatus, agentLine } = useVocaChain();
  const cluster = solanaClusterLabel(resolveSolanaRpcUrl());
  if (!envConfigured) {
    if (partialEnv) {
      return (
        <p className="text-xs text-amber-600/90 dark:text-amber-500/90">
          On-chain VOCA logging: set both{" "}
          <code className="text-[10px] rounded bg-muted/40 px-1">VITE_VOCA_CONFIG_AUTHORITY</code>{" "}
          and <code className="text-[10px] rounded bg-muted/40 px-1">VITE_VOCA_AGENT_NONCE</code> in{" "}
          <code className="text-[10px] rounded bg-muted/40 px-1">.env</code> (see{" "}
          <code className="text-[10px] rounded bg-muted/40 px-1">.env.example</code>) · RPC:{" "}
          {cluster}
        </p>
      );
    }
    return <p className="text-xs text-muted-foreground">RPC: {cluster}</p>;
  }
  return (
    <p className="text-xs text-muted-foreground">
      On-chain VOCA · {configStatus ?? "…"}
      {agentLine ? ` · ${agentLine}` : ""}
    </p>
  );
}
