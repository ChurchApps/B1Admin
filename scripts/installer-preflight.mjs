import {
  boolArg,
  failText,
  getArg,
  inferDeployRepo,
  printJson,
  relativeToRoot,
  requireEnvironmentDir,
  resolveEnvironmentDir,
  runCommandJson,
  runNodeJson,
  rootDir,
} from "./installer-common.mjs";
import fs from "node:fs";
import path from "node:path";

function planArgs(environment, environmentDirArg, repo) {
  const args = [
    `--environment=${environment}`,
    `--region=${getArg("region", process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1")}`,
    `--deployment-source=${getArg("deployment-source", "api-repo")}`,
    `--b1admin-repo=${getArg("b1admin-repo", "ChurchApps/B1Admin")}`,
    `--b1admin-ref=${getArg("b1admin-ref", "main")}`,
    `--api-repo=${getArg("api-repo", "ChurchApps/Api")}`,
    `--api-ref=${getArg("api-ref", "main")}`,
    `--run-api-migrations=${boolArg("run-api-migrations", true) ? "true" : "false"}`,
    `--api-migration-runner=${getArg("api-migration-runner", "data-api")}`,
    `--verify-http-after-deploy=${boolArg("verify-http-after-deploy", true) ? "true" : "false"}`,
    `--sync-app-config-secret=${boolArg("sync-app-config-secret", true) ? "true" : "false"}`,
    "--output=json",
  ];

  if (environmentDirArg) args.push(`--environment-dir=${environmentDirArg}`);
  if (repo) args.push(`--repo=${repo}`);
  return args;
}

function ghRepoCheck(repo) {
  if (boolArg("skip-github-repo-check", false)) {
    return { ok: true, detail: "Skipped by --skip-github-repo-check=true." };
  }

  if (!repo) {
    return { ok: false, detail: "DEPLOY_REPO or --repo is required so the installer knows which private deployment repository to use." };
  }
  const result = runCommandJson("gh", ["repo", "view", repo, "--json", "nameWithOwner,isPrivate"]);
  if (!result.ok) {
    return { ok: false, detail: result.stderr.trim() || `Could not read GitHub repository ${repo}.` };
  }
  return {
    ok: true,
    detail: `${result.parsed?.nameWithOwner || repo}${result.parsed?.isPrivate ? " is private" : " is visible to gh"}`,
  };
}

function renderMarkdown(result) {
  const lines = [
    `# Installer Preflight: ${result.environment}`,
    "",
    `- Status: ${result.ok ? "ready" : "blocked"}`,
    `- Environment dir: \`${result.environmentDir}\``,
    `- Private deploy repo: \`${result.deployRepo || "<missing>"}\``,
    `- Starter blockers: ${result.starterBlockers}`,
    `- Deploy-plan blockers: ${result.deployPlanBlockers}`,
    "",
    "## Checks",
    "",
  ];

  result.checks.forEach((check) => {
    lines.push(`- ${check.ok ? "OK" : "BLOCKED"}: ${check.name} - ${check.detail}`);
  });

  if (result.nextCommand) {
    lines.push("", "## Next Command", "", `\`${result.nextCommand}\``);
  }

  return `${lines.join("\n")}\n`;
}

