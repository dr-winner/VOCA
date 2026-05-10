import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import type { PluginOption, UserConfig, ViteDevServer } from "vite";

/** Surfaces TanStack server-fn errors to the dev client (same behavior as prior wrapper). */
function devServerFnErrorLogger(): PluginOption {
  const HMR_SEND_KEY = "__TANSTACK_SERVER_FN_HMR_SEND__";
  return {
    name: "dev-server-fn-error-logger",
    apply: "serve",
    enforce: "pre",
    configureServer(server: ViteDevServer) {
      (globalThis as Record<string, unknown>)[HMR_SEND_KEY] = (data: unknown) => {
        server.ws.send({
          type: "custom",
          event: "server-fn-error",
          data,
        });
      };
    },
    transform(code, id) {
      const normalizedId = id.replace(/\\/g, "/");
      const isTargetModule =
        normalizedId.includes("/@tanstack/start-server-core/src/server-functions-handler.ts") ||
        normalizedId.includes("/@tanstack/start-server-core/dist/esm/server-functions-handler.js");
      if (!isTargetModule) return null;
      const needle = "const unwrapped = res.result || res.error";
      if (!code.includes(needle)) return null;
      const tail = `

      if (res?.error) {
        const err = res.error
        const payload = {
          source: 'tanstack',
          type: 'server-fn-error',
          method: request.method,
          url: request.url,
          name: err?.name ?? 'Error',
          message: err?.message ?? String(err),
          stack: typeof err?.stack === 'string' ? err.stack : undefined,
        }
        globalThis.${HMR_SEND_KEY}?.(payload)
      }`;
      return code.replace(needle, needle + tail);
    },
  };
}

// https://vitejs.dev/config — TanStack Start + Cloudflare worker entry `src/server.ts`
export default defineConfig(async ({ command, mode }) => {
  // `vite dev`: expose `.env` to `process.env` so `/api/*` routes resolve `GROQ_*`, `ELEVENLABS_*`, etc. via readEnv().
  // (Vite only injects `VITE_*` into `import.meta.env` below — never put secrets in `define`.)
  if (command === "serve") {
    const merged = loadEnv(mode, process.cwd(), "");
    for (const [key, value] of Object.entries(merged)) {
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }

  const plugins: PluginOption[] = [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    devServerFnErrorLogger(),
  ];

  if (command === "build") {
    plugins.push(
      cloudflare({
        viteEnvironment: { name: "ssr" },
      }),
    );
  }

  plugins.push(
    tanstackStart({
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
      server: { entry: "server" },
    }),
  );

  plugins.push(react());

  const envDefine: Record<string, string> = {};
  const loadedEnv = loadEnv(mode, process.cwd(), "VITE_");
  for (const [key, value] of Object.entries(loadedEnv)) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  const base: UserConfig = {
    define: envDefine,
    resolve: {
      alias: {
        "@": `${process.cwd()}/src`,
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    plugins,
    server: {
      host: "::",
      port: 8080,
      watch: {
        awaitWriteFinish: {
          stabilityThreshold: 1000,
          pollInterval: 100,
        },
      },
    },
  };

  return base;
});
