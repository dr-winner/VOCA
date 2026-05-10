/**
 * Reads config from Vite (`import.meta.env`) and/or Node/Workers (`process.env`)
 * so client, SSR, and `/api/*` handlers see the same keys with sensible aliases.
 */

function importMetaEnvRecord(): Record<string, string | undefined> | undefined {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env) {
      return import.meta.env as unknown as Record<string, string | undefined>;
    }
  } catch {
    /* non-Vite */
  }
  return undefined;
}

function processEnvRecord(): Record<string, string | undefined> | undefined {
  if (typeof process !== "undefined" && process.env) {
    return process.env as Record<string, string | undefined>;
  }
  return undefined;
}

/** First non-empty value among keys tried on import.meta.env, then process.env. */
export function readEnv(...keys: string[]): string | undefined {
  const im = importMetaEnvRecord();
  const pe = processEnvRecord();
  for (const key of keys) {
    const a = im?.[key];
    if (typeof a === "string" && a.trim()) return a.trim();
  }
  for (const key of keys) {
    const b = pe?.[key];
    if (typeof b === "string" && b.trim()) return b.trim();
  }
  return undefined;
}