function main() {
  const environment = getArg("environment", "staging");
  const environmentDirArg = getArg("environment-dir");
  const outputMode = getArg("output", "text").toLowerCase();
  const includeDetails = boolArg("include-details", false);
  const write = boolArg("write", false);
  const outputFile = path.resolve(rootDir, getArg("output-file", path.join("deployment", environment, "preflight-readiness.json")));
  const repo = inferDeployRepo(getArg("repo"));
  const environmentDir = resolveEnvironmentDir(environment, environmentDirArg);

  try {
    requireEnvironmentDir(environmentDir);
  } catch (error) {
    failText(error instanceof Error ? error.message : String(error), outputMode);
  }

  const audit = runNodeJson("scripts/audit-environment-starter.mjs", [
    `--environment=${environment}`,
    ...(environmentDirArg ? [`--environment-dir=${environmentDirArg}`] : []),
    "--only-blockers=true",
    "--output=json",
  ]);
  const plan = runNodeJson("scripts/plan-environment-deploy.mjs", planArgs(environment, environmentDirArg, repo));
  const repoCheck = ghRepoCheck(repo);
  const awsPreflight = runNodeJson("scripts/installer-aws-preflight.mjs", [
    `--environment=${environment}`,
    ...(environmentDirArg ? [`--environment-dir=${environmentDirArg}`] : []),
    `--region=${getArg("region", process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1")}`,
    ...(getArg("account-id") ? [`--account-id=${getArg("account-id")}`] : []),
    ...(getArg("cloudformation-execution-role-arn") ? [`--cloudformation-execution-role-arn=${getArg("cloudformation-execution-role-arn")}`] : []),
    ...(boolArg("skip-aws-check") ? ["--skip-aws-check=true"] : []),
    ...(boolArg("skip-aws-identity-check") ? ["--skip-aws-identity-check=true"] : []),
    ...(boolArg("skip-aws-resource-lookups") ? ["--skip-aws-resource-lookups=true"] : []),
    "--output=json",
  ]);

  const checks = [
    {
      name: "environment starter audit",
      ok: audit.ok,
      detail: audit.ok ? "No unresolved placeholders, unsafe starter defaults, or required blanks." : "Environment starter still has blockers.",
    },
    {
      name: "deployment plan",
      ok: plan.ok && Boolean(plan.parsed?.githubActionsExecution?.ok),
      detail: plan.parsed?.recommendedExecution?.reason || plan.stderr.trim() || "Could not compute deploy plan.",
    },
    {
      name: "private deployment repository",
      ...repoCheck,
    },
    {
      name: "AWS prerequisites",
      ok: awsPreflight.ok && Boolean(awsPreflight.parsed?.ok),
      detail: awsPreflight.parsed?.skipped
        ? "Skipped by --skip-aws-check=true."
        : awsPreflight.parsed?.ok
          ? "AWS CLI, configured role/certificate/DNS prerequisites are readable."
          : awsPreflight.stderr.trim() || "AWS prerequisite checks are blocked.",
    },
  ];

  const result = {
    ok: checks.every((check) => check.ok),
    write,
    outputFile: relativeToRoot(outputFile),
    environment,
    environmentDir: relativeToRoot(environmentDir),
    deployRepo: repo,
    starterBlockers: audit.parsed?.blockerSummary?.blockerCount ?? 0,
    deployPlanBlockers: plan.parsed?.githubActionsExecution?.blockerCount ?? 0,
    checks,
    summaries: {
      audit: {
        ok: audit.parsed?.ok,
        blockerSummary: audit.parsed?.blockerSummary,
      },
      plan: {
        ok: plan.parsed?.ok,
        recommendedExecution: plan.parsed?.recommendedExecution,
        requiredGithubSecrets: plan.parsed?.requiredGithubSecrets,
        optionalGithubSecrets: plan.parsed?.optionalGithubSecrets,
        warnings: plan.parsed?.warnings,
      },
      awsPreflight: {
        ok: awsPreflight.parsed?.ok,
        skipped: awsPreflight.parsed?.skipped,
        checks: awsPreflight.parsed?.checks,
      },
    },
    nextCommand: `yarn installer:deploy -- --environment=${environment}${environmentDirArg ? ` --environment-dir=${environmentDirArg}` : ""} --confirm=true`,
  };

  if (includeDetails) {
    result.audit = audit.parsed;
    result.plan = plan.parsed;
    result.awsPreflight = awsPreflight.parsed;
  }

  if (write) {
    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.writeFileSync(outputFile, `${JSON.stringify(result, null, 2)}\n`);
  }

  if (outputMode === "json") {
    printJson(result);
  } else if (outputMode === "markdown" || outputMode === "md") {
    process.stdout.write(renderMarkdown(result));
  } else {
    console.log(`Installer preflight: ${environment}`);
    checks.forEach((check) => console.log(`[${check.ok ? "OK" : "BLOCKED"}] ${check.name}: ${check.detail}`));
    console.log(`Next: ${result.nextCommand}`);
  }

  process.exit(result.ok ? 0 : 1);
}

main();
