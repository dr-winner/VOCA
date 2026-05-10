import { readEnv } from "@/lib/config/env-bridge";

export type TokenInfo = {
  symbol: string;
  mint: string;
  decimals: number;
  name: string;
  color: string;
};

/** Mainnet (and generic) SPL mints — use when `VITE_MAINNET_TOKEN_MINTS=1` or unknown env. */
const MAINNET_TOKENS: Record<string, TokenInfo> = {
  SOL: {
    symbol: "SOL",
    mint: "So11111111111111111111111111111111111111112",
    decimals: 9,
    name: "Solana",
    color: "#14F195",
  },
  USDC: {
    symbol: "USDC",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    decimals: 6,
    name: "USD Coin",
    color: "#2775CA",
  },
  USDT: {
    symbol: "USDT",
    mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    decimals: 6,
    name: "Tether",
    color: "#26A17B",
  },
  JUP: {
    symbol: "JUP",
    mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    decimals: 6,
    name: "Jupiter",
    color: "#C7F284",
  },
  BONK: {
    symbol: "BONK",
    mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    decimals: 5,
    name: "Bonk",
    color: "#F7931A",
  },
  RAY: {
    symbol: "RAY",
    mint: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
    decimals: 6,
    name: "Raydium",
    color: "#C200FB",
  },
};

/** Devnet USDC used by faucets / demos (mainnet USDC mint will not resolve on devnet). */
const DEVNET_USDC: TokenInfo = {
  symbol: "USDC",
  mint: "4zMMC9srt5RiUMXytHBwqccvzhXEQ7H2zzZ9XKdyAgUv",
  decimals: 6,
  name: "USD Coin (devnet)",
  color: "#2775CA",
};

function mainnetTokenMintsEnabled(): boolean {
  return readEnv("VITE_MAINNET_TOKEN_MINTS", "MAINNET_TOKEN_MINTS") === "1";
}

/**
 * Active registry: defaults to devnet-friendly USDC unless `VITE_MAINNET_TOKEN_MINTS=1`.
 * Jupiter routes still vary by cluster — SOL↔USDC on devnet is the safest hackathon path.
 */
export function getTokenRegistry(): Record<string, TokenInfo> {
  if (mainnetTokenMintsEnabled()) return { ...MAINNET_TOKENS };
  return { ...MAINNET_TOKENS, USDC: DEVNET_USDC };
}

export function lookupToken(symbol: string): TokenInfo | undefined {
  return getTokenRegistry()[symbol.toUpperCase()];
}

export function tokenByMint(mint: string): TokenInfo | undefined {
  return Object.values(getTokenRegistry()).find((t) => t.mint === mint);
}
