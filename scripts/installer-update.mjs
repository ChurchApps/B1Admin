import { spawnSync } from "node:child_process";
import path from "node:path";
import readline from "node:readline/promises";
import {
  boolArg,
  getArg,
  printJson,
  relativeToRoot,
  rootDir,
} from "./installer-common.mjs";

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || rootDir,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    maxBuffer: 20 * 1024 * 1024,
  });

  return {
    ok: result.status === 0,
    status: result.status ?? 1,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function statusLines(deployRepoDir) {
  const result = runCommand("git", ["status", "--short"], { cwd: deployRepoDir, capture: true });
  if (!result.ok) return [];
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function hasSafePrivateChanges(lines) {
  return lines.some((line) => {
    const filePath = line.replace(/^..?\s+/, "");
    return filePath === "README.md"
      || filePath === ".gitignore"
      || filePath === "customer-values.sample.json"
      || filePath === ".github/workflows/deploy-aws-self-hosted.yml"
      || filePath.startsWith("environments/");
  });
}

async function confirm(rl, question, defaultYes = false, options = {}) {
  if (options.yes) return true;
  const suffix = defaultYes ? " [Y/n]" : " [y/N]";
  const raw = (await rl.question(`${question}${suffix}: `)).trim().toLowerCase();
  if (!raw) return defaultYes;
  return raw === "y" || raw === "yes";
}

function runOrThrow(command, args, options = {}) {
  const result = runCommand(command, args, options);
  if (!result.ok) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }
  return result;
}

async function main() {
  const outputMode = getArg("output", "text").toLowerCase();
  const deployRepoDirArg = getArg("deploy-repo-dir", "../b1admin-deploy");
  const deployEnvDirArg = getArg("deploy-env-dir", path.join(deployRepoDirArg, "environments"));
  const deploymentRootArg = getArg("deployment-root", path.join(deployRepoDirArg, "deployment"));
  const customerFileArg = getArg("customer-file", path.join(deployRepoDirArg, "customer-values.json"));
  const environment = getArg("environment", "prod");
  const skipPull = boolArg("skip-pull", false);
  const skipPrivateCommit = boolArg("skip-private-commit", false);
  const yes = boolArg("yes", false);
  const approveGates = boolArg("approve-gates", false);
  const dryRun = boolArg("dry-run", false);
  const deployRepoDir = path.resolve(rootDir, deployRepoDirArg);
  const history = [];

  if (outputMode !== "json") {
    console.log("B1Admin update will refresh source code, refresh the private deployment workspace, then start the guided deploy runner.");
    console.log(`Environment: ${environment}`);
    console.log(`User's private repository: ${relativeToRoot(deployRepoDir)}`);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    if (!skipPull) {
      const shouldPull = await confirm(rl, "Pull latest B1Admin source repository code now?", true, { yes });
      if (shouldPull) {
        history.push({ action: "git-pull" });
        if (!dryRun) runOrThrow("git", ["pull"]);
      }
    }

    history.push({ action: "installer-init" });
    if (!dryRun) {
      runOrThrow("npm", [
        "run",
        "installer:init",
        "--",
        `--deploy-repo-dir=${deployRepoDirArg}`,
        "--output=markdown",
      ]);
    }

    const privateStatus = dryRun ? [] : statusLines(deployRepoDir);
    if (privateStatus.length > 0 && outputMode !== "json") {
      console.log("\nUser's private repository changes:");
      privateStatus.forEach((line) => console.log(line));
    }

    if (!skipPrivateCommit && privateStatus.length > 0 && hasSafePrivateChanges(privateStatus)) {
      const shouldCommit = await confirm(rl, "Commit and push safe private repository scaffold changes now?", false, { yes });
      if (shouldCommit) {
        history.push({ action: "private-commit-push" });
        if (!dryRun) {
          runOrThrow("git", ["add", "README.md", ".gitignore", ".github/workflows/deploy-aws-self-hosted.yml", "customer-values.sample.json", "environments"], { cwd: deployRepoDir });
          const commit = runCommand("git", ["commit", "-m", "Update B1Admin deployment scaffold"], { cwd: deployRepoDir });
          if (!commit.ok && outputMode !== "json") {
            console.log("No private scaffold commit was created. Continuing.");
          }
          runOrThrow("git", ["push"], { cwd: deployRepoDir });
        }
      } else if (outputMode !== "json") {
        console.log("Paused before deploy. Commit and push safe private repository changes, then run installer:update again.");
        return;
      }
    }

    const runnerArgs = [
      "run",
      "installer:run",
      "--",
      `--deploy-repo-dir=${deployRepoDirArg}`,
      `--deploy-env-dir=${deployEnvDirArg}`,
      `--deployment-root=${deploymentRootArg}`,
      `--customer-file=${customerFileArg}`,
      `--environment=${environment}`,
      "--output=markdown",
    ];
    if (yes) runnerArgs.push("--yes=true");
    if (approveGates) runnerArgs.push("--approve-gates=true");
    if (dryRun) runnerArgs.push("--dry-run=true");

    history.push({ action: "installer-run" });
    if (!dryRun) runOrThrow("npm", runnerArgs);

    if (outputMode === "json") printJson({ ok: true, history });
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
