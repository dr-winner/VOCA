import { Connection, VersionedTransaction } from "@solana/web3.js";
import { Buffer } from "buffer";
import { lookupToken } from "./tokens";

const QUOTE_API = "https://quote-api.jup.ag/v6/quote";
const SWAP_API = "https://quote-api.jup.ag/v6/swap";
/** Jupiter Price API v3 (v2 is retired / 404). */
const PRICE_API = "https://api.jup.ag/price/v3";

export async function getPrices(symbols: string[]): Promise<Record<string, number>> {
  const mints = symbols.map((s) => lookupToken(s)?.mint).filter(Boolean) as string[];
  if (!mints.length) return {};
  const url = `${PRICE_API}?ids=${mints.join(",")}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return {};
    const json = (await res.json()) as Record<string, { usdPrice?: number } | undefined>;
    const out: Record<string, number> = {};
    for (const sym of symbols) {
      const t = lookupToken(sym);
      if (!t) continue;
      const entry = json[t.mint];
      const p = entry?.usdPrice;
      if (typeof p === "number" && Number.isFinite(p)) out[sym.toUpperCase()] = p;
    }
    return out;
  } catch {
    return {};
  }
}

export async function getSwapQuote(fromSymbol: string, toSymbol: string, amount: number) {
  const from = lookupToken(fromSymbol);
  const to = lookupToken(toSymbol);
  if (!from || !to) throw new Error(`Unknown token: ${fromSymbol} or ${toSymbol}`);
  const rawAmount = Math.floor(amount * Math.pow(10, from.decimals));
  const params = new URLSearchParams({
    inputMint: from.mint,
    outputMint: to.mint,
    amount: rawAmount.toString(),
    slippageBps: "100",
  });
  const res = await fetch(`${QUOTE_API}?${params}`);
  if (!res.ok) throw new Error(`Jupiter quote failed: ${res.status}`);
  const quote = await res.json();
  const outAmount = Number(quote.outAmount) / Math.pow(10, to.decimals);
  return { quote, outAmount, fromToken: from, toToken: to };
}

export async function executeSwap(
  quoteResponse: unknown,
  walletPublicKey: string,
  signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>,
  connection: Connection,
): Promise<string> {
  const swapRes = await fetch(SWAP_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse,
      userPublicKey: walletPublicKey,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: "auto",
    }),
  });
  if (!swapRes.ok) throw new Error(`Jupiter swap failed: ${swapRes.status}`);
  const { swapTransaction } = await swapRes.json();
  const txBuf = Buffer.from(swapTransaction, "base64");
  const tx = VersionedTransaction.deserialize(txBuf);
  const signed = await signTransaction(tx);
  const sig = await connection.sendRawTransaction(signed.serialize(), { maxRetries: 3 });
  const latest = await connection.getLatestBlockhash();
  await connection.confirmTransaction(
    { signature: sig, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
    "confirmed",
  );
  return sig;
}
