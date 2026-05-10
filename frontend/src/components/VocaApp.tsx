import { Toaster } from "sonner";
import { WalletProviders } from "./WalletProviders";
import { Header } from "./Header";
import { PortfolioHero } from "./PortfolioHero";
import { TokenGrid } from "./TokenGrid";
import { ChatTranscript } from "./ChatTranscript";
import { MicButton } from "./MicButton";
import { TextInput } from "./TextInput";
import { VocaChainStrip } from "./VocaChainStrip";
import { resolveSolanaRpcUrl, solanaClusterLabel } from "@/lib/solana-cluster";

export default function VocaApp() {
  const cluster = solanaClusterLabel(resolveSolanaRpcUrl());
  return (
    <WalletProviders>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 md:py-10 space-y-6">
          <PortfolioHero />
          <VocaChainStrip />
          <TokenGrid />
          <ChatTranscript />
          <div className="flex flex-col items-center gap-4 pt-2 pb-8">
            <MicButton />
            <div className="w-full max-w-xl">
              <TextInput />
            </div>
          </div>
        </main>
        <footer className="text-center text-[11px] text-muted-foreground/60 py-4">
          VOCA · {cluster} · Jupiter · Groq · ElevenLabs
        </footer>
      </div>
      <Toaster theme="dark" richColors position="top-center" />
    </WalletProviders>
  );
}
