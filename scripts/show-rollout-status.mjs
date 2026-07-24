import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function getArg(name, fallback = "") {
  const prefix = `--${name}=`;
  const bareFlag = `--${name}`;
  for (let index = 0; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    if (arg.startsWith(prefix)) return arg.slice(prefix.length);
    if (arg === bareFlag) {
      const next = process.argv[index + 1];
      if (next !== undefined && !next.startsWith("--")) return next;
    }
  }
  const envName = name.toUpperCase().replace(/-/g, "_");
  return process.env[envName] ?? process.env[name.toUpperCase()] ?? fallback;
}

function parseEnvironmentNames() {
  const singleEnvironment = getArg("environment");
  if (singleEnvironment) return [singleEnvironment];

  const environmentsArg = getArg("environments", "staging,prod");
  const names = environmentsArg
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return names.length > 0 ? names : ["staging", "prod"];
}

function normalizeDeploymentIntent(value) {
  const normalized = String(value || "all").trim().toLowerCase();
  if (["github", "github-actions", "github_actions", "gha"].includes(normalized)) {
    return "github-actions";
  }
  if (normalized === "local") {
    return "local";
  }
  return "all";
}

function buildPlanArgs(environment, options) {
  const args = [
    path.join(rootDir, "scripts", "plan-environment-deploy.mjs"),
    `--environment=${environment}`,
    "--output=json",
  ];

  if (options.environmentRootDir) {
    args.push(`--environment-dir=${path.join(options.environmentRootDir, environment)}`);
  }

  for (const [flagName, value] of Object.entries(options.forwardedArgs)) {
    if (value === "") continue;
    args.push(`--${flagName}=${value}`);
  }

  return args;
}

function isLocalOnlyNextStep(value) {
  const text = String(value || "");
  return text.includes("local Api repo is unreadable")
    || text.includes("switch the local run to package-manifest")
    || text.includes("switch the local run to package-manifest or backend-artifact");
}

function isLocalOnlyCommand(value) {
  const text = String(value || "");
  return text.includes("deploy-split-stack.sh")
    || (
      text.startsWith("yarn plan:environment-deploy --")
      && (text.includes("--deployment-source=package-manifest") || text.includes("--deployment-source=backend-artifact"))
    );
}

function filterCommandsForIntent(commands, deploymentIntent) {
  if (deploymentIntent !== "github-actions") return commands;
  return commands.filter((command) => !isLocalOnlyCommand(command));
}

function runPlan(environment, options) {
  const result = spawnSync(process.execPath, buildPlanArgs(environment, options), {
    cwd: rootDir,
    encoding: "utf8",
    env: process.env,
  });

  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  let parsed = null;

  try {
    parsed = JSON.parse(stdout);
  } catch {
    parsed = null;
  }

  if (!parsed || typeof parsed !== "object") {
    return {
      ok: false,
      environment,
      status: "blocked",
      errors: [`Could not parse plan output for ${environment}.`, stderr || stdout || "No output returned."],
    };
  }

  const ready = parsed.recommendedExecution?.path && parsed.recommendedExecution.path !== "none";
  const starterAndInputBlockerCount = (parsed.starterSummary?.blockerCount || 0) + (parsed.inputBlockers?.length || 0);
  const sharedBlockers = (parsed.blockers || []).map((entry) => entry.summary).filter(Boolean);
  const localOnlyBlockers = (parsed.localExecution?.blockers || []).filter((entry) => !sharedBlockers.includes(entry));
  const githubOnlyBlockers = (parsed.githubActionsExecution?.blockers || []).filter((entry) => !sharedBlockers.includes(entry));
  const localDispatchBlockers = parsed.localGithubDispatch?.blockers || [];

  const highlightedBlockers = [
    ...sharedBlockers,
    ...localOnlyBlockers,
    ...githubOnlyBlockers,
    ...localDispatchBlockers,
  ].filter((value, index, list) => list.indexOf(value) === index).slice(0, 5);

  const githubFocusedHighlightedBlockers = [
    ...sharedBlockers,
    ...githubOnlyBlockers,
    ...localDispatchBlockers,
  ].filter((value, index, list) => list.indexOf(value) === index).slice(0, 5);

  const githubFocusedNextSteps = (parsed.nextSteps || []).filter((step) => !isLocalOnlyNextStep(step));
  const githubFocusedReady = starterAndInputBlockerCount === 0
    && parsed.githubActionsExecution?.ok === true
    && parsed.localGithubDispatch?.ok === true;

  return {
    ok: true,
    environment,
    status: ready ? "ready" : "blocked",
    githubFocusedStatus: githubFocusedReady ? "ready" : "blocked",
    recommendedPath: parsed.recommendedExecution?.path || "none",
    recommendedReason: parsed.recommendedExecution?.reason || "",
    primaryCommand: parsed.recommendedCommands?.primary || "",
    alternateCommands: parsed.recommendedCommands?.alternates || [],
    starterBlockerCount: parsed.starterSummary?.blockerCount || 0,
    inputBlockerCount: parsed.inputBlockers?.length || 0,
    starterAndInputBlockerCount,
    localExecutionOk: parsed.localExecution?.ok === true,
    localExecutionBlockerCount: parsed.localExecution?.blockerCount || 0,
    githubActionsExecutionOk: parsed.githubActionsExecution?.ok === true,
    githubActionsExecutionBlockerCount: parsed.githubActionsExecution?.blockerCount || 0,
    localGithubDispatchOk: parsed.localGithubDispatch?.ok === true,
    localGithubDispatchBlockerCount: parsed.localGithubDispatch?.blockerCount || 0,
    appConfigSecretFilePresent: parsed.appConfigSecretFilePresent === true,
    warnings: parsed.warnings || [],
    highlightedBlockers,
    githubFocusedHighlightedBlockers,
    nextSteps: parsed.nextSteps || [],
    githubFocusedNextSteps,
  };
}

