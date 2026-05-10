import { useEffect, useState } from "react";
import { BN } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { vocaAgentNonce, vocaConfigAuthority } from "@/lib/voca/env";
import { createVocaProgram } from "@/lib/voca/program";
import { findAgentPda, findConfigPda } from "@/lib/voca/pdas";

export type VocaChainState = {
  /** Whether env points at a config authority + agent nonce to read on-chain. */
  envConfigured: boolean;
  /** Human-readable config status on the current RPC, or null if not queried. */
  configStatus: string | null;
  /** Agent name / state, or null. */
  agentLine: string | null;
};

export function useVocaChain(): VocaChainState {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();
  const [configStatus, setConfigStatus] = useState<string | null>(null);
  const [agentLine, setAgentLine] = useState<string | null>(null);

  const auth = vocaConfigAuthority();
  const nonce = vocaAgentNonce();
  const envConfigured = auth !== null && nonce !== null;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!anchorWallet || !publicKey || !auth || nonce === null) {
        setConfigStatus(null);
        setAgentLine(null);
        return;
      }
      try {
        const program = createVocaProgram(connection, anchorWallet);
        const [configPk] = findConfigPda(program.programId, auth);
        const cfg = await program.account.config.fetchNullable(configPk);
        if (cancelled) return;
        if (!cfg) {
          setConfigStatus("config account missing (run initialize_config on this cluster)");
          setAgentLine(null);
          return;
        }
        const cfgOk = cfg.isActive && !cfg.isPaused;
        setConfigStatus(cfgOk ? "program config active" : "program paused or inactive");

        const [agentPk] = findAgentPda(program.programId, publicKey, new BN(nonce.toString()));
        const ag = await program.account.agent.fetchNullable(agentPk);
        if (cancelled) return;
        if (!ag) setAgentLine(`no agent for nonce ${nonce}`);
        else setAgentLine(`${ag.name}${ag.isActive ? "" : " (inactive)"}`);
      } catch {
        if (!cancelled) {
          setConfigStatus("could not reach program on this RPC");
          setAgentLine(null);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [connection, anchorWallet, publicKey, auth?.toBase58() ?? "", nonce === null ? "" : nonce.toString()]);

  return { envConfigured, configStatus, agentLine };
}
