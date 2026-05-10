import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";

export function Header() {
  const { publicKey } = useWallet();
  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl border-b border-border/60 bg-background/70">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-accent grid place-items-center glow-primary">
            <span className="font-display font-bold text-primary-foreground">V</span>
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-xl font-display font-semibold tracking-tight">VOCA</h1>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              voice · solana
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-elevated border border-border text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success animate-pulse" />
            devnet
          </span>
          {publicKey && (
            <span className="hidden md:inline text-xs font-mono text-muted-foreground">
              {publicKey.toBase58().slice(0, 4)}…{publicKey.toBase58().slice(-4)}
            </span>
          )}
          <WalletMultiButton />
        </div>
      </div>
    </header>
  );
}