function uniq(values) {
  return values.filter((value, index) => value && values.indexOf(value) === index);
}

function buildBlockerCategory(environments, predicate) {
  const matching = environments
    .filter(predicate)
    .map((entry) => entry.environment);

  return {
    environmentCount: matching.length,
    environments: matching,
  };
}

function buildCommandSummary(result) {
  const global = result.recommendedNextCommand ? [result.recommendedNextCommand] : [];
  const globalSet = new Set(global);
  const byEnvironment = {};
  const all = [...global];

  result.environments.forEach((environment) => {
    const commands = filterCommandsForIntent([
      environment.primaryCommand,
      ...environment.alternateCommands,
    ], result.deploymentIntent).filter((command) => command && !globalSet.has(command));

    byEnvironment[environment.environment] = commands;
    commands.forEach((command) => {
      if (!all.includes(command)) all.push(command);
    });
  });

  return {
    global,
    all,
    byEnvironment,
  };
}

function renderCommands(result) {
  const lines = [];
  const printedGlobalCommands = new Set();

  if (result.recommendedNextCommand) {
    lines.push(result.recommendedNextCommand);
    printedGlobalCommands.add(result.recommendedNextCommand);
  }

  result.environments.forEach((environment) => {
    const environmentCommands = filterCommandsForIntent([
      environment.primaryCommand,
      ...environment.alternateCommands,
    ], result.deploymentIntent).filter((command) => command && !printedGlobalCommands.has(command));

    if (environmentCommands.length === 0) return;

    if (lines.length > 0) lines.push("");
    lines.push(`# ${environment.environment}`);
    for (const command of environmentCommands) {
      lines.push(command);
    }
  });

  return `${lines.join("\n").trimEnd()}\n`;
}

function renderMarkdown(result) {
  const lines = [
    "# Rollout Status",
    "",
    `- Overall status: ${result.ok ? "ready" : "blocked"}`,
    `- Deployment intent: \`${result.deploymentIntent}\``,
    `- Ready environments: ${result.readyEnvironmentCount}/${result.environmentCount}`,
    `- Blocked environments: ${result.blockedEnvironmentCount}`,
  ];

  if (result.recommendedNextCommand) {
    lines.push(`- Recommended next command: \`${result.recommendedNextCommand}\``);
  }
  if (result.readyEnvironments.length > 0) {
    lines.push(`- Ready environment names: ${result.readyEnvironments.map((name) => `\`${name}\``).join(", ")}`);
  }
  if (result.blockedEnvironments.length > 0) {
    lines.push(`- Blocked environment names: ${result.blockedEnvironments.map((name) => `\`${name}\``).join(", ")}`);
  }
  lines.push(`- Starter/Input blocker environments: ${result.blockerCategories.starterOrInput.environmentCount}`);
  lines.push(`- Local execution blocker environments: ${result.blockerCategories.localExecution.environmentCount}`);
  lines.push(`- GitHub execution blocker environments: ${result.blockerCategories.githubActionsExecution.environmentCount}`);
  lines.push(`- Local GitHub dispatch blocker environments: ${result.blockerCategories.localGithubDispatch.environmentCount}`);
  if (result.ignoredBlockerCategories.length > 0) {
    lines.push(`- Ignored blocker categories: ${result.ignoredBlockerCategories.map((value) => `\`${value}\``).join(", ")}`);
  }
  if (result.overallHighlightedBlockers.length > 0) {
    lines.push("", "## Overall Blockers", "");
    result.overallHighlightedBlockers.forEach((blocker) => lines.push(`- ${blocker}`));
  }
  if (result.recommendedNextSteps.length > 0) {
    lines.push("", "## Overall Next Steps", "");
    result.recommendedNextSteps.forEach((step) => lines.push(`- ${step}`));
  }

  result.environments.forEach((environment) => {
    lines.push("", `## ${environment.environment}`, "");
    lines.push(`- Status: ${environment.status}`);
    lines.push(`- Recommended path: \`${environment.recommendedPath}\``);
    lines.push(`- Reason: ${environment.recommendedReason}`);
    lines.push(`- Starter/Input blockers: ${environment.starterAndInputBlockerCount}`);
    lines.push(`- Local path: ${environment.localExecutionOk ? "ready" : `blocked (${environment.localExecutionBlockerCount})`}`);
    lines.push(`- GitHub Actions path: ${environment.githubActionsExecutionOk ? "ready" : `blocked (${environment.githubActionsExecutionBlockerCount})`}`);
    lines.push(`- Local GitHub dispatch: ${environment.localGithubDispatchOk ? "ready" : `blocked (${environment.localGithubDispatchBlockerCount})`}`);
    lines.push(`- Primary command: \`${environment.primaryCommand}\``);

    if (environment.highlightedBlockers.length > 0) {
      lines.push("- Highlighted blockers:");
      environment.highlightedBlockers.forEach((blocker) => lines.push(`  - ${blocker}`));
    }

    if (environment.nextSteps.length > 0) {
      lines.push("- Next step:");
      lines.push(`  - ${environment.nextSteps[0]}`);
    }
  });

  return `${lines.join("\n").trimEnd()}\n`;
}

