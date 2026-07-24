import {
  defaultStackNames,
  failText,
  getArg,
  printJson,
  runNodeJson,
} from "./installer-common.mjs";

function main() {
  const environment = getArg("environment", "staging");
  const outputMode = getArg("output", "text").toLowerCase();
  const region = getArg("region", process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1");
  const stackNames = defaultStackNames(environment);

  const verify = runNodeJson("scripts/verify-split-stack.mjs", [
    `--region=${region}`,
    `--backend-stack-name=${getArg("backend-stack-name", stackNames.backend)}`,
    `--frontend-stack-name=${getArg("frontend-stack-name", stackNames.frontend)}`,
    "--check-http=true",
    "--output=json",
  ]);

  if (!verify.parsed) {
    failText(verify.stderr.trim() || "Could not parse split-stack verification output.", outputMode);
  }

  if (outputMode === "json") {
    printJson(verify.parsed);
  } else if (outputMode === "markdown" || outputMode === "md") {
    const lines = [
      `# Installer Verify: ${environment}`,
      "",
      `- Status: ${verify.parsed.ok ? "ok" : "failed"}`,
      `- Region: \`${region}\``,
      `- Backend stack: \`${verify.parsed.backendStackName}\``,
      `- Frontend stack: \`${verify.parsed.frontendStackName}\``,
      "",
      "## Checks",
      "",
    ];
    (verify.parsed.checks || []).forEach((check) => {
      const status = check.skipped ? "SKIP" : check.ok ? "OK" : "FAIL";
      lines.push(`- ${status}: ${check.name} - ${check.detail}`);
    });
    process.stdout.write(`${lines.join("\n")}\n`);
  } else {
    console.log(`Installer verify: ${verify.parsed.ok ? "ok" : "failed"}`);
    (verify.parsed.checks || []).forEach((check) => {
      const status = check.skipped ? "SKIP" : check.ok ? "OK" : "FAIL";
      console.log(`[${status}] ${check.name}: ${check.detail}`);
    });
  }

  process.exit(verify.ok ? 0 : 1);
}

main();
