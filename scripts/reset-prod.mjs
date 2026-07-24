#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const resetStagingScript = path.join(scriptDir, "reset-staging.mjs");

const userArgs = process.argv.slice(2);

function readEnvironmentArg(args) {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--environment") return args[index + 1] || "";
    if (arg.startsWith("--environment=")) return arg.split("=", 2)[1] || "";
  }

  return "";
}

const requestedEnvironment = readEnvironmentArg(userArgs);
if (requestedEnvironment && requestedEnvironment !== "prod") {
  console.error(`reset:prod only supports --environment=prod, received: ${requestedEnvironment}`);
  process.exit(1);
}

const forwardedArgs = requestedEnvironment ? userArgs : ["--environment=prod", ...userArgs];

const result = spawnSync(process.execPath, [resetStagingScript, ...forwardedArgs], {
  cwd: path.resolve(scriptDir, ".."),
  stdio: "inherit",
  env: process.env,
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
