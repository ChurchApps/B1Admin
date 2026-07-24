import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  boolArg,
  failText,
  getArg,
  inferDeployRepo,
  printJson,
  relativeToRoot,
  rootDir,
  runNodeJson,
} from "./installer-common.mjs";

function runGh(args) {
  return spawnSync("gh", args, {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
}

function parseJsonOutput(result, fallbackLabel) {
  try {
    return JSON.parse(result.stdout || "{}");
  } catch {
    throw new Error(result.stderr.trim() || `Could not parse ${fallbackLabel} output.`);
  }
}

function latestRun(repo) {
  const args = [
    "run",
    "list",
    "--workflow",
    "deploy-aws-self-hosted.yml",
    "--limit",
    "1",
    "--json",
    "databaseId,status,conclusion,url,headSha,createdAt,updatedAt,displayTitle,workflowName",
  ];
  if (repo) args.push("--repo", repo);
  const result = runGh(args);
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || "Could not list GitHub workflow runs.");
  }
  const runs = parseJsonOutput(result, "gh run list");
  return Array.isArray(runs) ? runs[0] || null : null;
}

function viewRun(runId, repo) {
  const args = [
    "run",
    "view",
    String(runId),
    "--json",
    "databaseId,status,conclusion,url,headSha,createdAt,updatedAt,displayTitle,workflowName,event",
  ];
  if (repo) args.push("--repo", repo);
  const result = runGh(args);
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `Could not view GitHub workflow run ${runId}.`);
  }
  return parseJsonOutput(result, "gh run view");
}