function renderText(result) {
  const lines = [
    `Rollout status: ${result.ok ? "ready" : "blocked"}`,
    `Deployment intent: ${result.deploymentIntent}`,
    `Ready environments: ${result.readyEnvironmentCount}/${result.environmentCount}`,
    `Blocked environments: ${result.blockedEnvironmentCount}`,
  ];

  if (result.recommendedNextCommand) {
    lines.push(`Recommended next command: ${result.recommendedNextCommand}`);
  }
  if (result.readyEnvironments.length > 0) {
    lines.push(`Ready environment names: ${result.readyEnvironments.join(", ")}`);
  }
  if (result.blockedEnvironments.length > 0) {
    lines.push(`Blocked environment names: ${result.blockedEnvironments.join(", ")}`);
  }
  lines.push(`Starter/Input blocker environments: ${result.blockerCategories.starterOrInput.environmentCount}`);
  lines.push(`Local execution blocker environments: ${result.blockerCategories.localExecution.environmentCount}`);
  lines.push(`GitHub execution blocker environments: ${result.blockerCategories.githubActionsExecution.environmentCount}`);
  lines.push(`Local GitHub dispatch blocker environments: ${result.blockerCategories.localGithubDispatch.environmentCount}`);
  if (result.ignoredBlockerCategories.length > 0) {
    lines.push(`Ignored blocker categories: ${result.ignoredBlockerCategories.join(", ")}`);
  }
  result.overallHighlightedBlockers.forEach((blocker) => {
    lines.push(`Overall blocker: ${blocker}`);
  });
  result.recommendedNextSteps.forEach((step) => {
    lines.push(`Overall next step: ${step}`);
  });

  result.environments.forEach((environment) => {
    lines.push("");
    lines.push(`[${environment.environment}] ${environment.status}`);
    lines.push(`Recommended path: ${environment.recommendedPath}`);
    lines.push(`Reason: ${environment.recommendedReason}`);
    lines.push(`Starter/Input blockers: ${environment.starterAndInputBlockerCount}`);
    lines.push(`Local path: ${environment.localExecutionOk ? "ready" : `blocked (${environment.localExecutionBlockerCount})`}`);
    lines.push(`GitHub Actions path: ${environment.githubActionsExecutionOk ? "ready" : `blocked (${environment.githubActionsExecutionBlockerCount})`}`);
    lines.push(`Local GitHub dispatch: ${environment.localGithubDispatchOk ? "ready" : `blocked (${environment.localGithubDispatchBlockerCount})`}`);
    lines.push(`Primary command: ${environment.primaryCommand}`);

    environment.highlightedBlockers.forEach((blocker) => {
      lines.push(`Blocker: ${blocker}`);
    });
  });

  return `${lines.join("\n").trimEnd()}\n`;
}

