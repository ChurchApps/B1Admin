import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  boolArg,
  explainFailure,
  failText,
  getArg,
  inferDeployRepo,
  printJson,
  relativeToRoot,
  rootDir,
} from "./installer-common.mjs";

// Only these paths are ever staged. Secrets never appear here, and the
// check-ignore guard below refuses to continue if the .gitignore that keeps
// them out is missing.
const SAFE_PATHS = [
  "README.md",
  ".gitignore",
  ".github",
  "customer-values.sample.json",
  "environments",
  "iam",
  "aws-admin-handoff.md",
];

const SENSITIVE_GLOBS = [
  "customer-values.json",
  "environments/staging/app-config-secret.json",
  "environments/prod/app-config-secret.json",
  "environments/staging/bootstrap-admin-secret.json",
  "environments/prod/bootstrap-admin-secret.json",
];

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
    maxBuffer: 20 * 1024 * 1024,
  });
  return {
    ok: result.status === 0,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function gitIgnores(deployRepoDir, relativePath) {
  return run("git", ["check-ignore", "--quiet", relativePath], deployRepoDir).ok;
}

function main() {
  const outputMode = getArg("output", "text").toLowerCase();
  const deployRepoDirArg = getArg("deploy-repo-dir", "../b1admin-deploy");
  const deployRepoDir = path.resolve(rootDir, deployRepoDirArg);
  const repo = inferDeployRepo(getArg("repo"));
  const message = getArg("message", "B1Admin installer update");
  const push = boolArg("push", true);
  const actions = [];

  if (!fs.existsSync(deployRepoDir)) {
    failText(`The private deployment folder does not exist yet: ${relativeToRoot(deployRepoDir)}. Run \`yarn installer:init\` first.`, outputMode);
  }
  if (!fs.existsSync(path.join(deployRepoDir, ".gitignore"))) {
    failText("The private deployment folder has no .gitignore, so committing could expose secret files. Run `yarn installer:init` to restore it, then retry.", outputMode);
  }

  if (!fs.existsSync(path.join(deployRepoDir, ".git"))) {
    const init = run("git", ["init", "-b", "main"], deployRepoDir);
    if (!init.ok) failText(`Could not initialize git in ${relativeToRoot(deployRepoDir)}: ${init.stderr.trim()}`, outputMode);
    actions.push({ ok: true, label: "Initialized git in the private deployment folder" });
  }

  for (const sensitive of SENSITIVE_GLOBS) {
    if (fs.existsSync(path.join(deployRepoDir, sensitive)) && !gitIgnores(deployRepoDir, sensitive)) {
      failText(`Refusing to commit: the secret file ${sensitive} is not covered by .gitignore. Run \`yarn installer:init\` to restore the .gitignore, then retry.`, outputMode);
    }
  }

  const stage = run("git", ["add", "--", ...SAFE_PATHS.filter((entry) => fs.existsSync(path.join(deployRepoDir, entry)))], deployRepoDir);
  if (!stage.ok) failText(`Could not stage files: ${stage.stderr.trim()}`, outputMode);

  const staged = run("git", ["diff", "--cached", "--name-only"], deployRepoDir).stdout.trim();
  let committed = false;
  if (staged) {
    const identityOk = run("git", ["config", "user.email"], deployRepoDir).stdout.trim() !== "";
    if (!identityOk) {
      failText('Git needs your name and email once before it can save changes. Run `git config --global user.name "Your Name"` and `git config --global user.email "you@example.com"`, then retry.', outputMode);
    }
    const commit = run("git", ["commit", "-m", message], deployRepoDir);
    if (!commit.ok) failText(`Could not commit: ${commit.stderr.trim() || commit.stdout.trim()}`, outputMode);
    committed = true;
    actions.push({ ok: true, label: `Committed changes: ${staged.split("\n").length} file(s)` });
  } else {
    actions.push({ ok: true, label: "No new changes to commit" });
  }

  let pushed = false;
  if (push) {
    const hasRemote = run("git", ["remote", "get-url", "origin"], deployRepoDir).ok;
    if (!hasRemote) {
      if (!repo) {
        failText("No git remote is configured and no repository name is available. Answer the private repository question in `yarn installer:customer-values`, then retry.", outputMode);
      }
      const view = run("gh", ["repo", "view", repo, "--json", "name"], deployRepoDir);
      if (!view.ok) {
        const create = run("gh", ["repo", "create", repo, "--private"], deployRepoDir);
        if (!create.ok) {
          const hint = explainFailure(create.stderr);
          failText(`Could not create the private GitHub repository ${repo}: ${create.stderr.trim()}${hint ? `\n${hint}` : ""}`, outputMode);
        }
        actions.push({ ok: true, label: `Created private GitHub repository ${repo}` });
      }
      const addRemote = run("git", ["remote", "add", "origin", `https://github.com/${repo}.git`], deployRepoDir);
      if (!addRemote.ok) failText(`Could not add the git remote: ${addRemote.stderr.trim()}`, outputMode);
      actions.push({ ok: true, label: `Connected the folder to https://github.com/${repo}` });
    }

    const pushResult = run("git", ["push", "-u", "origin", "HEAD"], deployRepoDir);
    if (!pushResult.ok) {
      const hint = explainFailure(pushResult.stderr);
      failText(`Could not push to GitHub: ${pushResult.stderr.trim()}${hint ? `\n${hint}` : ""}`, outputMode);
    }
    pushed = true;
    actions.push({ ok: true, label: "Pushed to GitHub" });
  }

  const result = {
    ok: true,
    deployRepoDir: relativeToRoot(deployRepoDir),
    repo,
    committed,
    pushed,
    actions,
  };

  if (outputMode === "json") {
    printJson(result);
  } else if (outputMode === "markdown" || outputMode === "md") {
    const lines = [
      "# Private Repository Sync",
      "",
      `- Folder: \`${result.deployRepoDir}\``,
      `- Repository: \`${repo || "<not set>"}\``,
      "",
      "## Actions",
      "",
    ];
    result.actions.forEach((action) => lines.push(`- ${action.ok ? "OK" : "FAILED"}: ${action.label}`));
    process.stdout.write(`${lines.join("\n")}\n`);
  } else {
    result.actions.forEach((action) => console.log(`${action.ok ? "OK" : "FAILED"}: ${action.label}`));
  }
}

main();
