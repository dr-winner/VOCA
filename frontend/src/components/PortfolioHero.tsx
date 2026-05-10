import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { resolveSolanaRpcUrl, solanaClusterLabel } from "@/lib/solana-cluster";

export function PortfolioHero() {
  const { totalUsd, holdings } = usePortfolio();
  const cluster = solanaClusterLabel(resolveSolanaRpcUrl());
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="glass rounded-3xl p-8 md:p-10 relative overflow-hidden"
    >
      <div className="absolute -top-32 -right-20 size-72 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-10 size-60 rounded-full bg-accent/15 blur-3xl pointer-events-none" />
      <div className="relative">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Portfolio Value</p>
        <div className="mt-3 flex items-baseline gap-3">
          <h2 className="text-5xl md:text-6xl font-display font-semibold text-gradient">
            ${totalUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </h2>
          <span className="inline-flex items-center gap-1 text-sm text-success">
            <TrendingUp className="size-4" />
            live
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {holdings.length} {holdings.length === 1 ? "asset" : "assets"} on Solana {cluster}
        </p>
      </div>
    </motion.div>
  );
}
