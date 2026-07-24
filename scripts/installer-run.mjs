import { spawnSync } from "node:child_process";
import process from "node:process";
import readline from "node:readline/promises";
import {
  boolArg,
  getArg,
  printJson,
  rootDir,
  runNodeJson,
} from "./installer-common.mjs";

const runnerArgs = new Set([
  "approve-gates",
  "dry-run",
  "max-steps",
  "output",
  "yes",
]);

function argName(arg) {
  if (!arg.startsWith("--")) return "";
  return arg.replace(/^--/, "").split("=")[0];
}

function startArgs() {
  const args = [];
  const raw = process.argv.slice(2);
  for (let index = 0; index < raw.length; index += 1) {
    const arg = raw[index];
    const name = argName(arg);
    if (name && runnerArgs.has(name)) {
      if (!arg.includes("=") && raw[index + 1] && !raw[index + 1].startsWith("--")) index += 1;
      continue;
    }
    args.push(arg);
  }
  return [...args, "--output=json"];
}

function splitWords(command) {
  const words = [];
  let current = "";
  let quote = "";
  let escaping = false;

  for (const char of command.trim()) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }
    if (char === "\\") {
      escaping = true;
      continue;
    }
    if (quote) {
      if (char === quote) {
        quote = "";
      } else {
        current += char;
      }
      continue;
    }
    if (char === "\"" || char === "'") {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) {
        words.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }

  if (current) words.push(current);
  return words;
}

function invocationFromCommand(command) {
  const trimmed = command.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const words = splitWords(trimmed);
  if (words[0] === "npm" && words[1] === "install" && words.length === 2) {
    return { command: "npm", args: ["install"] };
  }
  if (words[0] === "npm" && words[1] === "run" && words[2]) {
    return { command: "npm", args: ["run", words[2], ...words.slice(3)] };
  }
  if (words[0] === "cp" && words.length === 3) {
    return { command: "cp", args: words.slice(1) };
  }
  return null;
}

function isApprovalGate(command) {
  return command.includes("installer:deploy")
    || command.includes("--write-secrets=true")
    || command.includes("installer:bootstrap-admin")
    || command.includes("installer:browser-smoke")
    || command.includes("installer:adopt-frontend-origin")
    || command.includes("installer:report");
}

function renderStep(step, check, gated) {
  const lines = [
    "",
    `Step ${step}: ${check?.label || "Next command"}`,
    check?.detail ? `Status: ${check.detail}` : "",
    gated ? "Approval: this step can change AWS/GitHub state, create a login, launch browser testing, or write sign-off evidence." : "",
    "Command:",
    check?.command || "",
  ].filter(Boolean);
  return lines.join("\n");
}

async function shouldRun(rl, command, options) {
  const gated = isApprovalGate(command);
  if (options.dryRun) return false;
  if (options.yes && (!gated || options.approveGates)) return true;

  const suffix = gated ? " [y/N]" : " [Y/n]";
  const raw = (await rl.question(`Run this command now?${suffix}: `)).trim().toLowerCase();
  if (!raw) return !gated;
  return ["y", "yes"].includes(raw);
}

function runStart() {
  const result = runNodeJson("scripts/installer-start.mjs", startArgs());
  if (!result.ok || !result.parsed) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || "installer:next did not return JSON.");
  }
  return result.parsed;
}

async function main() {
  const outputMode = getArg("output", "text").toLowerCase();
  const options = {
    approveGates: boolArg("approve-gates", false),
    dryRun: boolArg("dry-run", false),
    maxSteps: Number(getArg("max-steps", "30")),
    yes: boolArg("yes", false),
  };
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const history = [];

  try {
    for (let step = 1; step <= options.maxSteps; step += 1) {
      const state = runStart();
      const nextCommand = String(state.nextCommand || "").trim();
      const nextCheck = state.checks?.find((check) => !check.ok && check.command === nextCommand)
        || state.checks?.find((check) => !check.ok)
        || null;

      if (state.ok || !nextCommand || nextCommand.startsWith("#")) {
        history.push({ step, action: "complete", command: nextCommand });
        if (outputMode === "json") printJson({ ok: true, complete: true, history, state });
        else console.log(nextCommand || "Installer run complete.");
        return;
      }

      const invocation = invocationFromCommand(nextCommand);
      if (!invocation) {
        history.push({ step, action: "manual", command: nextCommand });
        if (outputMode === "json") printJson({ ok: false, complete: false, manualCommand: nextCommand, history, state });
        else console.log(`Run this command manually, then start installer:run again:\n${nextCommand}`);
        process.exit(1);
      }

      if (outputMode !== "json") console.log(renderStep(step, nextCheck, isApprovalGate(nextCommand)));
      const runIt = await shouldRun(rl, nextCommand, options);
      if (!runIt) {
        history.push({ step, action: "paused", command: nextCommand });
        if (outputMode === "json") printJson({ ok: true, complete: false, paused: true, command: nextCommand, history, state });
        else console.log("Paused. Run installer:run again when you are ready to continue.");
        return;
      }

      history.push({ step, action: "run", command: nextCommand });
      const result = spawnSync(invocation.command, invocation.args, {
        cwd: rootDir,
        encoding: "utf8",
        stdio: outputMode === "json" ? "pipe" : "inherit",
        maxBuffer: 20 * 1024 * 1024,
      });

      if ((result.status ?? 1) !== 0) {
        if (outputMode === "json") {
          printJson({
            ok: false,
            complete: false,
            failedCommand: nextCommand,
            status: result.status ?? 1,
            stdout: result.stdout || "",
            stderr: result.stderr || "",
            history,
          });
        } else {
          console.error("That command did not finish successfully. Fix the issue shown above, then run installer:run again.");
        }
        process.exit(result.status ?? 1);
      }
    }

    const message = `Paused after ${options.maxSteps} step(s). Re-run installer:run to continue.`;
    if (outputMode === "json") {
      printJson({ ok: true, complete: false, paused: true, reason: "max-steps", history });
    } else {
      console.log(message);
    }
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
