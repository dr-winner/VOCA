import { useEffect, useState } from "react";
import { Buffer } from "buffer";

// Browser-only Buffer polyfill for @solana/web3.js
if (typeof window !== "undefined" && !(window as any).Buffer) {
  (window as any).Buffer = Buffer;
  (globalThis as any).Buffer = Buffer;
}

export function ClientGate({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
}
