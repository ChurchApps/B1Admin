import { execFileSync } from "node:child_process";
import path from "node:path";
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

function runAws(args) {
  try {
    return execFileSync("aws", args, {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 10 * 1024 * 1024,
    }).trim();
  } catch (error) {
    const stderr = error && typeof error === "object" && "stderr" in error ? String(error.stderr || "") : "";
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(stderr.trim() || message);
  }
}

function getRole(roleName) {
  try {
    const stdout = runAws(["iam", "get-role", "--role-name", roleName, "--output", "json"]);
    const parsed = JSON.parse(stdout);
    return {
      found: true,
      roleName,
      arn: parsed?.Role?.Arn || "",
    };
  } catch (_error) {
    return {
      found: false,
      roleName,
      arn: "",
    };
  }
}

function listCandidateRoles(projectName, environment) {
  const stdout = runAws(["iam", "list-roles", "--output", "json"]);
  const parsed = JSON.parse(stdout);
  const roles = Array.isArray(parsed?.Roles) ? parsed.Roles : [];
  return roles
    .filter((role) => {
      const name = String(role?.RoleName || "");
      return (
        name.includes(projectName)
        || name.includes(environment)
        || name.includes("github")
        || name.includes("oidc")
        || name.includes("cfn")
      );
    })
    .map((role) => ({
      roleName: role.RoleName,
      arn: role.Arn,
    }));
}

function renderText(result) {
  const lines = [
    `GitHub AWS role discovery: ${result.environment}`,
    `Project: ${result.projectName}`,
    `Suggested deploy role name: ${result.expected.deployRoleName}`,
    `Suggested CloudFormation execution role name: ${result.expected.cfnRoleName}`,
    "",
    `Deploy role: ${result.deployRole.found ? result.deployRole.arn : "not found"}`,
    `CloudFormation execution role: ${result.cfnRole.found ? result.cfnRole.arn : "not found"}`,
  ];

  if (result.deployRole.found || result.cfnRole.found) {
    lines.push("", "GitHub secret commands:");
    if (result.deployRole.found) {
      lines.push(`- gh secret set AWS_ROLE_TO_ASSUME --env aws-${result.environment} --repo <owner>/<repo> --body '${result.deployRole.arn}'`);
    }
    if (result.cfnRole.found) {
      lines.push(`- gh secret set AWS_CLOUDFORMATION_EXECUTION_ROLE_ARN --env aws-${result.environment} --repo <owner>/<repo> --body '${result.cfnRole.arn}'`);
    }
  }

  if (result.candidates.length > 0) {
    lines.push("", "Nearby IAM roles:");
    result.candidates.forEach((candidate) => lines.push(`- ${candidate.roleName} :: ${candidate.arn}`));
  }

  return `${lines.join("\n")}\n`;
}

function renderMarkdown(result) {
  const lines = [
    `# GitHub AWS Role Discovery: ${result.environment}`,
    "",
    `- Project: \`${result.projectName}\``,
    `- Suggested deploy role name: \`${result.expected.deployRoleName}\``,
    `- Suggested CloudFormation execution role name: \`${result.expected.cfnRoleName}\``,
    "",
    "## Resolved Roles",
    "",
    `- Deploy role: ${result.deployRole.found ? `\`${result.deployRole.arn}\`` : "not found"}`,
    `- CloudFormation execution role: ${result.cfnRole.found ? `\`${result.cfnRole.arn}\`` : "not found"}`,
  ];

  if (result.deployRole.found || result.cfnRole.found) {
    lines.push("", "## GitHub Secret Commands", "");
    if (result.deployRole.found) {
      lines.push(`- \`gh secret set AWS_ROLE_TO_ASSUME --env aws-${result.environment} --repo <owner>/<repo> --body '${result.deployRole.arn}'\``);
    }
    if (result.cfnRole.found) {
      lines.push(`- \`gh secret set AWS_CLOUDFORMATION_EXECUTION_ROLE_ARN --env aws-${result.environment} --repo <owner>/<repo> --body '${result.cfnRole.arn}'\``);
    }
  }

  if (result.candidates.length > 0) {
    lines.push("", "## Nearby IAM Roles", "");
    result.candidates.forEach((candidate) => lines.push(`- \`${candidate.roleName}\` :: \`${candidate.arn}\``));
  }

  return `${lines.join("\n")}\n`;
}

function main() {
  const environment = getArg("environment", "staging");
  const projectName = getArg("project-name", "b1admin");
  const output = getArg("output", "text").toLowerCase();

  const expected = {
    deployRoleName: `${projectName}-${environment}-github-deploy`,
    cfnRoleName: `${projectName}-${environment}-cfn-exec`,
  };

  const deployRole = getRole(expected.deployRoleName);
  const cfnRole = getRole(expected.cfnRoleName);
  const candidates = listCandidateRoles(projectName, environment);

  const result = {
    ok: deployRole.found || cfnRole.found,
    environment,
    projectName,
    expected,
    deployRole,
    cfnRole,
    candidates,
  };

  if (output === "json") {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (output === "markdown") {
    process.stdout.write(renderMarkdown(result));
    return;
  }

  process.stdout.write(renderText(result));
}

main();
