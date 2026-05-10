import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getTokenRegistry, tokenByMint } from "./tokens";

export type Holding = {
  symbol: string;
  amount: number;
  mint: string;
  decimals: number;
  usd?: number;
};

export async function fetchHoldings(connection: Connection, owner: PublicKey): Promise<Holding[]> {
  const out: Holding[] = [];
  const lamports = await connection.getBalance(owner);
  out.push({
    symbol: "SOL",
    mint: getTokenRegistry().SOL.mint,
    decimals: 9,
    amount: lamports / LAMPORTS_PER_SOL,
  });

  const resp = await connection.getParsedTokenAccountsByOwner(owner, {
    programId: TOKEN_PROGRAM_ID,
  });

  type ParsedSplTokenInfo = { mint?: string; tokenAmount?: { uiAmount?: number | null } };
  for (const { account } of resp.value) {
    const info = account.data.parsed?.info as ParsedSplTokenInfo | undefined;
    if (!info?.mint) continue;
    const mint = info.mint;
    const amount = Number(info.tokenAmount?.uiAmount ?? 0);
    if (!amount) continue;
    const known = tokenByMint(mint);
    if (!known) continue; // skip unknown tokens for clean UI
    out.push({
      symbol: known.symbol,
      mint,
      decimals: known.decimals,
      amount,
    });
  }
  return out;
}
