#!/usr/bin/env node
/**
 * Copies Anchor IDL from contracts → frontend so client, API routes, and program stay aligned.
 * Run after: `cd contracts && anchor build`
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const from = path.join(root, "contracts/target/idl/workspace.json");
const toDir = path.join(root, "frontend/src/idl");
const to = path.join(toDir, "workspace.json");

if (!fs.existsSync(from)) {
  console.error("[sync] Missing IDL. Run from repo root:\n  cd contracts && anchor build");
  process.exit(1);
}
fs.mkdirSync(toDir, { recursive: true });
fs.copyFileSync(from, to);
const idl = JSON.parse(fs.readFileSync(to, "utf8"));
console.log("[sync] IDL → frontend/src/idl/workspace.json");
console.log(`[sync] program: ${idl.address} (${idl.metadata?.name ?? "?"})`);