function main() {
  const environmentRootDir = getArg("environment-root-dir");
  const deploymentIntent = normalizeDeploymentIntent(getArg("deployment-intent", "all"));
  const outputMode = getArg("output", "text").toLowerCase();
  const jsonOutput = outputMode === "json";
  const markdownOutput = outputMode === "markdown" || outputMode === "md";
  const commandsOutput = outputMode === "commands" || outputMode === "shell";
  const environmentNames = parseEnvironmentNames();

  const forwardedArgs = {
    "deployment-source": getArg("deployment-source"),
    "github-auth-mode": getArg("github-auth-mode"),
    "region": getArg("region"),
    "api-repo-path": getArg("api-repo-path"),
    "api-repo": getArg("api-repo"),
    "api-ref": getArg("api-ref"),
    "package-manifest-file": getArg("package-manifest-file"),
    "backend-artifact-source-file": getArg("backend-artifact-source-file"),
    "migration-artifact-source-file": getArg("migration-artifact-source-file"),
    "dependencies-layer-source-file": getArg("dependencies-layer-source-file"),
    "sync-app-config-secret": getArg("sync-app-config-secret"),
    "run-api-migrations": getArg("run-api-migrations"),
    "api-migration-action": getArg("api-migration-action"),
    "api-migration-module": getArg("api-migration-module"),
    "verify-http-after-deploy": getArg("verify-http-after-deploy"),
    "account-id": getArg("account-id"),
  };

  if (environmentRootDir && !fs.existsSync(environmentRootDir)) {
    const message = `Environment root directory does not exist: ${environmentRootDir}`;
    if (jsonOutput) {
      process.stdout.write(`${JSON.stringify({ ok: false, errors: [message] }, null, 2)}\n`);
    } else {
      console.error(message);
    }
    process.exit(1);
  }

  const environments = environmentNames.map((environment) => runPlan(environment, {
    environmentRootDir: environmentRootDir ? path.resolve(rootDir, environmentRootDir) : "",
    forwardedArgs,
  }));

  const intentStatusField = deploymentIntent === "github-actions" ? "githubFocusedStatus" : "status";
  const ignoredBlockerCategories = deploymentIntent === "github-actions" ? ["localExecution"] : [];

  const readyEnvironmentCount = environments.filter((entry) => entry[intentStatusField] === "ready").length;
  const blockedEnvironmentCount = environments.length - readyEnvironmentCount;
  const firstBlockedEnvironment = environments.find((entry) => entry[intentStatusField] === "blocked");
  const readyEnvironments = environments.filter((entry) => entry[intentStatusField] === "ready").map((entry) => entry.environment);
  const blockedEnvironments = environments.filter((entry) => entry[intentStatusField] === "blocked").map((entry) => entry.environment);
  const overallHighlightedBlockers = uniq(environments.flatMap((entry) => (
    deploymentIntent === "github-actions" ? (entry.githubFocusedHighlightedBlockers || []) : (entry.highlightedBlockers || [])
  ))).slice(0, 8);
  const recommendedNextSteps = uniq(environments
    .filter((entry) => entry[intentStatusField] === "blocked")
    .map((entry) => (
      deploymentIntent === "github-actions"
        ? (entry.githubFocusedNextSteps?.[0] || entry.nextSteps?.[0] || "")
        : (entry.nextSteps?.[0] || "")
    )))
    .slice(0, 5);
  const blockerCategories = {
    starterOrInput: buildBlockerCategory(environments, (entry) => entry.starterAndInputBlockerCount > 0),
    localExecution: buildBlockerCategory(environments, (entry) => entry.localExecutionOk !== true),
    githubActionsExecution: buildBlockerCategory(environments, (entry) => entry.githubActionsExecutionOk !== true),
    localGithubDispatch: buildBlockerCategory(environments, (entry) => entry.localGithubDispatchOk !== true),
  };
  const intentBlockerCategories = deploymentIntent === "github-actions"
    ? {
      starterOrInput: blockerCategories.starterOrInput,
      githubActionsExecution: blockerCategories.githubActionsExecution,
      localGithubDispatch: blockerCategories.localGithubDispatch,
    }
    : blockerCategories;
  const commandSummary = buildCommandSummary({
    deploymentIntent,
    recommendedNextCommand: firstBlockedEnvironment?.primaryCommand || "",
    environments,
  });

  const result = {
    ok: blockedEnvironmentCount === 0 && environments.every((entry) => entry.ok),
    deploymentIntent,
    ignoredBlockerCategories,
    environmentCount: environments.length,
    readyEnvironmentCount,
    blockedEnvironmentCount,
    readyEnvironments,
    blockedEnvironments,
    recommendedNextCommand: firstBlockedEnvironment?.primaryCommand || "",
    commandSummary,
    blockerCategories,
    intentBlockerCategories,
    overallHighlightedBlockers,
    recommendedNextSteps,
    environments,
  };

  if (jsonOutput) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else if (commandsOutput) {
    process.stdout.write(renderCommands(result));
  } else {
    process.stdout.write(markdownOutput ? renderMarkdown(result) : renderText(result));
  }

  if (!result.ok) {
    process.exit(1);
  }
}

main();