function watchRun(runId, repo) {
  const args = ["run", "watch", String(runId), "--compact", "--exit-status"];
  if (repo) args.push("--repo", repo);
  const result = runGh(args);
  return {
    ok: result.status === 0,
    status: result.status ?? 1,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function downloadArtifact(runId, repo, artifactName, evidenceDir) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  const downloadDir = fs.mkdtempSync(path.join(os.tmpdir(), `b1admin-${artifactName}-`));
  const args = [
    "run",
    "download",
    String(runId),
    "--name",
    artifactName,
    "--dir",
    downloadDir,
  ];
  if (repo) args.push("--repo", repo);
  const result = runGh(args);
  if (result.status === 0) {
    fs.cpSync(downloadDir, evidenceDir, { recursive: true, force: true });
  }
  fs.rmSync(downloadDir, { recursive: true, force: true });
  return {
    ok: result.status === 0,
    status: result.status ?? 1,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function readSummary(summaryFile) {
  if (!fs.existsSync(summaryFile)) return null;
  return JSON.parse(fs.readFileSync(summaryFile, "utf8"));
}

function verifyFromEvidence(environment, evidenceDir, checkHttp) {
  const backendOutputsFile = path.join(evidenceDir, "backend-outputs.json");
  const frontendOutputsFile = path.join(evidenceDir, "frontend-outputs.json");
  if (!fs.existsSync(backendOutputsFile) || !fs.existsSync(frontendOutputsFile)) {
    return null;
  }

  return runNodeJson("scripts/verify-split-stack.mjs", [
    `--backend-outputs-file=${backendOutputsFile}`,
    `--frontend-outputs-file=${frontendOutputsFile}`,
    `--check-http=${checkHttp ? "true" : "false"}`,
    "--check-aws=false",
    "--output=json",
  ]).parsed;
}

function renderMarkdown(result) {
  const run = result.run || {};
  const lines = [
    `# Deployment Observe: ${result.environment}`,
    "",
    `- Status: ${result.ok ? "ok" : "needs attention"}`,
    `- Repository: \`${result.repo || "<current>"}\``,
    `- Run id: \`${result.runId || ""}\``,
    `- Run status: \`${run.status || ""}\``,
    `- Conclusion: \`${run.conclusion || ""}\``,
    `- URL: ${run.url ? `[open run](${run.url})` : ""}`,
    `- Evidence dir: \`${result.evidenceDir}\``,
    `- Downloaded artifact: \`${result.downloadedArtifact || "<none>"}\``,
  ];

  if (result.summary?.resolved) {
    lines.push(
      "",
      "## URLs",
      "",
      `- API base URL: \`${result.summary.resolved.apiBaseUrl || ""}\``,
      `- Frontend app URL: \`${result.summary.resolved.frontendAppUrl || ""}\``,
      `- Frontend bucket: \`${result.summary.resolved.frontendBucketName || ""}\``,
      `- CloudFront distribution: \`${result.summary.resolved.frontendDistributionId || ""}\``,
    );
  }

  if (result.verification?.checks) {
    lines.push("", "## Verification", "");
    result.verification.checks.forEach((check) => {
      const status = check.skipped ? "SKIP" : check.ok ? "OK" : "FAIL";
      lines.push(`- ${status}: ${check.name} - ${check.detail}`);
    });
  }

  if (result.followUp.length > 0) {
    lines.push("", "## Follow Up", "");
    result.followUp.forEach((step) => lines.push(`- ${step}`));
  }

  if (result.warnings.length > 0) {
    lines.push("", "## Warnings", "");
    result.warnings.forEach((warning) => lines.push(`- ${warning}`));
  }

  return `${lines.join("\n")}\n`;
}

function main() {
  const environment = getArg("environment", "staging");
  const outputMode = getArg("output", "text").toLowerCase();
  const repo = inferDeployRepo(getArg("repo"));
  const runIdArg = getArg("run-id");
  const watch = boolArg("watch", false);
  const download = boolArg("download-evidence", true);
  const verify = boolArg("verify", true);
  const checkHttp = boolArg("check-http", true);
  const deploymentRoot = getArg("deployment-root", "deployment");
  const evidenceDir = path.resolve(rootDir, getArg("evidence-dir", path.join(deploymentRoot, environment)));
  const warnings = [];
  const followUp = [];
  const attemptedArtifacts = [];
  let downloadedArtifact = "";

  let run = null;
  try {
    run = runIdArg ? viewRun(runIdArg, repo) : latestRun(repo);
  } catch (error) {
    failText(error instanceof Error ? error.message : String(error), outputMode);
  }

  if (!run) {
    failText("No deploy-aws-self-hosted.yml workflow runs were found.", outputMode);
  }

  const runId = run.databaseId || runIdArg;

  if (watch) {
    const watched = watchRun(runId, repo);
    if (!watched.ok) {
      failText(watched.stderr.trim() || `Workflow run ${runId} did not finish cleanly.`, outputMode, { run });
    }
    try {
      run = viewRun(runId, repo);
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : String(error));
    }
  } else if (run.status !== "completed") {
    followUp.push(`Watch the run: yarn installer:observe -- --environment=${environment}${repo ? ` --repo=${repo}` : ""} --deployment-root=${deploymentRoot} --run-id=${runId} --watch=true --output=markdown`);
  }

  if (download) {
    fs.mkdirSync(evidenceDir, { recursive: true });
    const artifactNames = [
      `aws-${environment}-deployment-evidence`,
      `aws-${environment}-preflight-plan`,
    ];
    let downloaded = null;
    for (const artifactName of artifactNames) {
      attemptedArtifacts.push(artifactName);
      downloaded = downloadArtifact(runId, repo, artifactName, evidenceDir);
      if (downloaded.ok) {
        downloadedArtifact = artifactName;
        break;
      }
    }
    if (!downloaded.ok) {
      warnings.push(downloaded.stderr.trim() || `Could not download deployment evidence for run ${runId}.`);
      followUp.push(`Download evidence manually: gh run download ${runId}${repo ? ` --repo ${repo}` : ""} --name aws-${environment}-deployment-evidence --dir ${relativeToRoot(evidenceDir)}`);
    }
  } else {
    followUp.push(`Download evidence: yarn installer:observe -- --environment=${environment}${repo ? ` --repo=${repo}` : ""} --deployment-root=${deploymentRoot} --run-id=${runId} --download-evidence=true --verify=false --output=markdown`);
  }

  const summaryFile = path.join(evidenceDir, "deployment-summary.json");
  let summary = null;
  try {
    summary = readSummary(summaryFile);
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : String(error));
  }

  if (!summary) {
    followUp.push(`Show summary after evidence is available: yarn show:deployment-summary -- --summary-file=${relativeToRoot(summaryFile)} --output=markdown`);
    if (downloadedArtifact.endsWith("-deployment-evidence") && run.status === "completed" && run.conclusion === "success") {
      warnings.push(`Downloaded ${downloadedArtifact}, but it did not contain deployment-summary.json. Update the private deployment workflow so it runs save:split-stack-outputs after a real deploy.`);
    }
  }

  let verification = null;
  if (verify) {
    verification = verifyFromEvidence(environment, evidenceDir, checkHttp);
    if (!verification) {
      followUp.push(`Verify after evidence is available: yarn verify:split-stack -- --backend-outputs-file=${relativeToRoot(path.join(evidenceDir, "backend-outputs.json"))} --frontend-outputs-file=${relativeToRoot(path.join(evidenceDir, "frontend-outputs.json"))} --check-http=true --check-aws=false --output=markdown`);
    }
  }

  const result = {
    ok: warnings.length === 0 && (!verification || verification.ok !== false),
    environment,
    repo,
    runId,
    run,
    evidenceDir: relativeToRoot(evidenceDir),
    downloadedArtifact,
    attemptedArtifacts,
    summaryFile: relativeToRoot(summaryFile),
    summary,
    verification,
    warnings,
    followUp,
  };

  if (outputMode === "json") {
    printJson(result);
  } else if (outputMode === "markdown" || outputMode === "md") {
    process.stdout.write(renderMarkdown(result));
  } else {
    console.log(`Deployment observe: ${result.ok ? "ok" : "needs attention"}`);
    console.log(`Run id: ${runId}`);
    followUp.forEach((step) => console.log(`- ${step}`));
    warnings.forEach((warning) => console.log(`Warning: ${warning}`));
  }

  process.exit(result.ok ? 0 : 1);
}

main();
