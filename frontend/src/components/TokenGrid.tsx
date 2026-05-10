import { motion } from "framer-motion";
import { usePortfolio } from "@/hooks/usePortfolio";
import { getTokenRegistry } from "@/lib/tokens";

export function TokenGrid() {
  const { holdings, prices } = usePortfolio();
  const registry = getTokenRegistry();
  if (!holdings.length) {
    return (
      <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
        Connect your wallet to see your assets.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {holdings.map((h, i) => {
        const meta = registry[h.symbol];
        const usd = prices[h.symbol] ? h.amount * prices[h.symbol] : null;
        return (
          <motion.div
            key={h.mint}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="glass rounded-2xl p-4 hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div
                className="size-9 rounded-full grid place-items-center text-xs font-bold"
                style={{
                  background: `${meta?.color ?? "#6366F1"}22`,
                  color: meta?.color ?? "#fff",
                }}
              >
                {h.symbol.slice(0, 3)}
              </div>
              <div>
                <p className="text-sm font-medium leading-tight">{h.symbol}</p>
                <p className="text-[11px] text-muted-foreground">{meta?.name ?? "Token"}</p>
              </div>
            </div>
            <p className="mt-3 text-lg font-display font-semibold">
              {h.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </p>
            <p className="text-xs text-muted-foreground">
              {usd !== null
                ? `$${usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                : "—"}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
