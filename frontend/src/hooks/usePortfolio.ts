import { useEffect, useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { fetchHoldings, type Holding } from "@/lib/balances";
import { getPrices } from "@/lib/jupiter";

export function usePortfolio() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!publicKey) {
      setHoldings([]);
      return;
    }
    setLoading(true);
    try {
      const h = await fetchHoldings(connection, publicKey);
      setHoldings(h);
      const symbols = [...new Set(h.map((x) => x.symbol))];
      const p = await getPrices(symbols);
      setPrices(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    void refresh();
    const t = setInterval(refresh, 20000);
    return () => clearInterval(t);
  }, [refresh]);

  const totalUsd = holdings.reduce((a, h) => {
    const p = prices[h.symbol];
    return a + (p ? h.amount * p : 0);
  }, 0);

  return { holdings, prices, totalUsd, loading, refresh };
}
