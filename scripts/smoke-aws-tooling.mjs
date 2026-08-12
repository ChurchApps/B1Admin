import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jsonOutput = process.argv.includes("--output=json") || (process.argv.includes("--output") && process.argv[process.argv.indexOf("--output") + 1] === "json");
const childProcessTimeoutMs = Number(process.env.SMOKE_CHILD_TIMEOUT_MS || 30000);

function spawnNode(scriptPath, args, env = {}) {
  const result = spawnSync("node", [scriptPath, ...args], {
    cwd: rootDir,
    encoding: "utf8",
    timeout: childProcessTimeoutMs,
    env: {
      ...process.env,
      ...env,
    },
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout || "",
    stderr: `${result.stderr || ""}${result.error ? `\n${result.error.message}` : ""}`,
  };
}

function runCheck(scriptPath) {
  execFileSync("node", ["--check", scriptPath], {
    cwd: rootDir,
    stdio: "pipe",
    encoding: "utf8",
  });
}

function runShellCheck(scriptPath) {
  execFileSync("bash", ["-n", scriptPath], {
    cwd: rootDir,
    stdio: "pipe",
    encoding: "utf8",
  });
}

function runYamlParse(filePath) {
  execFileSync("ruby", ["-e", 'require "psych"; Psych.parse_stream(File.read(ARGV[0]))', filePath], {
    cwd: rootDir,
    stdio: "pipe",
    encoding: "utf8",
  });
}

function sleepMs(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function parseJsonFileWithRetry(filePath, { attempts = 4, retryDelayMs = 50 } = {}) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return JSON.parse(fs.readFileSync(path.join(rootDir, filePath), "utf8"));
    } catch (error) {
      lastError = error;
      const isMissingFile = error && typeof error === "object" && "code" in error && error.code === "ENOENT";
      const isTransientParseFailure = error instanceof SyntaxError;
      const shouldRetry = attempt < attempts && (isMissingFile || isTransientParseFailure);
      if (!shouldRetry) break;
      sleepMs(retryDelayMs);
    }
  }

  throw lastError;
}

function runJsonParse(filePath) {
  parseJsonFileWithRetry(filePath);
}

function readJsonFile(filePath) {
  return parseJsonFileWithRetry(filePath);
}

function listContractCheckedJsonSamples() {
  const smokeSource = fs.readFileSync(fileURLToPath(import.meta.url), "utf8");
  return [...new Set(
    [...smokeSource.matchAll(/readJsonFile\("([^"]+\.sample\.json)"\)/g)].map((match) => match[1]),
  )].sort();
}

function expectJsonExampleContractCoverage(jsonFilesToParse) {
  const inputOnlySamples = [
    "infrastructure/examples/app-config-secret.sample.json",
    "infrastructure/examples/backend-outputs.sample.json",
    "infrastructure/examples/backend-parameters.sample.json",
    "infrastructure/examples/backend-stack-outputs.sample.json",
    "infrastructure/examples/bootstrap-parameters.sample.json",
    "infrastructure/examples/database-secret.sample.json",
    "infrastructure/examples/frontend-outputs.sample.json",
    "infrastructure/examples/frontend-parameters.sample.json",
  ].sort();

  const parsedExampleSamples = jsonFilesToParse
    .filter((filePath) => filePath.startsWith("infrastructure/examples/") && filePath.endsWith(".sample.json"))
    .sort();
  const contractCheckedSamples = listContractCheckedJsonSamples();

  const missingContractCoverage = parsedExampleSamples.filter((filePath) => (
    !contractCheckedSamples.includes(filePath) && !inputOnlySamples.includes(filePath)
  ));
  const staleInputOnlyEntries = inputOnlySamples.filter((filePath) => !parsedExampleSamples.includes(filePath));
  const contractCheckedButUnparsed = contractCheckedSamples.filter((filePath) => !parsedExampleSamples.includes(filePath));

  if (missingContractCoverage.length > 0 || staleInputOnlyEntries.length > 0 || contractCheckedButUnparsed.length > 0) {
    const lines = [];
    if (missingContractCoverage.length > 0) {
      lines.push(`Samples missing contract coverage or input-only classification: ${missingContractCoverage.join(", ")}`);
    }
    if (staleInputOnlyEntries.length > 0) {
      lines.push(`Input-only sample allowlist contains files that are no longer parsed: ${staleInputOnlyEntries.join(", ")}`);
    }
    if (contractCheckedButUnparsed.length > 0) {
      lines.push(`Contract-checked samples are no longer parsed by the smoke suite: ${contractCheckedButUnparsed.join(", ")}`);
    }
    throw new Error(lines.join("\n"));
  }
}

function expectEnvironmentStarterParity() {
  const environmentsRoot = path.join(rootDir, "infrastructure", "environments");
  const environmentNames = fs.readdirSync(environmentsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const requiredEnvironments = ["prod", "staging"];
  const missingEnvironments = requiredEnvironments.filter((name) => !environmentNames.includes(name));
  if (missingEnvironments.length > 0) {
    throw new Error(`Missing expected environment starter directories: ${missingEnvironments.join(", ")}`);
  }

  const fileSets = Object.fromEntries(environmentNames.map((name) => {
    const envDir = path.join(environmentsRoot, name);
    const files = fs.readdirSync(envDir, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .filter((entry) => [
        "app-config-secret.template.json",
        "backend-parameters.json",
        "bootstrap-parameters.json",
        "deploy-split-stack.sh",
        "frontend-parameters.json",
      ].includes(entry.name))
      .map((entry) => entry.name)
      .sort();
    return [name, files];
  }));

  const baseline = fileSets[requiredEnvironments[0]];
  for (const environmentName of requiredEnvironments.slice(1)) {
    const current = fileSets[environmentName];
    const missingFromCurrent = baseline.filter((fileName) => !current.includes(fileName));
    const extraInCurrent = current.filter((fileName) => !baseline.includes(fileName));

    if (missingFromCurrent.length > 0 || extraInCurrent.length > 0) {
      const lines = [`Environment starter kits are out of sync between ${requiredEnvironments[0]} and ${environmentName}.`];
      if (missingFromCurrent.length > 0) {
        lines.push(`${environmentName} is missing: ${missingFromCurrent.join(", ")}`);
      }
      if (extraInCurrent.length > 0) {
        lines.push(`${environmentName} has extra files: ${extraInCurrent.join(", ")}`);
      }
      throw new Error(lines.join("\n"));
    }
  }
}

function expectDeployAwsWorkflowUploadsEvidenceArtifact() {
  const workflowPath = path.join(rootDir, ".github", "workflows", "deploy-aws-self-hosted.yml");
  const workflowText = fs.readFileSync(workflowPath, "utf8");

  const expectedSnippets = [
    "name: Write preflight plan summary",
    "## Preflight Plan",
    "yarn plan:environment-deploy --",
    "preflight-plan.md",
    "preview_only:",
    "PREVIEW_ONLY:",
    "name: Upload deployment evidence",
    "uses: actions/upload-artifact@v4",
    "name: aws-${{ inputs.environment }}-deployment-evidence",
    "path: deployment/${{ inputs.environment }}/",
    "name: Save source metadata",
    "source-metadata.json",
    "name: Upload preflight plan for preview-only run",
    "name: Upload preflight plan on failure",
    "name: aws-${{ inputs.environment }}-preflight-plan",
    "path: deployment/${{ inputs.environment }}/preflight-plan.md",
    "name: Write deployment summary",
    "name: Write preview-only summary",
    "## Preview-Only Result",
    "GITHUB_STEP_SUMMARY",
    "deployment-summary.json",
    "yarn show:deployment-summary -- --summary-file=\"${SUMMARY_FILE}\" --output=markdown",
  ];

  const missing = expectedSnippets.filter((snippet) => !workflowText.includes(snippet));
  if (missing.length > 0) {
    throw new Error(`deploy-aws-self-hosted workflow is missing expected deployment-evidence upload content: ${missing.join(", ")}`);
  }

  const privateWorkflowTemplatePath = path.join(rootDir, "infrastructure", "environments", "private-deployment-workflow.sample.yml");
  const privateWorkflowTemplateText = fs.readFileSync(privateWorkflowTemplatePath, "utf8");
  if (!privateWorkflowTemplateText.includes("ARGS+=(--run-api-migrations=true)")) {
    throw new Error("private deployment workflow template must pass --run-api-migrations=true explicitly so deploy-aws forwards migrations to deploy-backend.");
  }
  if (!privateWorkflowTemplateText.includes("name: Save source metadata")
    || !privateWorkflowTemplateText.includes("source-metadata.json")) {
    throw new Error("private deployment workflow template must save source-metadata.json into deployment evidence.");
  }
}

function expectObjectContainsKeys(name, actual, sample, objectPath = "<root>") {
  if (!actual || typeof actual !== "object" || Array.isArray(actual)) {
    throw new Error(`${name} expected an object at ${objectPath}.`);
  }
  if (!sample || typeof sample !== "object" || Array.isArray(sample)) {
    throw new Error(`${name} sample did not contain an object at ${objectPath}.`);
  }

  const missing = Object.keys(actual).filter((key) => !(key in sample));
  if (missing.length > 0) {
    throw new Error(`${name} sample is missing keys at ${objectPath}: ${missing.join(", ")}`);
  }
}

function canReadFile(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function canReadDirectory(filePath) {
  try {
    fs.readdirSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function addSkippedResults(results, names) {
  names.forEach((name) => {
    results.push({
      name,
      ok: true,
      skipped: true,
    });
  });
}

function parseApiRepoServerlessEnvKeys(filePath) {
  const ruby = `
    require "yaml"
    require "json"
    data = YAML.load_file(ARGV[0])
    provider_env = (data.dig("provider", "environment") || {}).keys
    function_env = (data["functions"] || {}).values.flat_map { |fn| (fn["environment"] || {}).keys }
    puts JSON.generate((provider_env + function_env).uniq.sort)
  `;

  return JSON.parse(execFileSync("ruby", ["-e", ruby, filePath], {
    cwd: rootDir,
    stdio: "pipe",
    encoding: "utf8",
  }));
}

function checkBackendTemplateContainsApiRepoEnvKeys(apiRepoPath) {
  const serverlessPath = path.join(apiRepoPath, "serverless.yml");
  const templatePath = path.join(rootDir, "infrastructure", "cloudformation", "backend-api.yaml");
  const envKeys = parseApiRepoServerlessEnvKeys(serverlessPath);
  const templateText = fs.readFileSync(templatePath, "utf8");
  const missing = envKeys.filter((key) => !templateText.includes(`${key}:`));

  if (missing.length > 0) {
    throw new Error(`backend-api.yaml is missing env keys required by Api/serverless.yml: ${missing.join(", ")}`);
  }
}

function runJsonScript(scriptPath, args) {
  const result = spawnNode(scriptPath, args);

  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  let parsed = null;

  if (stdout.trim() !== "") {
    parsed = JSON.parse(stdout);
  }

  return {
    status: result.status ?? 1,
    stdout,
    stderr,
    parsed,
  };
}

function runJsonScriptWithEnv(scriptPath, args, env) {
  const result = spawnNode(scriptPath, args, env);

  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  let parsed = null;

  if (stdout.trim() !== "") {
    parsed = JSON.parse(stdout);
  }

  return {
    status: result.status ?? 1,
    stdout,
    stderr,
    parsed,
  };
}

function runScript(scriptPath, args) {
  return spawnNode(scriptPath, args);
}

function runScriptWithEnv(scriptPath, args, env) {
  return spawnNode(scriptPath, args, env);
}

function expectOk(name, invocation) {
  const result = runJsonScript("scripts/validate-aws-deploy.mjs", invocation);
  if (result.status !== 0) {
    throw new Error(`${name} failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }
  if (!result.parsed?.ok) {
    throw new Error(`${name} returned ok=false unexpectedly.\nSTDOUT:\n${result.stdout}`);
  }
}

function expectBootstrapValidatorNextStep() {
  const result = runJsonScript("scripts/validate-aws-deploy.mjs", [
    "--mode=bootstrap",
    "--stack-name=example-bootstrap",
    "--parameters-file=infrastructure/examples/bootstrap-parameters.sample.json",
    "--output=json",
  ]);

  if (result.status !== 0 || !result.parsed?.ok) {
    throw new Error(`bootstrap validator next step failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }

  if (result.parsed.stackName !== "example-bootstrap") {
    throw new Error(`bootstrap validator did not preserve stack-name.\nSTDOUT:\n${result.stdout}`);
  }

  if (result.parsed.parametersFile !== "infrastructure/examples/bootstrap-parameters.sample.json") {
    throw new Error(`bootstrap validator did not expose parametersFile cleanly.\nSTDOUT:\n${result.stdout}`);
  }

  const nextStep = result.parsed.nextSteps?.[0] || "";
  const expected = "yarn deploy:bootstrap -- --region=us-east-1 --parameters-file=infrastructure/examples/bootstrap-parameters.sample.json --stack-name=example-bootstrap";
  if (nextStep !== expected) {
    throw new Error(`bootstrap validator next step was not exact.\nExpected:\n${expected}\nActual:\n${nextStep}\nSTDOUT:\n${result.stdout}`);
  }
}

function expectPackageManifestValidatorNextStep() {
  withFakePackageManifest((manifestPath) => {
    const result = runJsonScript("scripts/validate-aws-deploy.mjs", [
      "--mode=backend",
      "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
      `--package-manifest-file=${manifestPath}`,
      "--lambda-code-s3-bucket=my-artifacts-bucket",
      "--output=json",
    ]);

    if (result.status !== 0 || !result.parsed?.ok) {
      throw new Error(`package manifest validator next step failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }

    if (result.parsed.resolved?.packageManifestFile !== manifestPath) {
      throw new Error(`package manifest validator did not expose the resolved manifest path.\nSTDOUT:\n${result.stdout}`);
    }

    const nextStep = result.parsed.nextSteps?.find((step) => String(step).includes("upload:backend-artifact")) || "";
    if (!nextStep.includes(`--source-file=${path.join(path.dirname(manifestPath), "api-test-self-contained.zip")}`)) {
      throw new Error(`package manifest validator next step did not reuse the manifest backend artifact path.\nActual:\n${nextStep}\nSTDOUT:\n${result.stdout}`);
    }
  });
}

function expectPackageManifestValidatorMigrationNextStep() {
  withFakePackageManifest((manifestPath) => {
    const result = runJsonScript("scripts/validate-aws-deploy.mjs", [
      "--mode=backend",
      "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
      `--package-manifest-file=${manifestPath}`,
      "--lambda-code-s3-bucket=my-artifacts-bucket",
      "--run-migrations=true",
      "--migration-handler=index.migrate",
      "--output=json",
    ]);

    if (result.status !== 0 || !result.parsed?.ok) {
      throw new Error(`package manifest validator migration next step failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }

    if (result.parsed.resolved?.migrationArtifactSource !== path.join(path.dirname(manifestPath), "api-test-migrations.zip")) {
      throw new Error(`package manifest validator did not expose the resolved migration artifact path.\nSTDOUT:\n${result.stdout}`);
    }

    const nextStep = result.parsed.nextSteps?.find((step) => String(step).includes('Migration artifact')) || "";
    if (!nextStep.includes(`--source-file=${path.join(path.dirname(manifestPath), "api-test-migrations.zip")}`)) {
      throw new Error(`package manifest validator migration next step did not reuse the manifest migration artifact path.\nActual:\n${nextStep}\nSTDOUT:\n${result.stdout}`);
    }
  }, { includeMigrationArtifact: true });
}

function expectPackageApiBackendJsonIncludesManifestDeployHints() {
  withFakePackagableApiRepo((fakeApiRepoPath) => {
    const outputDir = fs.mkdtempSync(path.join(rootDir, ".tmp-package-output-"));
    const migrationArtifactPath = path.join(outputDir, "api-stage-migrations.zip");

    try {
      fs.writeFileSync(migrationArtifactPath, "fake migration artifact\n");

      const result = runJsonScript("scripts/package-api-backend.mjs", [
        `--api-repo-path=${fakeApiRepoPath}`,
        `--output-dir=${outputDir}`,
        "--project-name=testproj",
        "--environment=stage",
        `--migration-artifact-path=${migrationArtifactPath}`,
        "--build=false",
        "--output=json",
      ]);

      if (result.status !== 0) {
        throw new Error(`package-api-backend json hints failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
      }

      const parsed = result.parsed || {};
      if (parsed.backendArtifactPath !== "api-stage-self-contained.zip") {
        throw new Error(`package-api-backend did not emit a manifest-relative backend artifact path.\nSTDOUT:\n${result.stdout}`);
      }

      if (parsed.recommendedBackendArtifactKey !== "testproj/stage/backend/api.zip") {
        throw new Error(`package-api-backend did not expose the derived backend artifact key.\nSTDOUT:\n${result.stdout}`);
      }

      if (parsed.migrationArtifactPath !== "api-stage-migrations.zip") {
        throw new Error(`package-api-backend did not emit a manifest-relative migration artifact path.\nSTDOUT:\n${result.stdout}`);
      }

      const deployBackend = parsed.recommendedNextSteps?.deployBackend || "";
      if (!deployBackend.includes("--package-manifest-file=")) {
        throw new Error(`package-api-backend did not emit a manifest-driven deploy:backend hint.\nSTDOUT:\n${result.stdout}`);
      }

      const uploadHint = parsed.recommendedNextSteps?.uploadBackendArtifact || "";
      if (!uploadHint.includes("--artifact-key=testproj/stage/backend/api.zip")) {
        throw new Error(`package-api-backend upload hint did not include the derived artifact key.\nSTDOUT:\n${result.stdout}`);
      }

      const uploadMigrationHint = parsed.recommendedNextSteps?.uploadMigrationArtifact || "";
      if (!uploadMigrationHint.includes("--artifact-key=testproj/stage/backend/migrations.zip")) {
        throw new Error(`package-api-backend migration upload hint did not include the derived migration artifact key.\nSTDOUT:\n${result.stdout}`);
      }
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });
}

function expectPackageManifestSampleMatchesContract() {
  const sample = readJsonFile("infrastructure/examples/package-manifest.sample.json");

  withFakePackagableApiRepo((fakeApiRepoPath) => {
    const outputDir = fs.mkdtempSync(path.join(rootDir, ".tmp-package-manifest-contract-"));

    try {
      const result = runJsonScript("scripts/package-api-backend.mjs", [
        `--api-repo-path=${fakeApiRepoPath}`,
        `--output-dir=${outputDir}`,
        "--project-name=b1admin",
        "--environment=prod",
        "--build=false",
        "--output=json",
      ]);

      if (result.status !== 0) {
        throw new Error(`package manifest sample contract run failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
      }

      const actual = result.parsed || {};
      expectObjectContainsKeys("package manifest sample", actual, sample);
      expectObjectContainsKeys("package manifest sample", actual.recommendedNextSteps || {}, sample.recommendedNextSteps || {}, "recommendedNextSteps");

      if (sample.apiRepoPath !== "<api-repo-path>") {
        throw new Error(`package manifest sample should use the <api-repo-path> placeholder.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.backendArtifactPath !== "api-prod-self-contained.zip") {
        throw new Error(`package manifest sample should document the manifest-relative backend artifact path.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.manifestPath !== "package-manifest.sample.json") {
        throw new Error(`package manifest sample should point at the checked sample manifest filename.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.recommendedBackendArtifactKey !== "b1admin/prod/backend/api.zip") {
        throw new Error(`package manifest sample should document the derived backend artifact key.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.recommendedMigrationArtifactKey !== "b1admin/prod/backend/migrations.zip") {
        throw new Error(`package manifest sample should document the derived migration artifact key.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (!String(sample.recommendedNextSteps?.deployBackend || "").includes("--package-manifest-file=infrastructure/artifacts/api/api-prod-self-contained.manifest.json")) {
        throw new Error(`package manifest sample should document the manifest-driven deploy:backend hint.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (!String(sample.recommendedNextSteps?.uploadBackendArtifact || "").includes("--artifact-key=b1admin/prod/backend/api.zip")) {
        throw new Error(`package manifest sample should document the upload helper artifact key hint.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });
}

function expectPackageApiBackendOutputSampleMatchesContract() {
  const sample = readJsonFile("infrastructure/examples/package-api-backend-output.sample.json");

  withFakePackagableApiRepo((fakeApiRepoPath) => {
    const outputDir = fs.mkdtempSync(path.join(rootDir, ".tmp-package-output-contract-"));

    try {
      const result = runJsonScript("scripts/package-api-backend.mjs", [
        `--api-repo-path=${fakeApiRepoPath}`,
        `--output-dir=${outputDir}`,
        "--project-name=b1admin",
        "--environment=prod",
        "--build=false",
        "--output=json",
      ]);

      if (result.status !== 0) {
        throw new Error(`package-api-backend output sample contract run failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
      }

      const actual = result.parsed || {};
      expectObjectContainsKeys("package-api-backend output sample", actual, sample);
      expectObjectContainsKeys(
        "package-api-backend output sample",
        actual.recommendedNextSteps || {},
        sample.recommendedNextSteps || {},
        "recommendedNextSteps",
      );

      if (sample.apiRepoPath !== "<api-repo-path>") {
        throw new Error(`package-api-backend output sample should use the <api-repo-path> placeholder.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.backendArtifactPath !== "api-prod-self-contained.zip") {
        throw new Error(`package-api-backend output sample should document the manifest-relative backend artifact path.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.manifestPath !== "infrastructure/artifacts/api/api-prod-self-contained.manifest.json") {
        throw new Error(`package-api-backend output sample should point at the generated manifest path.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.recommendedBackendArtifactKey !== "b1admin/prod/backend/api.zip") {
        throw new Error(`package-api-backend output sample should document the derived backend artifact key.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.recommendedMigrationArtifactKey !== "b1admin/prod/backend/migrations.zip") {
        throw new Error(`package-api-backend output sample should document the derived migration artifact key.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (!String(sample.recommendedNextSteps?.deployBackend || "").includes("--package-manifest-file=infrastructure/artifacts/api/api-prod-self-contained.manifest.json")) {
        throw new Error(`package-api-backend output sample should document the manifest-driven deploy:backend hint.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (!String(sample.recommendedNextSteps?.uploadBackendArtifact || "").includes("--artifact-key=b1admin/prod/backend/api.zip")) {
        throw new Error(`package-api-backend output sample should document the upload helper artifact key hint.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });
}

function expectAuditEnvironmentStarterOutputSampleMatchesContract() {
  const sample = readJsonFile("infrastructure/examples/audit-environment-starter-output.sample.json");
  let result;
  withRawStarterEnvironment("staging", (tempDir) => {
    result = runJsonScript("scripts/audit-environment-starter.mjs", [
      "--environment=staging",
      `--environment-dir=${tempDir}`,
      "--output=json",
    ]);
  });

  if (result.status !== 1) {
    throw new Error(`audit-environment-starter sample contract run should fail while placeholders remain in staging.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }

  const actual = result.parsed || {};
  expectObjectContainsKeys("audit-environment-starter output sample", actual, sample);

  if (sample.ok !== false || sample.environment !== "staging") {
    throw new Error(`audit-environment-starter output sample should document a non-ready staging starter.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (sample.summary?.placeholderCount !== 5
    || sample.summary?.unsafeDefaultCount !== 10
    || sample.summary?.requiredBlankCount !== 0
    || sample.summary?.optionalBlankCount !== 41) {
    throw new Error(`audit-environment-starter output sample should document the current staging placeholder, starter-default, and optional-blank counts.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
}

function expectAuditEnvironmentStarterMarkdownOutputWorks() {
  let result;
  withRawStarterEnvironment("staging", (tempDir) => {
    result = spawnSync("node", ["scripts/audit-environment-starter.mjs", "--environment=staging", `--environment-dir=${tempDir}`, "--only-blockers=true", "--output=markdown"], {
      cwd: rootDir,
      encoding: "utf8",
    });
  });

  const stdout = result.stdout || "";
  const stderr = result.stderr || "";

  if (result.status !== 1) {
    throw new Error(`audit-environment-starter markdown mode should fail while blockers remain in staging.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`);
  }

  if (!stdout.includes("# Environment Starter Audit: staging")) {
    throw new Error(`audit-environment-starter markdown output is missing the expected title.\nSTDOUT:\n${stdout}`);
  }
  if (!stdout.includes("## Next Steps") || !stdout.includes("## Suggestions") || !stdout.includes("## Findings")) {
    throw new Error(`audit-environment-starter markdown output is missing one or more expected sections.\nSTDOUT:\n${stdout}`);
  }
  if (!stdout.includes("jwtSecret")
    || !stdout.includes("encryptionKey")) {
    throw new Error(`audit-environment-starter markdown output should include the current staging blocker keys.\nSTDOUT:\n${stdout}`);
  }
}

function expectPrepareEnvironmentStarterOutputSampleMatchesContract() {
  const sample = readJsonFile("infrastructure/examples/prepare-environment-starter-output.sample.json");
  const result = runJsonScript("scripts/prepare-environment-starter.mjs", [
    "--environment=staging",
    "--account-id=123456789012",
    "--output=json",
  ]);

  if (result.status !== 0) {
    throw new Error(`prepare-environment-starter output sample contract run failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }

  const actual = result.parsed || {};
  expectObjectContainsKeys("prepare-environment-starter output sample", actual, sample);

  if (sample.ok !== true || sample.environment !== "staging" || sample.write !== false) {
    throw new Error(`prepare-environment-starter output sample should document a staging dry-run result.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (sample.accountId !== "123456789012" || sample.generatedSecrets !== true || sample.usedExistingSecretFile !== false) {
    throw new Error(`prepare-environment-starter output sample should document the expected input identity and secret-generation path.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
}

function expectPrepareEnvironmentStarterCommandsOutputWorks() {
  const result = spawnSync("node", ["scripts/prepare-environment-starter.mjs", "--environment=staging", "--account-id=123456789012", "--output=commands"], {
    cwd: rootDir,
    encoding: "utf8",
  });

  const stdout = result.stdout || "";
  const stderr = result.stderr || "";

  if (result.status !== 0) {
    throw new Error(`prepare-environment-starter commands mode failed unexpectedly.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`);
  }

  const expectedSnippets = [
    "yarn prepare:environment-starter -- --environment=staging --account-id=123456789012 --write=true",
    "yarn audit:environment-starter -- --environment=staging --only-blockers=true",
    "./infrastructure/environments/staging/deploy-split-stack.sh",
  ];

  for (const snippet of expectedSnippets) {
    if (!stdout.includes(snippet)) {
      throw new Error(`prepare-environment-starter commands output is missing expected command: ${snippet}\nSTDOUT:\n${stdout}`);
    }
  }
}

function expectPrepareEnvironmentStarterMarkdownOutputWorks() {
  let result;
  withRawStarterEnvironment("staging", (tempDir) => {
    result = spawnSync("node", ["scripts/prepare-environment-starter.mjs", "--environment=staging", `--environment-dir=${tempDir}`, "--account-id=123456789012", "--output=markdown"], {
      cwd: rootDir,
      encoding: "utf8",
    });
  });

  const stdout = result.stdout || "";
  const stderr = result.stderr || "";

  if (result.status !== 0) {
    throw new Error(`prepare-environment-starter markdown mode failed unexpectedly.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`);
  }

  const expectedSnippets = [
    "# Prepare Environment Starter: staging",
    "## Proposed Changes",
    "## Next Steps",
    "## Recommended Commands",
    "app-config-secret.json",
    "jwtSecret",
  ];

  for (const snippet of expectedSnippets) {
    if (!stdout.includes(snippet)) {
      throw new Error(`prepare-environment-starter markdown output is missing expected content: ${snippet}\nSTDOUT:\n${stdout}`);
    }
  }
}

function expectPrepareEnvironmentStarterWriteModeClearsGeneratedBlockers() {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-prepare-environment-starter-"));

  try {
    for (const fileName of [
      "bootstrap-parameters.json",
      "backend-parameters.json",
      "frontend-parameters.json",
      "app-config-secret.template.json",
    ]) {
      fs.copyFileSync(
        path.join(rootDir, "infrastructure", "environments", "staging", fileName),
        path.join(tempDir, fileName),
      );
    }

    restoreStarterTemplateDefaults(tempDir, "staging");

    const prepareResult = runJsonScript("scripts/prepare-environment-starter.mjs", [
      "--environment=staging",
      `--environment-dir=${tempDir}`,
      "--account-id=123456789012",
      "--write=true",
      "--output=json",
    ]);

    if (prepareResult.status !== 0) {
      throw new Error(`prepare-environment-starter write mode failed unexpectedly.\nSTDOUT:\n${prepareResult.stdout}\nSTDERR:\n${prepareResult.stderr}`);
    }

    if (!fs.existsSync(path.join(tempDir, "app-config-secret.json"))) {
      throw new Error("prepare-environment-starter write mode did not create app-config-secret.json in the target environment directory.");
    }

    const auditResult = runJsonScript("scripts/audit-environment-starter.mjs", [
      "--environment=staging",
      `--environment-dir=${tempDir}`,
      "--only-blockers=true",
      "--output=json",
    ]);

    if (auditResult.status !== 1) {
      throw new Error(`audit-environment-starter should still report starter-default blockers after prepare write mode updates the copied environment.\nSTDOUT:\n${auditResult.stdout}\nSTDERR:\n${auditResult.stderr}`);
    }

    if (auditResult.parsed?.summary?.placeholderCount !== 0) {
      throw new Error(`prepare-environment-starter write mode should clear placeholder blockers in the copied environment.\nSTDOUT:\n${auditResult.stdout}`);
    }

    if (auditResult.parsed?.blockerSummary?.unsafeDefaultCount !== 9 || auditResult.parsed?.blockerSummary?.blockerCount !== 9) {
      throw new Error(`audit-environment-starter should leave only the known starter-default blockers after prepare write mode.\nSTDOUT:\n${auditResult.stdout}`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function expectPrepareEnvironmentStarterWriteModeCanClearStarterDefaults() {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-prepare-environment-complete-"));

  try {
    for (const fileName of [
      "bootstrap-parameters.json",
      "backend-parameters.json",
      "frontend-parameters.json",
      "app-config-secret.template.json",
    ]) {
      fs.copyFileSync(
        path.join(rootDir, "infrastructure", "environments", "staging", fileName),
        path.join(tempDir, fileName),
      );
    }

    restoreStarterTemplateDefaults(tempDir, "staging");

    const prepareResult = runJsonScript("scripts/prepare-environment-starter.mjs", [
      "--environment=staging",
      `--environment-dir=${tempDir}`,
      "--account-id=123456789012",
      "--admin-root-url=https://admin-staging.b1test.org",
      "--cors-origin=https://admin-staging.b1test.org",
      "--content-root-url=https://content-staging.b1test.org",
      "--store-api-url=https://store-staging.b1test.org",
      "--transfer-url=https://transfer-staging.b1test.org",
      "--support-email=support@b1test.org",
      "--support-phone=800-555-0199",
      "--support-site-url=https://support.b1test.org",
      "--website-base-url=https://{subdomain}.staging.b1test.org",
      "--write=true",
      "--output=json",
    ]);

    if (prepareResult.status !== 0) {
      throw new Error(`prepare-environment-starter full write mode failed unexpectedly.\nSTDOUT:\n${prepareResult.stdout}\nSTDERR:\n${prepareResult.stderr}`);
    }

    const auditResult = runJsonScript("scripts/audit-environment-starter.mjs", [
      "--environment=staging",
      `--environment-dir=${tempDir}`,
      "--only-blockers=true",
      "--output=json",
    ]);

    if (auditResult.status !== 0) {
      throw new Error(`audit-environment-starter should report no blockers after prepare write mode receives explicit backend values.\nSTDOUT:\n${auditResult.stdout}\nSTDERR:\n${auditResult.stderr}`);
    }

    if (auditResult.parsed?.blockerSummary?.blockerCount !== 0) {
      throw new Error(`prepare-environment-starter should be able to clear all starter blockers when explicit backend values are provided.\nSTDOUT:\n${auditResult.stdout}`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function expectPrepareEnvironmentStarterRootDomainShortcutWorks() {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-prepare-environment-root-domain-"));

  try {
    for (const fileName of [
      "bootstrap-parameters.json",
      "backend-parameters.json",
      "frontend-parameters.json",
      "app-config-secret.template.json",
    ]) {
      fs.copyFileSync(
        path.join(rootDir, "infrastructure", "environments", "staging", fileName),
        path.join(tempDir, fileName),
      );
    }

    restoreStarterTemplateDefaults(tempDir, "staging");

    const prepareResult = runJsonScript("scripts/prepare-environment-starter.mjs", [
      "--environment=staging",
      `--environment-dir=${tempDir}`,
      "--account-id=123456789012",
      "--root-domain=b1test.org",
      "--support-phone=800-555-0199",
      "--support-site-url=https://support.b1test.org",
      "--write=true",
      "--output=json",
    ]);

    if (prepareResult.status !== 0) {
      throw new Error(`prepare-environment-starter root-domain write mode failed unexpectedly.\nSTDOUT:\n${prepareResult.stdout}\nSTDERR:\n${prepareResult.stderr}`);
    }

    const backend = JSON.parse(fs.readFileSync(path.join(tempDir, "backend-parameters.json"), "utf8"));
    const expected = {
      WebsiteBaseUrl: "https://{subdomain}.b1test.org",
      ContentRootUrl: "https://content-staging.b1test.org",
      B1AdminRootUrl: "https://admin-staging.b1test.org",
      CorsOrigin: "https://admin-staging.b1test.org",
      StoreApiUrl: "https://store-staging.b1test.org",
      TransferUrl: "https://transfer-staging.b1test.org",
      SupportEmail: "support@b1test.org",
    };

    for (const [key, value] of Object.entries(expected)) {
      if (backend[key] !== value) {
        throw new Error(`prepare-environment-starter root-domain shortcut did not derive ${key} correctly.\nBackend:\n${JSON.stringify(backend, null, 2)}`);
      }
    }

    const secret = JSON.parse(fs.readFileSync(path.join(tempDir, "app-config-secret.json"), "utf8"));
    if (secret.webPushSubject !== "mailto:support@b1test.org") {
      throw new Error(`prepare-environment-starter root-domain shortcut did not derive webPushSubject correctly.\nSecret:\n${JSON.stringify(secret, null, 2)}`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function expectPrepareEnvironmentStarterCustomDomainInputsWork() {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-prepare-environment-domains-"));

  try {
    for (const fileName of [
      "bootstrap-parameters.json",
      "backend-parameters.json",
      "frontend-parameters.json",
      "app-config-secret.template.json",
    ]) {
      fs.copyFileSync(
        path.join(rootDir, "infrastructure", "environments", "staging", fileName),
        path.join(tempDir, fileName),
      );
    }

    restoreStarterTemplateDefaults(tempDir, "staging");

    const prepareResult = runJsonScript("scripts/prepare-environment-starter.mjs", [
      "--environment=staging",
      `--environment-dir=${tempDir}`,
      "--frontend-domain=admin-staging.b1test.org",
      "--frontend-certificate-arn=arn:aws:acm:us-east-1:123456789012:certificate/frontend",
      "--frontend-hosted-zone-id=ZFRONTEND123",
      "--api-domain=api-staging.b1test.org",
      "--api-certificate-arn=arn:aws:acm:us-east-1:123456789012:certificate/api",
      "--api-hosted-zone-id=ZAPI123",
      "--write=true",
      "--output=json",
    ]);

    if (prepareResult.status !== 0) {
      throw new Error(`prepare-environment-starter custom-domain write mode failed unexpectedly.\nSTDOUT:\n${prepareResult.stdout}\nSTDERR:\n${prepareResult.stderr}`);
    }

    const backend = JSON.parse(fs.readFileSync(path.join(tempDir, "backend-parameters.json"), "utf8"));
    const frontend = JSON.parse(fs.readFileSync(path.join(tempDir, "frontend-parameters.json"), "utf8"));

    if (frontend.AlternateDomainName !== "admin-staging.b1test.org"
      || frontend.AcmCertificateArn !== "arn:aws:acm:us-east-1:123456789012:certificate/frontend"
      || frontend.HostedZoneId !== "ZFRONTEND123") {
      throw new Error(`prepare-environment-starter did not write the expected frontend custom-domain fields.\nFrontend:\n${JSON.stringify(frontend, null, 2)}`);
    }

    if (backend.ApiCustomDomainName !== "api-staging.b1test.org"
      || backend.ApiCertificateArn !== "arn:aws:acm:us-east-1:123456789012:certificate/api"
      || backend.ApiHostedZoneId !== "ZAPI123"
      || backend.B1AdminRootUrl !== "https://admin-staging.b1test.org"
      || backend.CorsOrigin !== "https://admin-staging.b1test.org") {
      throw new Error(`prepare-environment-starter did not write the expected backend custom-domain fields.\nBackend:\n${JSON.stringify(backend, null, 2)}`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function expectPrepareEnvironmentStarterWriteModeCanSkipSecretFile() {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-prepare-environment-no-secret-"));

  try {
    for (const fileName of [
      "bootstrap-parameters.json",
      "backend-parameters.json",
      "frontend-parameters.json",
      "app-config-secret.template.json",
    ]) {
      fs.copyFileSync(
        path.join(rootDir, "infrastructure", "environments", "staging", fileName),
        path.join(tempDir, fileName),
      );
    }

    restoreStarterTemplateDefaults(tempDir, "staging");

    const prepareResult = runJsonScript("scripts/prepare-environment-starter.mjs", [
      "--environment=staging",
      `--environment-dir=${tempDir}`,
      "--account-id=123456789012",
      "--admin-root-url=https://admin-staging.customer.test",
      "--cors-origin=https://admin-staging.customer.test",
      "--content-root-url=https://content-staging.customer.test",
      "--transfer-url=https://transfer-staging.customer.test",
      "--support-email=support@customer.test",
      "--support-phone=918-994-2638",
      "--support-site-url=https://support-staging.customer.test",
      "--website-base-url=https://{subdomain}.customer.test",
      "--write=true",
      "--write-secret-file=false",
      "--output=json",
    ]);

    if (prepareResult.status !== 0) {
      throw new Error(`prepare-environment-starter no-secret write mode failed unexpectedly.\nSTDOUT:\n${prepareResult.stdout}\nSTDERR:\n${prepareResult.stderr}`);
    }

    if (prepareResult.parsed?.writeSecretFile !== false) {
      throw new Error(`prepare-environment-starter should report writeSecretFile=false when asked to skip secret materialization.\nSTDOUT:\n${prepareResult.stdout}`);
    }

    if (fs.existsSync(path.join(tempDir, "app-config-secret.json"))) {
      throw new Error("prepare-environment-starter should not create app-config-secret.json when --write-secret-file=false is set.");
    }

    const auditResult = runJsonScript("scripts/audit-environment-starter.mjs", [
      "--environment=staging",
      `--environment-dir=${tempDir}`,
      "--only-blockers=true",
      "--output=json",
    ]);

    if (auditResult.status !== 1) {
      throw new Error(`audit-environment-starter should still report the unresolved secret-template blockers when no secret file is written.\nSTDOUT:\n${auditResult.stdout}\nSTDERR:\n${auditResult.stderr}`);
    }

    const secretTemplate = JSON.parse(fs.readFileSync(path.join(tempDir, "app-config-secret.template.json"), "utf8"));
    if (secretTemplate.webPushSubject !== "mailto:support@customer.test") {
      throw new Error(`prepare-environment-starter should update the template webPushSubject when secret materialization is skipped.\nTemplate:\n${JSON.stringify(secretTemplate, null, 2)}`);
    }

    if (auditResult.parsed?.blockerSummary?.blockerCount !== 3) {
      throw new Error(`prepare-environment-starter no-secret write mode should leave only the unresolved store URL plus the two secret placeholders.\nSTDOUT:\n${auditResult.stdout}`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function expectPrepareEnvironmentStarterOptionalPublicFieldsWork() {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-prepare-environment-public-fields-"));

  try {
    for (const fileName of [
      "bootstrap-parameters.json",
      "backend-parameters.json",
      "frontend-parameters.json",
      "app-config-secret.template.json",
    ]) {
      fs.copyFileSync(
        path.join(rootDir, "infrastructure", "environments", "prod", fileName),
        path.join(tempDir, fileName),
      );
    }

    restoreStarterTemplateDefaults(tempDir, "prod");

    const prepareResult = runJsonScript("scripts/prepare-environment-starter.mjs", [
      "--environment=prod",
      `--environment-dir=${tempDir}`,
      "--mobile-app-url=https://customer.test/app",
      "--domain-cname-target=proxy.customer.test",
      "--domain-a-target=3.23.251.61",
      "--default-stock-photo=https://content.customer.test/stockPhotos/default.png",
      "--google-analytics-tag=G-47N4XQJQJ5",
      "--write=true",
      "--write-secret-file=false",
      "--output=json",
    ]);

    if (prepareResult.status !== 0) {
      throw new Error(`prepare-environment-starter optional public fields write mode failed unexpectedly.\nSTDOUT:\n${prepareResult.stdout}\nSTDERR:\n${prepareResult.stderr}`);
    }

    const backend = JSON.parse(fs.readFileSync(path.join(tempDir, "backend-parameters.json"), "utf8"));
    const expected = {
      MobileAppUrl: "https://customer.test/app",
      DomainCnameTarget: "proxy.customer.test",
      DomainATarget: "3.23.251.61",
      DefaultStockPhoto: "https://content.customer.test/stockPhotos/default.png",
      GoogleAnalyticsTag: "G-47N4XQJQJ5",
    };

    for (const [key, value] of Object.entries(expected)) {
      if (backend[key] !== value) {
        throw new Error(`prepare-environment-starter did not write ${key} as expected.\nBackend:\n${JSON.stringify(backend, null, 2)}`);
      }
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function expectPlanEnvironmentDeployOutputSampleMatchesContract() {
  const sample = readJsonFile("infrastructure/examples/plan-environment-deploy-output.sample.json");
  let result;
  withFailingGhForDispatchGithubAwsDeploy((env) => withRawStarterEnvironment("staging", (tempDir) => {
    result = runJsonScriptWithEnv("scripts/plan-environment-deploy.mjs", [
      "--environment=staging",
      `--environment-dir=${tempDir}`,
      "--api-repo-path=.",
      "--output=json",
    ], env);
  }));

  if (sample.localGithubDispatch?.ok !== false
    || sample.localGithubDispatch?.blockerCount !== 1
    || !sample.localGithubDispatch?.blockers?.some((entry) => String(entry).includes("gh auth login -h github.com"))) {
    throw new Error(`plan-environment-deploy output sample should document the local gh auth blocker cleanly.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }

  if (result.status !== 1) {
    throw new Error(`plan-environment-deploy output sample contract run should be blocked while placeholders remain in staging.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }

  const actual = result.parsed || {};
  expectObjectContainsKeys("plan-environment-deploy output sample", actual, sample);

  if (sample.ok !== false || sample.environment !== "staging" || sample.deploymentSource !== "api-repo") {
    throw new Error(`plan-environment-deploy output sample should document a blocked staging api-repo plan.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (!Array.isArray(sample.requiredGithubSecrets) || sample.requiredGithubSecrets[0] !== "AWS_ROLE_TO_ASSUME") {
    throw new Error(`plan-environment-deploy output sample should document the default OIDC secret requirement.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (sample.localExecution?.blockerCount !== 3 || sample.githubActionsExecution?.blockerCount !== 3) {
    throw new Error(`plan-environment-deploy output sample should document the expected shared execution blocker counts.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (sample.starterSummary?.unsafeDefaultCount !== 10 || sample.starterSummary?.blockerCount !== 15) {
    throw new Error(`plan-environment-deploy output sample should document the expected starter blocker totals.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (sample.recommendedExecution?.path !== "none") {
    throw new Error(`plan-environment-deploy output sample should recommend no execution path while shared blockers remain.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (sample.recommendedCommands?.primary !== sample.starterPrepCommands?.dryRun) {
    throw new Error(`plan-environment-deploy output sample should recommend the starter prep dry-run first while shared starter blockers remain.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (!String(sample.commands?.localPreview || "").includes("PREVIEW_ONLY='true'")
    || !String(sample.commands?.githubActionsWrapperPreview || "").includes("--preview-only=true")
    || !String(sample.commands?.githubActionsPreview || "").includes("preview_only='true'")) {
    throw new Error(`plan-environment-deploy output sample should expose local and GitHub preview commands.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (!Array.isArray(sample.recommendedCommands?.alternates)
    || !sample.recommendedCommands.alternates.some((command) => String(command).includes("PREVIEW_ONLY='true'"))
    || !sample.recommendedCommands.alternates.some((command) => String(command).includes("--preview-only=true"))
    || !sample.recommendedCommands.alternates.some((command) => String(command).includes("preview_only='true'"))) {
    throw new Error(`plan-environment-deploy output sample should include preview-mode alternates alongside the live commands.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (!String(sample.starterPrepCommands?.commands || "").includes("prepare:environment-starter")
    || !String(sample.starterPrepCommands?.write || "").includes("--write=true")) {
    throw new Error(`plan-environment-deploy output sample should include the starter prep follow-up commands.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (!String(sample.preflightCommands?.auditStarter || "").includes("audit:environment-starter")
    || !String(sample.preflightCommands?.auditApiRepoContract || "").includes("audit:api-repo-contract")) {
    throw new Error(`plan-environment-deploy output sample should document the expected preflight audit commands.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (!String(sample.postDeployCommands?.verify || "").includes("verify:split-stack") || !String(sample.postDeployCommands?.checklist || "").includes("first-rollout-checklist.md")) {
    throw new Error(`plan-environment-deploy output sample should document the expected post-deploy follow-up commands.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (!String(sample.postDeployCommands?.ensureOutputsDir || "").includes("mkdir -p deployment/staging")
    || !String(sample.postDeployCommands?.saveBackendOutputs || "").includes("mkdir -p deployment/staging && aws cloudformation describe-stacks")
    || !String(sample.postDeployCommands?.saveFrontendOutputs || "").includes("mkdir -p deployment/staging && aws cloudformation describe-stacks")) {
    throw new Error(`plan-environment-deploy output sample should document the expected output-capture commands.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (!String(sample.postDeployCommands?.saveOutputsWithHelper || "").includes("yarn save:split-stack-outputs -- --environment=staging --region=us-east-1")) {
    throw new Error(`plan-environment-deploy output sample should document the helper-based output capture command.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (!String(sample.postDeployCommands?.showSavedSummary || "").includes("yarn show:deployment-summary -- --summary-file=deployment/staging/deployment-summary.json --output=markdown")) {
    throw new Error(`plan-environment-deploy output sample should document the saved-summary render command.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (!String(sample.postDeployCommands?.verifyFromSavedOutputs || "").includes("--backend-outputs-file=deployment/staging/backend-outputs.json")
    || !String(sample.postDeployCommands?.verifyFromSavedOutputsWithHttp || "").includes("--check-http=true")
    || !String(sample.postDeployCommands?.publishFromSavedOutputs || "").includes("--skip-backend --skip-frontend --publish-frontend-assets")
    || !String(sample.postDeployCommands?.publishFrontendAssetsFromSavedOutputs || "").includes("yarn publish:frontend-assets -- --frontend-outputs-file=deployment/staging/frontend-outputs.json")) {
    throw new Error(`plan-environment-deploy output sample should document the expected saved-output reuse commands.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (sample.githubPostDeploy?.artifactName !== "aws-staging-deployment-evidence"
    || sample.githubPostDeploy?.artifactPath !== "deployment/staging/"
    || sample.githubPostDeploy?.failureArtifactName !== "aws-staging-preflight-plan"
    || sample.githubPostDeploy?.failureArtifactPath !== "deployment/staging/preflight-plan.md"
    || !Array.isArray(sample.githubPostDeploy?.summaryIncludes)
    || !sample.githubPostDeploy.summaryIncludes.includes("preflight deploy plan")
    || !sample.githubPostDeploy.summaryIncludes.includes("saved-output follow-up commands")) {
    throw new Error(`plan-environment-deploy output sample should document the expected GitHub post-deploy handoff.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
}

function expectPlanEnvironmentDeployCommandsOutputWorks() {
  let result;
  withRawStarterEnvironment("staging", (tempDir) => {
    result = spawnSync("node", ["scripts/plan-environment-deploy.mjs", "--environment=staging", `--environment-dir=${tempDir}`, "--api-repo-path=.", "--output=commands"], {
      cwd: rootDir,
      encoding: "utf8",
    });
  });

  const stdout = result.stdout || "";
  const stderr = result.stderr || "";

  if (result.status !== 1) {
    throw new Error(`plan-environment-deploy commands mode should be blocked while staging placeholders remain.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`);
  }

  const expectedSnippets = [
    "yarn prepare:environment-starter -- --environment=staging --environment-dir=",
    "--account-id=<aws-account-id> --output=json",
    "--account-id=<aws-account-id> --output=commands",
    "--account-id=<aws-account-id> --write=true",
    "PREVIEW_ONLY='true' ./infrastructure/environments/staging/deploy-split-stack.sh",
    "yarn dispatch:github-aws-deploy -- --environment=staging --deployment-source=api-repo --region=us-east-1 --environment-dir=",
    "--preview-only=true",
    "preview_only='true'",
    "./infrastructure/environments/staging/deploy-split-stack.sh",
    "gh workflow run deploy-aws-self-hosted.yml",
  ];

  const lines = stdout.trim().split("\n");
  if (!lines[0]?.startsWith("yarn prepare:environment-starter -- --environment=staging --environment-dir=")
    || !lines[0]?.endsWith("--account-id=<aws-account-id> --output=json")) {
    throw new Error(`plan-environment-deploy commands output should recommend the starter prep dry-run first while shared starter blockers remain.\nSTDOUT:\n${stdout}`);
  }
  if (!stdout.includes("yarn verify:split-stack -- --region=us-east-1 --backend-stack-name=b1admin-staging-backend --frontend-stack-name=b1admin-staging-frontend")) {
    throw new Error(`plan-environment-deploy commands output should include the post-deploy verification command.\nSTDOUT:\n${stdout}`);
  }
  if (!stdout.includes("yarn save:split-stack-outputs -- --environment=staging --region=us-east-1")) {
    throw new Error(`plan-environment-deploy commands output should include the helper-based output capture command.\nSTDOUT:\n${stdout}`);
  }
  if (!stdout.includes("yarn audit:api-repo-contract -- --api-repo-path=. --output=markdown")) {
    throw new Error(`plan-environment-deploy commands output should include the Api repo contract preflight command.\nSTDOUT:\n${stdout}`);
  }
  if (!stdout.includes("yarn show:deployment-summary -- --summary-file=deployment/staging/deployment-summary.json --output=markdown")) {
    throw new Error(`plan-environment-deploy commands output should include the saved-summary render command.\nSTDOUT:\n${stdout}`);
  }
  if (!stdout.includes("mkdir -p deployment/staging")
    || !stdout.includes("mkdir -p deployment/staging && aws cloudformation describe-stacks --stack-name b1admin-staging-backend --region us-east-1 --output json > deployment/staging/backend-outputs.json")
    || !stdout.includes("mkdir -p deployment/staging && aws cloudformation describe-stacks --stack-name b1admin-staging-frontend --region us-east-1 --output json > deployment/staging/frontend-outputs.json")) {
    throw new Error(`plan-environment-deploy commands output should include the output-capture commands.\nSTDOUT:\n${stdout}`);
  }
  const publishFromSavedOutputsPattern = new RegExp(
    String.raw`yarn deploy:aws -- --region=us-east-1 --project-name=b1admin --environment=staging --frontend-parameters-file=.*frontend-parameters\.json --backend-parameters-file=.*backend-parameters\.json --frontend-outputs-file=deployment/staging/frontend-outputs\.json --backend-outputs-file=deployment/staging/backend-outputs\.json --skip-backend --skip-frontend --publish-frontend-assets`,
  );

  if (!stdout.includes("yarn verify:split-stack -- --region=us-east-1 --backend-outputs-file=deployment/staging/backend-outputs.json --frontend-outputs-file=deployment/staging/frontend-outputs.json")
    || !publishFromSavedOutputsPattern.test(stdout)
    || !stdout.includes("yarn publish:frontend-assets -- --frontend-outputs-file=deployment/staging/frontend-outputs.json --backend-outputs-file=deployment/staging/backend-outputs.json")) {
    throw new Error(`plan-environment-deploy commands output should include the saved-output reuse commands.\nSTDOUT:\n${stdout}`);
  }

  for (const snippet of expectedSnippets) {
    if (!stdout.includes(snippet)) {
      throw new Error(`plan-environment-deploy commands output is missing expected content: ${snippet}\nSTDOUT:\n${stdout}`);
    }
  }
}

function expectInstallerSetupScaffoldsPrivateDeploymentRepo() {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-installer-setup-"));

  try {
    const dryRun = runJsonScript("scripts/setup-private-deployment-repo.mjs", [
      `--deploy-repo-dir=${tempDir}`,
      "--output=json",
    ]);

    if (dryRun.status !== 0 || dryRun.parsed?.write !== false || dryRun.parsed?.writtenCount !== 0 || dryRun.parsed?.plannedCount !== 14) {
      throw new Error(`installer setup dry-run did not report the expected scaffold plan.\nSTDOUT:\n${dryRun.stdout}\nSTDERR:\n${dryRun.stderr}`);
    }

    const writeRun = runJsonScript("scripts/setup-private-deployment-repo.mjs", [
      `--deploy-repo-dir=${tempDir}`,
      "--write=true",
      "--output=json",
    ]);

    if (writeRun.status !== 0 || writeRun.parsed?.write !== true || writeRun.parsed?.writtenCount !== 14) {
      throw new Error(`installer setup write mode did not write the expected scaffold.\nSTDOUT:\n${writeRun.stdout}\nSTDERR:\n${writeRun.stderr}`);
    }
    const safeCommitCommands = writeRun.parsed?.safeCommitCommands || [];
    if (!safeCommitCommands.some((command) => String(command).includes("git add README.md .gitignore .github/workflows/deploy-aws-self-hosted.yml customer-values.sample.json environments"))
      || safeCommitCommands.some((command) => String(command).includes("customer-values.json "))
      || safeCommitCommands.some((command) => String(command).includes("deployment/"))) {
      throw new Error(`installer setup should output safe private repo commit commands that do not stage local secrets or evidence.\nSTDOUT:\n${writeRun.stdout}`);
    }

    const expectedFiles = [
      ".github/workflows/deploy-aws-self-hosted.yml",
      ".gitignore",
      "README.md",
      "customer-values.sample.json",
      "environments/staging/bootstrap-parameters.json",
      "environments/staging/backend-parameters.json",
      "environments/staging/frontend-parameters.json",
      "environments/staging/app-config-secret.template.json",
      "environments/staging/deploy-split-stack.sh",
      "environments/prod/bootstrap-parameters.json",
      "environments/prod/backend-parameters.json",
      "environments/prod/frontend-parameters.json",
      "environments/prod/app-config-secret.template.json",
      "environments/prod/deploy-split-stack.sh",
    ];

    const missing = expectedFiles.filter((fileName) => !fs.existsSync(path.join(tempDir, fileName)));
    if (missing.length > 0) {
      throw new Error(`installer setup scaffold is missing expected files: ${missing.join(", ")}`);
    }

    for (const forbiddenFile of [
      "environments/staging/app-config-secret.json",
      "environments/staging/bootstrap-admin-secret.json",
      "environments/prod/app-config-secret.json",
      "environments/prod/bootstrap-admin-secret.json",
    ]) {
      if (fs.existsSync(path.join(tempDir, forbiddenFile))) {
        throw new Error(`installer setup should not copy local runtime secret files: ${forbiddenFile}`);
      }
    }

    const workflowText = fs.readFileSync(path.join(tempDir, ".github/workflows/deploy-aws-self-hosted.yml"), "utf8");
    if (!workflowText.includes("b1admin_repo:") || !workflowText.includes("b1admin_ref:")) {
      throw new Error("installer setup should copy the private workflow with explicit B1Admin source inputs.");
    }
    if (!workflowText.includes("name: Save deployment evidence")
      || !workflowText.includes("yarn save:split-stack-outputs --")
      || !workflowText.includes("name: Write deployment summary")
      || !workflowText.includes("deployment-summary.json")) {
      throw new Error("installer setup should copy a private workflow that saves and summarizes deployment evidence before uploading artifacts.");
    }

    const gitignoreText = fs.readFileSync(path.join(tempDir, ".gitignore"), "utf8");
    if (!gitignoreText.includes("environments/*/app-config-secret.json")
      || !gitignoreText.includes("environments/*/bootstrap-admin-secret.json")
      || !gitignoreText.includes("customer-values.json")) {
      throw new Error("installer setup should create a private repo .gitignore that protects runtime secret files.");
    }

    const readmeText = fs.readFileSync(path.join(tempDir, "README.md"), "utf8");
    if (!readmeText.includes("pauses before approval steps")
      || !readmeText.includes(`yarn installer:init -- --deploy-repo-dir=${tempDir} --output=markdown`)
      || !readmeText.includes("yarn installer:customer-values")
      || !readmeText.includes("yarn installer:run")
      || !readmeText.includes(`--deploy-env-dir=${path.join(tempDir, "environments")}`)
      || !readmeText.includes(`--deployment-root=${path.join(tempDir, "deployment")}`)
      || !readmeText.includes("Smallest AWS footprint: deploy prod first and skip staging")
      || !readmeText.includes("--environment=prod")
      || !readmeText.includes("Optional practice deployment")
      || !readmeText.includes("Do not commit `customer-values.json`, `app-config-secret.json`, `bootstrap-admin-secret.json`, or `deployment/`")
      || !readmeText.includes("installer stores downloaded workflow evidence, browser-smoke results, and the final report")
      || !readmeText.includes("git add README.md .gitignore .github/workflows/deploy-aws-self-hosted.yml customer-values.sample.json environments")
      || !readmeText.includes("Use `yarn installer:doctor")) {
      throw new Error(`installer setup private README should keep the operator on the guided path.\n${readmeText}`);
    }

    const customerFilePath = path.join(tempDir, "customer-values.json");
    fs.copyFileSync(path.join(tempDir, "customer-values.sample.json"), customerFilePath);
    const customerValues = JSON.parse(fs.readFileSync(customerFilePath, "utf8"));
    fs.writeFileSync(customerFilePath, `${JSON.stringify({
      ...customerValues,
      accountId: "123456789012",
      repo: "example/b1admin-deploy",
      rootDomain: "customer.test",
      supportEmail: "support@customer.test",
      supportPhone: "111-222-3333",
    }, null, 2)}\n`);

    const audit = runJsonScript("scripts/audit-environment-starter.mjs", [
      "--environment=staging",
      `--environment-dir=${path.join(tempDir, "environments", "staging")}`,
      "--only-blockers=true",
      "--output=json",
    ]);

    if (audit.status !== 1 || audit.parsed?.blockerSummary?.blockerCount !== 15) {
      throw new Error(`installer setup should scaffold raw starters with expected first-run blockers.\nSTDOUT:\n${audit.stdout}\nSTDERR:\n${audit.stderr}`);
    }

    const configured = runJsonScript("scripts/installer-configure.mjs", [
      "--environment=staging",
      `--environment-dir=${path.join(tempDir, "environments", "staging")}`,
      `--customer-file=${customerFilePath}`,
      "--write=true",
      "--output=json",
    ]);

    if (configured.status !== 0 || configured.parsed?.auditBlockerCount !== 0) {
      throw new Error(`installer configure should clear generated staging blockers.\nSTDOUT:\n${configured.stdout}\nSTDERR:\n${configured.stderr}`);
    }

    const appConfigPreview = runJsonScript("scripts/installer-app-config-secret.mjs", [
      "--environment=staging",
      `--environment-dir=${path.join(tempDir, "environments", "staging")}`,
      `--customer-file=${customerFilePath}`,
      "--output=json",
    ]);

    if (appConfigPreview.status !== 0 || !["preview", "reuse-existing"].includes(appConfigPreview.parsed?.fileAction)) {
      throw new Error(`installer app-config secret preview should report whether it would create or reuse the local secret file.\nSTDOUT:\n${appConfigPreview.stdout}\nSTDERR:\n${appConfigPreview.stderr}`);
    }

    const appConfigWrite = runJsonScript("scripts/installer-app-config-secret.mjs", [
      "--environment=staging",
      `--environment-dir=${path.join(tempDir, "environments", "staging")}`,
      `--customer-file=${customerFilePath}`,
      "--write=true",
      "--output=json",
    ]);

    const appConfigSecretPath = path.join(tempDir, "environments", "staging", "app-config-secret.json");
    const appConfigSecret = JSON.parse(fs.readFileSync(appConfigSecretPath, "utf8"));
    if (appConfigWrite.status !== 0
      || !["created", "kept-existing"].includes(appConfigWrite.parsed?.fileAction)
      || String(appConfigSecret.jwtSecret).startsWith("replace-me")
      || String(appConfigSecret.encryptionKey).startsWith("replace-me")
      || appConfigSecret.webPushSubject !== "mailto:support@customer.test") {
      throw new Error(`installer app-config secret write should create a usable gitignored secret JSON.\nSTDOUT:\n${appConfigWrite.stdout}\nSTDERR:\n${appConfigWrite.stderr}`);
    }

    const appConfigGithubPreview = runJsonScript("scripts/installer-app-config-secret.mjs", [
      "--environment=staging",
      `--environment-dir=${path.join(tempDir, "environments", "staging")}`,
      "--repo=example/b1admin-deploy",
      "--sync-github-secret=true",
      "--skip-gh-auth-check=true",
      "--output=json",
    ]);

    if (appConfigGithubPreview.status !== 0
      || appConfigGithubPreview.parsed?.githubSync?.action !== "validated"
      || appConfigGithubPreview.parsed?.githubSync?.secretName !== "AWS_APP_CONFIG_SECRET_JSON"
      || !String(appConfigGithubPreview.parsed?.githubSync?.commandPreview || "").includes("gh secret set")) {
      throw new Error(`installer app-config secret should dry-run GitHub secret sync without touching GitHub.\nSTDOUT:\n${appConfigGithubPreview.stdout}\nSTDERR:\n${appConfigGithubPreview.stderr}`);
    }

    const awsPreflightSkipped = runJsonScript("scripts/installer-aws-preflight.mjs", [
      "--environment=staging",
      `--environment-dir=${path.join(tempDir, "environments", "staging")}`,
      "--skip-aws-check=true",
      "--output=json",
    ]);

    if (awsPreflightSkipped.status !== 0 || awsPreflightSkipped.parsed?.ok !== true || awsPreflightSkipped.parsed?.skipped !== true) {
      throw new Error(`installer aws preflight should support an explicit offline skip mode.\nSTDOUT:\n${awsPreflightSkipped.stdout}\nSTDERR:\n${awsPreflightSkipped.stderr}`);
    }

    const frontendParamsPath = path.join(tempDir, "environments", "staging", "frontend-parameters.json");
    const frontendParams = JSON.parse(fs.readFileSync(frontendParamsPath, "utf8"));
    fs.writeFileSync(frontendParamsPath, `${JSON.stringify({
      ...frontendParams,
      AlternateDomainName: "admin-staging.customer.test",
      AcmCertificateArn: "arn:aws:acm:us-west-2:123456789012:certificate/example",
      HostedZoneId: "Z1234567890",
    }, null, 2)}\n`);

    const badCertificate = runJsonScript("scripts/installer-aws-preflight.mjs", [
      "--environment=staging",
      `--environment-dir=${path.join(tempDir, "environments", "staging")}`,
      "--skip-aws-identity-check=true",
      "--skip-aws-resource-lookups=true",
      "--output=json",
    ]);

    if (badCertificate.status === 0 || badCertificate.parsed?.ok !== false || !String(JSON.stringify(badCertificate.parsed)).includes("CloudFront requires the frontend ACM certificate in us-east-1")) {
      throw new Error(`installer aws preflight should block frontend certs outside us-east-1.\nSTDOUT:\n${badCertificate.stdout}\nSTDERR:\n${badCertificate.stderr}`);
    }

    fs.writeFileSync(frontendParamsPath, `${JSON.stringify(frontendParams, null, 2)}\n`);

    const preflight = runJsonScript("scripts/installer-preflight.mjs", [
      "--environment=staging",
      `--environment-dir=${path.join(tempDir, "environments", "staging")}`,
      "--repo=example/b1admin-deploy",
      "--skip-github-repo-check=true",
      "--skip-aws-check=true",
      "--output=json",
    ]);

    if (preflight.status !== 0 || preflight.parsed?.ok !== true || preflight.parsed?.starterBlockers !== 0) {
      throw new Error(`installer preflight should pass for a configured private staging starter when repo lookup is skipped.\nSTDOUT:\n${preflight.stdout}\nSTDERR:\n${preflight.stderr}`);
    }

    const deployDryRun = runJsonScript("scripts/installer-deploy.mjs", [
      "--environment=staging",
      `--environment-dir=${path.join(tempDir, "environments", "staging")}`,
      "--repo=example/b1admin-deploy",
      "--skip-github-repo-check=true",
      "--skip-gh-auth-check=true",
      "--skip-aws-check=true",
      "--dry-run=true",
      "--output=json",
    ]);

    if (deployDryRun.status !== 0 || deployDryRun.parsed?.action !== "validated" || deployDryRun.parsed?.dispatch?.previewOnly !== true) {
      throw new Error(`installer deploy dry-run should validate a preview workflow dispatch without touching GitHub.\nSTDOUT:\n${deployDryRun.stdout}\nSTDERR:\n${deployDryRun.stderr}`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function expectInstallerInitCreatesGuidedStartingPoint() {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-installer-init-"));

  try {
    const result = runJsonScript("scripts/installer-init.mjs", [
      `--deploy-repo-dir=${tempDir}`,
      "--output=json",
    ]);

    if (result.status !== 0
      || result.parsed?.ok !== true
      || !fs.existsSync(path.join(tempDir, ".github", "workflows", "deploy-aws-self-hosted.yml"))
      || !fs.existsSync(path.join(tempDir, "customer-values.json"))
      || !String(result.parsed?.nextCommand || "").includes("installer:customer-values")
      || !String(result.parsed?.nextCommand || "").includes("installer:run")
      || !String(result.parsed?.nextCommand || "").includes(`--deploy-repo-dir=${tempDir}`)
      || !String(result.parsed?.nextCommand || "").includes(`--deploy-env-dir=${path.join(tempDir, "environments")}`)
      || !String(result.parsed?.nextCommand || "").includes(`--deployment-root=${path.join(tempDir, "deployment")}`)
      || !String(result.parsed?.nextCommand || "").includes("--environment=prod")
      || !String(result.parsed?.nextCommand || "").includes("Optional practice deployment")
      || !result.parsed?.safeCommitCommands?.some((command) => String(command).includes("git add README.md .gitignore .github/workflows/deploy-aws-self-hosted.yml customer-values.sample.json environments"))
      || result.parsed?.safeCommitCommands?.some((command) => String(command).includes("customer-values.json "))
      || result.parsed?.safeCommitCommands?.some((command) => String(command).includes("deployment/"))) {
      throw new Error(`installer init should scaffold the private repo, create customer-values.json, and recommend installer:run.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }

    const customerFile = path.join(tempDir, "customer-values.json");
    fs.writeFileSync(customerFile, `${JSON.stringify({ sentinel: "keep-me" }, null, 2)}\n`);

    const rerun = runJsonScript("scripts/installer-init.mjs", [
      `--deploy-repo-dir=${tempDir}`,
      "--output=json",
    ]);
    const customerValues = JSON.parse(fs.readFileSync(customerFile, "utf8"));

    if (rerun.status !== 0
      || customerValues.sentinel !== "keep-me"
      || !String(rerun.parsed?.actions?.find((action) => action.label === "Customer values file")?.detail || "").includes("not overwritten")) {
      throw new Error(`installer init should preserve an existing customer-values.json.\nSTDOUT:\n${rerun.stdout}\nSTDERR:\n${rerun.stderr}`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function expectInstallerCustomerValuesWritesGuidedAnswers() {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-installer-customer-values-"));
  const customerFile = path.join(tempDir, "customer-values.json");

  try {
    const result = runJsonScript("scripts/installer-customer-values.mjs", [
      `--customer-file=${customerFile}`,
      "--interactive=false",
      "--write=true",
      "--aws-region=us-east-1",
      "--account-id=123456789012",
      "--repo=example/b1admin-deploy",
      "--root-domain=customer.test",
      "--support-email=support@customer.test",
      "--support-phone=111-222-3333",
      "--first-admin-email=admin@customer.test",
      "--first-admin-password=Use-Once-2638!",
      "--first-church-name=Customer Church",
      "--prod-frontend-domain=admin.customer.test",
      "--prod-frontend-certificate-arn=arn:aws:acm:us-east-1:123456789012:certificate/example",
      "--prod-frontend-hosted-zone-id=Z123EXAMPLE",
      "--output=json",
    ]);

    const values = JSON.parse(fs.readFileSync(customerFile, "utf8"));
    if (result.status !== 0
      || result.parsed?.ok !== true
      || values.accountId !== "123456789012"
      || values.repo !== "example/b1admin-deploy"
      || values.firstChurchName !== "Customer Church"
      || values.environments?.prod?.frontendDomain !== "admin.customer.test"
      || values.environments?.staging?.frontendDomain !== "") {
      throw new Error(`installer customer-values should write answers into the local customer file.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function expectInstallerRunExecutesGuidedStep() {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-installer-run-"));

  try {
    const setup = runJsonScript("scripts/setup-private-deployment-repo.mjs", [
      `--deploy-repo-dir=${tempDir}`,
      "--write=true",
      "--output=json",
    ]);
    if (setup.status !== 0) {
      throw new Error(`installer run fixture setup failed.\nSTDOUT:\n${setup.stdout}\nSTDERR:\n${setup.stderr}`);
    }

    const result = runJsonScript("scripts/installer-run.mjs", [
      `--deploy-repo-dir=${tempDir}`,
      `--deploy-env-dir=${path.join(tempDir, "environments")}`,
      `--customer-file=${path.join(tempDir, "customer-values.json")}`,
      "--yes=true",
      "--max-steps=1",
      "--output=json",
    ]);

    if (result.status !== 0
      || result.parsed?.complete !== false
      || result.parsed?.history?.[0]?.action !== "run"
      || !fs.existsSync(path.join(tempDir, "customer-values.json"))) {
      throw new Error(`installer run should execute the first safe guided step.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function expectInstallerUpdateDryRun() {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-installer-update-"));

  try {
    const result = runJsonScript("scripts/installer-update.mjs", [
      `--deploy-repo-dir=${tempDir}`,
      `--deploy-env-dir=${path.join(tempDir, "environments")}`,
      `--deployment-root=${path.join(tempDir, "deployment")}`,
      `--customer-file=${path.join(tempDir, "customer-values.json")}`,
      "--environment=prod",
      "--dry-run=true",
      "--skip-pull=true",
      "--skip-private-commit=true",
      "--output=json",
    ]);

    if (result.status !== 0
      || result.parsed?.ok !== true
      || result.parsed?.history?.[0]?.action !== "installer-init"
      || result.parsed?.history?.[1]?.action !== "installer-run"
      || result.parsed?.history?.some((entry) => entry.action === "git-pull")) {
      throw new Error(`installer update dry-run should plan scaffold refresh and guided deploy without pulling source.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function gitCommitAllFixture(repoDir) {
  const runGit = (args) => {
    const result = spawnSync("git", args, { cwd: repoDir, encoding: "utf8", timeout: childProcessTimeoutMs });
    return { status: result.status ?? 1, stdout: result.stdout || "", stderr: result.stderr || "" };
  };
  const requireGit = (args) => {
    const result = runGit(args);
    if (result.status !== 0) throw new Error(`fixture git ${args.join(" ")} failed: ${result.stderr}`);
    return result;
  };

  if (!fs.existsSync(path.join(repoDir, ".git"))) {
    requireGit(["init", "-b", "main"]);
    requireGit(["config", "user.email", "smoke@example.com"]);
    requireGit(["config", "user.name", "Smoke Fixture"]);
    const remoteDir = path.join(repoDir, ".remote.git");
    const bare = spawnSync("git", ["init", "--bare", remoteDir], { encoding: "utf8", timeout: childProcessTimeoutMs });
    if ((bare.status ?? 1) !== 0) throw new Error(`fixture bare git init failed: ${bare.stderr}`);
    fs.appendFileSync(path.join(repoDir, ".gitignore"), "\n/.remote.git/\n");
    requireGit(["remote", "add", "origin", remoteDir]);
  }

  requireGit(["add", "-A"]);
  const commit = runGit(["commit", "-m", "fixture commit"]);
  if (commit.status !== 0 && !/nothing to commit/.test(`${commit.stdout}${commit.stderr}`)) {
    throw new Error(`fixture git commit failed: ${commit.stderr || commit.stdout}`);
  }
  requireGit(["push", "-u", "origin", "HEAD"]);
}

function expectInstallerStartRecommendsNextStep() {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-installer-start-"));
  const nodeModulesDir = path.join(rootDir, "node_modules");
  const viteCliPath = path.join(nodeModulesDir, "vite", "dist", "node", "cli.js");
  const hadNodeModules = fs.existsSync(nodeModulesDir);
  const hadViteCli = fs.existsSync(viteCliPath);

  try {
    const noScaffoldDir = path.join(tempDir, "empty-deploy-repo");
    const noScaffold = runJsonScript("scripts/installer-start.mjs", [
      `--deploy-repo-dir=${noScaffoldDir}`,
      `--deploy-env-dir=${path.join(noScaffoldDir, "environments")}`,
      `--customer-file=${path.join(noScaffoldDir, "customer-values.json")}`,
      "--environment=staging",
      "--output=json",
    ]);
    if (noScaffold.status !== 0 || !String(noScaffold.parsed?.nextCommand || "").includes("installer:init")) {
      throw new Error(`installer start should recommend scaffolding before copying a missing customer sample.\nSTDOUT:\n${noScaffold.stdout}\nSTDERR:\n${noScaffold.stderr}`);
    }

    const defaultEnvironment = runJsonScript("scripts/installer-start.mjs", [
      `--deploy-repo-dir=${noScaffoldDir}`,
      `--deploy-env-dir=${path.join(noScaffoldDir, "environments")}`,
      `--customer-file=${path.join(noScaffoldDir, "customer-values.json")}`,
      "--output=json",
    ]);
    if (defaultEnvironment.status !== 0 || defaultEnvironment.parsed?.environment !== "prod") {
      throw new Error(`installer start should default to prod for the smaller AWS footprint path.\nSTDOUT:\n${defaultEnvironment.stdout}\nSTDERR:\n${defaultEnvironment.stderr}`);
    }

    const setup = runJsonScript("scripts/setup-private-deployment-repo.mjs", [
      `--deploy-repo-dir=${tempDir}`,
      "--write=true",
      "--output=json",
    ]);
    if (setup.status !== 0) {
      throw new Error(`installer start fixture setup failed.\nSTDOUT:\n${setup.stdout}\nSTDERR:\n${setup.stderr}`);
    }

    const missingCustomer = runJsonScript("scripts/installer-start.mjs", [
      `--deploy-repo-dir=${tempDir}`,
      `--deploy-env-dir=${path.join(tempDir, "environments")}`,
      `--customer-file=${path.join(tempDir, "customer-values.json")}`,
      "--environment=staging",
      "--output=json",
    ]);

    if (missingCustomer.status !== 0 || !String(missingCustomer.parsed?.nextCommand || "").startsWith("cp ")) {
      throw new Error(`installer start should recommend creating customer-values.json first.\nSTDOUT:\n${missingCustomer.stdout}\nSTDERR:\n${missingCustomer.stderr}`);
    }

    const customerFilePath = path.join(tempDir, "customer-values.json");
    const sample = JSON.parse(fs.readFileSync(path.join(tempDir, "customer-values.sample.json"), "utf8"));
    fs.writeFileSync(customerFilePath, `${JSON.stringify(sample, null, 2)}\n`);

    const blankCustomer = runJsonScript("scripts/installer-start.mjs", [
      `--deploy-repo-dir=${tempDir}`,
      `--deploy-env-dir=${path.join(tempDir, "environments")}`,
      `--customer-file=${customerFilePath}`,
      "--environment=staging",
      "--output=json",
    ]);

    if (blankCustomer.status !== 0
      || !String(blankCustomer.parsed?.nextCommand || "").includes("installer:customer-values")
      || blankCustomer.parsed?.checks?.find((check) => check.label === "Core customer values")?.ok !== false) {
      throw new Error(`installer start should not treat blank/sample customer values as ready.\nSTDOUT:\n${blankCustomer.stdout}\nSTDERR:\n${blankCustomer.stderr}`);
    }

    fs.writeFileSync(customerFilePath, `${JSON.stringify({
      ...sample,
      accountId: "999888777666",
      repo: "acme-church/b1admin-deploy",
      rootDomain: "acmechurch.org",
      supportEmail: "support@acmechurch.org",
      supportPhone: "918-555-2638",
      firstAdminEmail: "",
      firstAdminPassword: "",
      firstChurchName: "",
    }, null, 2)}\n`);

    const withCustomer = runJsonScript("scripts/installer-start.mjs", [
      `--deploy-repo-dir=${tempDir}`,
      `--deploy-env-dir=${path.join(tempDir, "environments")}`,
      `--customer-file=${customerFilePath}`,
      "--environment=staging",
      "--output=json",
    ]);

    if (withCustomer.status !== 0
      || !String(withCustomer.parsed?.nextCommand || "").includes("installer:aws-handoff")
      || withCustomer.parsed?.deploymentRoot !== path.relative(rootDir, path.join(tempDir, "deployment"))
      || !withCustomer.parsed?.checks?.some((check) => check.label === "Core customer values" && check.ok === true)) {
      throw new Error(`installer start should use customer-values.json and recommend the IAM handoff next.\nSTDOUT:\n${withCustomer.stdout}\nSTDERR:\n${withCustomer.stderr}`);
    }

    const deploymentRoot = path.join(tempDir, "deployment");
    const startArgs = [
      `--deploy-repo-dir=${tempDir}`,
      `--deploy-env-dir=${path.join(tempDir, "environments")}`,
      `--deployment-root=${deploymentRoot}`,
      `--customer-file=${customerFilePath}`,
      "--environment=staging",
      "--output=json",
    ];

    const handoff = runJsonScript("scripts/installer-aws-handoff.mjs", [
      `--customer-file=${customerFilePath}`,
      `--deploy-repo-dir=${tempDir}`,
      "--write=true",
      "--output=json",
    ]);
    if (handoff.status !== 0) {
      throw new Error(`installer start fixture handoff failed.\nSTDOUT:\n${handoff.stdout}\nSTDERR:\n${handoff.stderr}`);
    }

    const needsIamApply = runJsonScript("scripts/installer-start.mjs", startArgs);
    if (needsIamApply.status !== 0 || !String(needsIamApply.parsed?.nextCommand || "").includes("--apply=true")) {
      throw new Error(`installer start should recommend creating the IAM roles after the handoff files exist.\nSTDOUT:\n${needsIamApply.stdout}\nSTDERR:\n${needsIamApply.stderr}`);
    }

    fs.mkdirSync(path.join(tempDir, "iam", "staging"), { recursive: true });
    fs.writeFileSync(path.join(tempDir, "iam", "staging", "apply-result.json"), JSON.stringify({ ok: true }, null, 2));

    const configure = runJsonScript("scripts/installer-configure.mjs", [
      "--environment=staging",
      `--environment-dir=${path.join(tempDir, "environments", "staging")}`,
      `--customer-file=${customerFilePath}`,
      "--write=true",
      "--output=json",
    ]);
    if (configure.status !== 0) {
      throw new Error(`installer start fixture configure failed.\nSTDOUT:\n${configure.stdout}\nSTDERR:\n${configure.stderr}`);
    }

    const appConfig = runJsonScript("scripts/installer-app-config-secret.mjs", [
      "--environment=staging",
      `--environment-dir=${path.join(tempDir, "environments", "staging")}`,
      `--customer-file=${customerFilePath}`,
      "--write=true",
      "--output=json",
    ]);
    if (appConfig.status !== 0) {
      throw new Error(`installer start fixture app-config failed.\nSTDOUT:\n${appConfig.stdout}\nSTDERR:\n${appConfig.stderr}`);
    }

    const needsCommit = runJsonScript("scripts/installer-start.mjs", startArgs);
    if (needsCommit.status !== 0 || !String(needsCommit.parsed?.nextCommand || "").includes("installer:commit")) {
      throw new Error(`installer start should recommend syncing the private repository after local files change.\nSTDOUT:\n${needsCommit.stdout}\nSTDERR:\n${needsCommit.stderr}`);
    }
    gitCommitAllFixture(tempDir);

    const needsGithubReadiness = runJsonScript("scripts/installer-start.mjs", startArgs);
    if (needsGithubReadiness.status !== 0 || !String(needsGithubReadiness.parsed?.nextCommand || "").includes("installer:github-readiness")) {
      throw new Error(`installer start should recommend GitHub readiness after local setup is complete.\nSTDOUT:\n${needsGithubReadiness.stdout}\nSTDERR:\n${needsGithubReadiness.stderr}`);
    }

    const stagingEvidenceDir = path.join(deploymentRoot, "staging");
    fs.mkdirSync(stagingEvidenceDir, { recursive: true });
    fs.writeFileSync(path.join(stagingEvidenceDir, "github-readiness.json"), JSON.stringify({ ok: false }, null, 2));
    const failedGithubReadiness = runJsonScript("scripts/installer-start.mjs", startArgs);
    if (failedGithubReadiness.status !== 0
      || !String(failedGithubReadiness.parsed?.nextCommand || "").includes("installer:github-setup")
      || !String(failedGithubReadiness.parsed?.nextCommand || "").includes("--write=true")
      || !String(failedGithubReadiness.parsed?.nextCommand || "").includes("--write-secrets=true")) {
      throw new Error(`installer start should recommend GitHub setup when readiness evidence is not clean.\nSTDOUT:\n${failedGithubReadiness.stdout}\nSTDERR:\n${failedGithubReadiness.stderr}`);
    }

    fs.writeFileSync(path.join(stagingEvidenceDir, "github-readiness.json"), JSON.stringify({ ok: true }, null, 2));

    const needsPreflight = runJsonScript("scripts/installer-start.mjs", startArgs);
    if (needsPreflight.status !== 0 || !String(needsPreflight.parsed?.nextCommand || "").includes("installer:preflight")) {
      throw new Error(`installer start should recommend preflight after GitHub readiness evidence exists.\nSTDOUT:\n${needsPreflight.stdout}\nSTDERR:\n${needsPreflight.stderr}`);
    }

    fs.writeFileSync(path.join(stagingEvidenceDir, "preflight-readiness.json"), JSON.stringify({ ok: true }, null, 2));
    const needsPreview = runJsonScript("scripts/installer-start.mjs", startArgs);
    if (needsPreview.status !== 0 || !String(needsPreview.parsed?.nextCommand || "").includes("--preview-only=true")) {
      throw new Error(`installer start should recommend preview dispatch after preflight evidence exists.\nSTDOUT:\n${needsPreview.stdout}\nSTDERR:\n${needsPreview.stderr}`);
    }

    fs.writeFileSync(path.join(stagingEvidenceDir, "last-preview-dispatch.json"), JSON.stringify({ ok: true, runId: 123 }, null, 2));
    const needsObservePreview = runJsonScript("scripts/installer-start.mjs", startArgs);
    if (needsObservePreview.status !== 0 || !String(needsObservePreview.parsed?.nextCommand || "").includes("installer:observe")) {
      throw new Error(`installer start should recommend observing a dispatched preview.\nSTDOUT:\n${needsObservePreview.stdout}\nSTDERR:\n${needsObservePreview.stderr}`);
    }

    fs.writeFileSync(path.join(stagingEvidenceDir, "preflight-plan.md"), "# Preview plan\n");
    const needsDeploy = runJsonScript("scripts/installer-start.mjs", startArgs);
    if (needsDeploy.status !== 0 || !String(needsDeploy.parsed?.nextCommand || "").includes("--confirm=true")) {
      throw new Error(`installer start should recommend real deploy after preview evidence exists.\nSTDOUT:\n${needsDeploy.stdout}\nSTDERR:\n${needsDeploy.stderr}`);
    }

    fs.writeFileSync(path.join(stagingEvidenceDir, "last-deploy-dispatch.json"), JSON.stringify({ ok: true, runId: 456 }, null, 2));
    const needsObserveDeploy = runJsonScript("scripts/installer-start.mjs", startArgs);
    if (needsObserveDeploy.status !== 0 || !String(needsObserveDeploy.parsed?.nextCommand || "").includes("--verify=true")) {
      throw new Error(`installer start should recommend observing a dispatched deploy.\nSTDOUT:\n${needsObserveDeploy.stdout}\nSTDERR:\n${needsObserveDeploy.stderr}`);
    }

    writeReportEvidenceFixture(deploymentRoot, "staging");
    const needsFrontendOrigin = runJsonScript("scripts/installer-start.mjs", startArgs);
    if (needsFrontendOrigin.status !== 0
      || !String(needsFrontendOrigin.parsed?.nextCommand || "").includes("installer:adopt-frontend-origin")
      || !needsFrontendOrigin.parsed?.checks?.some((check) => check.label === "Frontend origin accepted by backend" && check.ok === false)) {
      throw new Error(`installer start should recommend adopting the deployed frontend origin before browser login steps.\nSTDOUT:\n${needsFrontendOrigin.stdout}\nSTDERR:\n${needsFrontendOrigin.stderr}`);
    }

    const adoptFrontendOrigin = runJsonScript("scripts/installer-adopt-frontend-origin.mjs", [
      "--environment=staging",
      `--environment-dir=${path.join(tempDir, "environments", "staging")}`,
      `--deployment-root=${deploymentRoot}`,
      "--write=true",
      "--output=json",
    ]);
    if (adoptFrontendOrigin.status !== 0 || !adoptFrontendOrigin.parsed?.ok) {
      throw new Error(`installer adopt frontend origin should update backend parameters from deployment evidence.\nSTDOUT:\n${adoptFrontendOrigin.stdout}\nSTDERR:\n${adoptFrontendOrigin.stderr}`);
    }

    const needsPostAdoptCommit = runJsonScript("scripts/installer-start.mjs", startArgs);
    if (needsPostAdoptCommit.status !== 0 || !String(needsPostAdoptCommit.parsed?.nextCommand || "").includes("installer:commit")) {
      throw new Error(`installer start should recommend committing the adopted frontend origin.\nSTDOUT:\n${needsPostAdoptCommit.stdout}\nSTDERR:\n${needsPostAdoptCommit.stderr}`);
    }
    gitCommitAllFixture(tempDir);

    const needsRedeploy = runJsonScript("scripts/installer-start.mjs", startArgs);
    if (needsRedeploy.status !== 0 || !String(needsRedeploy.parsed?.nextCommand || "").includes("--confirm=true")) {
      throw new Error(`installer start should recommend rerunning the real deploy after adopting the frontend origin.\nSTDOUT:\n${needsRedeploy.stdout}\nSTDERR:\n${needsRedeploy.stderr}`);
    }

    fs.writeFileSync(path.join(stagingEvidenceDir, "last-deploy-dispatch.json"), JSON.stringify({ ok: true, runId: 789 }, null, 2));
    const needsObserveRedeploy = runJsonScript("scripts/installer-start.mjs", startArgs);
    if (needsObserveRedeploy.status !== 0 || !String(needsObserveRedeploy.parsed?.nextCommand || "").includes("--verify=true")) {
      throw new Error(`installer start should recommend observing the post-adopt redeploy.\nSTDOUT:\n${needsObserveRedeploy.stdout}\nSTDERR:\n${needsObserveRedeploy.stderr}`);
    }
    writeReportEvidenceFixture(deploymentRoot, "staging");

    const needsFirstAdminValues = runJsonScript("scripts/installer-start.mjs", startArgs);
    if (needsFirstAdminValues.status !== 0
      || !String(needsFirstAdminValues.parsed?.nextCommand || "").includes("installer:customer-values")
      || !needsFirstAdminValues.parsed?.checks?.some((check) => check.label === "First admin values" && check.ok === false)) {
      throw new Error(`installer start should ask for first-admin values after deployment evidence exists.\nSTDOUT:\n${needsFirstAdminValues.stdout}\nSTDERR:\n${needsFirstAdminValues.stderr}`);
    }

    const customerValues = JSON.parse(fs.readFileSync(customerFilePath, "utf8"));
    fs.writeFileSync(customerFilePath, `${JSON.stringify({
      ...customerValues,
      firstAdminEmail: "admin@customer.test",
      firstAdminPassword: "Use-Once-2638!",
      firstChurchName: "Customer Church",
    }, null, 2)}\n`);

    let needsBootstrapAdmin = runJsonScript("scripts/installer-start.mjs", startArgs);
    if (!hadViteCli) {
      if (needsBootstrapAdmin.status !== 0 || !String(needsBootstrapAdmin.parsed?.nextCommand || "").includes("yarn install")) {
        throw new Error(`installer start should ask for yarn install only when local bootstrap/browser work is next.\nSTDOUT:\n${needsBootstrapAdmin.stdout}\nSTDERR:\n${needsBootstrapAdmin.stderr}`);
      }
      fs.mkdirSync(path.dirname(viteCliPath), { recursive: true });
      fs.writeFileSync(viteCliPath, "export {};\n");
      needsBootstrapAdmin = runJsonScript("scripts/installer-start.mjs", startArgs);
    }
    if (needsBootstrapAdmin.status !== 0 || !String(needsBootstrapAdmin.parsed?.nextCommand || "").includes("installer:bootstrap-admin")) {
      throw new Error(`installer start should recommend first-admin bootstrap after deployment evidence exists.\nSTDOUT:\n${needsBootstrapAdmin.stdout}\nSTDERR:\n${needsBootstrapAdmin.stderr}`);
    }

    fs.writeFileSync(path.join(stagingEvidenceDir, "bootstrap-admin.json"), JSON.stringify({ ok: true, dryRun: false }, null, 2));
    const needsBrowserSmoke = runJsonScript("scripts/installer-start.mjs", startArgs);
    if (needsBrowserSmoke.status !== 0 || !String(needsBrowserSmoke.parsed?.nextCommand || "").includes("installer:browser-smoke")) {
      throw new Error(`installer start should recommend browser smoke after first-admin evidence exists.\nSTDOUT:\n${needsBrowserSmoke.stdout}\nSTDERR:\n${needsBrowserSmoke.stderr}`);
    }

    fs.writeFileSync(path.join(stagingEvidenceDir, "browser-smoke.json"), JSON.stringify({ ok: true }, null, 2));
    const stagingComplete = runJsonScript("scripts/installer-start.mjs", startArgs);
    if (stagingComplete.status !== 0 || !String(stagingComplete.parsed?.nextCommand || "").includes("--environment=prod")) {
      throw new Error(`installer start should send the operator to prod after staging is complete.\nSTDOUT:\n${stagingComplete.stdout}\nSTDERR:\n${stagingComplete.stderr}`);
    }

    const markdownShort = spawnNode("scripts/installer-start.mjs", [
      ...startArgs.filter((arg) => arg !== "--output=json"),
      "--output=markdown",
    ]);
    if (markdownShort.status !== 0
      || !markdownShort.stdout.includes("## Next Command")
      || markdownShort.stdout.includes("## Command Reference")
      || markdownShort.stdout.includes("## Useful Commands")) {
      throw new Error(`installer start markdown should focus on one next command by default.\nSTDOUT:\n${markdownShort.stdout}\nSTDERR:\n${markdownShort.stderr}`);
    }

    const markdownReference = spawnNode("scripts/installer-start.mjs", [
      ...startArgs.filter((arg) => arg !== "--output=json"),
      "--output=markdown",
      "--show-all-commands=true",
    ]);
    if (markdownReference.status !== 0 || !markdownReference.stdout.includes("## Command Reference")) {
      throw new Error(`installer start markdown should expose the command reference when requested.\nSTDOUT:\n${markdownReference.stdout}\nSTDERR:\n${markdownReference.stderr}`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
    if (!hadNodeModules) {
      fs.rmSync(nodeModulesDir, { recursive: true, force: true });
    } else if (!hadViteCli) {
      fs.rmSync(path.join(nodeModulesDir, "vite"), { recursive: true, force: true });
    }
  }
}

function expectCustomerFileAwsRegionAliasWorks() {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-installer-region-alias-"));

  try {
    const setup = runJsonScript("scripts/setup-private-deployment-repo.mjs", [
      `--deploy-repo-dir=${tempDir}`,
      "--write=true",
      "--output=json",
    ]);
    if (setup.status !== 0) {
      throw new Error(`region alias fixture setup failed.\nSTDOUT:\n${setup.stdout}\nSTDERR:\n${setup.stderr}`);
    }

    const customerFilePath = path.join(tempDir, "customer-values.json");
    const sample = JSON.parse(fs.readFileSync(path.join(tempDir, "customer-values.sample.json"), "utf8"));
    fs.writeFileSync(customerFilePath, `${JSON.stringify({
      ...sample,
      awsRegion: "us-west-2",
      accountId: "123456789012",
      repo: "example/b1admin-deploy",
    }, null, 2)}\n`);

    const result = runJsonScript("scripts/installer-aws-preflight.mjs", [
      "--environment=staging",
      `--environment-dir=${path.join(tempDir, "environments", "staging")}`,
      `--customer-file=${customerFilePath}`,
      "--skip-aws-check=true",
      "--output=json",
    ]);

    if (result.status !== 0 || result.parsed?.region !== "us-west-2") {
      throw new Error(`customer-values awsRegion should be accepted as the installer region.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function expectInstallerAwsRolesGeneratesPolicyFiles() {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-installer-aws-roles-"));

  try {
    const result = runJsonScript("scripts/installer-aws-roles.mjs", [
      "--environment=staging",
      "--account-id=123456789012",
      "--repo=example/b1admin-deploy",
      `--output-dir=${tempDir}`,
      "--write=true",
      "--output=json",
    ]);

    if (result.status !== 0 || result.parsed?.files?.length !== 4 || result.parsed?.roleArns?.deployRoleArn !== "arn:aws:iam::123456789012:role/b1admin-staging-github-deploy") {
      throw new Error(`installer aws roles should render the expected IAM file set and role ARNs.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }

    const expectedFiles = [
      "b1admin-staging-github-deploy-trust.json",
      "b1admin-staging-github-deploy-policy.json",
      "b1admin-staging-cfn-exec-trust.json",
      "b1admin-staging-cfn-exec-policy.json",
    ];
    expectedFiles.forEach((fileName) => {
      const filePath = path.join(tempDir, fileName);
      if (!fs.existsSync(filePath)) {
        throw new Error(`installer aws roles did not write ${fileName}.`);
      }
      const text = fs.readFileSync(filePath, "utf8");
      JSON.parse(text);
      if (text.includes("<account-id>") || text.includes("<repo-owner>") || text.includes("<deploy-repo>")) {
        throw new Error(`installer aws roles left placeholders in ${fileName}.\n${text}`);
      }
    });

    const trust = JSON.parse(fs.readFileSync(path.join(tempDir, "b1admin-staging-github-deploy-trust.json"), "utf8"));
    const subject = trust.Statement?.[0]?.Condition?.StringLike?.["token.actions.githubusercontent.com:sub"];
    if (subject !== "repo:example/b1admin-deploy:environment:aws-staging") {
      throw new Error(`installer aws roles rendered the wrong GitHub OIDC subject: ${subject}`);
    }

    const deployPolicy = JSON.parse(fs.readFileSync(path.join(tempDir, "b1admin-staging-github-deploy-policy.json"), "utf8"));
    const passRole = deployPolicy.Statement.find((statement) => statement.Sid === "PassCloudFormationExecutionRole");
    if (passRole?.Resource !== "arn:aws:iam::123456789012:role/b1admin-staging-cfn-exec") {
      throw new Error(`installer aws roles rendered the wrong iam:PassRole resource.\n${JSON.stringify(passRole, null, 2)}`);
    }

    if (!result.parsed.awsCommands.some((command) => command.includes("create-open-id-connect-provider --url https://token.actions.githubusercontent.com --client-id-list sts.amazonaws.com"))
      || result.parsed.awsCommands.some((command) => command.includes("--thumbprint-list"))
      || !result.parsed.githubSecretCommands.some((command) => command.includes("AWS_ROLE_TO_ASSUME"))
      || !result.parsed.githubSecretCommands.some((command) => command.includes("AWS_CLOUDFORMATION_EXECUTION_ROLE_ARN"))) {
      throw new Error(`installer aws roles should output OIDC setup and GitHub secret commands.\nSTDOUT:\n${result.stdout}`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function expectInstallerAwsHandoffWritesAdminDocument() {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-installer-aws-handoff-"));

  try {
    const setup = runJsonScript("scripts/setup-private-deployment-repo.mjs", [
      `--deploy-repo-dir=${tempDir}`,
      "--write=true",
      "--output=json",
    ]);
    if (setup.status !== 0) {
      throw new Error(`installer aws handoff fixture setup failed.\nSTDOUT:\n${setup.stdout}\nSTDERR:\n${setup.stderr}`);
    }

    const customerFilePath = path.join(tempDir, "customer-values.json");
    const sample = JSON.parse(fs.readFileSync(path.join(tempDir, "customer-values.sample.json"), "utf8"));
    fs.writeFileSync(customerFilePath, `${JSON.stringify({
      ...sample,
      accountId: "123456789012",
      repo: "example/b1admin-deploy",
      rootDomain: "customer.test",
      supportEmail: "support@customer.test",
      supportPhone: "111-222-3333",
    }, null, 2)}\n`);

    const result = runJsonScript("scripts/installer-aws-handoff.mjs", [
      `--customer-file=${customerFilePath}`,
      `--deploy-repo-dir=${tempDir}`,
      "--write=true",
      "--output=json",
    ]);

    const handoffPath = path.join(tempDir, "aws-admin-handoff.md");
    if (result.status !== 0
      || result.parsed?.environments?.length !== 2
      || !fs.existsSync(handoffPath)
      || !fs.existsSync(path.join(tempDir, "iam", "staging", "b1admin-staging-github-deploy-trust.json"))
      || !fs.existsSync(path.join(tempDir, "iam", "prod", "b1admin-prod-github-deploy-trust.json"))) {
      throw new Error(`installer aws handoff should write a two-environment admin bundle.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }

    const body = fs.readFileSync(handoffPath, "utf8");
    if (!body.includes("# B1Admin AWS Admin Handoff")
      || !body.includes("aws iam create-role --role-name b1admin-staging-github-deploy")
      || !body.includes("aws iam create-role --role-name b1admin-prod-github-deploy")
      || !body.includes("arn:aws:iam::123456789012:role/b1admin-prod-cfn-exec")
      || !body.includes("gh secret set AWS_ROLE_TO_ASSUME --repo example/b1admin-deploy --env aws-prod")
      || !body.includes("Smallest AWS footprint: continue with prod first")
      || !body.includes("--environment=prod")) {
      throw new Error(`installer aws handoff document is missing expected admin/operator content.\n${body}`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function expectInstallerGithubSetupPlansAndWritesSecrets() {
  const deployRepoDir = fs.mkdtempSync(path.join(rootDir, ".tmp-installer-github-setup-repo-"));
  const fakeGhDir = fs.mkdtempSync(path.join(rootDir, ".tmp-installer-github-setup-gh-"));
  const ghPath = path.join(fakeGhDir, "gh");
  const capturePath = path.join(fakeGhDir, "capture.jsonl");
  const ghScript = `#!/usr/bin/env node
import fs from "node:fs";
const args = process.argv.slice(2);
let stdin = "";
process.stdin.on("data", (chunk) => { stdin += chunk; });
process.stdin.on("end", () => {
  if (args[0] === "api" && args[1] === "-X" && args[2] === "PUT") {
    fs.appendFileSync(${JSON.stringify(capturePath)}, JSON.stringify({ kind: "environment", args }) + "\\n");
    process.exit(0);
  }
  if (args[0] === "secret" && args[1] === "set") {
    const bodyIndex = args.indexOf("--body");
    fs.appendFileSync(${JSON.stringify(capturePath)}, JSON.stringify({
      kind: "secret",
      args,
      body: bodyIndex >= 0 ? args[bodyIndex + 1] : stdin,
    }) + "\\n");
    process.exit(0);
  }
  process.stderr.write("Unexpected gh invocation: " + args.join(" ") + "\\n");
  process.exit(1);
});
`;

  try {
    const setup = runJsonScript("scripts/setup-private-deployment-repo.mjs", [
      `--deploy-repo-dir=${deployRepoDir}`,
      "--write=true",
      "--output=json",
    ]);
    if (setup.status !== 0) {
      throw new Error(`installer github setup fixture scaffold failed.\nSTDOUT:\n${setup.stdout}\nSTDERR:\n${setup.stderr}`);
    }

    for (const environment of ["staging", "prod"]) {
      const appConfig = runJsonScript("scripts/installer-app-config-secret.mjs", [
        `--environment=${environment}`,
        `--environment-dir=${path.join(deployRepoDir, "environments", environment)}`,
        "--support-email=support@customer.test",
        "--write=true",
        "--output=json",
      ]);
      if (appConfig.status !== 0) {
        throw new Error(`installer github setup fixture app-config generation failed for ${environment}.\nSTDOUT:\n${appConfig.stdout}\nSTDERR:\n${appConfig.stderr}`);
      }
    }

    const preview = runJsonScript("scripts/installer-github-setup.mjs", [
      "--repo=example/b1admin-deploy",
      "--account-id=123456789012",
      `--deploy-env-dir=${path.join(deployRepoDir, "environments")}`,
      "--include-checkout-token-commands=false",
      "--output=json",
    ]);

    if (preview.status !== 0
      || preview.parsed?.secretPlans?.length !== 6
      || !preview.parsed.secretPlans.every((secret) => secret.ready === true)
      || !preview.parsed.secretCommands.some((command) => command.includes("arn:aws:iam::123456789012:role/b1admin-staging-github-deploy"))
      || !preview.parsed.secretCommands.some((command) => command.includes("app-config-secret.json"))) {
      throw new Error(`installer github setup should produce ready concrete secret commands from generated IAM/app-config values.\nSTDOUT:\n${preview.stdout}\nSTDERR:\n${preview.stderr}`);
    }

    fs.writeFileSync(ghPath, ghScript);
    fs.chmodSync(ghPath, 0o755);
    const write = runJsonScriptWithEnv("scripts/installer-github-setup.mjs", [
      "--repo=example/b1admin-deploy",
      "--account-id=123456789012",
      `--deploy-env-dir=${path.join(deployRepoDir, "environments")}`,
      "--include-checkout-token-commands=false",
      "--write=true",
      "--write-secrets=true",
      "--output=json",
    ], {
      PATH: `${fakeGhDir}${path.delimiter}${process.env.PATH || ""}`,
    });

    if (write.status !== 0 || write.parsed?.secretResults?.length !== 6 || !write.parsed.secretResults.every((secret) => secret.ok === true)) {
      throw new Error(`installer github setup should create environments and write all ready required secrets through gh.\nSTDOUT:\n${write.stdout}\nSTDERR:\n${write.stderr}`);
    }

    const captures = fs.readFileSync(capturePath, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
    const environmentCreates = captures.filter((capture) => capture.kind === "environment");
    const secretWrites = captures.filter((capture) => capture.kind === "secret");
    if (environmentCreates.length !== 2 || secretWrites.length !== 6) {
      throw new Error(`installer github setup did not call gh for both environments and all required secrets.\nCaptures:\n${JSON.stringify(captures, null, 2)}`);
    }
    if (!secretWrites.some((capture) => capture.args[2] === "AWS_APP_CONFIG_SECRET_JSON" && String(capture.body || "").includes("jwtSecret"))
      || !secretWrites.some((capture) => capture.args[2] === "AWS_ROLE_TO_ASSUME" && String(capture.body || "").includes("b1admin-staging-github-deploy"))) {
      throw new Error(`installer github setup did not send expected secret bodies.\nCaptures:\n${JSON.stringify(captures, null, 2)}`);
    }
  } finally {
    fs.rmSync(deployRepoDir, { recursive: true, force: true });
    fs.rmSync(fakeGhDir, { recursive: true, force: true });
  }
}

function expectInstallerGithubReadinessChecksEnvironmentSecrets() {
  const fakeGhDir = fs.mkdtempSync(path.join(rootDir, ".tmp-installer-github-readiness-gh-"));
  const ghPath = path.join(fakeGhDir, "gh");
  const script = `#!/usr/bin/env node
const args = process.argv.slice(2);
const endpoint = args[1] === "api" ? args[2] : args[1];
if (args[0] !== "api") {
  process.stderr.write("Unexpected gh invocation: " + args.join(" ") + "\\n");
  process.exit(1);
}
if (endpoint.endsWith("/environments/aws-staging")) {
  process.stdout.write(JSON.stringify({ name: "aws-staging" }));
  process.exit(0);
}
if (endpoint.endsWith("/environments/aws-staging/secrets")) {
  process.stdout.write(JSON.stringify({ secrets: [
    { name: "AWS_ROLE_TO_ASSUME" },
    { name: "AWS_CLOUDFORMATION_EXECUTION_ROLE_ARN" },
    { name: "AWS_APP_CONFIG_SECRET_JSON" }
  ] }));
  process.exit(0);
}
if (endpoint.endsWith("/environments/aws-prod")) {
  process.stdout.write(JSON.stringify({ name: "aws-prod" }));
  process.exit(0);
}
if (endpoint.endsWith("/environments/aws-prod/secrets")) {
  process.stdout.write(JSON.stringify({ secrets: [
    { name: "AWS_ROLE_TO_ASSUME" },
    { name: "AWS_CLOUDFORMATION_EXECUTION_ROLE_ARN" }
  ] }));
  process.exit(0);
}
process.stderr.write("Unexpected gh endpoint: " + endpoint + "\\n");
process.exit(1);
`;

  try {
    fs.writeFileSync(ghPath, script);
    fs.chmodSync(ghPath, 0o755);

    const staging = runJsonScriptWithEnv("scripts/installer-github-readiness.mjs", [
      "--environment=staging",
      "--repo=example/b1admin-deploy",
      "--output=json",
    ], {
      PATH: `${fakeGhDir}${path.delimiter}${process.env.PATH || ""}`,
    });

    if (staging.status !== 0
      || staging.parsed?.ok !== true
      || staging.parsed?.environments?.[0]?.missingSecrets?.length !== 0) {
      throw new Error(`installer github readiness should pass when all required environment secrets exist.\nSTDOUT:\n${staging.stdout}\nSTDERR:\n${staging.stderr}`);
    }

    const all = runJsonScriptWithEnv("scripts/installer-github-readiness.mjs", [
      "--environment=all",
      "--repo=example/b1admin-deploy",
      "--output=json",
    ], {
      PATH: `${fakeGhDir}${path.delimiter}${process.env.PATH || ""}`,
    });

    if (all.status === 0
      || all.parsed?.ok !== false
      || !all.parsed?.environments?.find((environment) => environment.githubEnvironment === "aws-prod")?.missingSecrets?.includes("AWS_APP_CONFIG_SECRET_JSON")) {
      throw new Error(`installer github readiness should fail clearly when a required environment secret is missing.\nSTDOUT:\n${all.stdout}\nSTDERR:\n${all.stderr}`);
    }
  } finally {
    fs.rmSync(fakeGhDir, { recursive: true, force: true });
  }
}

function expectInstallerObserveSummarizesDownloadedEvidence() {
  const fakeGhDir = fs.mkdtempSync(path.join(rootDir, ".tmp-installer-observe-gh-"));
  const evidenceDir = fs.mkdtempSync(path.join(rootDir, ".tmp-installer-observe-evidence-"));
  const ghPath = path.join(fakeGhDir, "gh");
  const script = `#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const args = process.argv.slice(2);
if (args[0] === "run" && args[1] === "list") {
  process.stdout.write(JSON.stringify([{
    databaseId: 12345,
    status: "completed",
    conclusion: "success",
    url: "https://github.com/example/b1admin-deploy/actions/runs/12345",
    headSha: "abc123",
    createdAt: "2026-07-22T12:00:00Z",
    updatedAt: "2026-07-22T12:05:00Z",
    displayTitle: "Deploy AWS From Private Repo",
    workflowName: "Deploy AWS From Private Repo"
  }]));
  process.exit(0);
}
if (args[0] === "run" && args[1] === "view") {
  process.stdout.write(JSON.stringify({
    databaseId: Number(args[2]),
    status: "completed",
    conclusion: "success",
    url: "https://github.com/example/b1admin-deploy/actions/runs/" + args[2],
    headSha: "abc123",
    createdAt: "2026-07-22T12:00:00Z",
    updatedAt: "2026-07-22T12:05:00Z",
    displayTitle: "Deploy AWS From Private Repo",
    workflowName: "Deploy AWS From Private Repo",
    event: "workflow_dispatch"
  }));
  process.exit(0);
}
if (args[0] === "run" && args[1] === "download") {
  const dir = args[args.indexOf("--dir") + 1];
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(path.join(${JSON.stringify(rootDir)}, "infrastructure", "examples", "backend-outputs.sample.json"), path.join(dir, "backend-outputs.json"));
  fs.copyFileSync(path.join(${JSON.stringify(rootDir)}, "infrastructure", "examples", "frontend-outputs.sample.json"), path.join(dir, "frontend-outputs.json"));
  fs.writeFileSync(path.join(dir, "deployment-summary.json"), JSON.stringify({
    environment: "staging",
    region: "us-east-1",
    stackNames: {
      backend: "b1admin-staging-backend",
      frontend: "b1admin-staging-frontend"
    },
    resolved: {
      apiBaseUrl: "https://api.example.com",
      frontendAppUrl: "https://admin.example.com",
      frontendBucketName: "example-frontend-bucket",
      frontendDistributionId: "EXAMPLE123"
    },
    files: {
      backendOutputsFile: "deployment/staging/backend-outputs.json",
      frontendOutputsFile: "deployment/staging/frontend-outputs.json",
      summaryFile: "deployment/staging/deployment-summary.json"
    },
    followUpCommands: {}
  }, null, 2) + "\\n");
  process.exit(0);
}
process.stderr.write("Unexpected gh invocation: " + args.join(" ") + "\\n");
process.exit(1);
`;

  try {
    fs.writeFileSync(ghPath, script);
    fs.chmodSync(ghPath, 0o755);

    const result = runJsonScriptWithEnv("scripts/installer-observe.mjs", [
      "--environment=staging",
      "--repo=example/b1admin-deploy",
      `--evidence-dir=${evidenceDir}`,
      "--check-http=false",
      "--output=json",
    ], {
      PATH: `${fakeGhDir}${path.delimiter}${process.env.PATH || ""}`,
    });

    if (result.status !== 0
      || result.parsed?.runId !== 12345
      || result.parsed?.summary?.resolved?.frontendAppUrl !== "https://admin.example.com"
      || result.parsed?.verification?.ok !== true
      || result.parsed?.warnings?.length !== 0) {
      throw new Error(`installer observe should summarize a completed run from downloaded evidence.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }
  } finally {
    fs.rmSync(fakeGhDir, { recursive: true, force: true });
    fs.rmSync(evidenceDir, { recursive: true, force: true });
  }
}

function expectInstallerObserveDownloadsPreviewArtifactFallback() {
  const fakeGhDir = fs.mkdtempSync(path.join(rootDir, ".tmp-installer-observe-preview-gh-"));
  const evidenceDir = fs.mkdtempSync(path.join(rootDir, ".tmp-installer-observe-preview-evidence-"));
  const ghPath = path.join(fakeGhDir, "gh");
  const script = `#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const args = process.argv.slice(2);
if (args[0] === "run" && args[1] === "list") {
  process.stdout.write(JSON.stringify([{
    databaseId: 67890,
    status: "completed",
    conclusion: "success",
    url: "https://github.com/example/b1admin-deploy/actions/runs/67890",
    headSha: "def456",
    createdAt: "2026-07-22T12:00:00Z",
    updatedAt: "2026-07-22T12:05:00Z",
    displayTitle: "Deploy AWS From Private Repo",
    workflowName: "Deploy AWS From Private Repo"
  }]));
  process.exit(0);
}
if (args[0] === "run" && args[1] === "download") {
  const name = args[args.indexOf("--name") + 1];
  if (name.endsWith("deployment-evidence")) {
    process.stderr.write("artifact not found\\n");
    process.exit(1);
  }
  const dir = args[args.indexOf("--dir") + 1];
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "preflight-plan.md"), "# Preview plan\\n");
  process.exit(0);
}
process.stderr.write("Unexpected gh invocation: " + args.join(" ") + "\\n");
process.exit(1);
`;

  try {
    fs.writeFileSync(ghPath, script);
    fs.chmodSync(ghPath, 0o755);

    const result = runJsonScriptWithEnv("scripts/installer-observe.mjs", [
      "--environment=staging",
      "--repo=example/b1admin-deploy",
      `--evidence-dir=${evidenceDir}`,
      "--verify=false",
      "--output=json",
    ], {
      PATH: `${fakeGhDir}${path.delimiter}${process.env.PATH || ""}`,
    });

    if (result.status !== 0
      || result.parsed?.downloadedArtifact !== "aws-staging-preflight-plan"
      || !fs.existsSync(path.join(evidenceDir, "preflight-plan.md"))
      || result.parsed?.warnings?.length !== 0) {
      throw new Error(`installer observe should fall back to preview preflight artifacts.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }
  } finally {
    fs.rmSync(fakeGhDir, { recursive: true, force: true });
    fs.rmSync(evidenceDir, { recursive: true, force: true });
  }
}

function expectInstallerObserveWarnsOnIncompleteDeploymentArtifact() {
  const fakeGhDir = fs.mkdtempSync(path.join(rootDir, ".tmp-installer-observe-incomplete-gh-"));
  const evidenceDir = fs.mkdtempSync(path.join(rootDir, ".tmp-installer-observe-incomplete-evidence-"));
  const ghPath = path.join(fakeGhDir, "gh");
  const script = `#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const args = process.argv.slice(2);
if (args[0] === "run" && args[1] === "list") {
  process.stdout.write(JSON.stringify([{
    databaseId: 24680,
    status: "completed",
    conclusion: "success",
    url: "https://github.com/example/b1admin-deploy/actions/runs/24680",
    headSha: "abc123",
    createdAt: "2026-07-22T12:00:00Z",
    updatedAt: "2026-07-22T12:05:00Z",
    displayTitle: "Deploy AWS From Private Repo",
    workflowName: "Deploy AWS From Private Repo"
  }]));
  process.exit(0);
}
if (args[0] === "run" && args[1] === "download") {
  const dir = args[args.indexOf("--dir") + 1];
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "preflight-plan.md"), "# Preview plan\\n");
  process.exit(0);
}
process.stderr.write("Unexpected gh invocation: " + args.join(" ") + "\\n");
process.exit(1);
`;

  try {
    fs.writeFileSync(ghPath, script);
    fs.chmodSync(ghPath, 0o755);

    const result = runJsonScriptWithEnv("scripts/installer-observe.mjs", [
      "--environment=staging",
      "--repo=example/b1admin-deploy",
      `--evidence-dir=${evidenceDir}`,
      "--output=json",
    ], {
      PATH: `${fakeGhDir}${path.delimiter}${process.env.PATH || ""}`,
    });

    if (result.status === 0
      || result.parsed?.ok !== false
      || !String(result.parsed?.warnings?.[0] || "").includes("deployment-summary.json")) {
      throw new Error(`installer observe should warn when a deployment artifact lacks saved deployment evidence.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }
  } finally {
    fs.rmSync(fakeGhDir, { recursive: true, force: true });
    fs.rmSync(evidenceDir, { recursive: true, force: true });
  }
}

function writeReportEvidenceFixture(deploymentRoot, environment) {
  const environmentDir = path.join(deploymentRoot, environment);
  fs.mkdirSync(environmentDir, { recursive: true });
  fs.copyFileSync(path.join(rootDir, "infrastructure", "examples", "backend-outputs.sample.json"), path.join(environmentDir, "backend-outputs.json"));
  fs.copyFileSync(path.join(rootDir, "infrastructure", "examples", "frontend-outputs.sample.json"), path.join(environmentDir, "frontend-outputs.json"));
  fs.writeFileSync(path.join(environmentDir, "deployment-summary.json"), JSON.stringify({
    environment,
    region: "us-east-1",
    stackNames: {
      backend: `b1admin-${environment}-backend`,
      frontend: `b1admin-${environment}-frontend`,
    },
    resolved: {
      apiBaseUrl: "https://api.example.com",
      frontendAppUrl: "https://d123example.cloudfront.net",
      frontendBucketName: "example-frontend-bucket",
      frontendDistributionId: "EXAMPLE123",
    },
    files: {
      backendOutputsFile: path.join(environmentDir, "backend-outputs.json"),
      frontendOutputsFile: path.join(environmentDir, "frontend-outputs.json"),
      summaryFile: path.join(environmentDir, "deployment-summary.json"),
    },
  }, null, 2));
  fs.writeFileSync(path.join(environmentDir, "last-deploy-dispatch.json"), JSON.stringify({
    ok: true,
    runId: environment === "staging" ? 111 : 222,
  }, null, 2));
  fs.writeFileSync(path.join(environmentDir, "source-metadata.json"), JSON.stringify({
    ok: true,
    environment,
    githubActions: {
      runId: environment === "staging" ? 111 : 222,
      privateRepoSha: `${environment}-deploy-repo`,
    },
    b1admin: {
      repo: "ChurchApps/B1Admin",
      ref: "main",
      sha: `${environment}-b1`,
    },
    api: {
      repo: "ChurchApps/Api",
      ref: "main",
      sha: `${environment}-api`,
    },
  }, null, 2));
}

function expectInstallerReportGeneratesRolloutRecord() {
  const deploymentRoot = fs.mkdtempSync(path.join(rootDir, ".tmp-installer-report-"));

  try {
    writeReportEvidenceFixture(deploymentRoot, "staging");
    writeReportEvidenceFixture(deploymentRoot, "prod");

    const browserSmoke = runJsonScript("scripts/installer-browser-smoke.mjs", [
      `--deployment-root=${deploymentRoot}`,
      "--environment=staging",
      "--app-url=https://admin.example.com",
      "--email=admin@example.com",
      "--password=temporary-password",
      "--church-name=Example Church",
      "--dry-run=true",
      "--output=json",
    ]);

    if (browserSmoke.status !== 0
      || browserSmoke.parsed?.ok !== true
      || !fs.existsSync(path.join(deploymentRoot, "staging", "browser-smoke.json"))) {
      throw new Error(`installer browser smoke dry-run should write browser evidence without launching a browser.\nSTDOUT:\n${browserSmoke.stdout}\nSTDERR:\n${browserSmoke.stderr}`);
    }

    const incomplete = runJsonScript("scripts/installer-report.mjs", [
      `--deployment-root=${deploymentRoot}`,
      "--environment=all",
      "--output=json",
    ]);

    if (incomplete.status !== 0
      || incomplete.parsed?.ok !== false
      || !String(incomplete.stdout).includes("browser login result")) {
      throw new Error(`installer report should flag missing human rollout records.\nSTDOUT:\n${incomplete.stdout}\nSTDERR:\n${incomplete.stderr}`);
    }

    fs.writeFileSync(path.join(deploymentRoot, "prod", "browser-smoke.json"), JSON.stringify({
      ok: true,
      method: "dry-run",
      selectedChurch: "Example Church",
      dashboardLoaded: true,
    }, null, 2));
    ["staging", "prod"].forEach((environmentName) => {
      fs.writeFileSync(path.join(deploymentRoot, environmentName, "bootstrap-admin.json"), JSON.stringify({
        ok: true,
        dryRun: false,
      }, null, 2));
    });

    const complete = runJsonScript("scripts/installer-report.mjs", [
      `--deployment-root=${deploymentRoot}`,
      "--environment=all",
      "--write=true",
      "--output=json",
    ]);

    const reportPath = path.join(deploymentRoot, "deployment-report.md");
    if (complete.status !== 0
      || complete.parsed?.ok !== true
      || !fs.existsSync(reportPath)) {
      throw new Error(`installer report should write a complete rollout report from evidence and supplied records.\nSTDOUT:\n${complete.stdout}\nSTDERR:\n${complete.stderr}`);
    }

    const body = fs.readFileSync(reportPath, "utf8");
    if (!body.includes("# B1Admin Deployment Report")
      || !body.includes("Complete environments: 2/2")
      || !body.includes("GitHub Actions run id: `222`")
      || !body.includes("B1Admin commit SHA: `prod-b1`")
      || !body.includes("Api commit SHA: `prod-api`")
      || !body.includes("API base URL: `https://api.example.com`")
      || !body.includes("Browser login result: passed:")) {
      throw new Error(`installer report markdown is missing expected rollout evidence.\n${body}`);
    }

    const prodOnly = runJsonScript("scripts/installer-report.mjs", [
      `--deployment-root=${deploymentRoot}`,
      "--environment=prod",
      "--output=json",
    ]);
    if (prodOnly.status !== 0
      || prodOnly.parsed?.environments?.length !== 1
      || !String(prodOnly.parsed?.markdown || "").includes("- Prod browser workflow tested by: ")
      || String(prodOnly.parsed?.markdown || "").includes("- Staging browser workflow tested by: ")) {
      throw new Error(`installer report should support a clean prod-only sign-off.\nSTDOUT:\n${prodOnly.stdout}\nSTDERR:\n${prodOnly.stderr}`);
    }
  } finally {
    fs.rmSync(deploymentRoot, { recursive: true, force: true });
  }
}

function expectShowRolloutStatusSummarizesMultipleEnvironments() {
  const tempRoot = fs.mkdtempSync(path.join(rootDir, ".tmp-rollout-status-env-root-"));

  try {
    for (const environmentName of ["staging", "prod"]) {
      const targetDir = path.join(tempRoot, environmentName);
      fs.mkdirSync(targetDir, { recursive: true });

      for (const fileName of [
        "bootstrap-parameters.json",
        "backend-parameters.json",
        "frontend-parameters.json",
        "app-config-secret.template.json",
      ]) {
        fs.copyFileSync(
          path.join(rootDir, "infrastructure", "environments", environmentName, fileName),
          path.join(targetDir, fileName),
        );
      }
    }

    restoreStarterTemplateDefaults(path.join(tempRoot, "staging"), "staging");
    restoreStarterTemplateDefaults(path.join(tempRoot, "prod"), "prod");

    const prepareProdResult = runJsonScript("scripts/prepare-environment-starter.mjs", [
      "--environment=prod",
      `--environment-dir=${path.join(tempRoot, "prod")}`,
      "--account-id=123456789012",
      "--admin-root-url=https://admin.customer.test",
      "--cors-origin=https://admin.customer.test",
      "--content-root-url=https://content.customer.test",
      "--store-api-url=https://store.customer.test",
      "--transfer-url=https://transfer.customer.test",
      "--support-email=support@customer.test",
      "--support-phone=918-994-2638",
      "--support-site-url=https://support.customer.test",
      "--website-base-url=https://{subdomain}.customer.test",
      "--mobile-app-url=https://customer.test/app",
      "--domain-cname-target=proxy.customer.test",
      "--domain-a-target=3.23.251.61",
      "--default-stock-photo=https://content.customer.test/stockPhotos/default.png",
      "--write=true",
      "--write-secret-file=true",
      "--output=json",
    ]);

    if (prepareProdResult.status !== 0) {
      throw new Error(`prepare-environment-starter should succeed before rollout-status verification.\nSTDOUT:\n${prepareProdResult.stdout}\nSTDERR:\n${prepareProdResult.stderr}`);
    }

    withFakePackagableApiRepo((fakeApiRepoPath) => withFakeGhForDispatchGithubAwsDeploy(({ env }) => {
      const result = runJsonScriptWithEnv("scripts/show-rollout-status.mjs", [
        `--environment-root-dir=${tempRoot}`,
        `--api-repo-path=${fakeApiRepoPath}`,
        "--output=json",
      ], env);

      if (result.status !== 1) {
        throw new Error(`show-rollout-status should exit non-zero when at least one environment is still blocked.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
      }

      const actual = result.parsed || {};
      if (actual.ok !== false || actual.environmentCount !== 2 || actual.readyEnvironmentCount !== 1 || actual.blockedEnvironmentCount !== 1) {
        throw new Error(`show-rollout-status did not report the expected ready/blocked counts.\nSTDOUT:\n${result.stdout}`);
      }
      if (!Array.isArray(actual.blockedEnvironments) || actual.blockedEnvironments.join(",") !== "staging" || !Array.isArray(actual.readyEnvironments) || actual.readyEnvironments.join(",") !== "prod") {
        throw new Error(`show-rollout-status did not report the expected ready/blocked environment names.\nSTDOUT:\n${result.stdout}`);
      }
      if (actual.blockerCategories?.starterOrInput?.environmentCount !== 1
        || actual.blockerCategories?.localExecution?.environmentCount < 1
        || actual.blockerCategories?.githubActionsExecution?.environmentCount < 1
        || actual.blockerCategories?.localGithubDispatch?.environmentCount !== 0) {
        throw new Error(`show-rollout-status did not report the expected blocker-category summary.\nSTDOUT:\n${result.stdout}`);
      }
      if (!Array.isArray(actual.overallHighlightedBlockers) || !actual.overallHighlightedBlockers.some((entry) => String(entry).includes("AWS_APP_CONFIG_SECRET_JSON"))) {
        throw new Error(`show-rollout-status did not surface the expected cross-environment blocker summary.\nSTDOUT:\n${result.stdout}`);
      }
      if (!Array.isArray(actual.recommendedNextSteps) || actual.recommendedNextSteps.length !== 1) {
        throw new Error(`show-rollout-status did not surface the expected cross-environment next-step summary.\nSTDOUT:\n${result.stdout}`);
      }

      if (!String(actual.recommendedNextCommand || "").startsWith("yarn prepare:environment-starter -- --environment=staging --environment-dir=")
        || !String(actual.recommendedNextCommand || "").endsWith("--account-id=<aws-account-id> --output=json")) {
        throw new Error(`show-rollout-status should surface the first blocked environment's primary command.\nSTDOUT:\n${result.stdout}`);
      }
      if (!Array.isArray(actual.commandSummary?.global) || actual.commandSummary.global[0] !== actual.recommendedNextCommand) {
        throw new Error(`show-rollout-status should expose the top recommended command in commandSummary.global.\nSTDOUT:\n${result.stdout}`);
      }
      if (!Array.isArray(actual.commandSummary?.all) || !actual.commandSummary.all.some((command) => String(command).includes("ENV_DIR=")
        && String(command).includes("/prod")
        && String(command).includes("./infrastructure/environments/prod/deploy-split-stack.sh"))) {
        throw new Error(`show-rollout-status should expose the ordered cross-environment command list in commandSummary.all.\nSTDOUT:\n${result.stdout}`);
      }
      if (!Array.isArray(actual.commandSummary?.byEnvironment?.staging) || actual.commandSummary.byEnvironment.staging.some((command) => command === actual.recommendedNextCommand)) {
        throw new Error(`show-rollout-status should omit the global top command from commandSummary.byEnvironment entries.\nSTDOUT:\n${result.stdout}`);
      }
      if (!Array.isArray(actual.commandSummary?.byEnvironment?.prod) || !actual.commandSummary.byEnvironment.prod.some((command) => String(command).includes("./infrastructure/environments/prod/deploy-split-stack.sh"))) {
        throw new Error(`show-rollout-status should preserve per-environment fallback commands in commandSummary.byEnvironment.\nSTDOUT:\n${result.stdout}`);
      }

      const staging = (actual.environments || []).find((entry) => entry.environment === "staging");
      const prod = (actual.environments || []).find((entry) => entry.environment === "prod");

      if (!staging || !prod) {
        throw new Error(`show-rollout-status did not return both staging and prod summaries.\nSTDOUT:\n${result.stdout}`);
      }
      if (staging.status !== "blocked" || staging.starterAndInputBlockerCount !== 15 || staging.recommendedPath !== "none") {
        throw new Error(`show-rollout-status did not preserve the blocked staging summary.\nSTDOUT:\n${result.stdout}`);
      }
      if (prod.status !== "ready" || prod.starterAndInputBlockerCount !== 0 || prod.recommendedPath !== "local") {
        throw new Error(`show-rollout-status did not preserve the locally ready prod summary.\nSTDOUT:\n${result.stdout}`);
      }
      if (prod.localExecutionOk !== true || prod.githubActionsExecutionOk !== false || prod.localGithubDispatchOk !== true) {
        throw new Error(`show-rollout-status did not preserve the expected prod execution-path readiness details.\nSTDOUT:\n${result.stdout}`);
      }
    }), { includeLayer: true });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function expectShowRolloutStatusOutputSampleMatchesContract() {
  const sample = readJsonFile("infrastructure/examples/show-rollout-status-output.sample.json");
  const tempRoot = path.join(rootDir, ".tmp-rollout-status-sample-env");

  fs.rmSync(tempRoot, { recursive: true, force: true });
  fs.mkdirSync(path.join(tempRoot, "staging"), { recursive: true });
  fs.mkdirSync(path.join(tempRoot, "prod"), { recursive: true });

  try {
    for (const environmentName of ["staging", "prod"]) {
      for (const fileName of [
        "bootstrap-parameters.json",
        "backend-parameters.json",
        "frontend-parameters.json",
        "app-config-secret.template.json",
      ]) {
        fs.copyFileSync(
          path.join(rootDir, "infrastructure", "environments", environmentName, fileName),
          path.join(tempRoot, environmentName, fileName),
        );
      }
    }

    restoreStarterTemplateDefaults(path.join(tempRoot, "staging"), "staging");
    restoreStarterTemplateDefaults(path.join(tempRoot, "prod"), "prod");

    const prepareProdResult = runJsonScript("scripts/prepare-environment-starter.mjs", [
      "--environment=prod",
      `--environment-dir=${path.join(tempRoot, "prod")}`,
      "--account-id=123456789012",
      "--admin-root-url=https://admin.customer.test",
      "--cors-origin=https://admin.customer.test",
      "--content-root-url=https://content.customer.test",
      "--store-api-url=https://store.customer.test",
      "--transfer-url=https://transfer.customer.test",
      "--support-email=support@customer.test",
      "--support-phone=918-994-2638",
      "--support-site-url=https://support.customer.test",
      "--website-base-url=https://{subdomain}.customer.test",
      "--mobile-app-url=https://customer.test/app",
      "--domain-cname-target=proxy.customer.test",
      "--domain-a-target=3.23.251.61",
      "--default-stock-photo=https://content.customer.test/stockPhotos/default.png",
      "--write=true",
      "--write-secret-file=true",
      "--output=json",
    ]);

    if (prepareProdResult.status !== 0) {
      throw new Error(`prepare-environment-starter should succeed before rollout-status sample verification.\nSTDOUT:\n${prepareProdResult.stdout}\nSTDERR:\n${prepareProdResult.stderr}`);
    }

    let result;
    let githubFocusedResult;
    withFakeGhForDispatchGithubAwsDeploy(({ env }) => {
      result = runJsonScriptWithEnv("scripts/show-rollout-status.mjs", [
        "--environment-root-dir=.tmp-rollout-status-sample-env",
        "--output=json",
      ], env);
      githubFocusedResult = runJsonScriptWithEnv("scripts/show-rollout-status.mjs", [
        "--environment-root-dir=.tmp-rollout-status-sample-env",
        "--deployment-intent=github-actions",
        "--output=json",
      ], env);
    });

    if (result.status !== 1) {
      throw new Error(`show-rollout-status output sample contract run should stay blocked while the local Api repo is unreadable and GitHub secret materialization is still missing.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }
    if (githubFocusedResult.status !== 1) {
      throw new Error(`show-rollout-status github-focused sample contract run should stay blocked while starter or GitHub-specific blockers remain.\nSTDOUT:\n${githubFocusedResult.stdout}\nSTDERR:\n${githubFocusedResult.stderr}`);
    }

    const actual = result.parsed || {};
    const githubFocusedActual = githubFocusedResult.parsed || {};
    expectObjectContainsKeys("show-rollout-status output sample", actual, sample);

    if (sample.ok !== false || sample.environmentCount !== 2 || sample.blockedEnvironmentCount !== 2) {
      throw new Error(`show-rollout-status output sample should document a blocked two-environment rollout snapshot.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (!Array.isArray(sample.blockedEnvironments) || sample.blockedEnvironments.join(",") !== "staging,prod" || !Array.isArray(sample.readyEnvironments) || sample.readyEnvironments.length !== 0) {
      throw new Error(`show-rollout-status output sample should list the expected ready/blocked environment names.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (sample.blockerCategories?.starterOrInput?.environmentCount !== 1
      || sample.blockerCategories?.localExecution?.environmentCount !== 2
      || sample.blockerCategories?.githubActionsExecution?.environmentCount !== 2
      || sample.blockerCategories?.localGithubDispatch?.environmentCount !== 0) {
      throw new Error(`show-rollout-status output sample should include the expected blocker-category summary.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (sample.recommendedNextCommand !== "yarn prepare:environment-starter -- --environment=staging --account-id=<aws-account-id> --output=json") {
      throw new Error(`show-rollout-status output sample should surface the staging starter prep command first.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (!Array.isArray(sample.commandSummary?.global) || sample.commandSummary.global[0] !== sample.recommendedNextCommand) {
      throw new Error(`show-rollout-status output sample should expose the global command list.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (!Array.isArray(sample.commandSummary?.all) || !sample.commandSummary.all.includes("yarn sync:github-app-config-secret -- --environment=prod --secret-file=.tmp-rollout-status-sample-env/prod/app-config-secret.json")) {
      throw new Error(`show-rollout-status output sample should include the ordered cross-environment command list.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (!Array.isArray(sample.commandSummary?.byEnvironment?.staging) || sample.commandSummary.byEnvironment.staging.some((command) => command === sample.recommendedNextCommand)) {
      throw new Error(`show-rollout-status output sample should omit the top-level command from staging-specific commandSummary entries.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (!Array.isArray(sample.commandSummary?.byEnvironment?.prod) || !sample.commandSummary.byEnvironment.prod.some((command) => String(command).includes("deployment-source=backend-artifact"))) {
      throw new Error(`show-rollout-status output sample should preserve prod fallback commands in commandSummary.byEnvironment.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (!Array.isArray(sample.overallHighlightedBlockers) || !sample.overallHighlightedBlockers.some((entry) => String(entry).includes("AWS_APP_CONFIG_SECRET_JSON"))) {
      throw new Error(`show-rollout-status output sample should include the cross-environment blocker summary.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (!Array.isArray(sample.recommendedNextSteps) || sample.recommendedNextSteps.length !== 2) {
      throw new Error(`show-rollout-status output sample should include the cross-environment next-step summary.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }

    const environments = sample.environments || [];
    const staging = environments.find((entry) => entry.environment === "staging");
    const prod = environments.find((entry) => entry.environment === "prod");

    if (!staging || !prod) {
      throw new Error(`show-rollout-status output sample should include both staging and prod summaries.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (staging.status !== "blocked" || staging.starterAndInputBlockerCount !== 15 || staging.localGithubDispatchOk !== true) {
      throw new Error(`show-rollout-status output sample should preserve the blocked staging summary with local gh ready.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (!Array.isArray(staging.alternateCommands) || !staging.alternateCommands.some((command) => String(command).includes("dispatch:github-aws-deploy"))) {
      throw new Error(`show-rollout-status output sample should include staging alternate deploy commands.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (prod.status !== "blocked" || prod.starterAndInputBlockerCount !== 0 || prod.primaryCommand !== "yarn sync:github-app-config-secret -- --environment=prod --secret-file=.tmp-rollout-status-sample-env/prod/app-config-secret.json") {
      throw new Error(`show-rollout-status output sample should preserve the execution-blocked prod summary.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (!Array.isArray(prod.highlightedBlockers) || !prod.highlightedBlockers.some((blocker) => String(blocker).includes("AWS_APP_CONFIG_SECRET_JSON"))) {
      throw new Error(`show-rollout-status output sample should include the prod GitHub secret materialization blocker.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (githubFocusedActual.deploymentIntent !== "github-actions" || !Array.isArray(githubFocusedActual.ignoredBlockerCategories) || !githubFocusedActual.ignoredBlockerCategories.includes("localExecution")) {
      throw new Error(`show-rollout-status github-focused mode should report that localExecution blockers are ignored in the rollout summary.\nSTDOUT:\n${githubFocusedResult.stdout}`);
    }
    if (!Array.isArray(githubFocusedActual.overallHighlightedBlockers) || githubFocusedActual.overallHighlightedBlockers.some((entry) => String(entry).includes("Local api-repo path is not readable from this workspace"))) {
      throw new Error(`show-rollout-status github-focused mode should suppress local Api readability blockers from the overall summary.\nSTDOUT:\n${githubFocusedResult.stdout}`);
    }
    if (!Array.isArray(githubFocusedActual.commandSummary?.all) || githubFocusedActual.commandSummary.all.some((command) => String(command).includes("deploy-split-stack.sh"))) {
      throw new Error(`show-rollout-status github-focused mode should keep local deploy commands out of the recommended command list.\nSTDOUT:\n${githubFocusedResult.stdout}`);
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function expectShowRolloutStatusCommandsOutputWorks() {
  const tempRoot = fs.mkdtempSync(path.join(rootDir, ".tmp-rollout-status-commands-root-"));

  try {
    for (const environmentName of ["staging", "prod"]) {
      const targetDir = path.join(tempRoot, environmentName);
      fs.mkdirSync(targetDir, { recursive: true });

      for (const fileName of [
        "bootstrap-parameters.json",
        "backend-parameters.json",
        "frontend-parameters.json",
        "app-config-secret.template.json",
      ]) {
        fs.copyFileSync(
          path.join(rootDir, "infrastructure", "environments", environmentName, fileName),
          path.join(targetDir, fileName),
        );
      }
    }

    restoreStarterTemplateDefaults(path.join(tempRoot, "staging"), "staging");
    restoreStarterTemplateDefaults(path.join(tempRoot, "prod"), "prod");

    const result = spawnSync("node", ["scripts/show-rollout-status.mjs", `--environment-root-dir=${tempRoot}`, "--output=commands"], {
      cwd: rootDir,
      encoding: "utf8",
    });

    const stdout = result.stdout || "";
    const stderr = result.stderr || "";
    const lines = stdout.trim().split("\n");

    if (result.status !== 1) {
      throw new Error(`show-rollout-status commands mode should exit non-zero when any environment is blocked.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`);
    }
    if (!lines[0].startsWith("yarn prepare:environment-starter -- --environment=staging --environment-dir=")
      || !lines[0].endsWith(" --account-id=<aws-account-id> --output=json")) {
      throw new Error(`show-rollout-status commands mode should print the top recommended command first.\nSTDOUT:\n${stdout}`);
    }
    if (!stdout.includes("# staging") || !stdout.includes("# prod")) {
      throw new Error(`show-rollout-status commands mode should split command lists by environment.\nSTDOUT:\n${stdout}`);
    }
    if ((stdout.match(new RegExp(`^${lines[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "gm")) || []).length !== 1) {
      throw new Error(`show-rollout-status commands mode should not repeat the same top-level remediation command inside each environment block.\nSTDOUT:\n${stdout}`);
    }
    if (!stdout.includes("gh workflow run deploy-aws-self-hosted.yml")) {
      throw new Error(`show-rollout-status commands mode should include alternate deploy commands from the underlying plan.\nSTDOUT:\n${stdout}`);
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function expectPlanEnvironmentDeployMarkdownOutputWorks() {
  let result;
  withFailingGhForDispatchGithubAwsDeploy((env) => withRawStarterEnvironment("staging", (tempDir) => {
    result = spawnSync("node", ["scripts/plan-environment-deploy.mjs", "--environment=staging", `--environment-dir=${tempDir}`, "--api-repo-path=.", "--output=markdown"], {
      cwd: rootDir,
      encoding: "utf8",
      env: { ...process.env, ...env },
    });
  }));

  const stdout = result.stdout || "";
  const stderr = result.stderr || "";

  if (result.status !== 1) {
    throw new Error(`plan-environment-deploy markdown mode should be blocked while staging placeholders remain.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`);
  }

  const expectedSnippets = [
    "# Environment Deploy Plan: staging",
    "## Blockers",
    "## Recommendation",
    "## Starter Prep",
    "## Preflight",
    "## Local Run",
    "## GitHub Actions Run",
    "## GitHub Secrets",
    "aws-staging-deployment-evidence",
    "aws-staging-preflight-plan",
    "saved-output follow-up commands",
    "jwtSecret",
    "encryptionKey",
    "audit:api-repo-contract",
    "prepare:environment-starter",
    "Local GitHub dispatch: blocked",
    "gh auth login -h github.com",
  ];

  for (const snippet of expectedSnippets) {
    if (!stdout.includes(snippet)) {
      throw new Error(`plan-environment-deploy markdown output is missing expected content: ${snippet}\nSTDOUT:\n${stdout}`);
    }
  }
}

function expectPlanEnvironmentDeployReadyPackageManifestModeWorks() {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-plan-environment-deploy-"));

  try {
    for (const fileName of [
      "bootstrap-parameters.json",
      "backend-parameters.json",
      "frontend-parameters.json",
      "app-config-secret.template.json",
    ]) {
      fs.copyFileSync(
        path.join(rootDir, "infrastructure", "environments", "staging", fileName),
        path.join(tempDir, fileName),
      );
    }

    const prepareResult = runJsonScript("scripts/prepare-environment-starter.mjs", [
      "--environment=staging",
      `--environment-dir=${tempDir}`,
      "--account-id=123456789012",
      "--write=true",
      "--output=json",
    ]);

    if (prepareResult.status !== 0) {
      throw new Error(`prepare-environment-starter should succeed before ready-mode plan verification.\nSTDOUT:\n${prepareResult.stdout}\nSTDERR:\n${prepareResult.stderr}`);
    }

    replaceStarterBackendDefaults(tempDir, "staging");

    const manifestPath = path.join(tempDir, "package-manifest.json");
    fs.writeFileSync(manifestPath, `${JSON.stringify({ artifactPath: "./api.zip" }, null, 2)}\n`);

    let planResult;
    withFakeGhForDispatchGithubAwsDeploy(({ env }) => {
      planResult = runJsonScriptWithEnv("scripts/plan-environment-deploy.mjs", [
        "--environment=staging",
        `--environment-dir=${tempDir}`,
        "--deployment-source=package-manifest",
        `--package-manifest-file=${manifestPath}`,
        "--github-auth-mode=static",
        "--sync-app-config-secret=true",
        "--run-api-migrations=true",
        "--api-migration-action=status",
        "--api-migration-module=membership",
        "--output=json",
      ], env);
    });

    if (planResult.status !== 0) {
      throw new Error(`plan-environment-deploy should report ready after prepare write mode and valid package-manifest inputs.\nSTDOUT:\n${planResult.stdout}\nSTDERR:\n${planResult.stderr}`);
    }

    const actual = planResult.parsed || {};
    if (actual.ok !== true || actual.starterSummary?.blockerCount !== 0) {
      throw new Error(`plan-environment-deploy ready-mode result should be ok with zero starter blockers.\nSTDOUT:\n${planResult.stdout}`);
    }
    if (actual.localExecution?.ok !== true || actual.githubActionsExecution?.ok !== true) {
      throw new Error(`plan-environment-deploy ready-mode result should mark both local and GitHub execution as ready.\nSTDOUT:\n${planResult.stdout}`);
    }
    if (actual.localGithubDispatch?.ok !== true || actual.localGithubDispatch?.blockerCount !== 0) {
      throw new Error(`plan-environment-deploy ready-mode result should mark local gh dispatch as ready when gh auth succeeds.\nSTDOUT:\n${planResult.stdout}`);
    }
    if (actual.recommendedExecution?.path !== "either") {
      throw new Error(`plan-environment-deploy ready-mode result should recommend either path when both are ready.\nSTDOUT:\n${planResult.stdout}`);
    }
    if (actual.recommendedCommands?.primary !== actual.commands?.local) {
      throw new Error(`plan-environment-deploy ready-mode result should recommend the local command first when both paths are ready.\nSTDOUT:\n${planResult.stdout}`);
    }
    if (!String(actual.postDeployCommands?.verifyWithHttp || "").includes("--check-http=true")) {
      throw new Error(`plan-environment-deploy ready-mode result should include the HTTP verification follow-up command.\nSTDOUT:\n${planResult.stdout}`);
    }
    if (!String(actual.githubSecretSyncCommand || "").includes("yarn sync:github-app-config-secret -- --environment=staging")
      || !String(actual.githubSecretSyncCommand || "").includes("--secret-file=")) {
      throw new Error(`plan-environment-deploy ready-mode result should include the GitHub app-config secret sync helper command when app-config-secret.json exists.\nSTDOUT:\n${planResult.stdout}`);
    }
    if (!String(actual.postDeployCommands?.ensureOutputsDir || "").includes("mkdir -p deployment/staging")
      || !String(actual.postDeployCommands?.saveBackendOutputs || "").includes("mkdir -p deployment/staging && aws cloudformation describe-stacks")
      || !String(actual.postDeployCommands?.saveFrontendOutputs || "").includes("mkdir -p deployment/staging && aws cloudformation describe-stacks")) {
      throw new Error(`plan-environment-deploy ready-mode result should include output-capture follow-up commands.\nSTDOUT:\n${planResult.stdout}`);
    }
    if (!String(actual.postDeployCommands?.saveOutputsWithHelper || "").includes("yarn save:split-stack-outputs -- --environment=staging --region=us-east-1")) {
      throw new Error(`plan-environment-deploy ready-mode result should include the helper-based output capture command.\nSTDOUT:\n${planResult.stdout}`);
    }
    if (!String(actual.postDeployCommands?.showSavedSummary || "").includes("yarn show:deployment-summary -- --summary-file=deployment/staging/deployment-summary.json --output=markdown")) {
      throw new Error(`plan-environment-deploy ready-mode result should include the saved-summary render command.\nSTDOUT:\n${planResult.stdout}`);
    }
    if (!String(actual.postDeployCommands?.verifyFromSavedOutputs || "").includes("--backend-outputs-file=deployment/staging/backend-outputs.json")
      || !String(actual.postDeployCommands?.verifyFromSavedOutputsWithHttp || "").includes("--check-http=true")
      || !String(actual.postDeployCommands?.publishFromSavedOutputs || "").includes("--skip-backend --skip-frontend --publish-frontend-assets")
      || !String(actual.postDeployCommands?.publishFrontendAssetsFromSavedOutputs || "").includes("yarn publish:frontend-assets -- --frontend-outputs-file=deployment/staging/frontend-outputs.json")) {
      throw new Error(`plan-environment-deploy ready-mode result should include saved-output reuse follow-up commands.\nSTDOUT:\n${planResult.stdout}`);
    }
    if (actual.githubPostDeploy?.artifactName !== "aws-staging-deployment-evidence"
      || actual.githubPostDeploy?.artifactPath !== "deployment/staging/"
      || actual.githubPostDeploy?.failureArtifactName !== "aws-staging-preflight-plan"
      || actual.githubPostDeploy?.failureArtifactPath !== "deployment/staging/preflight-plan.md"
      || !Array.isArray(actual.githubPostDeploy?.summaryIncludes)
      || !actual.githubPostDeploy.summaryIncludes.includes("preflight deploy plan")
      || !actual.githubPostDeploy.summaryIncludes.includes("saved-output follow-up commands")) {
      throw new Error(`plan-environment-deploy ready-mode result should include the GitHub post-deploy handoff.\nSTDOUT:\n${planResult.stdout}`);
    }

    const requiredSecrets = actual.requiredGithubSecrets || [];
    for (const secretName of ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_APP_CONFIG_SECRET_JSON"]) {
      if (!requiredSecrets.includes(secretName)) {
        throw new Error(`plan-environment-deploy ready-mode result is missing required GitHub secret: ${secretName}\nSTDOUT:\n${planResult.stdout}`);
      }
    }

    const localCommand = actual.commands?.local || "";
    const localPreviewCommand = actual.commands?.localPreview || "";
    const githubWrapperCommand = actual.commands?.githubActionsWrapper || "";
    const githubWrapperPreviewCommand = actual.commands?.githubActionsWrapperPreview || "";
    const githubCommand = actual.commands?.githubActions || "";
    const githubPreviewCommand = actual.commands?.githubActionsPreview || "";

    for (const snippet of [
      "PACKAGE_MANIFEST_FILE=",
      "SYNC_APP_CONFIG_SECRET='true'",
      "RUN_API_MIGRATIONS='true'",
      "API_MIGRATION_ACTION='status'",
      "API_MIGRATION_MODULE='membership'",
    ]) {
      if (!localCommand.includes(snippet)) {
        throw new Error(`plan-environment-deploy ready-mode local command is missing expected content: ${snippet}\nSTDOUT:\n${planResult.stdout}`);
      }
    }
    if (!localPreviewCommand.includes("PREVIEW_ONLY='true'")) {
      throw new Error(`plan-environment-deploy ready-mode local preview command should include PREVIEW_ONLY='true'.\nSTDOUT:\n${planResult.stdout}`);
    }

    if (!githubWrapperCommand.includes("yarn dispatch:github-aws-deploy --")
      || !githubWrapperCommand.includes("--deployment-source=package-manifest")
      || !githubWrapperCommand.includes("--sync-app-config-secret=true")) {
      throw new Error(`plan-environment-deploy ready-mode GitHub wrapper command is missing expected content.\nSTDOUT:\n${planResult.stdout}`);
    }
    if (!githubWrapperPreviewCommand.includes("--preview-only=true")) {
      throw new Error(`plan-environment-deploy ready-mode GitHub preview wrapper command should include --preview-only=true.\nSTDOUT:\n${planResult.stdout}`);
    }

    for (const snippet of [
      "deployment_source='package-manifest'",
      "sync_app_config_secret='true'",
      "run_api_migrations='true'",
      "api_migration_action='status'",
      "api_migration_module='membership'",
    ]) {
      if (!githubCommand.includes(snippet)) {
        throw new Error(`plan-environment-deploy ready-mode GitHub command is missing expected content: ${snippet}\nSTDOUT:\n${planResult.stdout}`);
      }
    }
    if (!githubPreviewCommand.includes("preview_only='true'")) {
      throw new Error(`plan-environment-deploy ready-mode GitHub preview command should include preview_only='true'.\nSTDOUT:\n${planResult.stdout}`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function expectPlanEnvironmentDeployGithubNeedsSecretMaterializationWorks() {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-plan-environment-github-secret-"));

  try {
    for (const fileName of [
      "bootstrap-parameters.json",
      "backend-parameters.json",
      "frontend-parameters.json",
      "app-config-secret.template.json",
    ]) {
      fs.copyFileSync(
        path.join(rootDir, "infrastructure", "environments", "staging", fileName),
        path.join(tempDir, fileName),
      );
    }

    restoreStarterTemplateDefaults(tempDir, "staging");

    const prepareResult = runJsonScript("scripts/prepare-environment-starter.mjs", [
      "--environment=staging",
      `--environment-dir=${tempDir}`,
      "--account-id=123456789012",
      "--admin-root-url=https://admin-staging.customer.test",
      "--cors-origin=https://admin-staging.customer.test",
      "--content-root-url=https://content-staging.customer.test",
      "--store-api-url=https://store-staging.customer.test",
      "--transfer-url=https://transfer-staging.customer.test",
      "--support-email=support@customer.test",
      "--support-phone=918-994-2638",
      "--support-site-url=https://support-staging.customer.test",
      "--website-base-url=https://{subdomain}.customer.test",
      "--mobile-app-url=https://customer.test/app",
      "--domain-cname-target=proxy.customer.test",
      "--domain-a-target=3.23.251.61",
      "--default-stock-photo=https://content.customer.test/stockPhotos/default.png",
      "--write=true",
      "--write-secret-file=true",
      "--output=json",
    ]);

    if (prepareResult.status !== 0) {
      throw new Error(`prepare-environment-starter should succeed before GitHub secret-materialization plan verification.\nSTDOUT:\n${prepareResult.stdout}\nSTDERR:\n${prepareResult.stderr}`);
    }

    const manifestPath = path.join(tempDir, "package-manifest.json");
    fs.writeFileSync(manifestPath, `${JSON.stringify({ artifactPath: "./api.zip" }, null, 2)}\n`);

    const planResult = runJsonScript("scripts/plan-environment-deploy.mjs", [
      "--environment=staging",
      `--environment-dir=${tempDir}`,
      "--deployment-source=package-manifest",
      `--package-manifest-file=${manifestPath}`,
      "--output=json",
    ]);

    if (planResult.status !== 0) {
      throw new Error(`plan-environment-deploy should stay overall-ready when only the GitHub secret-materialization blocker remains.\nSTDOUT:\n${planResult.stdout}\nSTDERR:\n${planResult.stderr}`);
    }

    const actual = planResult.parsed || {};
    if (actual.ok !== true || actual.localExecution?.ok !== true || actual.githubActionsExecution?.ok !== false) {
      throw new Error(`plan-environment-deploy should keep the local path ready while blocking GitHub until app-config-secret is materialized there.\nSTDOUT:\n${planResult.stdout}`);
    }
    if (actual.recommendedExecution?.path !== "local") {
      throw new Error(`plan-environment-deploy should recommend the local path when GitHub is missing app-config-secret materialization.\nSTDOUT:\n${planResult.stdout}`);
    }
    if (!actual.githubActionsExecution?.blockers?.some((entry) => String(entry).includes("Enable sync-app-config-secret and provide AWS_APP_CONFIG_SECRET_JSON"))) {
      throw new Error(`plan-environment-deploy should explain how to materialize app-config-secret on the GitHub runner.\nSTDOUT:\n${planResult.stdout}`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function expectPlanEnvironmentDeployLocalOnlyExecutionBlockerWorks() {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-plan-environment-local-only-"));

  try {
    for (const fileName of [
      "bootstrap-parameters.json",
      "backend-parameters.json",
      "frontend-parameters.json",
      "app-config-secret.template.json",
    ]) {
      fs.copyFileSync(
        path.join(rootDir, "infrastructure", "environments", "staging", fileName),
        path.join(tempDir, fileName),
      );
    }

    const prepareResult = runJsonScript("scripts/prepare-environment-starter.mjs", [
      "--environment=staging",
      `--environment-dir=${tempDir}`,
      "--account-id=123456789012",
      "--write=true",
      "--output=json",
    ]);

    if (prepareResult.status !== 0) {
      throw new Error(`prepare-environment-starter should succeed before local-only execution blocker verification.\nSTDOUT:\n${prepareResult.stdout}\nSTDERR:\n${prepareResult.stderr}`);
    }

    replaceStarterBackendDefaults(tempDir, "staging");

    const missingManifestPath = path.join(tempDir, "missing-package-manifest.json");
    let planResult;
    withFakeGhForDispatchGithubAwsDeploy(({ env }) => {
      planResult = runJsonScriptWithEnv("scripts/plan-environment-deploy.mjs", [
        "--environment=staging",
        `--environment-dir=${tempDir}`,
        "--deployment-source=package-manifest",
        `--package-manifest-file=${missingManifestPath}`,
        "--sync-app-config-secret=true",
        "--output=json",
      ], env);
    });

    if (planResult.status !== 0) {
      throw new Error(`plan-environment-deploy should stay overall-ready when starter files are prepared and package-manifest input is present, even if the local file path is missing.\nSTDOUT:\n${planResult.stdout}\nSTDERR:\n${planResult.stderr}`);
    }

    const actual = planResult.parsed || {};
    if (actual.ok !== true || actual.githubActionsExecution?.ok !== true || actual.localExecution?.ok !== false) {
      throw new Error(`plan-environment-deploy should distinguish local-only execution blockers from shared readiness blockers.\nSTDOUT:\n${planResult.stdout}`);
    }
    if (actual.recommendedExecution?.path !== "github-actions") {
      throw new Error(`plan-environment-deploy should recommend GitHub Actions when it is ready and the local path is not.\nSTDOUT:\n${planResult.stdout}`);
    }
    if (actual.recommendedCommands?.primary !== actual.commands?.githubActionsWrapper) {
      throw new Error(`plan-environment-deploy should recommend the GitHub wrapper command first when only GitHub is ready.\nSTDOUT:\n${planResult.stdout}`);
    }

    const localBlockers = actual.localExecution?.blockers || [];
    if (!localBlockers.some((entry) => String(entry).includes("Local package manifest file does not exist yet:"))) {
      throw new Error(`plan-environment-deploy did not surface the missing local package manifest as a local-only execution blocker.\nSTDOUT:\n${planResult.stdout}`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function expectPlanEnvironmentDeployUnreadableApiRepoLocalOnlyBlockerWorks() {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-plan-environment-unreadable-api-"));

  try {
    for (const fileName of [
      "bootstrap-parameters.json",
      "backend-parameters.json",
      "frontend-parameters.json",
      "app-config-secret.template.json",
    ]) {
      fs.copyFileSync(
        path.join(rootDir, "infrastructure", "environments", "staging", fileName),
        path.join(tempDir, fileName),
      );
    }

    const prepareResult = runJsonScript("scripts/prepare-environment-starter.mjs", [
      "--environment=staging",
      `--environment-dir=${tempDir}`,
      "--account-id=123456789012",
      "--write=true",
      "--output=json",
    ]);

    if (prepareResult.status !== 0) {
      throw new Error(`prepare-environment-starter should succeed before unreadable api-repo verification.\nSTDOUT:\n${prepareResult.stdout}\nSTDERR:\n${prepareResult.stderr}`);
    }

    replaceStarterBackendDefaults(tempDir, "staging");

    withFakeGhForDispatchGithubAwsDeploy(({ env }) => withUnreadableFakeApiRepoDirectory((fakeApiRepoPath) => {
      const planResult = runJsonScriptWithEnv("scripts/plan-environment-deploy.mjs", [
        "--environment=staging",
        `--environment-dir=${tempDir}`,
        "--deployment-source=api-repo",
        `--api-repo-path=${fakeApiRepoPath}`,
        "--sync-app-config-secret=true",
        "--output=json",
      ], env);

      if (planResult.status !== 0) {
        throw new Error(`plan-environment-deploy should stay overall-ready when starter files are prepared and only the local api-repo path is unreadable.\nSTDOUT:\n${planResult.stdout}\nSTDERR:\n${planResult.stderr}`);
      }

      const actual = planResult.parsed || {};
      if (actual.ok !== true || actual.githubActionsExecution?.ok !== true || actual.localExecution?.ok !== false) {
        throw new Error(`plan-environment-deploy should classify an unreadable local api-repo path as a local-only execution blocker.\nSTDOUT:\n${planResult.stdout}`);
      }
      if (actual.recommendedExecution?.path !== "github-actions") {
        throw new Error(`plan-environment-deploy should recommend GitHub Actions when the local api-repo path is unreadable.\nSTDOUT:\n${planResult.stdout}`);
      }
      if (actual.recommendedCommands?.primary !== actual.commands?.githubActionsWrapper) {
        throw new Error(`plan-environment-deploy should recommend the GitHub wrapper command first when only the local api-repo path is unreadable.\nSTDOUT:\n${planResult.stdout}`);
      }

      const localBlockers = actual.localExecution?.blockers || [];
      if (!localBlockers.some((entry) => String(entry).includes("Local api-repo path is not readable from this workspace:"))) {
        throw new Error(`plan-environment-deploy did not surface the unreadable local api-repo path.\nSTDOUT:\n${planResult.stdout}`);
      }
      if (!localBlockers.some((entry) => String(entry).includes("deployment-source=package-manifest"))
        || !localBlockers.some((entry) => String(entry).includes("deployment-source=backend-artifact"))) {
        throw new Error(`plan-environment-deploy did not include the expected manifest/artifact fallback guidance.\nSTDOUT:\n${planResult.stdout}`);
      }
      const packageManifestPlan = String(actual.localFallbackCommands?.packageManifestPlan || "");
      const packageManifestLocal = String(actual.localFallbackCommands?.packageManifestLocal || "");
      const backendArtifactPlan = String(actual.localFallbackCommands?.backendArtifactPlan || "");
      const backendArtifactLocal = String(actual.localFallbackCommands?.backendArtifactLocal || "");

      if (!packageManifestPlan.includes("--deployment-source=package-manifest")
        || !packageManifestLocal.includes("PACKAGE_MANIFEST_FILE=")
        || !backendArtifactPlan.includes("--deployment-source=backend-artifact")
        || !backendArtifactLocal.includes("BACKEND_ARTIFACT_SOURCE_FILE=")) {
        throw new Error(`plan-environment-deploy did not include the expected concrete fallback commands.\nSTDOUT:\n${planResult.stdout}`);
      }
      if (backendArtifactLocal.includes("MIGRATION_ARTIFACT_SOURCE_FILE=")
        || backendArtifactLocal.includes("DEPENDENCIES_LAYER_SOURCE_FILE=")) {
        throw new Error(`plan-environment-deploy should keep the local backend-artifact fallback focused on the backend zip unless the user supplies extra artifacts separately.\nSTDOUT:\n${planResult.stdout}`);
      }
      if (!Array.isArray(actual.nextSteps)
        || !actual.nextSteps.some((entry) => String(entry).includes("switch the local run to package-manifest or backend-artifact mode"))) {
        throw new Error(`plan-environment-deploy did not add the expected fallback next step.\nSTDOUT:\n${planResult.stdout}`);
      }
    }));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function expectPlanEnvironmentDeployGithubOnlyNeedsGhAuthWorks() {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-plan-environment-github-only-auth-"));

  try {
    for (const fileName of [
      "bootstrap-parameters.json",
      "backend-parameters.json",
      "frontend-parameters.json",
      "app-config-secret.template.json",
    ]) {
      fs.copyFileSync(
        path.join(rootDir, "infrastructure", "environments", "staging", fileName),
        path.join(tempDir, fileName),
      );
    }

    const prepareResult = runJsonScript("scripts/prepare-environment-starter.mjs", [
      "--environment=staging",
      `--environment-dir=${tempDir}`,
      "--account-id=123456789012",
      "--write=true",
      "--output=json",
    ]);

    if (prepareResult.status !== 0) {
      throw new Error(`prepare-environment-starter should succeed before github-only gh-auth verification.\nSTDOUT:\n${prepareResult.stdout}\nSTDERR:\n${prepareResult.stderr}`);
    }

    replaceStarterBackendDefaults(tempDir, "staging");

    const missingManifestPath = path.join(tempDir, "missing-package-manifest.json");
    withFailingGhForDispatchGithubAwsDeploy((env) => {
      const planResult = runJsonScriptWithEnv("scripts/plan-environment-deploy.mjs", [
        "--environment=staging",
        `--environment-dir=${tempDir}`,
        "--deployment-source=package-manifest",
        `--package-manifest-file=${missingManifestPath}`,
        "--sync-app-config-secret=true",
        "--output=json",
      ], env);

      if (planResult.status !== 0) {
        throw new Error(`plan-environment-deploy should stay overall-ready when GitHub is the only deploy path and gh auth is the remaining machine blocker.\nSTDOUT:\n${planResult.stdout}\nSTDERR:\n${planResult.stderr}`);
      }

      const actual = planResult.parsed || {};
      if (actual.ok !== true
        || actual.recommendedExecution?.path !== "github-actions"
        || actual.githubActionsExecution?.ok !== true
        || actual.localExecution?.ok !== false
        || actual.localGithubDispatch?.ok !== false) {
        throw new Error(`plan-environment-deploy should classify this as a GitHub-only path blocked locally by gh auth.\nSTDOUT:\n${planResult.stdout}`);
      }
      if (actual.recommendedCommands?.primary !== "gh auth login -h github.com") {
        throw new Error(`plan-environment-deploy should recommend fixing gh auth before a GitHub-only deploy from this machine.\nSTDOUT:\n${planResult.stdout}`);
      }
      if (!Array.isArray(actual.nextSteps)
        || !String(actual.nextSteps[0] || "").includes("Run `gh auth login -h github.com` first")) {
        throw new Error(`plan-environment-deploy should prioritize the gh auth remediation step in nextSteps.\nSTDOUT:\n${planResult.stdout}`);
      }
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function expectPlanEnvironmentDeployGhNetworkFailureWorks() {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-plan-environment-gh-network-"));

  try {
    for (const fileName of [
      "bootstrap-parameters.json",
      "backend-parameters.json",
      "frontend-parameters.json",
      "app-config-secret.template.json",
    ]) {
      fs.copyFileSync(
        path.join(rootDir, "infrastructure", "environments", "staging", fileName),
        path.join(tempDir, fileName),
      );
    }

    const prepareResult = runJsonScript("scripts/prepare-environment-starter.mjs", [
      "--environment=staging",
      `--environment-dir=${tempDir}`,
      "--account-id=123456789012",
      "--write=true",
      "--output=json",
    ]);

    if (prepareResult.status !== 0) {
      throw new Error(`prepare-environment-starter should succeed before gh network failure verification.\nSTDOUT:\n${prepareResult.stdout}\nSTDERR:\n${prepareResult.stderr}`);
    }

    replaceStarterBackendDefaults(tempDir, "staging");

    const missingManifestPath = path.join(tempDir, "missing-package-manifest.json");
    withNetworkFailingGhForPlanEnvironmentDeploy((env) => {
      const planResult = runJsonScriptWithEnv("scripts/plan-environment-deploy.mjs", [
        "--environment=staging",
        `--environment-dir=${tempDir}`,
        "--deployment-source=package-manifest",
        `--package-manifest-file=${missingManifestPath}`,
        "--sync-app-config-secret=true",
        "--output=json",
      ], env);

      if (planResult.status !== 0) {
        throw new Error(`plan-environment-deploy should stay overall-ready when GitHub is the only deploy path and the remaining machine blocker is connectivity.\nSTDOUT:\n${planResult.stdout}\nSTDERR:\n${planResult.stderr}`);
      }

      const actual = planResult.parsed || {};
      if (actual.localGithubDispatch?.ok !== false
        || !actual.localGithubDispatch?.blockers?.some((entry) => String(entry).includes("could not reach github.com"))) {
        throw new Error(`plan-environment-deploy should classify gh network failures separately from invalid-token auth failures.\nSTDOUT:\n${planResult.stdout}`);
      }
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function expectPlanEnvironmentDeployExecutionRemediationCommandWorks() {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-plan-environment-remediation-"));

  try {
    for (const fileName of [
      "bootstrap-parameters.json",
      "backend-parameters.json",
      "frontend-parameters.json",
      "app-config-secret.template.json",
    ]) {
      fs.copyFileSync(
        path.join(rootDir, "infrastructure", "environments", "staging", fileName),
        path.join(tempDir, fileName),
      );
    }

    const prepareResult = runJsonScript("scripts/prepare-environment-starter.mjs", [
      "--environment=staging",
      `--environment-dir=${tempDir}`,
      "--account-id=123456789012",
      "--write=true",
      "--write-secret-file=true",
      "--output=json",
    ]);

    if (prepareResult.status !== 0) {
      throw new Error(`prepare-environment-starter should succeed before execution-remediation verification.\nSTDOUT:\n${prepareResult.stdout}\nSTDERR:\n${prepareResult.stderr}`);
    }

    replaceStarterBackendDefaults(tempDir, "staging");

    withFailingGhForDispatchGithubAwsDeploy((env) => withUnreadableFakeApiRepoDirectory((fakeApiRepoPath) => {
      const planResult = runJsonScriptWithEnv("scripts/plan-environment-deploy.mjs", [
        "--environment=staging",
        `--environment-dir=${tempDir}`,
        "--deployment-source=api-repo",
        `--api-repo-path=${fakeApiRepoPath}`,
        "--output=json",
      ], env);

      if (planResult.status !== 0) {
        throw new Error(`plan-environment-deploy should stay overall-ready when only execution-specific blockers remain.\nSTDOUT:\n${planResult.stdout}\nSTDERR:\n${planResult.stderr}`);
      }

      const actual = planResult.parsed || {};
      if (actual.ok !== true
        || actual.recommendedExecution?.path !== "none"
        || actual.localExecution?.ok !== false
        || actual.githubActionsExecution?.ok !== false
        || actual.localGithubDispatch?.ok !== false) {
        throw new Error(`plan-environment-deploy should classify this as execution-only blockers with no runnable path yet.\nSTDOUT:\n${planResult.stdout}`);
      }
      if (actual.recommendedCommands?.primary !== "gh auth login -h github.com") {
        throw new Error(`plan-environment-deploy should recommend fixing local gh auth first when GitHub dispatch remediation depends on it.\nSTDOUT:\n${planResult.stdout}`);
      }
      if (!Array.isArray(actual.nextSteps)
        || !String(actual.nextSteps[0] || "").includes("Run `gh auth login -h github.com` first")) {
        throw new Error(`plan-environment-deploy should prioritize the gh auth remediation step in nextSteps when execution-only blockers remain.\nSTDOUT:\n${planResult.stdout}`);
      }
      const alternates = actual.recommendedCommands?.alternates || [];
      if (!alternates.some((entry) => String(entry).includes("sync:github-app-config-secret"))
        || !alternates.some((entry) => String(entry).includes("--deployment-source=package-manifest"))
        || !alternates.some((entry) => String(entry).includes("--deployment-source=backend-artifact"))) {
        throw new Error(`plan-environment-deploy should include the GitHub secret sync and local fallback remediation commands.\nSTDOUT:\n${planResult.stdout}`);
      }
    }));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function expectPlanEnvironmentDeployBackendArtifactInputBlockerWorks() {
  const result = runJsonScript("scripts/plan-environment-deploy.mjs", [
    "--environment=staging",
    "--deployment-source=backend-artifact",
    "--output=json",
  ]);

  if (result.status !== 1) {
    throw new Error(`plan-environment-deploy backend-artifact mode should fail when no backend artifact source file is provided.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }

  const inputBlockers = result.parsed?.inputBlockers || [];
  if (!inputBlockers.some((entry) => String(entry).includes("backend-artifact-source-file is required"))) {
    throw new Error(`plan-environment-deploy backend-artifact mode did not report the missing backend-artifact-source-file blocker.\nSTDOUT:\n${result.stdout}`);
  }
}

function expectDeployBackendPackageManifestMissingMigrationArtifact() {
  withFakePackageManifest((manifestPath) => {
    withFakeAwsAllowingS3Cp((env) => {
      const result = runScriptWithEnv("scripts/deploy-backend.mjs", [
        "--stack-name=example-backend",
        "--parameters-file=infrastructure/examples/backend-parameters.sample.json",
        `--package-manifest-file=${manifestPath}`,
        "--lambda-code-s3-bucket=my-artifacts-bucket",
        "--run-migrations=true",
        "--migration-handler=index.migrate",
      ], env);

      if (result.status === 0) {
        throw new Error(`deploy-backend package manifest missing migration artifact unexpectedly passed.\nSTDOUT:\n${result.stdout}`);
      }

      const combined = `${result.stdout}\n${result.stderr}`;
      if (!combined.includes("Source file not found:")) {
        throw new Error(`deploy-backend package manifest missing migration artifact did not include expected missing artifact error.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
      }
    });
  }, { missingMigrationArtifact: true });
}

function expectDeployAwsPackageManifestMissingMigrationArtifact() {
  withFakePackageManifest((manifestPath) => {
    withFakeAwsAllowingS3Cp((env) => {
      const result = runScriptWithEnv("scripts/deploy-aws.mjs", [
        "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
        `--package-manifest-file=${manifestPath}`,
        "--lambda-code-s3-bucket=my-artifacts-bucket",
        "--run-migrations=true",
        "--migration-handler=index.migrate",
        "--skip-frontend",
      ], env);

      if (result.status === 0) {
        throw new Error(`deploy-aws package manifest missing migration artifact unexpectedly passed.\nSTDOUT:\n${result.stdout}`);
      }

      const combined = `${result.stdout}\n${result.stderr}`;
      if (!combined.includes("Source file not found:")) {
        throw new Error(`deploy-aws package manifest missing migration artifact did not include expected missing artifact error.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
      }
    });
  }, { missingMigrationArtifact: true });
}

function expectDeployBackendJsonIncludesManifestProvenance() {
  withFakePackageManifest((manifestPath) => {
    withFakeAwsForBackendDeploy((env) => {
      const result = runJsonScriptWithEnv("scripts/deploy-backend.mjs", [
        "--stack-name=example-backend",
        `--package-manifest-file=${manifestPath}`,
        "--lambda-code-s3-bucket=my-artifacts-bucket",
        "--output=json",
      ], env);

      if (result.status !== 0) {
        throw new Error(`deploy-backend json provenance failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
      }

      const parsed = result.parsed || {};
      if (parsed.resolvedPackageManifestFile !== manifestPath) {
        throw new Error(`deploy-backend json output did not include the resolved manifest path.\nSTDOUT:\n${result.stdout}`);
      }

      const expectedBackendArtifact = path.join(path.dirname(manifestPath), "api-test-self-contained.zip");
      if (parsed.resolvedBackendArtifactSourceFile !== expectedBackendArtifact) {
        throw new Error(`deploy-backend json output did not include the resolved backend artifact path.\nSTDOUT:\n${result.stdout}`);
      }
    });
  });
}

function expectDeployAwsJsonIncludesManifestProvenance() {
  withFakePackageManifest((manifestPath) => {
    withFakeAwsForBackendDeploy((env) => {
      const result = runJsonScriptWithEnv("scripts/deploy-aws.mjs", [
        "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
        "--backend-stack-name=example-backend",
        `--package-manifest-file=${manifestPath}`,
        "--lambda-code-s3-bucket=my-artifacts-bucket",
        "--skip-frontend",
        "--output=json",
      ], env);

      if (result.status !== 0) {
        throw new Error(`deploy-aws json provenance failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
      }

      const parsed = result.parsed || {};
      if (parsed.resolvedPackageManifestFile !== manifestPath) {
        throw new Error(`deploy-aws json output did not include the resolved manifest path.\nSTDOUT:\n${result.stdout}`);
      }

      const expectedBackendArtifact = path.join(path.dirname(manifestPath), "api-test-self-contained.zip");
      if (parsed.resolvedBackendArtifactSourceFile !== expectedBackendArtifact) {
        throw new Error(`deploy-aws json output did not include the resolved backend artifact path.\nSTDOUT:\n${result.stdout}`);
      }

      if (parsed.backend?.lambdaCodeS3Key !== "b1admin/prod/backend/api.zip") {
        throw new Error(`deploy-aws nested backend json output did not reflect the uploaded backend artifact key.\nSTDOUT:\n${result.stdout}`);
      }
    });
  });
}

function expectDeployBackendOutputSampleMatchesContract() {
  const sample = readJsonFile("infrastructure/examples/deploy-backend-output.sample.json");

  withFakePackageManifest((manifestPath) => {
    withFakeAwsForBackendDeploy((env) => {
      const result = runJsonScriptWithEnv("scripts/deploy-backend.mjs", [
        "--stack-name=example-backend",
        `--package-manifest-file=${manifestPath}`,
        "--lambda-code-s3-bucket=my-artifacts-bucket",
        "--output=json",
      ], env);

      if (result.status !== 0) {
        throw new Error(`deploy-backend output sample contract run failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
      }

      const actual = result.parsed || {};
      expectObjectContainsKeys("deploy-backend output sample", actual, sample);
      expectObjectContainsKeys("deploy-backend output sample", actual.outputs || {}, sample.outputs || {}, "outputs");

      if (sample.stackName !== "example-backend") {
        throw new Error(`deploy-backend output sample should document stackName=example-backend.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.lambdaCodeS3Bucket !== "my-artifacts-bucket") {
        throw new Error(`deploy-backend output sample should document lambdaCodeS3Bucket=my-artifacts-bucket.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.lambdaCodeS3Key !== "b1admin/prod/backend/api.zip") {
        throw new Error(`deploy-backend output sample should document the derived backend artifact key.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (!String(sample.resolvedPackageManifestFile).includes("package-manifest.sample.json")) {
        throw new Error(`deploy-backend output sample should point to the sample manifest path.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (!String(sample.resolvedBackendArtifactSourceFile).includes("<manifest-dir>/")) {
        throw new Error(`deploy-backend output sample should show a manifest-relative backend artifact placeholder.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
    });
  });
}

function expectDeployBootstrapOutputSampleMatchesContract() {
  const sample = readJsonFile("infrastructure/examples/deploy-bootstrap-output.sample.json");

  withFakeAwsForBootstrapDeploy((env) => {
    const result = runJsonScriptWithEnv("scripts/deploy-bootstrap.mjs", [
      "--stack-name=example-bootstrap",
      "--parameters-file=infrastructure/examples/bootstrap-parameters.sample.json",
      "--output=json",
    ], env);

    if (result.status !== 0) {
      throw new Error(`deploy-bootstrap output sample contract run failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }

    const actual = result.parsed || {};
    expectObjectContainsKeys("deploy-bootstrap output sample", actual, sample);
    expectObjectContainsKeys("deploy-bootstrap output sample", actual.parameters || {}, sample.parameters || {}, "parameters");
    expectObjectContainsKeys("deploy-bootstrap output sample", actual.outputs || {}, sample.outputs || {}, "outputs");

    if (sample.stackName !== "example-bootstrap") {
      throw new Error(`deploy-bootstrap output sample should document stackName=example-bootstrap.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (sample.region !== "us-east-1") {
      throw new Error(`deploy-bootstrap output sample should document region=us-east-1.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (sample.parameters?.TemplateBucketName !== "b1admin-prod-templates-123456789012") {
      throw new Error(`deploy-bootstrap output sample should document the sample template bucket.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (sample.parameters?.ArtifactBucketName !== "b1admin-prod-artifacts-123456789012") {
      throw new Error(`deploy-bootstrap output sample should document the sample artifact bucket.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (sample.outputs?.TemplateBucketName !== "b1admin-prod-templates-123456789012") {
      throw new Error(`deploy-bootstrap output sample should document the resolved TemplateBucketName output.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (sample.outputs?.ArtifactBucketName !== "b1admin-prod-artifacts-123456789012") {
      throw new Error(`deploy-bootstrap output sample should document the resolved ArtifactBucketName output.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
  });
}

function expectDeployFrontendOutputSampleMatchesContract() {
  const sample = readJsonFile("infrastructure/examples/deploy-frontend-output.sample.json");

  withFakeAwsForFrontendDeploy((env) => {
    const result = runJsonScriptWithEnv("scripts/deploy-frontend.mjs", [
      "--stack-name=example-frontend",
      "--parameters-file=infrastructure/examples/frontend-parameters.sample.json",
      "--infrastructure-only",
      "--output=json",
    ], env);

    if (result.status !== 0) {
      throw new Error(`deploy-frontend output sample contract run failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }

    const actual = result.parsed || {};
    expectObjectContainsKeys("deploy-frontend output sample", actual, sample);
    expectObjectContainsKeys("deploy-frontend output sample", actual.outputs || {}, sample.outputs || {}, "outputs");
    expectObjectContainsKeys("deploy-frontend output sample", actual.backendBuildEnv || {}, sample.backendBuildEnv || {}, "backendBuildEnv");

    if (sample.stackName !== "example-frontend") {
      throw new Error(`deploy-frontend output sample should document stackName=example-frontend.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (sample.environmentName !== "prod" || sample.region !== "us-east-1") {
      throw new Error(`deploy-frontend output sample should document the default region/environment identity.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (sample.bucket !== "example-frontend-bucket" || sample.distributionId !== "EXAMPLE123") {
      throw new Error(`deploy-frontend output sample should document the resolved frontend publish target.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (sample.appUrl !== "https://admin.example.com") {
      throw new Error(`deploy-frontend output sample should document the resolved app URL.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (sample.skipBuild !== false || sample.infrastructureOnly !== true || sample.frontendPublished !== false) {
      throw new Error(`deploy-frontend output sample should document the infrastructure-only JSON result.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
  });
}

function expectDeployFrontendPublishOutputSampleMatchesContract() {
  const sample = readJsonFile("infrastructure/examples/deploy-frontend-publish-output.sample.json");

  withFakeFrontendBuildHarness(({ envCapturePath, PATH }) => {
    withFakeAwsForFrontendDeploy((awsEnv) => {
      const result = runJsonScriptWithEnv("scripts/deploy-frontend.mjs", [
        "--stack-name=example-frontend",
        "--parameters-file=infrastructure/examples/frontend-parameters.sample.json",
        "--backend-outputs-file=infrastructure/examples/backend-outputs.sample.json",
        "--output=json",
      ], {
        ...awsEnv,
        PATH: `${awsEnv.PATH || ""}${path.delimiter}${PATH}`,
      });

      if (result.status !== 0) {
        throw new Error(`deploy-frontend publish output sample contract run failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
      }

      const actual = result.parsed || {};
      expectObjectContainsKeys("deploy-frontend publish output sample", actual, sample);
      expectObjectContainsKeys("deploy-frontend publish output sample", actual.outputs || {}, sample.outputs || {}, "outputs");
      expectObjectContainsKeys("deploy-frontend publish output sample", actual.backendBuildEnv || {}, sample.backendBuildEnv || {}, "backendBuildEnv");

      const capturedEnv = JSON.parse(fs.readFileSync(envCapturePath, "utf8"));
      if (sample.stackName !== "example-frontend") {
        throw new Error(`deploy-frontend publish output sample should document stackName=example-frontend.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.skipBuild !== false || sample.infrastructureOnly !== false || sample.frontendPublished !== true) {
        throw new Error(`deploy-frontend publish output sample should document the build-driven publish result.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.bucket !== "example-frontend-bucket" || sample.distributionId !== "EXAMPLE123") {
        throw new Error(`deploy-frontend publish output sample should document the resolved frontend publish target.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.appUrl !== "https://admin.example.com") {
        throw new Error(`deploy-frontend publish output sample should document the resolved app URL.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.backendBuildEnv?.REACT_APP_API_BASE !== "https://api.example.com") {
        throw new Error(`deploy-frontend publish output sample should document REACT_APP_API_BASE from backend outputs.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.backendBuildEnv?.REACT_APP_DEFAULT_STOCK_PHOTO !== "https://content.example.com/stockPhotos/default.jpg") {
        throw new Error(`deploy-frontend publish output sample should document REACT_APP_DEFAULT_STOCK_PHOTO from backend outputs.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (capturedEnv.REACT_APP_API_BASE !== "https://api.example.com" || capturedEnv.REACT_APP_STAGE !== "prod") {
        throw new Error(`deploy-frontend publish output sample contract run did not receive the expected build env.\nCaptured env:\n${JSON.stringify(capturedEnv, null, 2)}\nSTDOUT:\n${result.stdout}`);
      }
    });
  });
}

function expectDeployAwsFullOutputSampleMatchesContract() {
  const sample = readJsonFile("infrastructure/examples/deploy-aws-full-output.sample.json");

  withFakeFrontendBuildHarness(({ envCapturePath, PATH }) => {
    withFakeAwsForSplitStackFullDeploy((awsEnv) => {
      const result = runJsonScriptWithEnv("scripts/deploy-aws.mjs", [
        "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
        "--frontend-parameters-file=infrastructure/examples/frontend-parameters.sample.json",
        "--backend-stack-name=example-backend",
        "--frontend-stack-name=example-frontend",
        "--lambda-code-s3-bucket=my-artifacts-bucket",
        "--lambda-code-s3-key=b1admin/prod/backend/api.zip",
        "--output=json",
      ], {
        ...awsEnv,
        PATH: `${awsEnv.PATH || ""}${path.delimiter}${PATH}`,
      });

      if (result.status !== 0) {
        throw new Error(`deploy-aws full output sample contract run failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
      }

      const actual = result.parsed || {};
      expectObjectContainsKeys("deploy-aws full output sample", actual, sample);
      expectObjectContainsKeys("deploy-aws full output sample", actual.backend || {}, sample.backend || {}, "backend");
      expectObjectContainsKeys("deploy-aws full output sample", actual.backend?.outputs || {}, sample.backend?.outputs || {}, "backend.outputs");
      expectObjectContainsKeys("deploy-aws full output sample", actual.frontend || {}, sample.frontend || {}, "frontend");
      expectObjectContainsKeys("deploy-aws full output sample", actual.frontend?.outputs || {}, sample.frontend?.outputs || {}, "frontend.outputs");
      expectObjectContainsKeys("deploy-aws full output sample", actual.frontend?.backendBuildEnv || {}, sample.frontend?.backendBuildEnv || {}, "frontend.backendBuildEnv");

      const capturedEnv = JSON.parse(fs.readFileSync(envCapturePath, "utf8"));
      if (sample.skipBackend !== false || sample.skipFrontend !== false || sample.publishFrontendAssets !== false) {
        throw new Error(`deploy-aws full output sample should document the standard end-to-end wrapper flow.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.resolvedArtifactBucket !== "my-artifacts-bucket" || sample.resolvedLambdaCodeS3Key !== "b1admin/prod/backend/api.zip") {
        throw new Error(`deploy-aws full output sample should document the resolved backend artifact location.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.backend?.stackName !== "example-backend" || sample.frontend?.stackName !== "example-frontend") {
        throw new Error(`deploy-aws full output sample should document the nested backend/frontend stack identities.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.frontend?.frontendPublished !== true || sample.frontend?.infrastructureOnly !== false) {
        throw new Error(`deploy-aws full output sample should document the nested build-and-publish frontend result.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.frontend?.backendBuildEnv?.REACT_APP_API_BASE !== "https://api.example.com") {
        throw new Error(`deploy-aws full output sample should document REACT_APP_API_BASE from backend outputs.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (capturedEnv.REACT_APP_API_BASE !== "https://api.example.com" || capturedEnv.REACT_APP_STAGE !== "prod") {
        throw new Error(`deploy-aws full output sample contract run did not receive the expected frontend build env.\nCaptured env:\n${JSON.stringify(capturedEnv, null, 2)}\nSTDOUT:\n${result.stdout}`);
      }
    });
  });
}

function expectValidateFrontendOutputSampleMatchesContract() {
  const sample = readJsonFile("infrastructure/examples/validate-frontend-output.sample.json");

  const result = runJsonScript("scripts/validate-aws-deploy.mjs", [
    "--mode=frontend",
    "--frontend-parameters-file=infrastructure/examples/frontend-parameters.sample.json",
    "--output=json",
  ]);

  if (result.status !== 0) {
    throw new Error(`validate-frontend output sample contract run failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }

  const actual = result.parsed || {};
  expectObjectContainsKeys("validate-frontend output sample", actual, sample);
  expectObjectContainsKeys("validate-frontend output sample", actual.resolved || {}, sample.resolved || {}, "resolved");

  if (sample.ok !== true || sample.mode !== "frontend" || sample.frontendPublishMode !== false) {
    throw new Error(`validate-frontend output sample should document an ok frontend deploy validation result.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (sample.frontendParametersFile !== "infrastructure/examples/frontend-parameters.sample.json") {
    throw new Error(`validate-frontend output sample should point to the sample frontend parameters file.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (sample.resolved?.frontendDomain !== "admin.example.com") {
    throw new Error(`validate-frontend output sample should document the frontend custom domain.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (!Array.isArray(sample.info) || !sample.info.includes("Mode: frontend")) {
    throw new Error(`validate-frontend output sample should document the frontend mode.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (!Array.isArray(sample.warnings) || sample.warnings.length !== 0 || !Array.isArray(sample.errors) || sample.errors.length !== 0) {
    throw new Error(`validate-frontend output sample should document a clean validation result with no warnings or errors.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
}

function expectStagingBootstrapStarterValidation() {
  const result = runJsonScript("scripts/validate-aws-deploy.mjs", [
    "--mode=bootstrap",
    "--region=us-east-1",
    "--stack-name=b1admin-staging-bootstrap",
    "--parameters-file=infrastructure/environments/staging/bootstrap-parameters.json",
    "--output=json",
  ]);

  if (result.status !== 0 || !result.parsed?.ok) {
    throw new Error(`staging bootstrap starter validation failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }

  if (result.parsed.environmentName !== "staging") {
    throw new Error(`staging bootstrap starter validation did not preserve EnvironmentName=staging.\nSTDOUT:\n${result.stdout}`);
  }

  if (result.parsed.parametersFile !== "infrastructure/environments/staging/bootstrap-parameters.json") {
    throw new Error(`staging bootstrap starter validation did not expose the expected parameters file path.\nSTDOUT:\n${result.stdout}`);
  }

  if (result.parsed.resolved?.artifactBucket !== "replace-me-staging-artifact-bucket") {
    throw new Error(`staging bootstrap starter validation did not expose the expected resolved artifact bucket.\nSTDOUT:\n${result.stdout}`);
  }
}

function expectStagingSplitStackStarterValidation() {
  const result = runJsonScript("scripts/validate-aws-deploy.mjs", [
    "--mode=split-stack",
    "--region=us-east-1",
    "--backend-parameters-file=infrastructure/environments/staging/backend-parameters.json",
    "--frontend-parameters-file=infrastructure/environments/staging/frontend-parameters.json",
    "--output=json",
  ]);

  if (result.status !== 0 || !result.parsed?.ok) {
    throw new Error(`staging split-stack starter validation failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }

  if (result.parsed.environmentName !== "staging") {
    throw new Error(`staging split-stack starter validation did not preserve EnvironmentName=staging.\nSTDOUT:\n${result.stdout}`);
  }

  if (result.parsed.backendParametersFile !== "infrastructure/environments/staging/backend-parameters.json") {
    throw new Error(`staging split-stack starter validation did not expose the expected backend parameters file path.\nSTDOUT:\n${result.stdout}`);
  }

  if (result.parsed.frontendParametersFile !== "infrastructure/environments/staging/frontend-parameters.json") {
    throw new Error(`staging split-stack starter validation did not expose the expected frontend parameters file path.\nSTDOUT:\n${result.stdout}`);
  }

  if (result.parsed.resolved?.artifactKey !== "b1admin/staging/backend/api.zip") {
    throw new Error(`staging split-stack starter validation did not derive the expected staging artifact key.\nSTDOUT:\n${result.stdout}`);
  }
}

function expectStagingDeployScriptStopsOnPlaceholders() {
  withRawStarterRepo("staging", ({ rootPath, scriptPath }) => {
    const result = spawnSync("bash", [scriptPath], {
      cwd: rootPath,
      encoding: "utf8",
    });

    const stdout = result.stdout || "";
    const stderr = result.stderr || "";
    const combined = `${stdout}\n${stderr}`;

    if ((result.status ?? 1) === 0) {
      throw new Error(`staging deploy script unexpectedly succeeded with placeholder values still present.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`);
    }

    if (!combined.includes("# Environment Starter Audit: staging") || !combined.includes("Unsafe starter default")) {
      throw new Error(`staging deploy script did not stop on starter audit blockers as expected.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`);
    }
    for (const snippet of [
      "Starter audit failed for staging.",
      "yarn prepare:environment-starter -- --environment=staging --account-id=<aws-account-id> --output=json",
      "yarn plan:environment-deploy -- --environment=staging --output=markdown",
    ]) {
      if (!combined.includes(snippet)) {
        throw new Error(`staging deploy script did not print the expected recovery guidance: ${snippet}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`);
      }
    }
  });
}

function expectStagingDeployScriptSavesOutputsByDefault() {
  withStarterScriptHarness("staging", ({ rootPath, scriptPath, logPath, env }) => {
    const result = spawnSync("bash", [scriptPath], {
      cwd: rootPath,
      encoding: "utf8",
      env,
    });

    if ((result.status ?? 1) !== 0) {
      throw new Error(`staging deploy script failed unexpectedly in the fake harness.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }

    const invocations = fs.readFileSync(logPath, "utf8").trim().split("\n").filter(Boolean);
    const commands = invocations.map((line) => line.split("\u001f"));
    const scriptNames = commands.map((parts) => parts[1]);

    const expectedOrder = [
      "audit:environment-starter",
      "plan:environment-deploy",
      "validate:aws-deploy",
      "deploy:bootstrap",
      "validate:aws-deploy",
      "deploy:aws",
      "save:split-stack-outputs",
      "verify:split-stack",
    ];

    if (JSON.stringify(scriptNames) !== JSON.stringify(expectedOrder)) {
      throw new Error(`staging deploy script did not run the expected npm command order.\nActual:\n${JSON.stringify(scriptNames, null, 2)}`);
    }

    const saveInvocation = commands.find((parts) => parts[1] === "save:split-stack-outputs") || [];
    if (!saveInvocation.includes("--environment=staging")
      || !saveInvocation.includes("--region=us-east-1")
      || !saveInvocation.includes("--output-dir=deployment/staging")) {
      throw new Error(`staging deploy script did not invoke save:split-stack-outputs with the expected defaults.\nInvocation:\n${JSON.stringify(saveInvocation, null, 2)}`);
    }
  });
}

function expectStagingDeployScriptPreviewOnlyStopsAfterPlan() {
  withStarterScriptHarness("staging", ({ rootPath, scriptPath, logPath, env }) => {
    const result = spawnSync("bash", [scriptPath], {
      cwd: rootPath,
      encoding: "utf8",
      env: {
        ...env,
        PREVIEW_ONLY: "true",
      },
    });

    if ((result.status ?? 1) !== 0) {
      throw new Error(`staging deploy script preview-only mode failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }

    const invocations = fs.readFileSync(logPath, "utf8").trim().split("\n").filter(Boolean);
    const scriptNames = invocations.map((line) => line.split("\u001f")[1]);
    const expectedOrder = [
      "audit:environment-starter",
      "plan:environment-deploy",
    ];

    if (JSON.stringify(scriptNames) !== JSON.stringify(expectedOrder)) {
      throw new Error(`staging deploy script preview-only mode should stop after the deploy plan.\nActual:\n${JSON.stringify(scriptNames, null, 2)}`);
    }

    const combined = `${result.stdout || ""}\n${result.stderr || ""}`;
    if (!combined.includes("Preview-only mode enabled; stopping after starter audit and deploy plan.")) {
      throw new Error(`staging deploy script preview-only mode did not print the expected stop message.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }
  });
}

function expectStagingDeployScriptStopsOnUnreadableApiRepo() {
  withStarterScriptHarness("staging", ({ rootPath, scriptPath, logPath, env }) => {
    const unreadableApiRepo = path.join(rootPath, "UnreadableApi");
    fs.mkdirSync(unreadableApiRepo, { recursive: true });
    fs.writeFileSync(path.join(unreadableApiRepo, "package.json"), `${JSON.stringify({
      name: "fake-api-repo",
      private: true,
    }, null, 2)}\n`);
    fs.chmodSync(unreadableApiRepo, 0o000);

    try {
      const result = spawnSync("bash", [scriptPath], {
        cwd: rootPath,
        encoding: "utf8",
        env: {
          ...env,
          API_REPO_PATH: "./UnreadableApi",
        },
      });

      const stdout = result.stdout || "";
      const stderr = result.stderr || "";
      const combined = `${stdout}\n${stderr}`;

      if ((result.status ?? 1) === 0) {
        throw new Error(`staging deploy script unexpectedly succeeded with an unreadable local Api repo path.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`);
      }

      if (!combined.includes("Local Api repo path is not readable from this shell:")
        || !combined.includes("PACKAGE_MANIFEST_FILE")
        || !combined.includes("BACKEND_ARTIFACT_SOURCE_FILE")) {
        throw new Error(`staging deploy script did not print the expected unreadable-api fallback guidance.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`);
      }

      const invocations = fs.existsSync(logPath)
        ? fs.readFileSync(logPath, "utf8").trim().split("\n").filter(Boolean)
        : [];
      const scriptNames = invocations.map((line) => line.split("\u001f")[1]);
      const expectedOrder = [
        "audit:environment-starter",
        "plan:environment-deploy",
        "validate:aws-deploy",
        "deploy:bootstrap",
      ];

      if (JSON.stringify(scriptNames) !== JSON.stringify(expectedOrder)) {
        throw new Error(`staging deploy script should stop before split-stack validation when the local Api repo is unreadable.\nActual:\n${JSON.stringify(scriptNames, null, 2)}`);
      }
    } finally {
      fs.chmodSync(unreadableApiRepo, 0o755);
    }
  });
}

function expectValidatorUnreadableApiRepoIncludesFallbackGuidance() {
  withUnreadableFakeApiRepo((fakeApiRepoPath) => {
    const result = runJsonScript("scripts/validate-aws-deploy.mjs", [
      "--mode=backend",
      "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
      `--api-repo-path=${fakeApiRepoPath}`,
      "--output=json",
    ]);

    if (result.status === 0) {
      throw new Error(`validator unexpectedly succeeded for an unreadable api repo package file.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }

    const actual = result.parsed || {};
    if (!Array.isArray(actual.info)
      || !actual.info.some((entry) => String(entry).includes("switch to --package-manifest-file"))
      || !actual.info.some((entry) => String(entry).includes("--backend-artifact-source-file"))
      || !actual.info.some((entry) => String(entry).includes("GitHub Actions api-repo path"))) {
      throw new Error(`validator did not include the expected unreadable-api fallback guidance.\nSTDOUT:\n${result.stdout}`);
    }
  });
}

function expectProdBootstrapStarterValidation() {
  const result = runJsonScript("scripts/validate-aws-deploy.mjs", [
    "--mode=bootstrap",
    "--region=us-east-1",
    "--stack-name=b1admin-prod-bootstrap",
    "--parameters-file=infrastructure/environments/prod/bootstrap-parameters.json",
    "--output=json",
  ]);

  if (result.status !== 0 || !result.parsed?.ok) {
    throw new Error(`prod bootstrap starter validation failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }

  if (result.parsed.environmentName !== "prod") {
    throw new Error(`prod bootstrap starter validation did not preserve EnvironmentName=prod.\nSTDOUT:\n${result.stdout}`);
  }

  if (result.parsed.parametersFile !== "infrastructure/environments/prod/bootstrap-parameters.json") {
    throw new Error(`prod bootstrap starter validation did not expose the expected parameters file path.\nSTDOUT:\n${result.stdout}`);
  }

  if (result.parsed.resolved?.artifactBucket !== "replace-me-prod-artifact-bucket") {
    throw new Error(`prod bootstrap starter validation did not expose the expected resolved artifact bucket.\nSTDOUT:\n${result.stdout}`);
  }
}

function expectProdSplitStackStarterValidation() {
  const result = runJsonScript("scripts/validate-aws-deploy.mjs", [
    "--mode=split-stack",
    "--region=us-east-1",
    "--backend-parameters-file=infrastructure/environments/prod/backend-parameters.json",
    "--frontend-parameters-file=infrastructure/environments/prod/frontend-parameters.json",
    "--output=json",
  ]);

  if (result.status !== 0 || !result.parsed?.ok) {
    throw new Error(`prod split-stack starter validation failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }

  if (result.parsed.environmentName !== "prod") {
    throw new Error(`prod split-stack starter validation did not preserve EnvironmentName=prod.\nSTDOUT:\n${result.stdout}`);
  }

  if (result.parsed.backendParametersFile !== "infrastructure/environments/prod/backend-parameters.json") {
    throw new Error(`prod split-stack starter validation did not expose the expected backend parameters file path.\nSTDOUT:\n${result.stdout}`);
  }

  if (result.parsed.frontendParametersFile !== "infrastructure/environments/prod/frontend-parameters.json") {
    throw new Error(`prod split-stack starter validation did not expose the expected frontend parameters file path.\nSTDOUT:\n${result.stdout}`);
  }

  if (result.parsed.resolved?.artifactKey !== "b1admin/prod/backend/api.zip") {
    throw new Error(`prod split-stack starter validation did not derive the expected prod artifact key.\nSTDOUT:\n${result.stdout}`);
  }
}

function expectProdDeployScriptStopsOnPlaceholders() {
  withRawStarterRepo("prod", ({ rootPath, scriptPath }) => {
    const result = spawnSync("bash", [scriptPath], {
      cwd: rootPath,
      encoding: "utf8",
    });

    const stdout = result.stdout || "";
    const stderr = result.stderr || "";
    const combined = `${stdout}\n${stderr}`;

    if ((result.status ?? 1) === 0) {
      throw new Error(`prod deploy script unexpectedly succeeded with placeholder values still present.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`);
    }

    if (!combined.includes("# Environment Starter Audit: prod") || !combined.includes("Unsafe starter default")) {
      throw new Error(`prod deploy script did not stop on starter audit blockers as expected.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`);
    }
    for (const snippet of [
      "Starter audit failed for prod.",
      "yarn prepare:environment-starter -- --environment=prod --account-id=<aws-account-id> --output=json",
      "yarn plan:environment-deploy -- --environment=prod --output=markdown",
    ]) {
      if (!combined.includes(snippet)) {
        throw new Error(`prod deploy script did not print the expected recovery guidance: ${snippet}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`);
      }
    }
  });
}

function expectProdDeployScriptCanSkipSavingOutputs() {
  withStarterScriptHarness("prod", ({ rootPath, scriptPath, logPath, env }) => {
    const result = spawnSync("bash", [scriptPath], {
      cwd: rootPath,
      encoding: "utf8",
      env: {
        ...env,
        SAVE_OUTPUTS_AFTER_DEPLOY: "false",
      },
    });

    if ((result.status ?? 1) !== 0) {
      throw new Error(`prod deploy script failed unexpectedly in the fake harness.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }

    const invocations = fs.readFileSync(logPath, "utf8").trim().split("\n").filter(Boolean);
    const commands = invocations.map((line) => line.split("\u001f"));
    const scriptNames = commands.map((parts) => parts[1]);

    if (scriptNames.includes("save:split-stack-outputs")) {
      throw new Error(`prod deploy script should skip save:split-stack-outputs when SAVE_OUTPUTS_AFTER_DEPLOY=false.\nActual:\n${JSON.stringify(scriptNames, null, 2)}`);
    }
    if (!scriptNames.includes("plan:environment-deploy")) {
      throw new Error(`prod deploy script should run plan:environment-deploy before the deploy steps.\nActual:\n${JSON.stringify(scriptNames, null, 2)}`);
    }
    if (!scriptNames.includes("verify:split-stack")) {
      throw new Error(`prod deploy script should still verify after deploy when SAVE_OUTPUTS_AFTER_DEPLOY=false.\nActual:\n${JSON.stringify(scriptNames, null, 2)}`);
    }
  });
}

function expectProdDeployScriptPreviewOnlyStopsAfterPlan() {
  withStarterScriptHarness("prod", ({ rootPath, scriptPath, logPath, env }) => {
    const result = spawnSync("bash", [scriptPath], {
      cwd: rootPath,
      encoding: "utf8",
      env: {
        ...env,
        PREVIEW_ONLY: "true",
      },
    });

    if ((result.status ?? 1) !== 0) {
      throw new Error(`prod deploy script preview-only mode failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }

    const invocations = fs.readFileSync(logPath, "utf8").trim().split("\n").filter(Boolean);
    const scriptNames = invocations.map((line) => line.split("\u001f")[1]);
    const expectedOrder = [
      "audit:environment-starter",
      "plan:environment-deploy",
    ];

    if (JSON.stringify(scriptNames) !== JSON.stringify(expectedOrder)) {
      throw new Error(`prod deploy script preview-only mode should stop after the deploy plan.\nActual:\n${JSON.stringify(scriptNames, null, 2)}`);
    }

    const combined = `${result.stdout || ""}\n${result.stderr || ""}`;
    if (!combined.includes("Preview-only mode enabled; stopping after starter audit and deploy plan.")) {
      throw new Error(`prod deploy script preview-only mode did not print the expected stop message.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }
  });
}

function expectValidateBootstrapOutputSampleMatchesContract() {
  const sample = readJsonFile("infrastructure/examples/validate-bootstrap-output.sample.json");

  const result = runJsonScript("scripts/validate-aws-deploy.mjs", [
    "--mode=bootstrap",
    "--parameters-file=infrastructure/examples/bootstrap-parameters.sample.json",
    "--output=json",
  ]);

  if (result.status !== 0) {
    throw new Error(`validate-bootstrap output sample contract run failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }

  const actual = result.parsed || {};
  expectObjectContainsKeys("validate-bootstrap output sample", actual, sample);
  expectObjectContainsKeys("validate-bootstrap output sample", actual.resolved || {}, sample.resolved || {}, "resolved");

  if (sample.ok !== true || sample.mode !== "bootstrap" || sample.bootstrapMode !== true) {
    throw new Error(`validate-bootstrap output sample should document an ok bootstrap validation result.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (sample.parametersFile !== "infrastructure/examples/bootstrap-parameters.sample.json") {
    throw new Error(`validate-bootstrap output sample should point to the sample bootstrap parameters file.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (sample.resolved?.templateBucket !== "b1admin-prod-templates-123456789012") {
    throw new Error(`validate-bootstrap output sample should document the resolved template bucket.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (sample.resolved?.artifactBucket !== "b1admin-prod-artifacts-123456789012") {
    throw new Error(`validate-bootstrap output sample should document the resolved artifact bucket.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (!Array.isArray(sample.nextSteps) || !sample.nextSteps.some((step) => String(step).includes("deploy:bootstrap"))) {
    throw new Error(`validate-bootstrap output sample should include a deploy:bootstrap next step.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
}

function expectValidatorBootstrapRespectsEnvironmentName() {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-validate-bootstrap-env-"));
  const paramsPath = path.join(tempDir, "bootstrap-parameters.json");

  try {
    fs.writeFileSync(paramsPath, `${JSON.stringify({
      ProjectName: "b1admin",
      EnvironmentName: "staging",
      TemplateBucketName: "bootstrap-staging-templates-123456789012",
      ArtifactBucketName: "bootstrap-staging-artifacts-123456789012",
      EnableBucketVersioning: "true",
    }, null, 2)}\n`);

    const result = runJsonScript("scripts/validate-aws-deploy.mjs", [
      "--mode=bootstrap",
      "--region=us-east-1",
      "--stack-name=b1admin-staging-bootstrap",
      `--parameters-file=${paramsPath}`,
      "--output=json",
    ]);

    if (result.status !== 0) {
      throw new Error(`bootstrap EnvironmentName validation failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }

    if (result.parsed?.environmentName !== "staging") {
      throw new Error(`bootstrap validator did not preserve EnvironmentName from the parameters file.\nSTDOUT:\n${result.stdout}`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function expectValidateApiMigrationsOutputSampleMatchesContract() {
  const sample = readJsonFile("infrastructure/examples/validate-api-migrations-output.sample.json");
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-validate-api-migrations-sample-"));

  try {
    const fakeApiRepoPath = path.join(tempDir, "api");
    const outputsPath = path.join(tempDir, "outputs.json");
    const secretPath = path.join(tempDir, "database-secret.json");

    fs.mkdirSync(path.join(fakeApiRepoPath, "tools", "migrations", "attendance"), { recursive: true });
    fs.mkdirSync(path.join(fakeApiRepoPath, "node_modules"), { recursive: true });
    fs.writeFileSync(path.join(fakeApiRepoPath, "package.json"), `${JSON.stringify({
      name: "fake-api-repo",
      private: true,
    }, null, 2)}\n`);
    fs.writeFileSync(path.join(fakeApiRepoPath, "tools", "migrate.ts"), "export {};\n");
    fs.writeFileSync(path.join(fakeApiRepoPath, "tools", "kysely-config.ts"), "const MODULES = [\"membership\", \"attendance\"] as const;\nexport { MODULES };\n");
    fs.writeFileSync(path.join(fakeApiRepoPath, "serverless.yml"), "functions:\n  socket:\n    handler: lambda.socket\n");
    fs.writeFileSync(outputsPath, `${JSON.stringify({
      DatabaseEndpoint: "example.cluster.us-east-1.rds.amazonaws.com",
      DatabasePort: "3306",
      AttendanceDatabaseName: "attendance",
    }, null, 2)}\n`);
    fs.writeFileSync(secretPath, `${JSON.stringify({
      username: "churchapps",
      password: "replace-me",
    }, null, 2)}\n`);

    const result = runJsonScript("scripts/validate-aws-deploy.mjs", [
      "--mode=api-migrations",
      `--api-repo-path=${fakeApiRepoPath}`,
      `--outputs-file=${outputsPath}`,
      `--db-secret-file=${secretPath}`,
      "--action=status",
      "--module=attendance",
      "--dry-run=true",
      "--output=json",
    ]);

    if (result.status !== 0) {
      throw new Error(`validate-api-migrations output sample contract run failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }

    const actual = result.parsed || {};
    expectObjectContainsKeys("validate-api-migrations output sample", actual, sample);
    expectObjectContainsKeys("validate-api-migrations output sample", actual.resolved || {}, sample.resolved || {}, "resolved");

    if (sample.ok !== true || sample.mode !== "api-migrations" || sample.apiMigrationsMode !== true) {
      throw new Error(`validate-api-migrations output sample should document an ok standalone api-migrations validation result.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (!Array.isArray(sample.resolved?.apiRepoMigrationModules) || sample.resolved.apiRepoMigrationModules.join(",") !== "membership,attendance") {
      throw new Error(`validate-api-migrations output sample should document the detected migration module set.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (!Array.isArray(sample.resolved?.apiRepoMigrationDirectories) || sample.resolved.apiRepoMigrationDirectories.join(",") !== "attendance") {
      throw new Error(`validate-api-migrations output sample should document the detected migration directory set.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (!Array.isArray(sample.info) || !sample.info.includes("Standalone Api CLI migration validation")) {
      throw new Error(`validate-api-migrations output sample should document the standalone migration validator mode.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (!Array.isArray(sample.info) || !sample.info.some((line) => String(line).includes("API migration outputs file: /abs/path/to/"))) {
      throw new Error(`validate-api-migrations output sample should show the outputs-file placeholder.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (!Array.isArray(sample.nextSteps) || !sample.nextSteps.some((step) => String(step).includes("yarn run:api-migrations -- --api-repo-path=<api-repo-path>"))) {
      throw new Error(`validate-api-migrations output sample should include the standalone run:api-migrations next step.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (!Array.isArray(sample.warnings) || sample.warnings.length !== 0 || !Array.isArray(sample.errors) || sample.errors.length !== 0) {
      throw new Error(`validate-api-migrations output sample should document a clean validation result with no warnings or errors.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function expectValidateBackendOutputSampleMatchesContract() {
  const sample = readJsonFile("infrastructure/examples/validate-backend-output.sample.json");

  withFakePackageManifest((manifestPath) => {
    const result = runJsonScript("scripts/validate-aws-deploy.mjs", [
      "--mode=backend",
      "--stack-name=example-backend",
      "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
      `--package-manifest-file=${manifestPath}`,
      "--lambda-code-s3-bucket=my-artifacts-bucket",
      "--output=json",
    ]);

    if (result.status !== 0) {
      throw new Error(`validate-backend output sample contract run failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }

    const actual = result.parsed || {};
    expectObjectContainsKeys("validate-backend output sample", actual, sample);
    expectObjectContainsKeys("validate-backend output sample", actual.resolved || {}, sample.resolved || {}, "resolved");

    if (sample.ok !== true || sample.mode !== "backend") {
      throw new Error(`validate-backend output sample should document an ok backend validation result.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (sample.resolved?.artifactBucket !== "my-artifacts-bucket") {
      throw new Error(`validate-backend output sample should document artifactBucket=my-artifacts-bucket.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (sample.resolved?.artifactKey !== "b1admin/prod/backend/api.zip") {
      throw new Error(`validate-backend output sample should document the derived backend artifact key.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (!String(sample.resolved?.packageManifestFile || "").includes("package-manifest.sample.json")) {
      throw new Error(`validate-backend output sample should point to the sample manifest path.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (!String(sample.resolved?.backendArtifactSource || "").includes("<manifest-dir>/")) {
      throw new Error(`validate-backend output sample should show a manifest-relative backend artifact placeholder.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (!Array.isArray(sample.nextSteps) || !sample.nextSteps.some((step) => String(step).includes("upload:backend-artifact"))) {
      throw new Error(`validate-backend output sample should include an upload:backend-artifact next step.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (!Array.isArray(sample.nextSteps) || !sample.nextSteps.some((step) => String(step).includes("deploy:backend"))) {
      throw new Error(`validate-backend output sample should include a deploy:backend next step.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
  });
}

function expectValidateSplitStackOutputSampleMatchesContract() {
  const sample = readJsonFile("infrastructure/examples/validate-split-stack-output.sample.json");

  const result = runJsonScript("scripts/validate-aws-deploy.mjs", [
    "--mode=split-stack",
    "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
    "--frontend-parameters-file=infrastructure/examples/frontend-parameters.sample.json",
    "--output=json",
  ]);

  if (result.status !== 0) {
    throw new Error(`validate-split-stack output sample contract run failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }

  const actual = result.parsed || {};
  expectObjectContainsKeys("validate-split-stack output sample", actual, sample);
  expectObjectContainsKeys("validate-split-stack output sample", actual.resolved || {}, sample.resolved || {}, "resolved");

  if (sample.ok !== true || sample.mode !== "split-stack" || sample.splitStackPublishOnly !== false) {
    throw new Error(`validate-split-stack output sample should document an ok non-publish split-stack validation result.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (sample.backendParametersFile !== "infrastructure/examples/backend-parameters.sample.json") {
    throw new Error(`validate-split-stack output sample should point to the sample backend parameters file.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (sample.frontendParametersFile !== "infrastructure/examples/frontend-parameters.sample.json") {
    throw new Error(`validate-split-stack output sample should point to the sample frontend parameters file.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (sample.resolved?.artifactBucket !== "my-artifacts-bucket") {
    throw new Error(`validate-split-stack output sample should document artifactBucket=my-artifacts-bucket.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (sample.resolved?.artifactKey !== "b1admin/backend/api.zip") {
    throw new Error(`validate-split-stack output sample should document artifactKey=b1admin/backend/api.zip.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (!Array.isArray(sample.info) || !sample.info.includes("Split-stack validation: backend + frontend")) {
    throw new Error(`validate-split-stack output sample should document the split-stack validation mode.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (!Array.isArray(sample.info) || !sample.info.some((line) => String(line).includes("Frontend parameters file: /abs/path/to/"))) {
    throw new Error(`validate-split-stack output sample should show the frontend parameters file placeholder.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (!Array.isArray(sample.errors) || sample.errors.length !== 0 || !Array.isArray(sample.warnings) || sample.warnings.length !== 0) {
    throw new Error(`validate-split-stack output sample should document a clean validation result with no warnings or errors.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
}

function expectValidateSplitStackFrontendInfraOutputSampleMatchesContract() {
  const sample = readJsonFile("infrastructure/examples/validate-split-stack-frontend-infra-output.sample.json");

  const result = runJsonScript("scripts/validate-aws-deploy.mjs", [
    "--mode=split-stack",
    "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
    "--frontend-parameters-file=infrastructure/examples/frontend-parameters.sample.json",
    "--frontend-infrastructure-only",
    "--output=json",
  ]);

  if (result.status !== 0) {
    throw new Error(`validate-split-stack frontend-infrastructure output sample contract run failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }

  const actual = result.parsed || {};
  expectObjectContainsKeys("validate-split-stack frontend-infrastructure output sample", actual, sample);
  expectObjectContainsKeys("validate-split-stack frontend-infrastructure output sample", actual.resolved || {}, sample.resolved || {}, "resolved");

  if (sample.ok !== true || sample.mode !== "split-stack" || sample.frontendInfrastructureOnly !== true) {
    throw new Error(`validate-split-stack frontend-infrastructure output sample should document an ok hosting-only split-stack validation result.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (!Array.isArray(sample.info) || !sample.info.includes("Frontend infrastructure-only deploy requested.")) {
    throw new Error(`validate-split-stack frontend-infrastructure output sample should document the frontend infrastructure-only mode.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (!Array.isArray(sample.info) || !sample.info.some((line) => String(line).includes("frontend hosting provisioned but frontend asset publishing deferred"))) {
    throw new Error(`validate-split-stack frontend-infrastructure output sample should document the deferred frontend publish phase.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (!Array.isArray(sample.warnings) || sample.warnings.length !== 0 || !Array.isArray(sample.errors) || sample.errors.length !== 0) {
    throw new Error(`validate-split-stack frontend-infrastructure output sample should document a clean validation result with no warnings or errors.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
}

function expectValidateSplitStackPublishOutputSampleMatchesContract() {
  const sample = readJsonFile("infrastructure/examples/validate-split-stack-publish-output.sample.json");

  const result = runJsonScript("scripts/validate-aws-deploy.mjs", [
    "--mode=split-stack",
    "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
    "--frontend-parameters-file=infrastructure/examples/frontend-parameters.sample.json",
    "--skip-backend",
    "--skip-frontend",
    "--publish-frontend-assets",
    "--frontend-outputs-file=infrastructure/examples/frontend-outputs.sample.json",
    "--output=json",
  ]);

  if (result.status !== 0) {
    throw new Error(`validate-split-stack publish output sample contract run failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }

  const actual = result.parsed || {};
  expectObjectContainsKeys("validate-split-stack publish output sample", actual, sample);
  expectObjectContainsKeys("validate-split-stack publish output sample", actual.resolved || {}, sample.resolved || {}, "resolved");

  if (sample.ok !== true || sample.mode !== "split-stack" || sample.splitStackPublishOnly !== true) {
    throw new Error(`validate-split-stack publish output sample should document an ok split-stack publish-only validation result.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (sample.backendParametersFile !== "infrastructure/examples/backend-parameters.sample.json") {
    throw new Error(`validate-split-stack publish output sample should point to the sample backend parameters file.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (sample.frontendParametersFile !== "infrastructure/examples/frontend-parameters.sample.json") {
    throw new Error(`validate-split-stack publish output sample should point to the sample frontend parameters file.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (sample.resolved?.artifactBucket !== "my-artifacts-bucket") {
    throw new Error(`validate-split-stack publish output sample should document artifactBucket=my-artifacts-bucket.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (sample.resolved?.artifactKey !== "b1admin/backend/api.zip") {
    throw new Error(`validate-split-stack publish output sample should document artifactKey=b1admin/backend/api.zip.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (!Array.isArray(sample.info) || !sample.info.some((line) => String(line).includes("Frontend outputs file: /abs/path/to/"))) {
    throw new Error(`validate-split-stack publish output sample should show the frontend outputs file placeholder.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (!Array.isArray(sample.info) || !sample.info.some((line) => String(line).includes("Frontend parameters file: /abs/path/to/"))) {
    throw new Error(`validate-split-stack publish output sample should show the frontend parameters file placeholder.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (!Array.isArray(sample.warnings) || !sample.warnings.some((line) => String(line).includes("/abs/path/to/B1Admin/node_modules"))) {
    throw new Error(`validate-split-stack publish output sample should show the node_modules warning placeholder.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (!Array.isArray(sample.nextSteps) || !sample.nextSteps.some((step) => String(step).includes("deploy:aws"))) {
    throw new Error(`validate-split-stack publish output sample should include a deploy:aws next step.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
}

function expectValidateFrontendPublishOutputSampleMatchesContract() {
  const sample = readJsonFile("infrastructure/examples/validate-frontend-publish-output.sample.json");

  const result = runJsonScript("scripts/validate-aws-deploy.mjs", [
    "--mode=frontend-publish",
    "--bucket=example-frontend-bucket",
    "--distribution-id=EXAMPLE123",
    "--backend-outputs-file=infrastructure/examples/backend-outputs.sample.json",
    "--output=json",
  ]);

  if (result.status !== 0) {
    throw new Error(`validate-frontend publish output sample contract run failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }

  const actual = result.parsed || {};
  expectObjectContainsKeys("validate-frontend publish output sample", actual, sample);
  expectObjectContainsKeys("validate-frontend publish output sample", actual.resolved || {}, sample.resolved || {}, "resolved");

  if (sample.ok !== true || sample.mode !== "frontend-publish" || sample.frontendPublishMode !== true) {
    throw new Error(`validate-frontend publish output sample should document an ok frontend-publish validation result.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (!Array.isArray(sample.info) || !sample.info.some((line) => String(line).includes("Backend outputs file: /abs/path/to/"))) {
    throw new Error(`validate-frontend publish output sample should show the backend outputs file placeholder.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (!Array.isArray(sample.info) || !sample.info.includes("Frontend publish bucket: example-frontend-bucket")) {
    throw new Error(`validate-frontend publish output sample should document the publish bucket.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (!Array.isArray(sample.info) || !sample.info.includes("Frontend distribution ID: EXAMPLE123")) {
    throw new Error(`validate-frontend publish output sample should document the distribution id.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (!Array.isArray(sample.warnings) || !sample.warnings.some((line) => String(line).includes("/abs/path/to/B1Admin/node_modules"))) {
    throw new Error(`validate-frontend publish output sample should show the node_modules warning placeholder.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (!Array.isArray(sample.nextSteps) || !sample.nextSteps.some((step) => String(step).includes("publish:frontend-assets"))) {
    throw new Error(`validate-frontend publish output sample should include a publish:frontend-assets next step.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
}

function expectUploadBackendArtifactOutputSampleMatchesContract() {
  const sample = readJsonFile("infrastructure/examples/upload-backend-artifact-output.sample.json");

  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-upload-backend-sample-"));
  const sourceFile = path.join(tempDir, "api.zip");
  fs.writeFileSync(sourceFile, "fake backend zip");

  try {
    withFakeAwsForUploadBackendArtifact((env) => {
      const result = runJsonScriptWithEnv("scripts/upload-backend-artifact.mjs", [
        "--bootstrap-stack-name=example-bootstrap",
        `--source-file=${path.relative(rootDir, sourceFile)}`,
        "--artifact-key=b1admin/backend/api.zip",
        "--output=json",
      ], env);

      if (result.status !== 0) {
        throw new Error(`upload-backend-artifact output sample contract run failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
      }

      const actual = result.parsed || {};
      expectObjectContainsKeys("upload-backend-artifact output sample", actual, sample);

      if (sample.artifactLabel !== "Backend artifact") {
        throw new Error(`upload-backend-artifact output sample should document the default artifact label.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.bucket !== "my-artifacts-bucket") {
        throw new Error(`upload-backend-artifact output sample should document bucket=my-artifacts-bucket.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.key !== "b1admin/backend/api.zip") {
        throw new Error(`upload-backend-artifact output sample should document key=b1admin/backend/api.zip.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.s3Uri !== "s3://my-artifacts-bucket/b1admin/backend/api.zip") {
        throw new Error(`upload-backend-artifact output sample should document the uploaded S3 URI.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.bootstrapStackName !== "example-bootstrap") {
        throw new Error(`upload-backend-artifact output sample should document bootstrapStackName=example-bootstrap.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (!String(sample.sourceFile).includes("/abs/path/to/")) {
        throw new Error(`upload-backend-artifact output sample should show a source file placeholder path.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function expectPublishLambdaLayerOutputSampleMatchesContract() {
  const sample = readJsonFile("infrastructure/examples/publish-lambda-layer-output.sample.json");
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-publish-layer-sample-"));
  const sourceFile = path.join(tempDir, "layer.zip");
  fs.writeFileSync(sourceFile, "fake layer zip");

  try {
    withFakeAwsForPublishLambdaLayer((env) => {
      const result = runJsonScriptWithEnv("scripts/publish-lambda-layer.mjs", [
        "--layer-name=b1admin-prod-dependencies",
        `--source-file=${path.relative(rootDir, sourceFile)}`,
        "--output=json",
      ], env);

      if (result.status !== 0) {
        throw new Error(`publish-lambda-layer output sample contract run failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
      }

      const actual = result.parsed || {};
      expectObjectContainsKeys("publish-lambda-layer output sample", actual, sample);
      expectObjectContainsKeys("publish-lambda-layer output sample", actual.Content || {}, sample.Content || {}, "Content");

      if (sample.LayerArn !== "arn:aws:lambda:us-east-1:123456789012:layer:b1admin-prod-dependencies") {
        throw new Error(`publish-lambda-layer output sample should document the layer ARN.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.LayerVersionArn !== "arn:aws:lambda:us-east-1:123456789012:layer:b1admin-prod-dependencies:3") {
        throw new Error(`publish-lambda-layer output sample should document the layer version ARN.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.Version !== 3) {
        throw new Error(`publish-lambda-layer output sample should document Version=3.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (!Array.isArray(sample.CompatibleRuntimes) || sample.CompatibleRuntimes[0] !== "nodejs22.x") {
        throw new Error(`publish-lambda-layer output sample should document the default compatible runtime.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (!Array.isArray(sample.CompatibleArchitectures) || sample.CompatibleArchitectures[0] !== "arm64") {
        throw new Error(`publish-lambda-layer output sample should document the default compatible architecture.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function expectSyncAppConfigSecretOutputSampleMatchesContract() {
  const sample = readJsonFile("infrastructure/examples/sync-app-config-secret-output.sample.json");

  withFakeAwsForSyncAppConfigSecret((env) => {
    const result = runJsonScriptWithEnv("scripts/sync-app-config-secret.mjs", [
      "--secret-file=infrastructure/examples/app-config-secret.sample.json",
      "--secret-name=b1admin-prod-app-config",
      "--output=json",
    ], env);

    if (result.status !== 0) {
      throw new Error(`sync-app-config-secret output sample contract run failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }

    const actual = result.parsed || {};
    expectObjectContainsKeys("sync-app-config-secret output sample", actual, sample);

    if (sample.action !== "created") {
      throw new Error(`sync-app-config-secret output sample should document the created path.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (sample.name !== "b1admin-prod-app-config") {
      throw new Error(`sync-app-config-secret output sample should document the secret name.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (sample.arn !== "arn:aws:secretsmanager:us-east-1:123456789012:secret:b1admin-prod-app-config-abc123") {
      throw new Error(`sync-app-config-secret output sample should document the created secret ARN.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (sample.versionId !== "11111111-2222-3333-4444-555555555555") {
      throw new Error(`sync-app-config-secret output sample should document the returned secret version id.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
  });
}

function expectSyncGithubAppConfigSecretOutputSampleMatchesContract() {
  const sample = readJsonFile("infrastructure/examples/sync-github-app-config-secret-output.sample.json");

  withFakeGhForSyncGithubAppConfigSecret(({ env, capturePath }) => {
    const result = runJsonScriptWithEnv("scripts/sync-github-app-config-secret.mjs", [
      "--environment=staging",
      "--secret-file=infrastructure/examples/app-config-secret.sample.json",
      "--repo=ChurchApps/B1Admin",
      "--output=json",
    ], env);

    if (result.status !== 0) {
      throw new Error(`sync-github-app-config-secret output sample contract run failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }

    const actual = result.parsed || {};
    const capture = JSON.parse(fs.readFileSync(capturePath, "utf8"));
    expectObjectContainsKeys("sync-github-app-config-secret output sample", actual, sample);

    if (sample.action !== "stored") {
      throw new Error(`sync-github-app-config-secret output sample should document the stored path.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (sample.secretName !== "AWS_APP_CONFIG_SECRET_JSON") {
      throw new Error(`sync-github-app-config-secret output sample should document the GitHub secret name.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (sample.githubEnvironment !== "aws-staging") {
      throw new Error(`sync-github-app-config-secret output sample should document the derived GitHub environment.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (sample.repo !== "ChurchApps/B1Admin") {
      throw new Error(`sync-github-app-config-secret output sample should document the target GitHub repository.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (sample.keyCount !== 19) {
      throw new Error(`sync-github-app-config-secret output sample should document keyCount=19 for the checked sample input.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (!String(sample.commandPreview || "").includes("gh secret set 'AWS_APP_CONFIG_SECRET_JSON'")) {
      throw new Error(`sync-github-app-config-secret output sample should document the reusable gh command preview.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }

    if (capture.args[0] !== "secret" || capture.args[1] !== "set" || capture.args[2] !== "AWS_APP_CONFIG_SECRET_JSON") {
      throw new Error(`sync-github-app-config-secret did not call gh secret set with the expected secret name.\nCapture:\n${JSON.stringify(capture, null, 2)}`);
    }
    if (!capture.args.includes("--env") || !capture.args.includes("aws-staging")) {
      throw new Error(`sync-github-app-config-secret did not pass the expected GitHub environment.\nCapture:\n${JSON.stringify(capture, null, 2)}`);
    }
    if (!capture.args.includes("--repo") || !capture.args.includes("ChurchApps/B1Admin")) {
      throw new Error(`sync-github-app-config-secret did not pass the expected GitHub repository.\nCapture:\n${JSON.stringify(capture, null, 2)}`);
    }
    if (!capture.args.includes("--app") || !capture.args.includes("actions")) {
      throw new Error(`sync-github-app-config-secret did not scope the secret to GitHub Actions.\nCapture:\n${JSON.stringify(capture, null, 2)}`);
    }
    if (!capture.secretBody || typeof capture.secretBody.jwtSecret !== "string" || typeof capture.secretBody.encryptionKey !== "string") {
      throw new Error(`sync-github-app-config-secret did not pass the normalized JSON secret body.\nCapture:\n${JSON.stringify(capture, null, 2)}`);
    }
  });
}

function expectSyncLegacySsmOutputSampleMatchesContract() {
  const sample = readJsonFile("infrastructure/examples/sync-legacy-ssm-output.sample.json");

  withFakeAwsForSyncLegacySsm((env) => {
    const result = runJsonScriptWithEnv("scripts/sync-legacy-ssm-parameters.mjs", [
      "--stack-name=example-backend",
      "--environment=prod",
      "--dry-run=true",
      "--app-config-secret-file=infrastructure/examples/app-config-secret.sample.json",
      "--output=json",
    ], env);

    if (result.status !== 0) {
      throw new Error(`sync-legacy-ssm output sample contract run failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }

    const actual = result.parsed || {};
    expectObjectContainsKeys("sync-legacy-ssm output sample", actual, sample);

    if (sample.stackName !== "example-backend" || sample.environment !== "prod" || sample.prefix !== "/prod") {
      throw new Error(`sync-legacy-ssm output sample should document the default stack/environment/prefix identity.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (sample.dryRun !== true || sample.overwrite !== true) {
      throw new Error(`sync-legacy-ssm output sample should document the dry-run overwrite defaults.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (sample.parameterCount !== 10) {
      throw new Error(`sync-legacy-ssm output sample should document parameterCount=10 for the checked sample inputs.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (!Array.isArray(sample.parameters) || !sample.parameters.some((entry) => entry.name === "/prod/webPushSubject")) {
      throw new Error(`sync-legacy-ssm output sample should include the sample webPushSubject parameter.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (sample.parameters.some((entry) => "value" in entry) || (actual.parameters || []).some((entry) => "value" in entry)) {
      throw new Error(`sync-legacy-ssm output must list parameter names only; values are secrets and must not appear.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
  });
}

function expectDispatchGithubAwsDeployOutputSampleMatchesContract() {
  const sample = readJsonFile("infrastructure/examples/dispatch-github-aws-deploy-output.sample.json");
  const relativeEnvDir = ".tmp-dispatch-github-deploy-env";
  const tempDir = path.join(rootDir, relativeEnvDir);

  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.mkdirSync(tempDir, { recursive: true });

    for (const fileName of [
      "bootstrap-parameters.json",
      "backend-parameters.json",
      "frontend-parameters.json",
      "app-config-secret.template.json",
    ]) {
      fs.copyFileSync(
        path.join(rootDir, "infrastructure", "environments", "staging", fileName),
        path.join(tempDir, fileName),
      );
    }

    const prepareResult = runJsonScript("scripts/prepare-environment-starter.mjs", [
      "--environment=staging",
      `--environment-dir=${relativeEnvDir}`,
      "--account-id=123456789012",
      "--write=true",
      "--output=json",
    ]);
    if (prepareResult.status !== 0) {
      throw new Error(`prepare-environment-starter should succeed before dispatch-github-aws-deploy sample verification.\nSTDOUT:\n${prepareResult.stdout}\nSTDERR:\n${prepareResult.stderr}`);
    }

    replaceStarterBackendDefaults(tempDir, "staging");
    const manifestPath = path.join(tempDir, "package-manifest.json");
    fs.writeFileSync(manifestPath, `${JSON.stringify({ artifactPath: "./api.zip" }, null, 2)}\n`);

    withFakeGhForDispatchGithubAwsDeploy(({ env }) => {
      const result = runJsonScriptWithEnv("scripts/dispatch-github-aws-deploy.mjs", [
        "--environment=staging",
        `--environment-dir=${relativeEnvDir}`,
        "--deployment-source=package-manifest",
        `--package-manifest-file=${relativeEnvDir}/package-manifest.json`,
        "--repo=ChurchApps/B1Admin",
        "--dry-run=true",
        "--output=json",
      ], env);

      if (result.status !== 0) {
        throw new Error(`dispatch-github-aws-deploy output sample contract run failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
      }

      const actual = result.parsed || {};
      expectObjectContainsKeys("dispatch-github-aws-deploy output sample", actual, sample);

      if (sample.action !== "validated") {
        throw new Error(`dispatch-github-aws-deploy output sample should document the dry-run validated path.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.workflowEnvironmentName !== "aws-staging") {
        throw new Error(`dispatch-github-aws-deploy output sample should document the GitHub environment name.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.deploymentSource !== "package-manifest") {
        throw new Error(`dispatch-github-aws-deploy output sample should document the package-manifest deployment source.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.previewOnly !== false) {
        throw new Error(`dispatch-github-aws-deploy output sample should document the default non-preview dispatch path.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.syncAppConfigSecret !== true || sample.secretSync?.attempted !== true || sample.secretSync?.performed !== false) {
        throw new Error(`dispatch-github-aws-deploy output sample should document the dry-run secret sync path.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (!String(sample.secretSync?.command || "").includes("sync:github-app-config-secret")) {
        throw new Error(`dispatch-github-aws-deploy output sample should document the GitHub secret sync helper command.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (!String(sample.dispatchCommand || "").includes("gh workflow run deploy-aws-self-hosted.yml")) {
        throw new Error(`dispatch-github-aws-deploy output sample should document the workflow dispatch command.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.workflowInputs?.preview_only !== "false" || !String(sample.dispatchCommand || "").includes("preview_only='false'")) {
        throw new Error(`dispatch-github-aws-deploy output sample should document the preview_only workflow input explicitly.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (!String(sample.followUpCommands?.listRuns || "").includes("gh run list --workflow deploy-aws-self-hosted.yml")
        || !String(sample.followUpCommands?.watchLatestRun || "").includes("gh run watch $(")
        || !String(sample.followUpCommands?.viewLatestRun || "").includes("gh run view $(")) {
        throw new Error(`dispatch-github-aws-deploy output sample should document the post-dispatch GitHub run follow-up commands.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function expectPublishFrontendOutputSampleMatchesContract() {
  const sample = readJsonFile("infrastructure/examples/publish-frontend-output.sample.json");

  withFakeFrontendBuildHarness(({ envCapturePath, PATH }) => {
    withFakeAwsForFrontendPublish((awsEnv) => {
      const result = runJsonScriptWithEnv("scripts/publish-frontend-assets.mjs", [
        "--frontend-outputs-file=infrastructure/examples/frontend-outputs.sample.json",
        "--backend-outputs-file=infrastructure/examples/backend-outputs.sample.json",
        "--output=json",
      ], {
        ...awsEnv,
        PATH: `${awsEnv.PATH || ""}${path.delimiter}${PATH}`,
      });

      if (result.status !== 0) {
        throw new Error(`publish-frontend output sample contract run failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
      }

      const actual = result.parsed || {};
      expectObjectContainsKeys("publish-frontend output sample", actual, sample);
      expectObjectContainsKeys("publish-frontend output sample", actual.outputs || {}, sample.outputs || {}, "outputs");
      expectObjectContainsKeys("publish-frontend output sample", actual.backendBuildEnv || {}, sample.backendBuildEnv || {}, "backendBuildEnv");

      const capturedEnv = JSON.parse(fs.readFileSync(envCapturePath, "utf8"));
      if (sample.bucket !== "example-frontend-bucket" || sample.distributionId !== "EXAMPLE123") {
        throw new Error(`publish-frontend output sample should document the saved publish target outputs.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.appUrl !== "https://admin.example.com") {
        throw new Error(`publish-frontend output sample should document the saved app URL.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.backendBuildEnv?.REACT_APP_API_BASE !== "https://api.example.com") {
        throw new Error(`publish-frontend output sample should document REACT_APP_API_BASE from backend outputs.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.backendBuildEnv?.REACT_APP_DEFAULT_STOCK_PHOTO !== "https://content.example.com/stockPhotos/default.jpg") {
        throw new Error(`publish-frontend output sample should document REACT_APP_DEFAULT_STOCK_PHOTO from backend outputs.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.skipBuild !== false || sample.frontendPublished !== true) {
        throw new Error(`publish-frontend output sample should document a successful build-driven publish.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (capturedEnv.REACT_APP_API_BASE !== "https://api.example.com" || capturedEnv.REACT_APP_STAGE !== "prod") {
        throw new Error(`publish-frontend output sample contract run did not receive the expected build env.\nCaptured env:\n${JSON.stringify(capturedEnv, null, 2)}\nSTDOUT:\n${result.stdout}`);
      }
    });
  });
}

function expectVerifySplitStackOutputSampleMatchesContract() {
  const sample = readJsonFile("infrastructure/examples/verify-split-stack-output.sample.json");

  const result = runJsonScript("scripts/verify-split-stack.mjs", [
    "--backend-outputs-file=infrastructure/examples/backend-outputs.sample.json",
    "--frontend-outputs-file=infrastructure/examples/frontend-outputs.sample.json",
    "--check-aws=false",
    "--output=json",
  ]);

  if (result.status !== 0) {
    throw new Error(`verify-split-stack output sample contract run failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }

  const actual = result.parsed || {};
  expectObjectContainsKeys("verify-split-stack output sample", actual, sample);
  expectObjectContainsKeys("verify-split-stack output sample", actual.resolved || {}, sample.resolved || {}, "resolved");

  if (sample.ok !== true || sample.mode !== "split-stack" || sample.checkAws !== false) {
    throw new Error(`verify-split-stack output sample should document a successful outputs-file verification run with AWS checks disabled.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (sample.backendOutputsFile !== "infrastructure/examples/backend-outputs.sample.json") {
    throw new Error(`verify-split-stack output sample should point to the sample backend outputs file.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (sample.frontendOutputsFile !== "infrastructure/examples/frontend-outputs.sample.json") {
    throw new Error(`verify-split-stack output sample should point to the sample frontend outputs file.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (sample.resolved?.apiBaseUrl !== "https://api.example.com") {
    throw new Error(`verify-split-stack output sample should document the resolved API base URL.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (sample.resolved?.frontendAppUrl !== "https://admin.example.com") {
    throw new Error(`verify-split-stack output sample should document the resolved frontend app URL.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  if (sample.resolved?.frontendBucketName !== "example-frontend-bucket" || sample.resolved?.frontendDistributionId !== "EXAMPLE123") {
    throw new Error(`verify-split-stack output sample should document the resolved frontend hosting outputs.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  const backendSourceCheck = sample.checks?.find((check) => check.name === "backend outputs source");
  if (!backendSourceCheck || !String(backendSourceCheck.detail).includes("/abs/path/to/B1Admin/infrastructure/examples/backend-outputs.sample.json")) {
    throw new Error(`verify-split-stack output sample should show the backend outputs placeholder path.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  const frontendSourceCheck = sample.checks?.find((check) => check.name === "frontend outputs source");
  if (!frontendSourceCheck || !String(frontendSourceCheck.detail).includes("/abs/path/to/B1Admin/infrastructure/examples/frontend-outputs.sample.json")) {
    throw new Error(`verify-split-stack output sample should show the frontend outputs placeholder path.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
  const skippedAwsCheck = sample.checks?.find((check) => check.name === "frontend bucket aws reachability");
  if (!skippedAwsCheck || skippedAwsCheck.skipped !== true) {
    throw new Error(`verify-split-stack output sample should show the skipped AWS reachability check when --check-aws=false.\nSample:\n${JSON.stringify(sample, null, 2)}`);
  }
}

function expectSaveSplitStackOutputsOutputSampleMatchesContract() {
  const sample = readJsonFile("infrastructure/examples/save-split-stack-outputs-output.sample.json");
  const outputDir = ".tmp-save-split-stack-contract";
  const outputDirPath = path.join(rootDir, outputDir);

  fs.rmSync(outputDirPath, { recursive: true, force: true });

  try {
    withFakeAwsForSaveSplitStackOutputs((env) => {
      fs.mkdirSync(outputDirPath, { recursive: true });
      fs.writeFileSync(path.join(outputDirPath, "preflight-plan.md"), "# Preflight Plan\n");

      const result = runJsonScriptWithEnv("scripts/save-split-stack-outputs.mjs", [
        "--environment=staging",
        "--region=us-east-1",
        `--output-dir=${outputDir}`,
        "--output=json",
      ], env);

      if (result.status !== 0) {
        throw new Error(`save-split-stack-outputs output sample contract run failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
      }

      const actual = result.parsed || {};
      expectObjectContainsKeys("save-split-stack-outputs output sample", actual, sample);
      expectObjectContainsKeys("save-split-stack-outputs output sample", actual.files || {}, sample.files || {}, "files");
      expectObjectContainsKeys("save-split-stack-outputs output sample", actual.resolved || {}, sample.resolved || {}, "resolved");
      expectObjectContainsKeys("save-split-stack-outputs output sample", actual.followUpCommands || {}, sample.followUpCommands || {}, "followUpCommands");

      if (sample.ok !== true || sample.environment !== "staging" || sample.region !== "us-east-1") {
        throw new Error(`save-split-stack-outputs output sample should document a successful staging capture run.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.stackNames?.backend !== "b1admin-staging-backend" || sample.stackNames?.frontend !== "b1admin-staging-frontend") {
        throw new Error(`save-split-stack-outputs output sample should document the derived staging stack names.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.resolved?.apiBaseUrl !== "https://api.example.com" || sample.resolved?.frontendAppUrl !== "https://admin.example.com") {
        throw new Error(`save-split-stack-outputs output sample should document the resolved staging URLs.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.resolved?.frontendBucketName !== "example-frontend-bucket" || sample.resolved?.frontendDistributionId !== "EXAMPLE123") {
        throw new Error(`save-split-stack-outputs output sample should document the resolved frontend hosting outputs.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.files?.backendOutputsFile !== ".tmp-save-split-stack-contract/backend-outputs.json"
        || sample.files?.frontendOutputsFile !== ".tmp-save-split-stack-contract/frontend-outputs.json"
        || sample.files?.summaryFile !== ".tmp-save-split-stack-contract/deployment-summary.json"
        || sample.files?.preflightPlanFile !== ".tmp-save-split-stack-contract/preflight-plan.md") {
        throw new Error(`save-split-stack-outputs output sample should document the saved output file locations.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (!String(sample.followUpCommands?.showDeploymentSummary || "").includes("yarn show:deployment-summary -- --summary-file=.tmp-save-split-stack-contract/deployment-summary.json --output=markdown")
        || !String(sample.followUpCommands?.verifyFromSavedOutputs || "").includes("--backend-outputs-file=.tmp-save-split-stack-contract/backend-outputs.json")
        || !String(sample.followUpCommands?.publishFromSavedOutputs || "").includes("--skip-backend --skip-frontend --publish-frontend-assets")) {
        throw new Error(`save-split-stack-outputs output sample should document the follow-up commands that reuse the saved files.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
    });
  } finally {
    fs.rmSync(outputDirPath, { recursive: true, force: true });
  }
}

function expectSaveSplitStackOutputsEnvironmentModeWorks() {
  const outputDir = ".tmp-save-split-stack-outputs";
  const outputDirPath = path.join(rootDir, outputDir);

  fs.rmSync(outputDirPath, { recursive: true, force: true });

  try {
    withFakeAwsForSaveSplitStackOutputs((env) => {
      fs.mkdirSync(outputDirPath, { recursive: true });
      fs.writeFileSync(path.join(outputDirPath, "preflight-plan.md"), "# Preflight Plan\n");

      const result = runJsonScriptWithEnv("scripts/save-split-stack-outputs.mjs", [
        "--environment=staging",
        "--region=us-east-1",
        `--output-dir=${outputDir}`,
        "--output=json",
      ], env);

      if (result.status !== 0) {
        throw new Error(`save-split-stack-outputs environment mode failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
      }

      const actual = result.parsed || {};
      const backendOutputsPath = path.join(rootDir, outputDir, "backend-outputs.json");
      const frontendOutputsPath = path.join(rootDir, outputDir, "frontend-outputs.json");
      const summaryPath = path.join(rootDir, outputDir, "deployment-summary.json");

      if (!fs.existsSync(backendOutputsPath) || !fs.existsSync(frontendOutputsPath) || !fs.existsSync(summaryPath)) {
        throw new Error(`save-split-stack-outputs did not write all expected output files.\nSTDOUT:\n${result.stdout}`);
      }

      const backendFile = readJsonFile(path.relative(rootDir, backendOutputsPath));
      const frontendFile = readJsonFile(path.relative(rootDir, frontendOutputsPath));
      const summaryFile = readJsonFile(path.relative(rootDir, summaryPath));

      if (backendFile.Stacks?.[0]?.Outputs?.find((output) => output.OutputKey === "ApiBaseUrl")?.OutputValue !== "https://api.example.com") {
        throw new Error(`save-split-stack-outputs did not save the raw backend stack outputs.\nSaved backend file:\n${JSON.stringify(backendFile, null, 2)}`);
      }
      if (frontendFile.Stacks?.[0]?.Outputs?.find((output) => output.OutputKey === "AppUrl")?.OutputValue !== "https://admin.example.com") {
        throw new Error(`save-split-stack-outputs did not save the raw frontend stack outputs.\nSaved frontend file:\n${JSON.stringify(frontendFile, null, 2)}`);
      }
      if (summaryFile.resolved?.appConfigSecretArn !== "arn:aws:secretsmanager:us-east-1:123456789012:secret:example") {
        throw new Error(`save-split-stack-outputs summary did not capture the backend secret ARN.\nSaved summary file:\n${JSON.stringify(summaryFile, null, 2)}`);
      }
      if (summaryFile.files?.preflightPlanFile !== `${outputDir}/preflight-plan.md`) {
        throw new Error(`save-split-stack-outputs summary did not capture the preflight plan file when present.\nSaved summary file:\n${JSON.stringify(summaryFile, null, 2)}`);
      }
      if (actual.followUpCommands?.showDeploymentSummary !== `yarn show:deployment-summary -- --summary-file=${outputDir}/deployment-summary.json --output=markdown`) {
        throw new Error(`save-split-stack-outputs did not return the expected summary-render follow-up command.\nSTDOUT:\n${result.stdout}`);
      }
      if (actual.followUpCommands?.publishFrontendAssetsFromSavedOutputs !== `yarn publish:frontend-assets -- --frontend-outputs-file=${outputDir}/frontend-outputs.json --backend-outputs-file=${outputDir}/backend-outputs.json`) {
        throw new Error(`save-split-stack-outputs did not return the expected publish follow-up command.\nSTDOUT:\n${result.stdout}`);
      }
    });
  } finally {
    fs.rmSync(outputDirPath, { recursive: true, force: true });
  }
}

function expectSaveSplitStackOutputsMissingArgsIsClean() {
  const result = runJsonScript("scripts/save-split-stack-outputs.mjs", [
    "--output=json",
  ]);

  if (result.status === 0) {
    throw new Error(`save-split-stack-outputs unexpectedly succeeded without stack names or environment.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }

  const errors = result.parsed?.errors || [];
  if (!errors.includes("Provide --backend-stack-name or --environment.") || !errors.includes("Provide --frontend-stack-name or --environment.")) {
    throw new Error(`save-split-stack-outputs did not report the missing required inputs cleanly.\nSTDOUT:\n${result.stdout}`);
  }
}

function expectShowDeploymentSummaryMarkdownWorks() {
  const result = runScript("scripts/show-deployment-summary.mjs", [
    "--summary-file=infrastructure/examples/save-split-stack-outputs-output.sample.json",
    "--output=markdown",
  ]);

  if (result.status !== 0) {
    throw new Error(`show-deployment-summary markdown run failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }

  const stdout = result.stdout || "";
  for (const snippet of [
    "## staging summary",
    "API base URL",
    "CloudFront distribution",
    "### Saved files",
    "### Follow-up commands",
    "Summary file:",
    "Preflight plan:",
  ]) {
    if (!stdout.includes(snippet)) {
      throw new Error(`show-deployment-summary markdown output is missing expected content: ${snippet}\nSTDOUT:\n${stdout}`);
    }
  }
}

function expectShowDeploymentSummaryCommandsWorks() {
  const result = runScript("scripts/show-deployment-summary.mjs", [
    "--summary-file=infrastructure/examples/save-split-stack-outputs-output.sample.json",
    "--output=commands",
  ]);

  if (result.status !== 0) {
    throw new Error(`show-deployment-summary commands run failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }

  const stdout = result.stdout || "";
  for (const snippet of [
    "yarn verify:split-stack -- --region=us-east-1 --backend-outputs-file=.tmp-save-split-stack-contract/backend-outputs.json --frontend-outputs-file=.tmp-save-split-stack-contract/frontend-outputs.json",
    "yarn publish:frontend-assets -- --frontend-outputs-file=.tmp-save-split-stack-contract/frontend-outputs.json --backend-outputs-file=.tmp-save-split-stack-contract/backend-outputs.json",
    "yarn show:deployment-summary -- --summary-file=.tmp-save-split-stack-contract/deployment-summary.json --output=markdown",
  ]) {
    if (!stdout.includes(snippet)) {
      throw new Error(`show-deployment-summary commands output is missing expected content: ${snippet}\nSTDOUT:\n${stdout}`);
    }
  }
}

function expectShowDeploymentSummaryMissingFileIsClean() {
  const result = runJsonScript("scripts/show-deployment-summary.mjs", [
    "--summary-file=does-not-exist.json",
    "--output=json",
  ]);

  if (result.status === 0) {
    throw new Error(`show-deployment-summary unexpectedly succeeded with a missing summary file.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }

  const errors = result.parsed?.errors || [];
  if (!errors.some((message) => String(message).includes('Could not load deployment summary "does-not-exist.json"'))) {
    throw new Error(`show-deployment-summary did not report the missing summary file cleanly.\nSTDOUT:\n${result.stdout}`);
  }
}

function expectDeployAwsPublishOutputSampleMatchesContract() {
  const sample = readJsonFile("infrastructure/examples/deploy-aws-publish-output.sample.json");

  withFakeFrontendBuildOutput(() => {
    withFakeAwsForFrontendPublish((env) => {
      const result = runJsonScriptWithEnv("scripts/deploy-aws.mjs", [
        "--skip-backend",
        "--skip-frontend",
        "--publish-frontend-assets",
        "--skip-build",
        "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
        "--frontend-outputs-file=infrastructure/examples/frontend-outputs.sample.json",
        "--output=json",
      ], env);

      if (result.status !== 0) {
        throw new Error(`deploy-aws publish output sample contract run failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
      }

      const actual = result.parsed || {};
      expectObjectContainsKeys("deploy-aws publish output sample", actual, sample);
      expectObjectContainsKeys("deploy-aws publish output sample", actual.frontendPublish || {}, sample.frontendPublish || {}, "frontendPublish");
      expectObjectContainsKeys("deploy-aws publish output sample", actual.frontendPublish?.outputs || {}, sample.frontendPublish?.outputs || {}, "frontendPublish.outputs");

      if (sample.region !== "us-east-1" || sample.environment !== "prod" || sample.projectName !== "b1admin") {
        throw new Error(`deploy-aws publish output sample should document the default region/environment/project identity.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.skipBackend !== true || sample.skipFrontend !== true || sample.skipBuild !== true || sample.publishFrontendAssets !== true) {
        throw new Error(`deploy-aws publish output sample should document the publish-only skip-build flow.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.frontendOutputsFile !== "infrastructure/examples/frontend-outputs.sample.json") {
        throw new Error(`deploy-aws publish output sample should point at the sample frontend outputs file.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.frontendPublish?.bucket !== "example-frontend-bucket" || sample.frontendPublish?.distributionId !== "EXAMPLE123") {
        throw new Error(`deploy-aws publish output sample should document the saved frontend publish target.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.frontendPublish?.appUrl !== "https://admin.example.com") {
        throw new Error(`deploy-aws publish output sample should document the saved frontend app URL.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.frontendPublish?.skipBuild !== true || sample.frontendPublish?.frontendPublished !== true) {
        throw new Error(`deploy-aws publish output sample should document a successful skip-build publish helper result.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
    });
  });
}

function expectDeployAwsFrontendInfraOutputSampleMatchesContract() {
  const sample = readJsonFile("infrastructure/examples/deploy-aws-frontend-infra-output.sample.json");

  withFakeAwsForFrontendDeploy((env) => {
    const result = runJsonScriptWithEnv("scripts/deploy-aws.mjs", [
      "--skip-backend",
      "--frontend-infrastructure-only",
      "--frontend-stack-name=example-frontend",
      "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
      "--frontend-parameters-file=infrastructure/examples/frontend-parameters.sample.json",
      "--backend-outputs-file=infrastructure/examples/backend-outputs.sample.json",
      "--output=json",
    ], env);

    if (result.status !== 0) {
      throw new Error(`deploy-aws frontend-infrastructure output sample contract run failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }

    const actual = result.parsed || {};
    expectObjectContainsKeys("deploy-aws frontend-infrastructure output sample", actual, sample);
    expectObjectContainsKeys("deploy-aws frontend-infrastructure output sample", actual.frontend || {}, sample.frontend || {}, "frontend");
    expectObjectContainsKeys("deploy-aws frontend-infrastructure output sample", actual.frontend?.outputs || {}, sample.frontend?.outputs || {}, "frontend.outputs");
    expectObjectContainsKeys("deploy-aws frontend-infrastructure output sample", actual.frontend?.backendBuildEnv || {}, sample.frontend?.backendBuildEnv || {}, "frontend.backendBuildEnv");

    if (sample.region !== "us-east-1" || sample.environment !== "prod" || sample.projectName !== "b1admin") {
      throw new Error(`deploy-aws frontend-infrastructure output sample should document the default region/environment/project identity.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (sample.skipBackend !== true || sample.frontendInfrastructureOnly !== true || sample.publishFrontendAssets !== false) {
      throw new Error(`deploy-aws frontend-infrastructure output sample should document the staged hosting-only wrapper flow.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (sample.backendOutputsFile !== "infrastructure/examples/backend-outputs.sample.json") {
      throw new Error(`deploy-aws frontend-infrastructure output sample should point at the sample backend outputs file.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (sample.frontend?.bucket !== "example-frontend-bucket" || sample.frontend?.distributionId !== "EXAMPLE123") {
      throw new Error(`deploy-aws frontend-infrastructure output sample should document the resolved frontend hosting target.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (sample.frontend?.appUrl !== "https://admin.example.com") {
      throw new Error(`deploy-aws frontend-infrastructure output sample should document the resolved frontend app URL.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (sample.frontend?.backendBuildEnv?.REACT_APP_API_BASE !== "https://api.example.com") {
      throw new Error(`deploy-aws frontend-infrastructure output sample should document REACT_APP_API_BASE from saved backend outputs.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
    if (sample.frontend?.infrastructureOnly !== true || sample.frontend?.frontendPublished !== false) {
      throw new Error(`deploy-aws frontend-infrastructure output sample should document the nested infrastructure-only frontend result.\nSample:\n${JSON.stringify(sample, null, 2)}`);
    }
  });
}

function expectDeployAwsPublishBuildOutputSampleMatchesContract() {
  const sample = readJsonFile("infrastructure/examples/deploy-aws-publish-build-output.sample.json");

  withFakeFrontendBuildHarness(({ envCapturePath, PATH }) => {
    withFakeAwsForFrontendPublish((awsEnv) => {
      const result = runJsonScriptWithEnv("scripts/deploy-aws.mjs", [
        "--skip-backend",
        "--skip-frontend",
        "--publish-frontend-assets",
        "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
        "--frontend-outputs-file=infrastructure/examples/frontend-outputs.sample.json",
        "--backend-outputs-file=infrastructure/examples/backend-outputs.sample.json",
        "--output=json",
      ], {
        ...awsEnv,
        PATH: `${awsEnv.PATH || ""}${path.delimiter}${PATH}`,
      });

      if (result.status !== 0) {
        throw new Error(`deploy-aws publish build output sample contract run failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
      }

      const actual = result.parsed || {};
      expectObjectContainsKeys("deploy-aws publish build output sample", actual, sample);
      expectObjectContainsKeys("deploy-aws publish build output sample", actual.frontendPublish || {}, sample.frontendPublish || {}, "frontendPublish");
      expectObjectContainsKeys("deploy-aws publish build output sample", actual.frontendPublish?.outputs || {}, sample.frontendPublish?.outputs || {}, "frontendPublish.outputs");
      expectObjectContainsKeys("deploy-aws publish build output sample", actual.frontendPublish?.backendBuildEnv || {}, sample.frontendPublish?.backendBuildEnv || {}, "frontendPublish.backendBuildEnv");

      const capturedEnv = JSON.parse(fs.readFileSync(envCapturePath, "utf8"));
      if (sample.backendOutputsFile !== "infrastructure/examples/backend-outputs.sample.json") {
        throw new Error(`deploy-aws publish build output sample should point at the sample backend outputs file.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.skipBuild !== false || sample.frontendPublish?.skipBuild !== false) {
        throw new Error(`deploy-aws publish build output sample should document the build-driven publish flow.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.frontendPublish?.backendBuildEnv?.REACT_APP_API_BASE !== "https://api.example.com") {
        throw new Error(`deploy-aws publish build output sample should document REACT_APP_API_BASE from saved backend outputs.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (sample.frontendPublish?.backendBuildEnv?.REACT_APP_DEFAULT_STOCK_PHOTO !== "https://content.example.com/stockPhotos/default.jpg") {
        throw new Error(`deploy-aws publish build output sample should document REACT_APP_DEFAULT_STOCK_PHOTO from saved backend outputs.\nSample:\n${JSON.stringify(sample, null, 2)}`);
      }
      if (capturedEnv.REACT_APP_API_BASE !== "https://api.example.com" || capturedEnv.REACT_APP_STAGE !== "prod") {
        throw new Error(`deploy-aws publish build output sample contract run did not receive the expected build env.\nCaptured env:\n${JSON.stringify(capturedEnv, null, 2)}\nSTDOUT:\n${result.stdout}`);
      }
    });
  });
}

function expectError(name, invocation, expectedMessage) {
  const result = runJsonScript("scripts/validate-aws-deploy.mjs", invocation);
  if (result.status === 0) {
    throw new Error(`${name} unexpectedly passed.\nSTDOUT:\n${result.stdout}`);
  }
  const errors = result.parsed?.errors || [];
  if (!errors.some((message) => message.includes(expectedMessage))) {
    throw new Error(`${name} did not include expected error "${expectedMessage}".\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }
}

function expectScriptError(name, scriptPath, invocation, expectedMessage) {
  const result = runScript(scriptPath, invocation);
  if (result.status === 0) {
    throw new Error(`${name} unexpectedly passed.\nSTDOUT:\n${result.stdout}`);
  }

  const combined = `${result.stdout}\n${result.stderr}`;
  if (!combined.includes(expectedMessage)) {
    throw new Error(`${name} did not include expected error "${expectedMessage}".\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }
}

function expectScriptErrorClean(name, scriptPath, invocation, expectedMessage) {
  const result = runScript(scriptPath, invocation);
  if (result.status === 0) {
    throw new Error(`${name} unexpectedly passed.\nSTDOUT:\n${result.stdout}`);
  }

  const combined = `${result.stdout}\n${result.stderr}`;
  if (!combined.includes(expectedMessage)) {
    throw new Error(`${name} did not include expected error "${expectedMessage}".\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }

  const unwantedFragments = ["node:internal/errors", "Node.js v"];
  const unexpected = unwantedFragments.find((fragment) => combined.includes(fragment));
  if (unexpected) {
    throw new Error(`${name} still leaked a raw Node stack trace fragment "${unexpected}".\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }
}

function expectScriptOk(name, scriptPath, invocation) {
  const result = runScript(scriptPath, invocation);
  if (result.status !== 0) {
    throw new Error(`${name} failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }
}

function withFakePackagableApiRepo(callback, options = {}) {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-packagable-api-repo-"));

  try {
    fs.mkdirSync(path.join(tempDir, "config"), { recursive: true });
    fs.mkdirSync(path.join(tempDir, "dist"), { recursive: true });
    fs.mkdirSync(path.join(tempDir, "node_modules", "fake-dependency"), { recursive: true });
    fs.mkdirSync(path.join(tempDir, "tools", "migrations", "membership"), { recursive: true });
    fs.writeFileSync(path.join(tempDir, "config", "default.json"), "{}\n");
    fs.writeFileSync(path.join(tempDir, "dist", "index.js"), "export const ok = true;\n");
    fs.writeFileSync(path.join(tempDir, "lambda.js"), "exports.handler = async () => ({ statusCode: 200, body: 'ok' });\n");
    fs.writeFileSync(path.join(tempDir, "package.json"), `${JSON.stringify({
      name: "fake-api-repo",
      private: true,
      scripts: {
        "build:prod": "echo build",
        "build-layer": "echo build-layer",
      },
    }, null, 2)}\n`);
    fs.writeFileSync(path.join(tempDir, "node_modules", "fake-dependency", "index.js"), "module.exports = {};\n");
    fs.writeFileSync(path.join(tempDir, "serverless.yml"), `service: fake-api
provider:
  name: aws
  runtime: nodejs22.x
functions:
  web:
    handler: lambda.web
  socket:
    handler: lambda.socket
  timer15Min:
    handler: lambda.timer15Min
environment:
  MEMBERSHIP_CONNECTION_STRING: \${ssm:/prod/membershipConnectionString}
`);
    fs.writeFileSync(path.join(tempDir, "tools", "kysely-config.ts"), `const MODULES = ["membership", "attendance"] as const;\nexport { MODULES };\n`);

    if (options.includeLayer) {
      fs.mkdirSync(path.join(tempDir, "layer", "nodejs"), { recursive: true });
      fs.writeFileSync(path.join(tempDir, "layer", "nodejs", "index.js"), "module.exports = {};\n");
    }

    callback(tempDir);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function withUnreadableFakeApiRepo(callback) {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-unreadable-api-repo-"));
  const packageJsonPath = path.join(tempDir, "package.json");

  try {
    fs.writeFileSync(packageJsonPath, `${JSON.stringify({
      name: "fake-api-repo",
      private: true,
    }, null, 2)}\n`);
    fs.chmodSync(packageJsonPath, 0o000);
    callback(tempDir);
  } finally {
    try {
      fs.chmodSync(packageJsonPath, 0o644);
    } catch {}
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function withUnreadableFakeApiRepoDirectory(callback) {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-unreadable-api-repo-dir-"));
  const packageJsonPath = path.join(tempDir, "package.json");

  try {
    fs.writeFileSync(packageJsonPath, `${JSON.stringify({
      name: "fake-api-repo",
      private: true,
    }, null, 2)}\n`);
    fs.chmodSync(tempDir, 0o000);
    callback(tempDir);
  } finally {
    try {
      fs.chmodSync(tempDir, 0o755);
    } catch {}
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function expectAuditApiRepoContractWorks() {
  withFakePackagableApiRepo((fakeApiRepoPath) => {
    const result = runJsonScript("scripts/audit-api-repo-contract.mjs", [
      `--api-repo-path=${fakeApiRepoPath}`,
      "--output=json",
    ]);

    if (result.status !== 0) {
      throw new Error(`audit-api-repo-contract should succeed for a readable fake Api repo.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }

    const actual = result.parsed || {};
    if (actual.ok !== true || actual.packaging?.autoPackageReady !== true || actual.contract?.ready !== true) {
      throw new Error(`audit-api-repo-contract did not report the expected ready state.\nSTDOUT:\n${result.stdout}`);
    }
    if (actual.recommended?.packageMode !== "layered-or-self-contained") {
      throw new Error(`audit-api-repo-contract did not recommend the expected package mode.\nSTDOUT:\n${result.stdout}`);
    }
    if (!Array.isArray(actual.migrations?.modules) || !actual.migrations.modules.includes("membership") || !actual.migrations.modules.includes("attendance")) {
      throw new Error(`audit-api-repo-contract did not detect the expected migration modules.\nSTDOUT:\n${result.stdout}`);
    }
  }, { includeLayer: true });
}

function expectAuditApiRepoContractUnreadablePathIsClean() {
  const result = runJsonScript("scripts/audit-api-repo-contract.mjs", [
    "--api-repo-path=/definitely/missing/api-repo",
    "--output=json",
  ]);

  if (result.status === 0) {
    throw new Error(`audit-api-repo-contract unexpectedly succeeded for a missing repo path.\nSTDOUT:\n${result.stdout}`);
  }

  const actual = result.parsed || {};
  if (actual.ok !== false || !Array.isArray(actual.errors) || !actual.errors.some((entry) => String(entry).includes("API repo path not found:"))) {
    throw new Error(`audit-api-repo-contract did not return the expected missing-path error.\nSTDOUT:\n${result.stdout}`);
  }
}

function withFakePackageManifest(callback, options = {}) {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-package-manifest-"));
  const manifestPath = path.join(tempDir, "api-test-self-contained.manifest.json");
  const backendArtifactAbsolutePath = options.missingBackendArtifact
    ? path.join(tempDir, "missing-api.zip")
    : path.join(tempDir, "api-test-self-contained.zip");
  const migrationArtifactAbsolutePath = (options.includeMigrationArtifact || options.missingMigrationArtifact)
    ? path.join(tempDir, "api-test-migrations.zip")
    : "";
  const layerArtifactAbsolutePath = options.includeLayerArtifact
    ? path.join(tempDir, "api-test-dependencies-layer.zip")
    : "";

  try {
    if (!options.missingBackendArtifact) {
      fs.writeFileSync(backendArtifactAbsolutePath, "fake artifact\n");
    }
    if (options.includeMigrationArtifact && !options.missingMigrationArtifact) {
      fs.writeFileSync(migrationArtifactAbsolutePath, "fake migration artifact\n");
    }
    if (options.includeLayerArtifact) {
      fs.writeFileSync(layerArtifactAbsolutePath, "fake layer\n");
    }

    fs.writeFileSync(manifestPath, `${JSON.stringify({
      apiRepoPath: path.join(rootDir, "..", "Api"),
      packageMode: options.packageMode || "self-contained",
      environment: "test",
      build: false,
      buildCommand: "build:prod",
      buildLayer: Boolean(options.includeLayerArtifact),
      buildLayerCommand: options.includeLayerArtifact ? "build-layer" : "",
      backendArtifactPath: path.basename(backendArtifactAbsolutePath),
      migrationArtifactPath: migrationArtifactAbsolutePath ? path.basename(migrationArtifactAbsolutePath) : "",
      dependenciesLayerArtifactPath: layerArtifactAbsolutePath ? path.basename(layerArtifactAbsolutePath) : "",
      manifestPath: path.basename(manifestPath),
      recommendedNextSteps: {
        uploadBackendArtifact: "yarn upload:backend-artifact -- --source-file=fake.zip",
        deployMode: "Use the resulting backend zip directly.",
      },
      includedBackendEntries: ["dist"],
    }, null, 2)}\n`);
    callback(manifestPath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function withFakeFrontendBuildOutput(callback) {
  const distDir = path.join(rootDir, "dist");
  const backupDir = `${distDir}.backup-smoke`;
  const hadDist = fs.existsSync(distDir);

  try {
    if (fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
    if (hadDist) {
      fs.renameSync(distDir, backupDir);
    }

    fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(path.join(distDir, "index.html"), "<!doctype html><html><body>smoke</body></html>\n");
    fs.writeFileSync(path.join(distDir, "sw.js"), "self.addEventListener('install', () => {});\n");
    callback();
  } finally {
    fs.rmSync(distDir, { recursive: true, force: true });
    if (hadDist && fs.existsSync(backupDir)) {
      fs.renameSync(backupDir, distDir);
    } else if (fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
  }
}

function withMissingFrontendBuildOutput(callback) {
  const distDir = path.join(rootDir, "dist");
  const backupDir = `${distDir}.backup-smoke-missing`;
  const hadDist = fs.existsSync(distDir);

  try {
    if (fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
    if (hadDist) {
      fs.renameSync(distDir, backupDir);
    }

    callback();
  } finally {
    fs.rmSync(distDir, { recursive: true, force: true });
    if (hadDist && fs.existsSync(backupDir)) {
      fs.renameSync(backupDir, distDir);
    } else if (fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
  }
}

function withMissingFrontendNodeModules(callback) {
  const nodeModulesDir = path.join(rootDir, "node_modules");
  const backupDir = `${nodeModulesDir}.backup-smoke-missing-deps`;
  const hadNodeModules = fs.existsSync(nodeModulesDir);

  try {
    if (fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
    if (hadNodeModules) {
      fs.renameSync(nodeModulesDir, backupDir);
    }

    callback();
  } finally {
    fs.rmSync(nodeModulesDir, { recursive: true, force: true });
    if (hadNodeModules && fs.existsSync(backupDir)) {
      fs.renameSync(backupDir, nodeModulesDir);
    } else if (fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
  }
}

function writeFakeFrontendDependencyMarker(nodeModulesDir) {
  const viteCliPath = path.join(nodeModulesDir, "vite", "dist", "node", "cli.js");
  fs.mkdirSync(path.dirname(viteCliPath), { recursive: true });
  fs.writeFileSync(viteCliPath, "export {};\n");
}

function withStarterScriptHarness(environmentName, callback) {
  const tempRoot = fs.mkdtempSync(path.join(rootDir, `.tmp-${environmentName}-starter-script-`));
  const environmentRoot = path.join(tempRoot, "infrastructure", "environments", environmentName);
  const sourceRoot = path.join(rootDir, "infrastructure", "environments", environmentName);
  const fakeBin = path.join(tempRoot, "bin");
  const fakeApiRepo = path.join(tempRoot, "Api");
  const npmPath = path.join(fakeBin, "npm");
  const logPath = path.join(tempRoot, "npm-invocations.log");

  try {
    fs.mkdirSync(environmentRoot, { recursive: true });
    fs.mkdirSync(fakeBin, { recursive: true });
    fs.mkdirSync(fakeApiRepo, { recursive: true });

    for (const fileName of fs.readdirSync(sourceRoot)) {
      const sourcePath = path.join(sourceRoot, fileName);
      const targetPath = path.join(environmentRoot, fileName);
      fs.copyFileSync(sourcePath, targetPath);
    }

    for (const jsonName of ["bootstrap-parameters.json", "backend-parameters.json"]) {
      const jsonPath = path.join(environmentRoot, jsonName);
      const updated = fs.readFileSync(jsonPath, "utf8").replaceAll("replace-me", "ready");
      fs.writeFileSync(jsonPath, updated);
    }

    fs.writeFileSync(path.join(fakeApiRepo, "package.json"), `${JSON.stringify({
      name: "fake-api-repo",
      private: true,
    }, null, 2)}\n`);

    fs.writeFileSync(npmPath, `#!/usr/bin/env node
import fs from "node:fs";
const line = process.argv.slice(2).join("\\u001f");
fs.appendFileSync(${JSON.stringify(logPath)}, line + "\\n");
process.exit(0);
`);
    fs.chmodSync(npmPath, 0o755);

    callback({
      rootPath: tempRoot,
      scriptPath: path.join(environmentRoot, "deploy-split-stack.sh"),
      logPath,
      env: {
        ...process.env,
        API_REPO_PATH: "./Api",
        PATH: `${fakeBin}${path.delimiter}${process.env.PATH || ""}`,
      },
    });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function replaceStarterBackendDefaults(environmentDir, environmentName = "staging") {
  const backendPath = path.join(environmentDir, "backend-parameters.json");
  const backend = JSON.parse(fs.readFileSync(backendPath, "utf8"));
  const suffix = environmentName === "prod" ? "prod" : environmentName;

  backend.WebsiteBaseUrl = `https://{subdomain}.${suffix}.b1test.org`;
  backend.ContentRootUrl = `https://content-${suffix}.b1test.org`;
  backend.B1AdminRootUrl = `https://admin-${suffix}.b1test.org`;
  backend.CorsOrigin = `https://admin-${suffix}.b1test.org`;
  backend.StoreApiUrl = `https://store-${suffix}.b1test.org`;
  backend.TransferUrl = `https://transfer-${suffix}.b1test.org`;
  backend.SupportEmail = `support@${suffix}.b1test.org`;
  backend.SupportPhone = "800-555-0199";
  backend.SupportSiteUrl = `https://support-${suffix}.b1test.org`;

  fs.writeFileSync(backendPath, `${JSON.stringify(backend, null, 2)}\n`);
}

function restoreStarterTemplateDefaults(environmentDir, environmentName = "staging") {
  const bootstrapPath = path.join(environmentDir, "bootstrap-parameters.json");
  const backendPath = path.join(environmentDir, "backend-parameters.json");
  const secretTemplatePath = path.join(environmentDir, "app-config-secret.template.json");
  const environmentSuffix = environmentName === "prod" ? "" : `-${environmentName}`;

  const bootstrap = JSON.parse(fs.readFileSync(bootstrapPath, "utf8"));
  bootstrap.TemplateBucketName = `replace-me-b1admin-${environmentName}-templates-123456789012`;
  bootstrap.ArtifactBucketName = `replace-me-b1admin-${environmentName}-artifacts-123456789012`;
  fs.writeFileSync(bootstrapPath, `${JSON.stringify(bootstrap, null, 2)}\n`);

  const backend = JSON.parse(fs.readFileSync(backendPath, "utf8"));
  backend.LambdaCodeS3Bucket = `replace-me-b1admin-${environmentName}-artifacts-123456789012`;
  backend.WebsiteBaseUrl = "https://{subdomain}.example.com";
  backend.ContentRootUrl = `https://content${environmentSuffix}.example.com`;
  backend.B1AdminRootUrl = `https://admin${environmentSuffix}.example.com`;
  backend.CorsOrigin = `https://admin${environmentSuffix}.example.com`;
  backend.StoreApiUrl = `https://store${environmentSuffix}.example.com`;
  backend.TransferUrl = `https://transfer${environmentSuffix}.example.com`;
  backend.SupportEmail = "support@example.com";
  backend.SupportPhone = "555-555-5555";
  backend.SupportSiteUrl = "https://support.example.com";
  backend.MobileAppUrl = "";
  backend.DomainCnameTarget = "";
  backend.DomainATarget = "";
  backend.DefaultStockPhoto = "";
  backend.GoogleAnalyticsTag = "";
  fs.writeFileSync(backendPath, `${JSON.stringify(backend, null, 2)}\n`);

  const secretTemplate = JSON.parse(fs.readFileSync(secretTemplatePath, "utf8"));
  secretTemplate.jwtSecret = "replace-me-long-random-jwt-secret";
  secretTemplate.encryptionKey = "replace-me-long-random-encryption-key";
  secretTemplate.webPushSubject = "mailto:support@example.com";
  fs.writeFileSync(secretTemplatePath, `${JSON.stringify(secretTemplate, null, 2)}\n`);
}

function withRawStarterEnvironment(environmentName, callback) {
  const tempDir = fs.mkdtempSync(path.join(rootDir, `.tmp-raw-${environmentName}-starter-`));

  try {
    for (const fileName of [
      "bootstrap-parameters.json",
      "backend-parameters.json",
      "frontend-parameters.json",
      "app-config-secret.template.json",
    ]) {
      fs.copyFileSync(
        path.join(rootDir, "infrastructure", "environments", environmentName, fileName),
        path.join(tempDir, fileName),
      );
    }

    restoreStarterTemplateDefaults(tempDir, environmentName);
    callback(tempDir);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function withRawStarterRepo(environmentName, callback) {
  const tempRoot = fs.mkdtempSync(path.join(rootDir, `.tmp-raw-${environmentName}-repo-`));
  const tempScripts = path.join(tempRoot, "scripts");
  const tempEnvRoot = path.join(tempRoot, "infrastructure", "environments", environmentName);

  try {
    fs.mkdirSync(tempScripts, { recursive: true });
    fs.mkdirSync(tempEnvRoot, { recursive: true });

    fs.copyFileSync(path.join(rootDir, "package.json"), path.join(tempRoot, "package.json"));
    fs.cpSync(path.join(rootDir, "scripts"), tempScripts, { recursive: true });

    for (const fileName of [
      "bootstrap-parameters.json",
      "backend-parameters.json",
      "frontend-parameters.json",
      "app-config-secret.template.json",
      "deploy-split-stack.sh",
    ]) {
      fs.copyFileSync(
        path.join(rootDir, "infrastructure", "environments", environmentName, fileName),
        path.join(tempEnvRoot, fileName),
      );
    }

    restoreStarterTemplateDefaults(tempEnvRoot, environmentName);
    callback({
      rootPath: tempRoot,
      scriptPath: path.join(tempEnvRoot, "deploy-split-stack.sh"),
    });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function withFakeFrontendNodeModules(callback) {
  const nodeModulesDir = path.join(rootDir, "node_modules");
  const backupDir = `${nodeModulesDir}.backup-smoke`;
  const hadNodeModules = fs.existsSync(nodeModulesDir);

  try {
    if (fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
    if (hadNodeModules) {
      fs.renameSync(nodeModulesDir, backupDir);
    }

    fs.mkdirSync(nodeModulesDir, { recursive: true });
    writeFakeFrontendDependencyMarker(nodeModulesDir);
    callback();
  } finally {
    fs.rmSync(nodeModulesDir, { recursive: true, force: true });
    if (hadNodeModules && fs.existsSync(backupDir)) {
      fs.renameSync(backupDir, nodeModulesDir);
    } else if (fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
  }
}

function withFakeFrontendBuildHarness(callback) {
  const nodeModulesDir = path.join(rootDir, "node_modules");
  const nodeModulesBackupDir = `${nodeModulesDir}.backup-smoke`;
  const distDir = path.join(rootDir, "dist");
  const distBackupDir = `${distDir}.backup-smoke`;
  const toolsDir = fs.mkdtempSync(path.join(rootDir, ".tmp-fake-frontend-build-"));
  const vitePath = path.join(toolsDir, "vite");
  const envCapturePath = path.join(toolsDir, "build-env.json");
  const hadNodeModules = fs.existsSync(nodeModulesDir);
  const hadDist = fs.existsSync(distDir);
  const script = `#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const args = process.argv.slice(2);
if (args[0] !== "build") {
  process.stderr.write("Unexpected vite invocation: " + args.join(" ") + "\\n");
  process.exit(1);
}
const rootDir = ${JSON.stringify(rootDir)};
const capturePath = ${JSON.stringify(envCapturePath)};
const distDir = path.join(rootDir, "dist");
fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(path.join(distDir, "index.html"), "<!doctype html><html><body>fake build</body></html>\\n");
fs.writeFileSync(path.join(distDir, "sw.js"), "self.addEventListener('install', () => {});\\n");
fs.writeFileSync(capturePath, JSON.stringify({
  REACT_APP_STAGE: process.env.REACT_APP_STAGE || "",
  REACT_APP_API_BASE: process.env.REACT_APP_API_BASE || "",
  REACT_APP_CONTENT_ROOT: process.env.REACT_APP_CONTENT_ROOT || "",
  REACT_APP_B1_WEBSITE_URL: process.env.REACT_APP_B1_WEBSITE_URL || "",
  REACT_APP_LESSONS_API: process.env.REACT_APP_LESSONS_API || "",
  REACT_APP_TRANSFER_URL: process.env.REACT_APP_TRANSFER_URL || "",
  REACT_APP_SUPPORT_EMAIL: process.env.REACT_APP_SUPPORT_EMAIL || "",
  REACT_APP_SUPPORT_PHONE: process.env.REACT_APP_SUPPORT_PHONE || "",
  REACT_APP_SUPPORT_SITE_URL: process.env.REACT_APP_SUPPORT_SITE_URL || "",
  REACT_APP_MOBILE_APP_URL: process.env.REACT_APP_MOBILE_APP_URL || "",
  REACT_APP_DOMAIN_CNAME_TARGET: process.env.REACT_APP_DOMAIN_CNAME_TARGET || "",
  REACT_APP_DOMAIN_A_TARGET: process.env.REACT_APP_DOMAIN_A_TARGET || "",
  REACT_APP_DEFAULT_STOCK_PHOTO: process.env.REACT_APP_DEFAULT_STOCK_PHOTO || "",
}, null, 2) + "\\n");
`;

  try {
    if (fs.existsSync(nodeModulesBackupDir)) fs.rmSync(nodeModulesBackupDir, { recursive: true, force: true });
    if (fs.existsSync(distBackupDir)) fs.rmSync(distBackupDir, { recursive: true, force: true });
    if (hadNodeModules) fs.renameSync(nodeModulesDir, nodeModulesBackupDir);
    if (hadDist) fs.renameSync(distDir, distBackupDir);

    fs.mkdirSync(nodeModulesDir, { recursive: true });
    writeFakeFrontendDependencyMarker(nodeModulesDir);
    fs.writeFileSync(vitePath, script);
    fs.chmodSync(vitePath, 0o755);

    callback({
      PATH: `${toolsDir}${path.delimiter}${process.env.PATH || ""}`,
      envCapturePath,
    });
  } finally {
    fs.rmSync(distDir, { recursive: true, force: true });
    if (hadDist && fs.existsSync(distBackupDir)) fs.renameSync(distBackupDir, distDir);
    else if (fs.existsSync(distBackupDir)) fs.rmSync(distBackupDir, { recursive: true, force: true });

    fs.rmSync(nodeModulesDir, { recursive: true, force: true });
    if (hadNodeModules && fs.existsSync(nodeModulesBackupDir)) fs.renameSync(nodeModulesBackupDir, nodeModulesDir);
    else if (fs.existsSync(nodeModulesBackupDir)) fs.rmSync(nodeModulesBackupDir, { recursive: true, force: true });

    fs.rmSync(toolsDir, { recursive: true, force: true });
  }
}

function withFakeAwsAllowingS3Cp(callback) {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-fake-aws-s3cp-"));
  const awsPath = path.join(tempDir, "aws");
  const script = `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === "s3" && args[1] === "cp") {
  process.exit(0);
}
process.stderr.write("Unexpected aws invocation: " + args.join(" ") + "\\n");
process.exit(1);
`;

  try {
    fs.writeFileSync(awsPath, script);
    fs.chmodSync(awsPath, 0o755);
    callback({
      PATH: `${tempDir}${path.delimiter}${process.env.PATH || ""}`,
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function withFakeAwsForBackendDeploy(callback) {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-fake-aws-backend-"));
  const awsPath = path.join(tempDir, "aws");
  const script = `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === "s3" && args[1] === "cp") {
  process.exit(0);
}
if (args[0] === "cloudformation" && args[1] === "deploy") {
  process.exit(0);
}
if (args[0] === "cloudformation" && args[1] === "describe-stacks") {
  const stackNameIndex = args.indexOf("--stack-name");
  const stackName = stackNameIndex >= 0 ? args[stackNameIndex + 1] : "";
  if (stackName === "example-backend") {
    process.stdout.write(JSON.stringify({
      Stacks: [{
        Outputs: [
          { OutputKey: "AppConfigSecretArn", OutputValue: "arn:aws:secretsmanager:us-east-1:123456789012:secret:example" }
        ]
      }]
    }));
    process.exit(0);
  }
  process.stderr.write("Unexpected stack lookup: " + stackName + "\\n");
  process.exit(1);
}
process.stderr.write("Unexpected aws invocation: " + args.join(" ") + "\\n");
process.exit(1);
`;

  try {
    fs.writeFileSync(awsPath, script);
    fs.chmodSync(awsPath, 0o755);
    callback({
      PATH: `${tempDir}${path.delimiter}${process.env.PATH || ""}`,
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function withFakeAwsForBootstrapDeploy(callback) {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-fake-aws-bootstrap-"));
  const awsPath = path.join(tempDir, "aws");
  const script = `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === "cloudformation" && args[1] === "deploy") {
  process.exit(0);
}
if (args[0] === "cloudformation" && args[1] === "describe-stacks") {
  const stackNameIndex = args.indexOf("--stack-name");
  const stackName = stackNameIndex >= 0 ? args[stackNameIndex + 1] : "";
  if (stackName === "example-bootstrap") {
    process.stdout.write(JSON.stringify({
      Stacks: [{
        Outputs: [
          { OutputKey: "TemplateBucketName", OutputValue: "b1admin-prod-templates-123456789012" },
          { OutputKey: "ArtifactBucketName", OutputValue: "b1admin-prod-artifacts-123456789012" }
        ]
      }]
    }));
    process.exit(0);
  }
  process.stderr.write("Unexpected stack lookup: " + stackName + "\\n");
  process.exit(1);
}
process.stderr.write("Unexpected aws invocation: " + args.join(" ") + "\\n");
process.exit(1);
`;

  try {
    fs.writeFileSync(awsPath, script);
    fs.chmodSync(awsPath, 0o755);
    callback({
      PATH: `${tempDir}${path.delimiter}${process.env.PATH || ""}`,
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function withFakeAwsForFrontendDeploy(callback) {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-fake-aws-frontend-"));
  const awsPath = path.join(tempDir, "aws");
  const statePath = path.join(tempDir, "state.json");
  const script = `#!/usr/bin/env node
import fs from "node:fs";
const args = process.argv.slice(2);
const statePath = ${JSON.stringify(statePath)};
let state = { describeCount: 0 };
if (fs.existsSync(statePath)) {
  state = JSON.parse(fs.readFileSync(statePath, "utf8"));
}
if (args[0] === "cloudformation" && args[1] === "deploy") {
  process.exit(0);
}
if (args[0] === "cloudformation" && args[1] === "describe-stacks") {
  const stackNameIndex = args.indexOf("--stack-name");
  const stackName = stackNameIndex >= 0 ? args[stackNameIndex + 1] : "";
  if (stackName === "example-frontend") {
    state.describeCount += 1;
    fs.writeFileSync(statePath, JSON.stringify(state));
    if (state.describeCount > 1) {
      process.stderr.write("Unexpected repeated frontend stack lookup\\n");
      process.exit(1);
    }
    process.stdout.write(JSON.stringify({
      Stacks: [{
        Outputs: [
          { OutputKey: "SiteBucketName", OutputValue: "example-frontend-bucket" },
          { OutputKey: "CloudFrontDistributionId", OutputValue: "EXAMPLE123" },
          { OutputKey: "AppUrl", OutputValue: "https://admin.example.com" }
        ]
      }]
    }));
    process.exit(0);
  }
  process.stderr.write("Unexpected stack lookup: " + stackName + "\\n");
  process.exit(1);
}
if (args[0] === "s3" && (args[1] === "sync" || args[1] === "cp")) {
  process.exit(0);
}
if (args[0] === "cloudfront" && args[1] === "create-invalidation") {
  process.stdout.write(JSON.stringify({ Invalidation: { Id: "TEST" } }));
  process.exit(0);
}
process.stderr.write("Unexpected aws command: " + args.join(" ") + "\\n");
process.exit(1);
`;

  try {
    fs.writeFileSync(awsPath, script);
    fs.chmodSync(awsPath, 0o755);
    callback({
      PATH: `${tempDir}${path.delimiter}${process.env.PATH || ""}`,
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function withFakeAwsForSplitStackFullDeploy(callback) {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-fake-aws-split-stack-full-"));
  const awsPath = path.join(tempDir, "aws");
  const script = `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === "s3" && (args[1] === "cp" || args[1] === "sync")) {
  process.exit(0);
}
if (args[0] === "cloudfront" && args[1] === "create-invalidation") {
  process.stdout.write(JSON.stringify({ Invalidation: { Id: "TEST" } }));
  process.exit(0);
}
if (args[0] === "cloudformation" && args[1] === "deploy") {
  process.exit(0);
}
if (args[0] === "cloudformation" && args[1] === "describe-stacks") {
  const stackNameIndex = args.indexOf("--stack-name");
  const stackName = stackNameIndex >= 0 ? args[stackNameIndex + 1] : "";
  if (stackName === "example-backend") {
    process.stdout.write(JSON.stringify({
      Stacks: [{
        Outputs: [
          { OutputKey: "ApiBaseUrl", OutputValue: "https://api.example.com" },
          { OutputKey: "ContentRootUrl", OutputValue: "https://content.example.com" },
          { OutputKey: "WebsiteBaseUrl", OutputValue: "https://{subdomain}.example.com" },
          { OutputKey: "LessonsApiUrl", OutputValue: "https://lessons-api.example.com" },
          { OutputKey: "TransferUrl", OutputValue: "https://transfer.example.com" },
          { OutputKey: "SupportEmail", OutputValue: "support@example.com" },
          { OutputKey: "SupportPhone", OutputValue: "555-555-5555" },
          { OutputKey: "SupportSiteUrl", OutputValue: "https://support.example.com" },
          { OutputKey: "MobileAppUrl", OutputValue: "https://example.com/app" },
          { OutputKey: "DomainCnameTarget", OutputValue: "proxy.example.com" },
          { OutputKey: "DomainATarget", OutputValue: "203.0.113.10" },
          { OutputKey: "DefaultStockPhoto", OutputValue: "https://content.example.com/stockPhotos/default.jpg" },
          { OutputKey: "AppConfigSecretArn", OutputValue: "arn:aws:secretsmanager:us-east-1:123456789012:secret:b1admin-prod-app-config-abc123" },
          { OutputKey: "DatabaseEndpoint", OutputValue: "b1admin-prod.cluster-example.us-east-1.rds.amazonaws.com" },
          { OutputKey: "DatabasePort", OutputValue: "3306" },
          { OutputKey: "DatabaseSecretArn", OutputValue: "arn:aws:secretsmanager:us-east-1:123456789012:secret:b1admin-prod-db-master-abc123" },
          { OutputKey: "MembershipDatabaseName", OutputValue: "membership" },
          { OutputKey: "AttendanceDatabaseName", OutputValue: "attendance" },
          { OutputKey: "ContentDatabaseName", OutputValue: "content" },
          { OutputKey: "GivingDatabaseName", OutputValue: "giving" },
          { OutputKey: "MessagingDatabaseName", OutputValue: "messaging" },
          { OutputKey: "DoingDatabaseName", OutputValue: "doing" },
          { OutputKey: "ReportingDatabaseName", OutputValue: "reporting" }
        ]
      }]
    }));
    process.exit(0);
  }
  if (stackName === "example-frontend") {
    process.stdout.write(JSON.stringify({
      Stacks: [{
        Outputs: [
          { OutputKey: "SiteBucketName", OutputValue: "example-frontend-bucket" },
          { OutputKey: "CloudFrontDistributionId", OutputValue: "EXAMPLE123" },
          { OutputKey: "AppUrl", OutputValue: "https://admin.example.com" }
        ]
      }]
    }));
    process.exit(0);
  }
  process.stderr.write("Unexpected stack lookup: " + stackName + "\\n");
  process.exit(1);
}
process.stderr.write("Unexpected aws invocation: " + args.join(" ") + "\\n");
process.exit(1);
`;

  try {
    fs.writeFileSync(awsPath, script);
    fs.chmodSync(awsPath, 0o755);
    callback({
      PATH: `${tempDir}${path.delimiter}${process.env.PATH || ""}`,
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function withFakeAwsForFrontendPublish(callback) {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-fake-aws-frontend-publish-"));
  const awsPath = path.join(tempDir, "aws");
  const script = `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === "s3" && args[1] === "sync") {
  process.exit(0);
}
if (args[0] === "s3" && args[1] === "cp") {
  process.exit(0);
}
if (args[0] === "cloudfront" && args[1] === "create-invalidation") {
  process.exit(0);
}
process.stderr.write("Unexpected aws invocation: " + args.join(" ") + "\\n");
process.exit(1);
`;

  try {
    fs.writeFileSync(awsPath, script);
    fs.chmodSync(awsPath, 0o755);
    callback({
      PATH: `${tempDir}${path.delimiter}${process.env.PATH || ""}`,
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function withFakeAwsForSaveSplitStackOutputs(callback) {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-fake-aws-save-split-stack-outputs-"));
  const awsPath = path.join(tempDir, "aws");
  const script = `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === "cloudformation" && args[1] === "describe-stacks") {
  const stackNameIndex = args.indexOf("--stack-name");
  const stackName = stackNameIndex >= 0 ? args[stackNameIndex + 1] : "";
  if (stackName === "b1admin-staging-backend") {
    process.stdout.write(JSON.stringify({
      Stacks: [{
        Outputs: [
          { OutputKey: "ApiBaseUrl", OutputValue: "https://api.example.com" },
          { OutputKey: "AppConfigSecretArn", OutputValue: "arn:aws:secretsmanager:us-east-1:123456789012:secret:example" }
        ]
      }]
    }));
    process.exit(0);
  }
  if (stackName === "b1admin-staging-frontend") {
    process.stdout.write(JSON.stringify({
      Stacks: [{
        Outputs: [
          { OutputKey: "AppUrl", OutputValue: "https://admin.example.com" },
          { OutputKey: "SiteBucketName", OutputValue: "example-frontend-bucket" },
          { OutputKey: "CloudFrontDistributionId", OutputValue: "EXAMPLE123" }
        ]
      }]
    }));
    process.exit(0);
  }
  process.stderr.write("Unexpected stack lookup: " + stackName + "\\n");
  process.exit(1);
}
process.stderr.write("Unexpected aws invocation: " + args.join(" ") + "\\n");
process.exit(1);
`;

  try {
    fs.writeFileSync(awsPath, script);
    fs.chmodSync(awsPath, 0o755);
    callback({
      PATH: `${tempDir}${path.delimiter}${process.env.PATH || ""}`,
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function withFakeAwsForUploadBackendArtifact(callback) {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-fake-aws-upload-backend-"));
  const awsPath = path.join(tempDir, "aws");
  const script = `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === "cloudformation" && args[1] === "describe-stacks") {
  const stackNameIndex = args.indexOf("--stack-name");
  const stackName = stackNameIndex >= 0 ? args[stackNameIndex + 1] : "";
  if (stackName === "example-bootstrap") {
    process.stdout.write(JSON.stringify({
      Stacks: [{
        Outputs: [
          { OutputKey: "ArtifactBucketName", OutputValue: "my-artifacts-bucket" }
        ]
      }]
    }));
    process.exit(0);
  }
  process.stderr.write("Unexpected stack lookup: " + stackName + "\\n");
  process.exit(1);
}
if (args[0] === "s3" && args[1] === "cp") {
  process.exit(0);
}
process.stderr.write("Unexpected aws command: " + args.join(" ") + "\\n");
process.exit(1);
`;

  try {
    fs.writeFileSync(awsPath, script);
    fs.chmodSync(awsPath, 0o755);
    callback({
      PATH: `${tempDir}${path.delimiter}${process.env.PATH || ""}`,
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function withFakeAwsForPublishLambdaLayer(callback) {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-fake-aws-publish-layer-"));
  const awsPath = path.join(tempDir, "aws");
  const script = `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === "lambda" && args[1] === "publish-layer-version") {
  process.stdout.write(JSON.stringify({
    Content: {
      Location: "https://lambda.us-east-1.amazonaws.com/2018-10-31/layers/b1admin-prod-dependencies/versions/3",
      CodeSha256: "examplecodesha256value=",
      CodeSize: 12345
    },
    LayerArn: "arn:aws:lambda:us-east-1:123456789012:layer:b1admin-prod-dependencies",
    LayerVersionArn: "arn:aws:lambda:us-east-1:123456789012:layer:b1admin-prod-dependencies:3",
    Description: "Published by B1Admin AWS deployment tooling",
    CreatedDate: "2026-01-15T12:34:56.000+0000",
    Version: 3,
    CompatibleRuntimes: ["nodejs22.x"],
    CompatibleArchitectures: ["arm64"]
  }));
  process.exit(0);
}
process.stderr.write("Unexpected aws invocation: " + args.join(" ") + "\\n");
process.exit(1);
`;

  try {
    fs.writeFileSync(awsPath, script);
    fs.chmodSync(awsPath, 0o755);
    callback({
      PATH: `${tempDir}${path.delimiter}${process.env.PATH || ""}`,
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function withFakeAwsForSyncAppConfigSecret(callback) {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-fake-aws-sync-app-config-secret-"));
  const awsPath = path.join(tempDir, "aws");
  const script = `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === "secretsmanager" && args[1] === "describe-secret") {
  process.stderr.write("An error occurred (ResourceNotFoundException) when calling the DescribeSecret operation: Secrets Manager can't find the specified secret.\\n");
  process.exit(254);
}
if (args[0] === "secretsmanager" && args[1] === "create-secret") {
  process.stdout.write(JSON.stringify({
    ARN: "arn:aws:secretsmanager:us-east-1:123456789012:secret:b1admin-prod-app-config-abc123",
    Name: "b1admin-prod-app-config",
    VersionId: "11111111-2222-3333-4444-555555555555"
  }));
  process.exit(0);
}
process.stderr.write("Unexpected aws invocation: " + args.join(" ") + "\\n");
process.exit(1);
`;

  try {
    fs.writeFileSync(awsPath, script);
    fs.chmodSync(awsPath, 0o755);
    callback({
      PATH: `${tempDir}${path.delimiter}${process.env.PATH || ""}`,
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function withFakeGhForSyncGithubAppConfigSecret(callback) {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-fake-gh-sync-app-config-secret-"));
  const ghPath = path.join(tempDir, "gh");
  const capturePath = path.join(tempDir, "capture.json");
  const script = `#!/usr/bin/env node
import fs from "node:fs";
const args = process.argv.slice(2);
if (args[0] === "auth" && args[1] === "status") {
  process.exit(0);
}
if (args[0] === "secret" && args[1] === "set") {
  const bodyIndex = args.indexOf("--body");
  const secretBody = bodyIndex >= 0 ? JSON.parse(args[bodyIndex + 1] || "{}") : null;
  fs.writeFileSync(${JSON.stringify(capturePath)}, JSON.stringify({ args, secretBody }, null, 2) + "\\n");
  process.exit(0);
}
process.stderr.write("Unexpected gh invocation: " + args.join(" ") + "\\n");
process.exit(1);
`;

  try {
    fs.writeFileSync(ghPath, script);
    fs.chmodSync(ghPath, 0o755);
    callback({
      env: {
        PATH: `${tempDir}${path.delimiter}${process.env.PATH || ""}`,
      },
      capturePath,
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function withFailingGhForSyncGithubAppConfigSecret(callback) {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-fake-gh-sync-app-config-secret-fail-"));
  const ghPath = path.join(tempDir, "gh");
  const script = `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === "auth" && args[1] === "status") {
  process.stdout.write("github.com\\n");
  process.stderr.write("  X Failed to log in to github.com account example (default)\\n");
  process.stderr.write("  - Active account: true\\n");
  process.stderr.write("  - The token in default is invalid.\\n");
  process.exit(1);
}
process.stderr.write("mock gh failure\\n");
process.exit(1);
`;

  try {
    fs.writeFileSync(ghPath, script);
    fs.chmodSync(ghPath, 0o755);
    callback({
      PATH: `${tempDir}${path.delimiter}${process.env.PATH || ""}`,
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function withFakeGhForDispatchGithubAwsDeploy(callback) {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-fake-gh-dispatch-github-aws-deploy-"));
  const ghPath = path.join(tempDir, "gh");
  const capturePath = path.join(tempDir, "capture.jsonl");
  const script = `#!/usr/bin/env node
import fs from "node:fs";
const args = process.argv.slice(2);
let capture = { args };
if (args[0] === "auth" && args[1] === "status") {
  capture.kind = "auth";
} else if (args[0] === "secret" && args[1] === "set") {
  const bodyIndex = args.indexOf("--body");
  capture.secretBody = bodyIndex >= 0 ? JSON.parse(args[bodyIndex + 1] || "{}") : null;
  capture.kind = "secret";
} else if (args[0] === "workflow" && args[1] === "run") {
  capture.kind = "workflow";
} else {
  process.stderr.write("Unexpected gh invocation: " + args.join(" ") + "\\n");
  process.exit(1);
}
fs.appendFileSync(${JSON.stringify(capturePath)}, JSON.stringify(capture) + "\\n");
process.exit(0);
`;

  try {
    fs.writeFileSync(ghPath, script);
    fs.chmodSync(ghPath, 0o755);
    callback({
      env: {
        PATH: `${tempDir}${path.delimiter}${process.env.PATH || ""}`,
      },
      capturePath,
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function withFailingGhForDispatchGithubAwsDeploy(callback) {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-fake-gh-dispatch-github-aws-deploy-fail-"));
  const ghPath = path.join(tempDir, "gh");
  const script = `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === "auth" && args[1] === "status") {
  process.stdout.write("github.com\\n");
  process.stderr.write("  X Failed to log in to github.com account example (default)\\n");
  process.stderr.write("  - Active account: true\\n");
  process.stderr.write("  - The token in default is invalid.\\n");
  process.exit(1);
}
process.stderr.write("Unexpected gh invocation: " + args.join(" ") + "\\n");
process.exit(1);
`;

  try {
    fs.writeFileSync(ghPath, script);
    fs.chmodSync(ghPath, 0o755);
    callback({
      PATH: `${tempDir}${path.delimiter}${process.env.PATH || ""}`,
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function withNetworkFailingGhForPlanEnvironmentDeploy(callback) {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-fake-gh-plan-environment-network-fail-"));
  const ghPath = path.join(tempDir, "gh");
  const script = `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === "auth" && args[1] === "status") {
  process.stderr.write("error connecting to github.com\\n");
  process.stderr.write("check your internet connection or https://githubstatus.com\\n");
  process.exit(1);
}
process.stderr.write("Unexpected gh invocation: " + args.join(" ") + "\\n");
process.exit(1);
`;

  try {
    fs.writeFileSync(ghPath, script);
    fs.chmodSync(ghPath, 0o755);
    callback({
      PATH: `${tempDir}${path.delimiter}${process.env.PATH || ""}`,
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function withFakeAwsForSyncLegacySsm(callback) {
  const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-fake-aws-sync-legacy-ssm-"));
  const awsPath = path.join(tempDir, "aws");
  const script = `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === "cloudformation" && args[1] === "describe-stacks") {
  process.stdout.write(JSON.stringify({
    Stacks: [{
      Outputs: [
        { OutputKey: "DatabaseEndpoint", OutputValue: "b1admin-prod.cluster-example.us-east-1.rds.amazonaws.com" },
        { OutputKey: "DatabasePort", OutputValue: "3306" },
        { OutputKey: "DatabaseSecretArn", OutputValue: "arn:aws:secretsmanager:us-east-1:123456789012:secret:b1admin-prod-db-master-abc123" },
        { OutputKey: "MembershipDatabaseName", OutputValue: "membership" },
        { OutputKey: "AttendanceDatabaseName", OutputValue: "attendance" },
        { OutputKey: "ContentDatabaseName", OutputValue: "content" },
        { OutputKey: "GivingDatabaseName", OutputValue: "giving" },
        { OutputKey: "MessagingDatabaseName", OutputValue: "messaging" },
        { OutputKey: "DoingDatabaseName", OutputValue: "doing" },
        { OutputKey: "ReportingDatabaseName", OutputValue: "reporting" }
      ]
    }]
  }));
  process.exit(0);
}
if (args[0] === "secretsmanager" && args[1] === "get-secret-value") {
  process.stdout.write(JSON.stringify({
    SecretString: JSON.stringify({
      username: "churchapps",
      password: "replace-me"
    })
  }));
  process.exit(0);
}
process.stderr.write("Unexpected aws invocation: " + args.join(" ") + "\\n");
process.exit(1);
`;

  try {
    fs.writeFileSync(awsPath, script);
    fs.chmodSync(awsPath, 0o755);
    callback({
      PATH: `${tempDir}${path.delimiter}${process.env.PATH || ""}`,
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function expectDeployFrontendSkipBuildIgnoresBackendStack() {
  withFakeFrontendBuildOutput(() => {
    withFakeAwsForFrontendDeploy((env) => {
      const result = runScriptWithEnv("scripts/deploy-frontend.mjs", [
        "--stack-name=example-frontend",
        "--backend-stack-name=definitely-not-a-real-backend-stack",
        "--skip-build",
      ], env);

      if (result.status !== 0) {
        throw new Error(`deploy-frontend skip-build unexpectedly failed.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
      }

      const combined = `${result.stdout}\n${result.stderr}`;
      if (combined.includes("Could not read backend stack")) {
        throw new Error(`deploy-frontend skip-build still tried to read backend stack.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
      }
      if (combined.includes("Unexpected repeated frontend stack lookup")) {
        throw new Error(`deploy-frontend still re-read frontend stack outputs during publish.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
      }
      if (!combined.includes("Deployment complete.")) {
        throw new Error(`deploy-frontend skip-build did not complete successfully.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
      }
    });
  });
}

function expectValidatorReportingMigrationNoNextStep() {
  const result = runJsonScript("scripts/validate-aws-deploy.mjs", [
    "--mode=backend",
    "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
    "--api-repo-path=../Api",
    "--run-api-migrations=true",
    "--api-migration-module=reporting",
    "--api-migration-dry-run=true",
    "--output=json",
  ]);

  if (result.status !== 0) {
    throw new Error(`validator reporting migration scenario failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }

  const nextSteps = result.parsed?.nextSteps || [];
  if (nextSteps.some((step) => String(step).includes("run:api-migrations"))) {
    throw new Error(`validator still suggested run:api-migrations for unsupported reporting migrations.\nSTDOUT:\n${result.stdout}`);
  }
}

function expectStandaloneValidatorReportingMigrationNoNextStep() {
  const result = runJsonScript("scripts/validate-aws-deploy.mjs", [
    "--mode=api-migrations",
    "--api-repo-path=../Api",
    "--outputs-file=infrastructure/examples/backend-stack-outputs.sample.json",
    "--db-secret-file=infrastructure/examples/database-secret.sample.json",
    "--action=status",
    "--module=reporting",
    "--output=json",
  ]);

  if (result.status === 0) {
    throw new Error(`standalone validator reporting scenario unexpectedly passed.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }

  const nextSteps = result.parsed?.nextSteps || [];
  if (nextSteps.some((step) => String(step).includes("run:api-migrations"))) {
    throw new Error(`standalone validator still suggested run:api-migrations for unsupported reporting migrations.\nSTDOUT:\n${result.stdout}`);
  }
}

function runCase(name, fn, results) {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({
      name,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function main() {
  const scriptsToCheck = [
    "scripts/deploy-bootstrap.mjs",
    "scripts/audit-api-repo-contract.mjs",
    "scripts/deploy-frontend.mjs",
    "scripts/deploy-backend.mjs",
    "scripts/deploy-aws.mjs",
    "scripts/upload-backend-artifact.mjs",
    "scripts/publish-frontend-assets.mjs",
    "scripts/package-api-backend.mjs",
    "scripts/installer-common.mjs",
    "scripts/installer-init.mjs",
    "scripts/installer-customer-values.mjs",
    "scripts/installer-update.mjs",
    "scripts/installer-run.mjs",
    "scripts/installer-start.mjs",
    "scripts/setup-private-deployment-repo.mjs",
    "scripts/installer-app-config-secret.mjs",
    "scripts/installer-aws-handoff.mjs",
    "scripts/installer-aws-roles.mjs",
    "scripts/installer-configure.mjs",
    "scripts/installer-doctor.mjs",
    "scripts/installer-aws-preflight.mjs",
    "scripts/installer-preflight.mjs",
    "scripts/installer-deploy.mjs",
    "scripts/installer-observe.mjs",
    "scripts/installer-report.mjs",
    "scripts/installer-verify.mjs",
    "scripts/installer-bootstrap-admin.mjs",
    "scripts/installer-adopt-frontend-origin.mjs",
    "scripts/installer-github-setup.mjs",
    "scripts/installer-github-readiness.mjs",
    "scripts/installer-browser-smoke.mjs",
    "scripts/audit-environment-starter.mjs",
    "scripts/prepare-environment-starter.mjs",
    "scripts/plan-environment-deploy.mjs",
    "scripts/show-rollout-status.mjs",
    "scripts/dispatch-github-aws-deploy.mjs",
    "scripts/save-split-stack-outputs.mjs",
    "scripts/show-deployment-summary.mjs",
    "scripts/verify-split-stack.mjs",
    "scripts/run-api-migrations-data-api.mjs",
    "scripts/publish-lambda-layer.mjs",
    "scripts/sync-app-config-secret.mjs",
    "scripts/sync-github-app-config-secret.mjs",
    "scripts/sync-legacy-ssm-parameters.mjs",
    "scripts/validate-aws-deploy.mjs",
    "scripts/smoke-aws-tooling.mjs",
  ];
  const shellScriptsToCheck = [
    "infrastructure/environments/prod/deploy-split-stack.sh",
    "infrastructure/environments/staging/deploy-split-stack.sh",
  ];
  const templatesToParse = [
    "infrastructure/cloudformation/bootstrap.yaml",
    "infrastructure/cloudformation/frontend-site.yaml",
    "infrastructure/cloudformation/backend-api.yaml",
  ];
  const workflowsToParse = [
    ".github/workflows/deploy-aws-self-hosted.yml",
    ".github/workflows/deploy-demo.yml",
    ".github/workflows/deploy-prod.yml",
    ".github/workflows/deploy-staging.yml",
  ];
  const jsonFilesToParse = [
    "infrastructure/environments/customer-values.sample.json",
    "infrastructure/examples/app-config-secret.sample.json",
    "infrastructure/examples/audit-environment-starter-output.sample.json",
    "infrastructure/examples/plan-environment-deploy-output.sample.json",
    "infrastructure/examples/prepare-environment-starter-output.sample.json",
    "infrastructure/examples/deploy-backend-output.sample.json",
    "infrastructure/examples/backend-stack-outputs.sample.json",
    "infrastructure/examples/backend-outputs.sample.json",
    "infrastructure/examples/backend-parameters.sample.json",
    "infrastructure/examples/bootstrap-parameters.sample.json",
    "infrastructure/examples/database-secret.sample.json",
    "infrastructure/examples/deploy-bootstrap-output.sample.json",
    "infrastructure/examples/deploy-aws-frontend-infra-output.sample.json",
    "infrastructure/examples/deploy-aws-full-output.sample.json",
    "infrastructure/examples/deploy-aws-publish-build-output.sample.json",
    "infrastructure/examples/deploy-aws-publish-output.sample.json",
    "infrastructure/examples/deploy-frontend-output.sample.json",
    "infrastructure/examples/deploy-frontend-publish-output.sample.json",
    "infrastructure/examples/dispatch-github-aws-deploy-output.sample.json",
    "infrastructure/examples/frontend-outputs.sample.json",
    "infrastructure/examples/frontend-parameters.sample.json",
    "infrastructure/examples/package-api-backend-output.sample.json",
    "infrastructure/examples/package-manifest.sample.json",
    "infrastructure/examples/publish-lambda-layer-output.sample.json",
    "infrastructure/examples/publish-frontend-output.sample.json",
    "infrastructure/examples/save-split-stack-outputs-output.sample.json",
    "infrastructure/examples/show-rollout-status-output.sample.json",
    "infrastructure/examples/sync-app-config-secret-output.sample.json",
    "infrastructure/examples/sync-github-app-config-secret-output.sample.json",
    "infrastructure/examples/sync-legacy-ssm-output.sample.json",
    "infrastructure/examples/upload-backend-artifact-output.sample.json",
    "infrastructure/examples/verify-split-stack-output.sample.json",
    "infrastructure/examples/validate-api-migrations-output.sample.json",
    "infrastructure/examples/validate-backend-output.sample.json",
    "infrastructure/examples/validate-bootstrap-output.sample.json",
    "infrastructure/examples/validate-frontend-output.sample.json",
    "infrastructure/examples/validate-frontend-publish-output.sample.json",
    "infrastructure/examples/validate-split-stack-frontend-infra-output.sample.json",
    "infrastructure/examples/validate-split-stack-output.sample.json",
    "infrastructure/examples/validate-split-stack-publish-output.sample.json",
    "infrastructure/environments/prod/app-config-secret.template.json",
    "infrastructure/environments/prod/backend-parameters.json",
    "infrastructure/environments/prod/bootstrap-parameters.json",
    "infrastructure/environments/prod/frontend-parameters.json",
    "infrastructure/environments/staging/app-config-secret.template.json",
    "infrastructure/environments/staging/backend-parameters.json",
    "infrastructure/environments/staging/bootstrap-parameters.json",
    "infrastructure/environments/staging/frontend-parameters.json",
  ];
  const siblingApiRepoPath = path.resolve(rootDir, "..", "Api");
  const siblingApiRepoReadable = canReadFile(path.join(siblingApiRepoPath, "package.json"))
    && canReadFile(path.join(siblingApiRepoPath, "serverless.yml"))
    && canReadFile(path.join(siblingApiRepoPath, "tools", "kysely-config.ts"))
    && canReadDirectory(path.join(siblingApiRepoPath, "tools", "migrations"));

  const results = [];

  scriptsToCheck.forEach((scriptPath) => runCase(`parse ${scriptPath}`, () => runCheck(scriptPath), results));
  shellScriptsToCheck.forEach((scriptPath) => runCase(`parse ${scriptPath}`, () => runShellCheck(scriptPath), results));
  templatesToParse.forEach((filePath) => runCase(`parse ${filePath}`, () => runYamlParse(filePath), results));
  workflowsToParse.forEach((filePath) => runCase(`parse ${filePath}`, () => runYamlParse(filePath), results));
  jsonFilesToParse.forEach((filePath) => runCase(`parse ${filePath}`, () => runJsonParse(filePath), results));
  runCase("json example contract coverage is complete", () => expectJsonExampleContractCoverage(jsonFilesToParse), results);
  runCase("environment starter kits stay in sync", () => expectEnvironmentStarterParity(), results);
  runCase("deploy-aws workflow uploads deployment evidence artifact", () => expectDeployAwsWorkflowUploadsEvidenceArtifact(), results);

  if (siblingApiRepoReadable) {
    runCase("api repo serverless env key coverage", () => checkBackendTemplateContainsApiRepoEnvKeys(siblingApiRepoPath), results);
    runCase("package-api-backend child failure is clean", () => expectScriptErrorClean("package-api-backend child failure is clean", "scripts/package-api-backend.mjs", [
      "--api-repo-path=../Api",
      "--build-command=definitely-not-a-real-build-command",
    ], "definitely-not-a-real-build-command"), results);
    runCase("validator reporting migration no next step", () => expectValidatorReportingMigrationNoNextStep(), results);
    runCase("standalone validator reporting migration no next step", () => expectStandaloneValidatorReportingMigrationNoNextStep(), results);
  } else {
    addSkippedResults(results, [
      "api repo serverless env key coverage",
      "package-api-backend child failure is clean",
      "validator reporting migration no next step",
      "standalone validator reporting migration no next step",
    ]);
  }

  runCase("package-api-backend unreadable package file is clean", () => withUnreadableFakeApiRepo((fakeApiRepoPath) => {
    expectScriptErrorClean("package-api-backend unreadable package file is clean", "scripts/package-api-backend.mjs", [
      `--api-repo-path=${fakeApiRepoPath}`,
      "--build=false",
    ], "API package.json is not readable:");
  }), results);

  runCase("audit-api-repo-contract output works", () => expectAuditApiRepoContractWorks(), results);
  runCase("audit-api-repo-contract missing path is clean", () => expectAuditApiRepoContractUnreadablePathIsClean(), results);
  runCase("package-api-backend json includes manifest deploy hints", () => expectPackageApiBackendJsonIncludesManifestDeployHints(), results);
  runCase("package-api-backend output sample matches contract", () => expectPackageApiBackendOutputSampleMatchesContract(), results);
  runCase("audit-environment-starter output sample matches contract", () => expectAuditEnvironmentStarterOutputSampleMatchesContract(), results);
  runCase("audit-environment-starter markdown output works", () => expectAuditEnvironmentStarterMarkdownOutputWorks(), results);
  runCase("plan-environment-deploy output sample matches contract", () => expectPlanEnvironmentDeployOutputSampleMatchesContract(), results);
  runCase("show-rollout-status output sample matches contract", () => expectShowRolloutStatusOutputSampleMatchesContract(), results);
  runCase("plan-environment-deploy commands output works", () => expectPlanEnvironmentDeployCommandsOutputWorks(), results);
  runCase("installer setup scaffolds private deployment repo", () => expectInstallerSetupScaffoldsPrivateDeploymentRepo(), results);
  runCase("installer init creates guided starting point", () => expectInstallerInitCreatesGuidedStartingPoint(), results);
  runCase("installer customer-values writes guided answers", () => expectInstallerCustomerValuesWritesGuidedAnswers(), results);
  runCase("installer run executes guided step", () => expectInstallerRunExecutesGuidedStep(), results);
  runCase("installer update dry-run plans guided update", () => expectInstallerUpdateDryRun(), results);
  runCase("installer start recommends next step", () => expectInstallerStartRecommendsNextStep(), results);
  runCase("customer file awsRegion alias works", () => expectCustomerFileAwsRegionAliasWorks(), results);
  runCase("installer aws handoff writes admin document", () => expectInstallerAwsHandoffWritesAdminDocument(), results);
  runCase("installer aws roles generates policy files", () => expectInstallerAwsRolesGeneratesPolicyFiles(), results);
  runCase("installer github setup plans and writes secrets", () => expectInstallerGithubSetupPlansAndWritesSecrets(), results);
  runCase("installer github readiness checks environment secrets", () => expectInstallerGithubReadinessChecksEnvironmentSecrets(), results);
  runCase("installer observe summarizes downloaded evidence", () => expectInstallerObserveSummarizesDownloadedEvidence(), results);
  runCase("installer observe downloads preview artifact fallback", () => expectInstallerObserveDownloadsPreviewArtifactFallback(), results);
  runCase("installer observe warns on incomplete deployment artifact", () => expectInstallerObserveWarnsOnIncompleteDeploymentArtifact(), results);
  runCase("installer report generates rollout record", () => expectInstallerReportGeneratesRolloutRecord(), results);
  runCase("show-rollout-status summarizes multiple environments", () => expectShowRolloutStatusSummarizesMultipleEnvironments(), results);
  runCase("show-rollout-status commands output works", () => expectShowRolloutStatusCommandsOutputWorks(), results);
  runCase("plan-environment-deploy markdown output works", () => expectPlanEnvironmentDeployMarkdownOutputWorks(), results);
  runCase("plan-environment-deploy ready package-manifest mode works", () => expectPlanEnvironmentDeployReadyPackageManifestModeWorks(), results);
  runCase("plan-environment-deploy github needs secret materialization", () => expectPlanEnvironmentDeployGithubNeedsSecretMaterializationWorks(), results);
  runCase("plan-environment-deploy local-only execution blocker works", () => expectPlanEnvironmentDeployLocalOnlyExecutionBlockerWorks(), results);
  runCase("plan-environment-deploy unreadable api-repo local-only blocker works", () => expectPlanEnvironmentDeployUnreadableApiRepoLocalOnlyBlockerWorks(), results);
  runCase("plan-environment-deploy github-only path still needs gh auth", () => expectPlanEnvironmentDeployGithubOnlyNeedsGhAuthWorks(), results);
  runCase("plan-environment-deploy gh network failure works", () => expectPlanEnvironmentDeployGhNetworkFailureWorks(), results);
  runCase("plan-environment-deploy execution remediation command works", () => expectPlanEnvironmentDeployExecutionRemediationCommandWorks(), results);
  runCase("plan-environment-deploy backend-artifact input blocker works", () => expectPlanEnvironmentDeployBackendArtifactInputBlockerWorks(), results);
  runCase("prepare-environment-starter output sample matches contract", () => expectPrepareEnvironmentStarterOutputSampleMatchesContract(), results);
  runCase("prepare-environment-starter commands output works", () => expectPrepareEnvironmentStarterCommandsOutputWorks(), results);
  runCase("prepare-environment-starter markdown output works", () => expectPrepareEnvironmentStarterMarkdownOutputWorks(), results);
  runCase("prepare-environment-starter write mode clears generated blockers", () => expectPrepareEnvironmentStarterWriteModeClearsGeneratedBlockers(), results);
  runCase("prepare-environment-starter write mode can clear starter defaults", () => expectPrepareEnvironmentStarterWriteModeCanClearStarterDefaults(), results);
  runCase("prepare-environment-starter root-domain shortcut works", () => expectPrepareEnvironmentStarterRootDomainShortcutWorks(), results);
  runCase("prepare-environment-starter custom-domain inputs work", () => expectPrepareEnvironmentStarterCustomDomainInputsWork(), results);
  runCase("prepare-environment-starter write mode can skip secret file", () => expectPrepareEnvironmentStarterWriteModeCanSkipSecretFile(), results);
  runCase("prepare-environment-starter optional public fields work", () => expectPrepareEnvironmentStarterOptionalPublicFieldsWork(), results);
  runCase("save-split-stack-outputs output sample matches contract", () => expectSaveSplitStackOutputsOutputSampleMatchesContract(), results);
  runCase("save-split-stack-outputs environment mode works", () => expectSaveSplitStackOutputsEnvironmentModeWorks(), results);
  runCase("save-split-stack-outputs missing args is clean", () => expectSaveSplitStackOutputsMissingArgsIsClean(), results);
  runCase("show-deployment-summary markdown works", () => expectShowDeploymentSummaryMarkdownWorks(), results);
  runCase("show-deployment-summary commands works", () => expectShowDeploymentSummaryCommandsWorks(), results);
  runCase("show-deployment-summary missing file is clean", () => expectShowDeploymentSummaryMissingFileIsClean(), results);
  runCase("package manifest sample matches contract", () => expectPackageManifestSampleMatchesContract(), results);
  runCase("deploy-bootstrap output sample matches contract", () => expectDeployBootstrapOutputSampleMatchesContract(), results);
  runCase("deploy-frontend output sample matches contract", () => expectDeployFrontendOutputSampleMatchesContract(), results);
  runCase("deploy-frontend publish output sample matches contract", () => expectDeployFrontendPublishOutputSampleMatchesContract(), results);
  runCase("deploy-backend output sample matches contract", () => expectDeployBackendOutputSampleMatchesContract(), results);
  runCase("deploy-aws frontend-infrastructure output sample matches contract", () => expectDeployAwsFrontendInfraOutputSampleMatchesContract(), results);
  runCase("deploy-aws full output sample matches contract", () => expectDeployAwsFullOutputSampleMatchesContract(), results);
  runCase("deploy-aws publish output sample matches contract", () => expectDeployAwsPublishOutputSampleMatchesContract(), results);
  runCase("deploy-aws publish build output sample matches contract", () => expectDeployAwsPublishBuildOutputSampleMatchesContract(), results);
  runCase("publish-lambda-layer output sample matches contract", () => expectPublishLambdaLayerOutputSampleMatchesContract(), results);
  runCase("dispatch-github-aws-deploy output sample matches contract", () => expectDispatchGithubAwsDeployOutputSampleMatchesContract(), results);
  runCase("sync-app-config-secret output sample matches contract", () => expectSyncAppConfigSecretOutputSampleMatchesContract(), results);
  runCase("sync-github-app-config-secret output sample matches contract", () => expectSyncGithubAppConfigSecretOutputSampleMatchesContract(), results);
  runCase("sync-legacy-ssm output sample matches contract", () => expectSyncLegacySsmOutputSampleMatchesContract(), results);
  runCase("upload-backend-artifact output sample matches contract", () => expectUploadBackendArtifactOutputSampleMatchesContract(), results);
  runCase("validate-api-migrations output sample matches contract", () => expectValidateApiMigrationsOutputSampleMatchesContract(), results);
  runCase("validate-backend output sample matches contract", () => expectValidateBackendOutputSampleMatchesContract(), results);
  runCase("validate-bootstrap output sample matches contract", () => expectValidateBootstrapOutputSampleMatchesContract(), results);
  runCase("prod bootstrap starter validation works", () => expectProdBootstrapStarterValidation(), results);
  runCase("prod split-stack starter validation works", () => expectProdSplitStackStarterValidation(), results);
  runCase("prod deploy script stops on placeholders", () => expectProdDeployScriptStopsOnPlaceholders(), results);
  runCase("prod deploy script can skip saving outputs", () => expectProdDeployScriptCanSkipSavingOutputs(), results);
  runCase("prod deploy script preview-only mode stops after plan", () => expectProdDeployScriptPreviewOnlyStopsAfterPlan(), results);
  runCase("staging bootstrap starter validation works", () => expectStagingBootstrapStarterValidation(), results);
  runCase("staging split-stack starter validation works", () => expectStagingSplitStackStarterValidation(), results);
  runCase("staging deploy script stops on placeholders", () => expectStagingDeployScriptStopsOnPlaceholders(), results);
  runCase("staging deploy script saves outputs by default", () => expectStagingDeployScriptSavesOutputsByDefault(), results);
  runCase("staging deploy script preview-only mode stops after plan", () => expectStagingDeployScriptPreviewOnlyStopsAfterPlan(), results);
  runCase("staging deploy script stops on unreadable api repo", () => expectStagingDeployScriptStopsOnUnreadableApiRepo(), results);
  runCase("validate-frontend output sample matches contract", () => expectValidateFrontendOutputSampleMatchesContract(), results);
  runCase("validate-frontend publish output sample matches contract", () => expectValidateFrontendPublishOutputSampleMatchesContract(), results);
  runCase("validate-split-stack frontend-infrastructure output sample matches contract", () => expectValidateSplitStackFrontendInfraOutputSampleMatchesContract(), results);
  runCase("validate-split-stack output sample matches contract", () => expectValidateSplitStackOutputSampleMatchesContract(), results);
  runCase("validate-split-stack publish output sample matches contract", () => expectValidateSplitStackPublishOutputSampleMatchesContract(), results);
  runCase("publish-frontend output sample matches contract", () => expectPublishFrontendOutputSampleMatchesContract(), results);
  runCase("verify-split-stack output sample matches contract", () => expectVerifySplitStackOutputSampleMatchesContract(), results);

  runCase("validator unreadable api repo package file", () => withUnreadableFakeApiRepo((fakeApiRepoPath) => {
    expectError("validator unreadable api repo package file", [
      "--mode=backend",
      "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
      `--api-repo-path=${fakeApiRepoPath}`,
      "--output=json",
    ], "API repo package.json is not readable:");
  }), results);
  runCase("validator unreadable api repo fallback guidance", () => expectValidatorUnreadableApiRepoIncludesFallbackGuidance(), results);

  runCase("validator frontend mode", () => expectOk("frontend mode", [
    "--mode=frontend",
    "--frontend-parameters-file=infrastructure/examples/frontend-parameters.sample.json",
    "--output=json",
  ]), results);

  runCase("validator bootstrap mode respects EnvironmentName", () => expectValidatorBootstrapRespectsEnvironmentName(), results);

  runCase("validator bootstrap mode", () => expectOk("bootstrap mode", [
    "--mode=bootstrap",
    "--parameters-file=infrastructure/examples/bootstrap-parameters.sample.json",
    "--output=json",
  ]), results);

  runCase("validator bootstrap next step keeps stack-name", () => expectBootstrapValidatorNextStep(), results);
  runCase("validator package manifest next step reuses artifact path", () => expectPackageManifestValidatorNextStep(), results);
  runCase("validator package manifest migration next step reuses artifact path", () => expectPackageManifestValidatorMigrationNextStep(), results);

  runCase("validator split-stack mode", () => expectOk("split-stack mode", [
    "--mode=split-stack",
    "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
    "--frontend-parameters-file=infrastructure/examples/frontend-parameters.sample.json",
    "--output=json",
  ]), results);

  runCase("validator full-stack mode is removed", () => expectScriptError("validator full-stack mode is removed", "scripts/validate-aws-deploy.mjs", [
    "--mode=full-stack",
  ], "The full-stack deployment mode has been removed"), results);

  runCase("validator frontend publish mode", () => expectOk("frontend publish mode", [
    "--mode=frontend-publish",
    "--bucket=example-frontend-bucket",
    "--distribution-id=EXAMPLE123",
    "--backend-outputs-file=infrastructure/examples/backend-outputs.sample.json",
    "--output=json",
  ]), results);

  runCase("validator split-stack mode with backend outputs file", () => expectOk("split-stack mode with backend outputs file", [
    "--mode=split-stack",
    "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
    "--frontend-parameters-file=infrastructure/examples/frontend-parameters.sample.json",
    "--backend-outputs-file=infrastructure/examples/backend-outputs.sample.json",
    "--output=json",
  ]), results);

  runCase("validator backend mode with package manifest file", () => withFakePackageManifest((manifestPath) => {
    expectOk("backend mode with package manifest file", [
      "--mode=backend",
      "--stack-name=example-backend",
      "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
      `--package-manifest-file=${manifestPath}`,
      "--lambda-code-s3-bucket=my-artifacts-bucket",
      "--output=json",
    ]);
  }), results);

  runCase("validator env var fallback with underscores", () => {
    const result = runJsonScriptWithEnv("scripts/validate-aws-deploy.mjs", [
      "--mode=split-stack",
      "--output=json",
    ], {
      BACKEND_PARAMETERS_FILE: "infrastructure/examples/backend-parameters.sample.json",
      FRONTEND_PARAMETERS_FILE: "infrastructure/examples/frontend-parameters.sample.json",
    });

    if (result.status !== 0) {
      throw new Error(`validator env var fallback with underscores failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }
    if (!result.parsed?.ok) {
      throw new Error(`validator env var fallback with underscores returned ok=false unexpectedly.\nSTDOUT:\n${result.stdout}`);
    }
  }, results);

  if (siblingApiRepoReadable) {
    runCase("validator api-migrations mode", () => expectOk("api-migrations mode", [
      "--mode=api-migrations",
      "--api-repo-path=../Api",
      "--outputs-file=infrastructure/examples/backend-stack-outputs.sample.json",
      "--db-secret-file=infrastructure/examples/database-secret.sample.json",
      "--action=status",
      "--module=all",
      "--dry-run=true",
      "--output=json",
    ]), results);
  } else {
    addSkippedResults(results, ["validator api-migrations mode"]);
  }

  runCase("validator split-stack invalid publish combo", () => expectError("split-stack invalid publish combo", [
    "--mode=split-stack",
    "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
    "--frontend-parameters-file=infrastructure/examples/frontend-parameters.sample.json",
    "--frontend-infrastructure-only",
    "--publish-frontend-assets",
    "--output=json",
  ], "cannot be combined with --frontend-infrastructure-only"), results);

  runCase("validator frontend invalid skip-build combo", () => expectError("frontend invalid skip-build combo", [
    "--mode=frontend",
    "--frontend-parameters-file=infrastructure/examples/frontend-parameters.sample.json",
    "--infrastructure-only",
    "--skip-build",
    "--output=json",
  ], "has no effect together with --infrastructure-only"), results);

  runCase("validator missing parameters file", () => expectError("missing parameters file", [
    "--mode=bootstrap",
    "--parameters-file=does-not-exist.json",
    "--output=json",
  ], "Parameters file could not be loaded"), results);

  if (siblingApiRepoReadable) {
    runCase("validator api-migrations missing target", () => expectError("api-migrations missing target", [
      "--mode=api-migrations",
      "--api-repo-path=../Api",
      "--output=json",
    ], "Api-migrations mode needs --stack-name or --outputs-file"), results);

    runCase("validator reporting migration requires dry run", () => expectError("reporting migration requires dry run", [
      "--mode=backend",
      "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
      "--api-repo-path=../Api",
      "--run-api-migrations=true",
      "--api-migration-module=reporting",
      "--output=json",
    ], "Direct reporting migrations are not currently runnable outside dry-run mode"), results);

    runCase("validator api-migrations single-module minimal outputs", () => {
      const tempDir = fs.mkdtempSync(path.join(rootDir, ".tmp-validate-api-migration-"));
      try {
        const outputsPath = path.join(tempDir, "outputs.json");
        const secretPath = path.join(tempDir, "database-secret.json");
        fs.writeFileSync(outputsPath, `${JSON.stringify({
          DatabaseEndpoint: "example.cluster.us-east-1.rds.amazonaws.com",
          DatabasePort: "3306",
          AttendanceDatabaseName: "attendance",
        }, null, 2)}\n`);
        fs.writeFileSync(secretPath, `${JSON.stringify({
          username: "churchapps",
          password: "replace-me",
        }, null, 2)}\n`);

        expectOk("api-migrations single-module minimal outputs", [
          "--mode=api-migrations",
          "--api-repo-path=../Api",
          `--outputs-file=${outputsPath}`,
          `--db-secret-file=${secretPath}`,
          "--action=status",
          "--module=attendance",
          "--dry-run=true",
          "--output=json",
        ]);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }, results);
  } else {
    addSkippedResults(results, [
      "validator api-migrations missing target",
      "validator reporting migration requires dry run",
      "validator api-migrations single-module minimal outputs",
    ]);
  }

  runCase("validator unreadable bootstrap stack", () => expectError("unreadable bootstrap stack", [
    "--mode=split-stack",
    "--bootstrap-stack-name=definitely-not-a-real-bootstrap-stack",
    "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
    "--frontend-parameters-file=infrastructure/examples/frontend-parameters.sample.json",
    "--output=json",
  ], 'Bootstrap stack "definitely-not-a-real-bootstrap-stack" could not be read'), results);

  runCase("validator split-stack publish-only ignores bootstrap stack", () => expectOk("split-stack publish-only ignores bootstrap stack", [
    "--mode=split-stack",
    "--bootstrap-stack-name=definitely-not-a-real-bootstrap-stack",
    "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
    "--frontend-parameters-file=infrastructure/examples/frontend-parameters.sample.json",
    "--skip-backend",
    "--skip-frontend",
    "--publish-frontend-assets",
    "--output=json",
  ]), results);

  runCase("validator split-stack publish-only with frontend outputs file", () => expectOk("split-stack publish-only with frontend outputs file", [
    "--mode=split-stack",
    "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
    "--frontend-parameters-file=infrastructure/examples/frontend-parameters.sample.json",
    "--skip-backend",
    "--skip-frontend",
    "--publish-frontend-assets",
    "--frontend-outputs-file=infrastructure/examples/frontend-outputs.sample.json",
    "--output=json",
  ]), results);

  runCase("deploy-frontend invalid skip-build combo", () => expectScriptError("deploy-frontend invalid skip-build combo", "scripts/deploy-frontend.mjs", [
    "--stack-name=example-frontend",
    "--infrastructure-only",
    "--skip-build",
  ], "--skip-build has no effect when --infrastructure-only is set."), results);

  runCase("deploy-frontend missing build output in skip-build mode", () => withMissingFrontendBuildOutput(() => {
    expectScriptError("deploy-frontend missing build output in skip-build mode", "scripts/deploy-frontend.mjs", [
      "--stack-name=example-frontend",
      "--skip-build",
    ], "Build output not found:");
  }), results);

  runCase("deploy-frontend skip-build ignores backend stack", () => expectDeployFrontendSkipBuildIgnoresBackendStack(), results);

  runCase("deploy-bootstrap duplicate bucket names", () => expectScriptError("deploy-bootstrap duplicate bucket names", "scripts/deploy-bootstrap.mjs", [
    "--stack-name=example-bootstrap",
    "--template-bucket-name=example-bootstrap-bucket",
    "--artifact-bucket-name=example-bootstrap-bucket",
  ], "TemplateBucketName and ArtifactBucketName must be different"), results);

  runCase("deploy-bootstrap missing parameters file", () => expectScriptError("deploy-bootstrap missing parameters file", "scripts/deploy-bootstrap.mjs", [
    "--stack-name=example-bootstrap",
    "--parameters-file=does-not-exist.json",
  ], 'Could not load parameters file "does-not-exist.json"'), results);

  runCase("deploy-frontend missing parameters file", () => expectScriptError("deploy-frontend missing parameters file", "scripts/deploy-frontend.mjs", [
    "--stack-name=example-frontend",
    "--parameters-file=does-not-exist.json",
  ], 'Could not load parameters file "does-not-exist.json"'), results);

  runCase("deploy-frontend unreadable backend stack", () => expectScriptError("deploy-frontend unreadable backend stack", "scripts/deploy-frontend.mjs", [
    "--stack-name=example-frontend",
    "--backend-stack-name=definitely-not-a-real-backend-stack",
    "--infrastructure-only",
  ], 'Could not read backend stack "definitely-not-a-real-backend-stack"'), results);

  runCase("deploy-frontend env var fallback with underscores", () => {
    const result = runScriptWithEnv("scripts/deploy-frontend.mjs", [
      "--infrastructure-only",
    ], {
      STACK_NAME: "example-frontend",
      BACKEND_OUTPUTS_FILE: "does-not-exist.json",
    });

    if (result.status === 0) {
      throw new Error(`deploy-frontend env var fallback with underscores unexpectedly passed.\nSTDOUT:\n${result.stdout}`);
    }

    const combined = `${result.stdout}\n${result.stderr}`;
    if (!combined.includes('Could not load backend outputs file "does-not-exist.json"')) {
      throw new Error(`deploy-frontend env var fallback with underscores did not include expected backend outputs file error.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }
  }, results);

  runCase("deploy-frontend missing backend outputs file", () => expectScriptError("deploy-frontend missing backend outputs file", "scripts/deploy-frontend.mjs", [
    "--stack-name=example-frontend",
    "--backend-outputs-file=does-not-exist.json",
    "--infrastructure-only",
  ], 'Could not load backend outputs file "does-not-exist.json"'), results);

  runCase("deploy-backend missing parameters file", () => expectScriptError("deploy-backend missing parameters file", "scripts/deploy-backend.mjs", [
    "--stack-name=example-backend",
    "--parameters-file=does-not-exist.json",
  ], 'Could not load parameters file "does-not-exist.json"'), results);

  runCase("deploy-backend package manifest file without api repo", () => withFakePackageManifest((manifestPath) => {
    expectScriptError("deploy-backend package manifest file without api repo", "scripts/deploy-backend.mjs", [
      "--stack-name=example-backend",
      "--parameters-file=infrastructure/examples/backend-parameters.sample.json",
      `--package-manifest-file=${manifestPath}`,
      "--lambda-code-s3-bucket=my-artifacts-bucket",
    ], "Source file not found:");
  }, { missingBackendArtifact: true }), results);
  runCase("deploy-backend json includes manifest provenance", () => expectDeployBackendJsonIncludesManifestProvenance(), results);
  runCase("deploy-backend package manifest missing migration artifact", () => expectDeployBackendPackageManifestMissingMigrationArtifact(), results);

  runCase("deploy-backend unreadable bootstrap stack", () => expectScriptError("deploy-backend unreadable bootstrap stack", "scripts/deploy-backend.mjs", [
    "--stack-name=example-backend",
    "--bootstrap-stack-name=definitely-not-a-real-bootstrap-stack",
    "--output=json",
  ], 'Could not read bootstrap stack "definitely-not-a-real-bootstrap-stack"'), results);

  if (siblingApiRepoReadable) {
    runCase("deploy-backend unsupported reporting migration target", () => expectScriptError("deploy-backend unsupported reporting migration target", "scripts/deploy-backend.mjs", [
      "--stack-name=example-backend",
      "--run-api-migrations=true",
      "--api-migration-module=reporting",
    ], "Refusing to deploy with --run-api-migrations=true for an unsupported migration target"), results);
  } else {
    addSkippedResults(results, ["deploy-backend unsupported reporting migration target"]);
  }

  runCase("deploy-backend invalid migration action", () => expectScriptError("deploy-backend invalid migration action", "scripts/deploy-backend.mjs", [
    "--stack-name=example-backend",
    "--run-api-migrations=true",
    "--api-migration-action=nope",
    "--api-migration-dry-run=true",
  ], 'Invalid api-migration-action "nope"'), results);

  runCase("deploy-backend direct migration runner is removed", () => expectScriptError("deploy-backend direct migration runner is removed", "scripts/deploy-backend.mjs", [
    "--stack-name=example-backend",
    "--run-api-migrations=true",
    "--api-migration-runner=direct",
    "--api-migration-dry-run=true",
  ], 'The "direct" migration runner has been removed'), results);

  runCase("deploy-aws missing backend parameters file", () => expectScriptError("deploy-aws missing backend parameters file", "scripts/deploy-aws.mjs", [
    "--backend-parameters-file=does-not-exist.json",
  ], 'Could not load parameters file "does-not-exist.json"'), results);

  runCase("deploy-aws unreadable bootstrap stack", () => expectScriptError("deploy-aws unreadable bootstrap stack", "scripts/deploy-aws.mjs", [
    "--bootstrap-stack-name=definitely-not-a-real-bootstrap-stack",
    "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
    "--skip-frontend",
  ], 'Could not read bootstrap stack "definitely-not-a-real-bootstrap-stack"'), results);

  runCase("deploy-aws package manifest file without api repo", () => withFakePackageManifest((manifestPath) => {
    expectScriptError("deploy-aws package manifest file without api repo", "scripts/deploy-aws.mjs", [
      "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
      `--package-manifest-file=${manifestPath}`,
      "--lambda-code-s3-bucket=my-artifacts-bucket",
      "--skip-frontend",
    ], "Source file not found:");
  }, { missingBackendArtifact: true }), results);
  runCase("deploy-aws json includes manifest provenance", () => expectDeployAwsJsonIncludesManifestProvenance(), results);
  runCase("deploy-aws package manifest missing migration artifact", () => expectDeployAwsPackageManifestMissingMigrationArtifact(), results);

  runCase("deploy-aws publish-only ignores bootstrap stack", () => withFakeFrontendBuildOutput(() => {
    expectScriptErrorClean("deploy-aws publish-only ignores bootstrap stack", "scripts/deploy-aws.mjs", [
      "--bootstrap-stack-name=definitely-not-a-real-bootstrap-stack",
      "--skip-backend",
      "--skip-frontend",
      "--publish-frontend-assets",
      "--frontend-stack-name=definitely-not-a-real-frontend-stack",
      "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
      "--backend-stack-name=definitely-not-a-real-backend-stack",
      "--skip-build",
    ], 'Could not read frontend stack "definitely-not-a-real-frontend-stack"');
  }), results);

  runCase("deploy-aws invalid publish combo", () => expectScriptError("deploy-aws invalid publish combo", "scripts/deploy-aws.mjs", [
    "--region=us-east-1",
    "--project-name=b1admin",
    "--environment=prod",
    "--frontend-infrastructure-only",
    "--publish-frontend-assets",
  ], "--publish-frontend-assets cannot be combined with --frontend-infrastructure-only."), results);

  runCase("deploy-aws missing backend outputs file for frontend deploy", () => expectScriptError("deploy-aws missing backend outputs file for frontend deploy", "scripts/deploy-aws.mjs", [
    "--skip-backend",
    "--frontend-infrastructure-only",
    "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
    "--backend-outputs-file=does-not-exist.json",
  ], 'Could not load backend outputs file "does-not-exist.json"'), results);

  runCase("deploy-aws missing backend outputs file for publish-only", () => withFakeFrontendNodeModules(() => {
    expectScriptError("deploy-aws missing backend outputs file for publish-only", "scripts/deploy-aws.mjs", [
      "--skip-backend",
      "--skip-frontend",
      "--publish-frontend-assets",
      "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
      "--backend-outputs-file=does-not-exist.json",
    ], 'Could not load backend outputs file "does-not-exist.json"');
  }), results);

  runCase("deploy-aws publish-only prefers frontend outputs file over frontend stack", () => withFakeFrontendBuildOutput(() => {
    expectScriptErrorClean("deploy-aws publish-only prefers frontend outputs file over frontend stack", "scripts/deploy-aws.mjs", [
      "--skip-backend",
      "--skip-frontend",
      "--publish-frontend-assets",
      "--skip-build",
      "--frontend-stack-name=definitely-not-a-real-frontend-stack",
      "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
      "--frontend-outputs-file=does-not-exist.json",
    ], 'Could not load frontend outputs file "does-not-exist.json"');
  }), results);

  runCase("deploy-aws publish-only with frontend outputs file works", () => withFakeFrontendBuildOutput(() => {
    withFakeAwsForFrontendPublish((env) => {
      const result = runJsonScriptWithEnv("scripts/deploy-aws.mjs", [
        "--skip-backend",
        "--skip-frontend",
        "--publish-frontend-assets",
        "--skip-build",
        "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
        "--frontend-outputs-file=infrastructure/examples/frontend-outputs.sample.json",
        "--output=json",
      ], env);

      if (result.status !== 0) {
        throw new Error(`deploy-aws publish-only with frontend outputs file failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
      }

      const parsed = result.parsed || {};
      if (parsed.frontendPublish?.bucket !== "example-frontend-bucket") {
        throw new Error(`deploy-aws publish-only did not reuse the saved bucket from frontend outputs.\nSTDOUT:\n${result.stdout}`);
      }
      if (parsed.frontendPublish?.distributionId !== "EXAMPLE123") {
        throw new Error(`deploy-aws publish-only did not reuse the saved distribution from frontend outputs.\nSTDOUT:\n${result.stdout}`);
      }
      if (parsed.frontendPublish?.appUrl !== "https://admin.example.com") {
        throw new Error(`deploy-aws publish-only did not reuse the saved app URL from frontend outputs.\nSTDOUT:\n${result.stdout}`);
      }
      if (!parsed.frontendPublish?.frontendPublished || parsed.skipBuild !== true || parsed.skipFrontend !== true || parsed.skipBackend !== true) {
        throw new Error(`deploy-aws publish-only did not complete the outputs-driven skip-build follow-up cleanly.\nSTDOUT:\n${result.stdout}`);
      }
    });
  }), results);

  runCase("deploy-aws publish-only backend outputs file drives build env", () => withFakeFrontendBuildHarness(({ envCapturePath, PATH }) => {
    withFakeAwsForFrontendPublish((awsEnv) => {
      const result = runJsonScriptWithEnv("scripts/deploy-aws.mjs", [
        "--skip-backend",
        "--skip-frontend",
        "--publish-frontend-assets",
        "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
        "--frontend-outputs-file=infrastructure/examples/frontend-outputs.sample.json",
        "--backend-outputs-file=infrastructure/examples/backend-outputs.sample.json",
        "--output=json",
      ], {
        ...awsEnv,
        PATH: `${awsEnv.PATH || ""}${path.delimiter}${PATH}`,
      });

      if (result.status !== 0) {
        throw new Error(`deploy-aws publish-only backend outputs build run failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
      }

      const parsed = result.parsed || {};
      const capturedEnv = JSON.parse(fs.readFileSync(envCapturePath, "utf8"));
      if (parsed.frontendPublish?.backendBuildEnv?.REACT_APP_API_BASE !== "https://api.example.com") {
        throw new Error(`deploy-aws publish-only did not expose REACT_APP_API_BASE from saved backend outputs.\nSTDOUT:\n${result.stdout}`);
      }
      if (parsed.frontendPublish?.backendBuildEnv?.REACT_APP_SUPPORT_EMAIL !== "support@example.com") {
        throw new Error(`deploy-aws publish-only did not expose REACT_APP_SUPPORT_EMAIL from saved backend outputs.\nSTDOUT:\n${result.stdout}`);
      }
      if (capturedEnv.REACT_APP_API_BASE !== "https://api.example.com") {
        throw new Error(`deploy-aws publish-only did not pass REACT_APP_API_BASE into the frontend build.\nCaptured env:\n${JSON.stringify(capturedEnv, null, 2)}\nSTDOUT:\n${result.stdout}`);
      }
      if (capturedEnv.REACT_APP_DEFAULT_STOCK_PHOTO !== "https://content.example.com/stockPhotos/default.jpg") {
        throw new Error(`deploy-aws publish-only did not pass REACT_APP_DEFAULT_STOCK_PHOTO into the frontend build.\nCaptured env:\n${JSON.stringify(capturedEnv, null, 2)}\nSTDOUT:\n${result.stdout}`);
      }
      if (capturedEnv.REACT_APP_STAGE !== "prod") {
        throw new Error(`deploy-aws publish-only did not pass REACT_APP_STAGE into the frontend build.\nCaptured env:\n${JSON.stringify(capturedEnv, null, 2)}\nSTDOUT:\n${result.stdout}`);
      }
    });
  }), results);

  if (siblingApiRepoReadable) {
    runCase("deploy-aws unsupported reporting migration target", () => expectScriptError("deploy-aws unsupported reporting migration target", "scripts/deploy-aws.mjs", [
      "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
      "--run-api-migrations=true",
      "--api-migration-module=reporting",
      "--skip-frontend",
    ], "Refusing to deploy with --run-api-migrations=true for an unsupported migration target"), results);
  } else {
    addSkippedResults(results, ["deploy-aws unsupported reporting migration target"]);
  }

  runCase("deploy-aws invalid migration action", () => expectScriptError("deploy-aws invalid migration action", "scripts/deploy-aws.mjs", [
    "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
    "--run-api-migrations=true",
    "--api-migration-action=nope",
    "--api-migration-dry-run=true",
    "--skip-frontend",
  ], 'Invalid api-migration-action "nope"'), results);

  runCase("deploy-aws run-api-migrations requires backend step", () => expectScriptError("deploy-aws run-api-migrations requires backend step", "scripts/deploy-aws.mjs", [
    "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
    "--run-api-migrations=true",
    "--skip-backend",
    "--skip-frontend",
  ], "--run-api-migrations=true requires the backend deploy step"), results);

  runCase("deploy-aws direct migration runner is removed", () => expectScriptError("deploy-aws direct migration runner is removed", "scripts/deploy-aws.mjs", [
    "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
    "--run-api-migrations=true",
    "--api-migration-runner=direct",
    "--api-migration-dry-run=true",
    "--skip-frontend",
  ], 'The "direct" migration runner has been removed'), results);

  runCase("deploy-aws missing frontend dependencies", () => withMissingFrontendNodeModules(() => expectScriptError("deploy-aws missing frontend dependencies", "scripts/deploy-aws.mjs", [
    "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
    "--backend-outputs-file=infrastructure/examples/backend-outputs.sample.json",
    "--skip-backend",
  ], "Frontend dependencies are not installed:")), results);

  runCase("deploy-aws publish-only missing frontend dependencies is clean", () => withMissingFrontendNodeModules(() => expectScriptErrorClean("deploy-aws publish-only missing frontend dependencies is clean", "scripts/deploy-aws.mjs", [
    "--skip-backend",
    "--skip-frontend",
    "--publish-frontend-assets",
    "--backend-parameters-file=infrastructure/examples/backend-parameters.sample.json",
    "--backend-outputs-file=infrastructure/examples/backend-outputs.sample.json",
    "--frontend-outputs-file=infrastructure/examples/frontend-outputs.sample.json",
    "--frontend-stack-name=definitely-not-a-real-frontend-stack",
    "--backend-stack-name=definitely-not-a-real-backend-stack",
  ], "Frontend dependencies are not installed:")), results);

  runCase("publish-frontend-assets missing outputs file", () => expectScriptError("publish-frontend-assets missing outputs file", "scripts/publish-frontend-assets.mjs", [
    "--frontend-outputs-file=does-not-exist.json",
    "--skip-build",
    "--bucket=example-bucket",
    "--distribution-id=EXAMPLE123",
  ], 'Could not load frontend outputs file "does-not-exist.json"'), results);

  runCase("publish-frontend-assets missing build output in skip-build mode", () => withMissingFrontendBuildOutput(() => {
    expectScriptError("publish-frontend-assets missing build output in skip-build mode", "scripts/publish-frontend-assets.mjs", [
      "--bucket=example-bucket",
      "--distribution-id=EXAMPLE123",
      "--skip-build",
    ], "Build output not found:");
  }), results);

  runCase("publish-frontend-assets unreadable frontend stack", () => expectScriptError("publish-frontend-assets unreadable frontend stack", "scripts/publish-frontend-assets.mjs", [
    "--stack-name=definitely-not-a-real-frontend-stack",
  ], 'Could not read frontend stack "definitely-not-a-real-frontend-stack"'), results);

  runCase("publish-frontend-assets frontend outputs file works", () => withFakeFrontendBuildOutput(() => {
    withFakeAwsForFrontendPublish((env) => {
      const result = runJsonScriptWithEnv("scripts/publish-frontend-assets.mjs", [
        "--frontend-outputs-file=infrastructure/examples/frontend-outputs.sample.json",
        "--skip-build",
        "--output=json",
      ], env);

      if (result.status !== 0) {
        throw new Error(`publish-frontend-assets frontend outputs file run failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
      }

      const parsed = result.parsed || {};
      if (parsed.bucket !== "example-frontend-bucket") {
        throw new Error(`publish-frontend-assets frontend outputs file did not reuse the saved bucket.\nSTDOUT:\n${result.stdout}`);
      }
      if (parsed.distributionId !== "EXAMPLE123") {
        throw new Error(`publish-frontend-assets frontend outputs file did not reuse the saved distribution.\nSTDOUT:\n${result.stdout}`);
      }
      if (parsed.appUrl !== "https://admin.example.com") {
        throw new Error(`publish-frontend-assets frontend outputs file did not reuse the saved app URL.\nSTDOUT:\n${result.stdout}`);
      }
      if (!parsed.frontendPublished || parsed.skipBuild !== true) {
        throw new Error(`publish-frontend-assets frontend outputs file did not complete the skip-build publish flow cleanly.\nSTDOUT:\n${result.stdout}`);
      }
    });
  }), results);

  runCase("publish-frontend-assets backend outputs file drives build env", () => withFakeFrontendBuildHarness(({ envCapturePath, PATH }) => {
    withFakeAwsForFrontendPublish((awsEnv) => {
      const result = runJsonScriptWithEnv("scripts/publish-frontend-assets.mjs", [
        "--frontend-outputs-file=infrastructure/examples/frontend-outputs.sample.json",
        "--backend-outputs-file=infrastructure/examples/backend-outputs.sample.json",
        "--output=json",
      ], {
        ...awsEnv,
        PATH: `${awsEnv.PATH || ""}${path.delimiter}${PATH}`,
      });

      if (result.status !== 0) {
        throw new Error(`publish-frontend-assets backend outputs file build run failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
      }

      const parsed = result.parsed || {};
      const capturedEnv = JSON.parse(fs.readFileSync(envCapturePath, "utf8"));
      if (parsed.backendBuildEnv?.REACT_APP_API_BASE !== "https://api.example.com") {
        throw new Error(`publish-frontend-assets did not expose REACT_APP_API_BASE from backend outputs.\nSTDOUT:\n${result.stdout}`);
      }
      if (parsed.backendBuildEnv?.REACT_APP_SUPPORT_EMAIL !== "support@example.com") {
        throw new Error(`publish-frontend-assets did not expose REACT_APP_SUPPORT_EMAIL from backend outputs.\nSTDOUT:\n${result.stdout}`);
      }
      if (capturedEnv.REACT_APP_API_BASE !== "https://api.example.com") {
        throw new Error(`publish-frontend-assets did not pass REACT_APP_API_BASE into the frontend build.\nCaptured env:\n${JSON.stringify(capturedEnv, null, 2)}\nSTDOUT:\n${result.stdout}`);
      }
      if (capturedEnv.REACT_APP_DEFAULT_STOCK_PHOTO !== "https://content.example.com/stockPhotos/default.jpg") {
        throw new Error(`publish-frontend-assets did not pass REACT_APP_DEFAULT_STOCK_PHOTO into the frontend build.\nCaptured env:\n${JSON.stringify(capturedEnv, null, 2)}\nSTDOUT:\n${result.stdout}`);
      }
      if (capturedEnv.REACT_APP_STAGE !== "prod") {
        throw new Error(`publish-frontend-assets did not pass REACT_APP_STAGE into the frontend build.\nCaptured env:\n${JSON.stringify(capturedEnv, null, 2)}\nSTDOUT:\n${result.stdout}`);
      }
    });
  }), results);

  runCase("publish-frontend-assets skip-build ignores backend stack", () => withFakeFrontendBuildOutput(() => {
    expectScriptErrorClean("publish-frontend-assets skip-build ignores backend stack", "scripts/publish-frontend-assets.mjs", [
      "--stack-name=definitely-not-a-real-frontend-stack",
      "--backend-stack-name=definitely-not-a-real-backend-stack",
      "--skip-build",
    ], 'Could not read frontend stack "definitely-not-a-real-frontend-stack"');
  }), results);

  runCase("publish-lambda-layer invalid source file", () => expectScriptErrorClean("publish-lambda-layer invalid source file", "scripts/publish-lambda-layer.mjs", [
    "--source-file=package.json",
    "--layer-name=test-layer",
  ], "Source file must be a .zip archive"), results);

  runCase("sync-app-config-secret lookup failure is clean", () => expectScriptErrorClean("sync-app-config-secret lookup failure is clean", "scripts/sync-app-config-secret.mjs", [
    "--secret-file=infrastructure/examples/app-config-secret.sample.json",
    "--secret-name=test-secret",
  ], 'Could not look up Secrets Manager secret "test-secret"'), results);

  runCase("sync-github-app-config-secret gh failure is clean", () => withFailingGhForSyncGithubAppConfigSecret((env) => {
    const result = runScriptWithEnv("scripts/sync-github-app-config-secret.mjs", [
      "--environment=staging",
      "--secret-file=infrastructure/examples/app-config-secret.sample.json",
      "--repo=ChurchApps/B1Admin",
    ], env);

    if (result.status === 0) {
      throw new Error(`sync-github-app-config-secret unexpectedly succeeded during mocked gh failure.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }

    const combined = `${result.stdout}\n${result.stderr}`;
    if (!combined.includes("GitHub CLI is not authenticated with a valid token. Re-authenticate with `gh auth login -h github.com` and try again.")) {
      throw new Error(`sync-github-app-config-secret failure did not surface the gh auth guidance cleanly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }
  }), results);

  runCase("sync-github-app-config-secret gh network failure is clean", () => withNetworkFailingGhForPlanEnvironmentDeploy((env) => {
    const result = runScriptWithEnv("scripts/sync-github-app-config-secret.mjs", [
      "--environment=staging",
      "--secret-file=infrastructure/examples/app-config-secret.sample.json",
      "--repo=ChurchApps/B1Admin",
    ], env);

    if (result.status === 0) {
      throw new Error(`sync-github-app-config-secret unexpectedly succeeded during mocked gh network failure.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }

    const combined = `${result.stdout}\n${result.stderr}`;
    if (!combined.includes("GitHub CLI could not reach github.com from this machine. Check network access and GitHub availability before syncing this secret from here.")) {
      throw new Error(`sync-github-app-config-secret did not surface the gh connectivity guidance cleanly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    }
  }), results);

  runCase("dispatch-github-aws-deploy dispatches workflow after secret sync", () => withFakeGhForDispatchGithubAwsDeploy(({ env, capturePath }) => {
    const tempDir = path.join(rootDir, ".tmp-dispatch-github-deploy-run");

    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      fs.mkdirSync(tempDir, { recursive: true });

      for (const fileName of [
        "bootstrap-parameters.json",
        "backend-parameters.json",
        "frontend-parameters.json",
        "app-config-secret.template.json",
      ]) {
        fs.copyFileSync(
          path.join(rootDir, "infrastructure", "environments", "staging", fileName),
          path.join(tempDir, fileName),
        );
      }

      const prepareResult = runJsonScript("scripts/prepare-environment-starter.mjs", [
        "--environment=staging",
        "--environment-dir=.tmp-dispatch-github-deploy-run",
        "--account-id=123456789012",
        "--write=true",
        "--output=json",
      ]);
      if (prepareResult.status !== 0) {
        throw new Error(`prepare-environment-starter should succeed before dispatch-github-aws-deploy runtime verification.\nSTDOUT:\n${prepareResult.stdout}\nSTDERR:\n${prepareResult.stderr}`);
      }

      replaceStarterBackendDefaults(tempDir, "staging");
      fs.writeFileSync(path.join(tempDir, "package-manifest.json"), `${JSON.stringify({ artifactPath: "./api.zip" }, null, 2)}\n`);

      const result = runJsonScriptWithEnv("scripts/dispatch-github-aws-deploy.mjs", [
        "--environment=staging",
        "--environment-dir=.tmp-dispatch-github-deploy-run",
        "--deployment-source=package-manifest",
        "--package-manifest-file=.tmp-dispatch-github-deploy-run/package-manifest.json",
        "--repo=ChurchApps/B1Admin",
        "--output=json",
      ], env);

      if (result.status !== 0) {
        throw new Error(`dispatch-github-aws-deploy runtime verification failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
      }

      const actual = result.parsed || {};
      const captures = fs.readFileSync(capturePath, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
      const secretCapture = captures.find((entry) => entry.kind === "secret");
      const workflowCapture = captures.find((entry) => entry.kind === "workflow");

      if (actual.action !== "dispatched" || actual.secretSync?.performed !== true) {
        throw new Error(`dispatch-github-aws-deploy should report a real dispatch after syncing the GitHub secret.\nSTDOUT:\n${result.stdout}`);
      }
      if (actual.previewOnly !== false || actual.workflowInputs?.preview_only !== "false") {
        throw new Error(`dispatch-github-aws-deploy should preserve the default non-preview workflow input.\nSTDOUT:\n${result.stdout}`);
      }
      if (!String(actual.followUpCommands?.watchLatestRun || "").includes("gh run watch $(")
        || !String(actual.followUpCommands?.viewLatestRun || "").includes("gh run view $(")) {
        throw new Error(`dispatch-github-aws-deploy should expose follow-up commands for the latest GitHub Actions run.\nSTDOUT:\n${result.stdout}`);
      }
      if (!secretCapture || !workflowCapture) {
        throw new Error(`dispatch-github-aws-deploy should call both gh secret set and gh workflow run.\nCaptures:\n${JSON.stringify(captures, null, 2)}`);
      }
      if (!secretCapture.args.includes("--env") || !secretCapture.args.includes("aws-staging")) {
        throw new Error(`dispatch-github-aws-deploy did not sync the expected GitHub environment secret.\nCaptures:\n${JSON.stringify(captures, null, 2)}`);
      }
      if (!workflowCapture.args.includes("--repo") || !workflowCapture.args.includes("ChurchApps/B1Admin")) {
        throw new Error(`dispatch-github-aws-deploy did not dispatch the workflow against the expected repository.\nCaptures:\n${JSON.stringify(captures, null, 2)}`);
      }
      if (!workflowCapture.args.includes("-f") || !workflowCapture.args.includes("sync_app_config_secret=true")) {
        throw new Error(`dispatch-github-aws-deploy did not enable sync_app_config_secret in the workflow dispatch.\nCaptures:\n${JSON.stringify(captures, null, 2)}`);
      }
      if (!workflowCapture.args.includes("preview_only=false")) {
        throw new Error(`dispatch-github-aws-deploy did not pass preview_only=false into the workflow dispatch.\nCaptures:\n${JSON.stringify(captures, null, 2)}`);
      }
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }), results);

  runCase("dispatch-github-aws-deploy can dispatch preview-only mode", () => withFakeGhForDispatchGithubAwsDeploy(({ env, capturePath }) => {
    const tempDir = path.join(rootDir, ".tmp-dispatch-github-deploy-preview-only");

    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      fs.mkdirSync(tempDir, { recursive: true });

      for (const fileName of [
        "bootstrap-parameters.json",
        "backend-parameters.json",
        "frontend-parameters.json",
        "app-config-secret.template.json",
      ]) {
        fs.copyFileSync(
          path.join(rootDir, "infrastructure", "environments", "staging", fileName),
          path.join(tempDir, fileName),
        );
      }

      const prepareResult = runJsonScript("scripts/prepare-environment-starter.mjs", [
        "--environment=staging",
        "--environment-dir=.tmp-dispatch-github-deploy-preview-only",
        "--account-id=123456789012",
        "--write=true",
        "--output=json",
      ]);
      if (prepareResult.status !== 0) {
        throw new Error(`prepare-environment-starter should succeed before dispatch-github-aws-deploy preview-only verification.\nSTDOUT:\n${prepareResult.stdout}\nSTDERR:\n${prepareResult.stderr}`);
      }

      replaceStarterBackendDefaults(tempDir, "staging");
      fs.writeFileSync(path.join(tempDir, "package-manifest.json"), `${JSON.stringify({ artifactPath: "./api.zip" }, null, 2)}\n`);

      const result = runJsonScriptWithEnv("scripts/dispatch-github-aws-deploy.mjs", [
        "--environment=staging",
        "--environment-dir=.tmp-dispatch-github-deploy-preview-only",
        "--deployment-source=package-manifest",
        "--package-manifest-file=.tmp-dispatch-github-deploy-preview-only/package-manifest.json",
        "--repo=ChurchApps/B1Admin",
        "--preview-only=true",
        "--output=json",
      ], env);

      if (result.status !== 0) {
        throw new Error(`dispatch-github-aws-deploy preview-only verification failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
      }

      const actual = result.parsed || {};
      const captures = fs.readFileSync(capturePath, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
      const workflowCapture = captures.find((entry) => entry.kind === "workflow");

      if (actual.previewOnly !== true || actual.workflowInputs?.preview_only !== "true") {
        throw new Error(`dispatch-github-aws-deploy should expose preview-only mode in its JSON result.\nSTDOUT:\n${result.stdout}`);
      }
      if (!workflowCapture || !workflowCapture.args.includes("preview_only=true")) {
        throw new Error(`dispatch-github-aws-deploy did not pass preview_only=true into the workflow dispatch.\nCaptures:\n${JSON.stringify(captures, null, 2)}`);
      }
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }), results);

  runCase("dispatch-github-aws-deploy gh auth failure is clean", () => withFailingGhForDispatchGithubAwsDeploy((env) => {
    const tempDir = path.join(rootDir, ".tmp-dispatch-github-deploy-auth-fail");

    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      fs.mkdirSync(tempDir, { recursive: true });

      for (const fileName of [
        "bootstrap-parameters.json",
        "backend-parameters.json",
        "frontend-parameters.json",
        "app-config-secret.template.json",
      ]) {
        fs.copyFileSync(
          path.join(rootDir, "infrastructure", "environments", "staging", fileName),
          path.join(tempDir, fileName),
        );
      }

      const prepareResult = runJsonScript("scripts/prepare-environment-starter.mjs", [
        "--environment=staging",
        "--environment-dir=.tmp-dispatch-github-deploy-auth-fail",
        "--account-id=123456789012",
        "--write=true",
        "--output=json",
      ]);
      if (prepareResult.status !== 0) {
        throw new Error(`prepare-environment-starter should succeed before dispatch-github-aws-deploy auth failure verification.\nSTDOUT:\n${prepareResult.stdout}\nSTDERR:\n${prepareResult.stderr}`);
      }

      replaceStarterBackendDefaults(tempDir, "staging");
      fs.writeFileSync(path.join(tempDir, "package-manifest.json"), `${JSON.stringify({ artifactPath: "./api.zip" }, null, 2)}\n`);

      const result = runScriptWithEnv("scripts/dispatch-github-aws-deploy.mjs", [
        "--environment=staging",
        "--environment-dir=.tmp-dispatch-github-deploy-auth-fail",
        "--deployment-source=package-manifest",
        "--package-manifest-file=.tmp-dispatch-github-deploy-auth-fail/package-manifest.json",
        "--repo=ChurchApps/B1Admin",
      ], env);

      if (result.status === 0) {
        throw new Error(`dispatch-github-aws-deploy unexpectedly succeeded during mocked gh auth failure.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
      }

      const combined = `${result.stdout}\n${result.stderr}`;
      if (!combined.includes("GitHub CLI is not authenticated with a valid token. Re-authenticate with `gh auth login -h github.com` and try again.")) {
        throw new Error(`dispatch-github-aws-deploy did not surface the gh auth guidance cleanly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
      }
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }), results);

  runCase("dispatch-github-aws-deploy gh network failure is clean", () => withNetworkFailingGhForPlanEnvironmentDeploy((env) => {
    const tempDir = path.join(rootDir, ".tmp-dispatch-github-deploy-network-fail");

    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      fs.mkdirSync(tempDir, { recursive: true });

      for (const fileName of [
        "bootstrap-parameters.json",
        "backend-parameters.json",
        "frontend-parameters.json",
        "app-config-secret.template.json",
      ]) {
        fs.copyFileSync(
          path.join(rootDir, "infrastructure", "environments", "staging", fileName),
          path.join(tempDir, fileName),
        );
      }

      const prepareResult = runJsonScript("scripts/prepare-environment-starter.mjs", [
        "--environment=staging",
        "--environment-dir=.tmp-dispatch-github-deploy-network-fail",
        "--account-id=123456789012",
        "--write=true",
        "--output=json",
      ]);
      if (prepareResult.status !== 0) {
        throw new Error(`prepare-environment-starter should succeed before dispatch-github-aws-deploy network failure verification.\nSTDOUT:\n${prepareResult.stdout}\nSTDERR:\n${prepareResult.stderr}`);
      }

      replaceStarterBackendDefaults(tempDir, "staging");
      fs.writeFileSync(path.join(tempDir, "package-manifest.json"), `${JSON.stringify({ artifactPath: "./api.zip" }, null, 2)}\n`);

      const result = runScriptWithEnv("scripts/dispatch-github-aws-deploy.mjs", [
        "--environment=staging",
        "--environment-dir=.tmp-dispatch-github-deploy-network-fail",
        "--deployment-source=package-manifest",
        "--package-manifest-file=.tmp-dispatch-github-deploy-network-fail/package-manifest.json",
        "--repo=ChurchApps/B1Admin",
      ], env);

      if (result.status === 0) {
        throw new Error(`dispatch-github-aws-deploy unexpectedly succeeded during mocked gh network failure.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
      }

      const combined = `${result.stdout}\n${result.stderr}`;
      if (!combined.includes("GitHub CLI could not reach github.com from this machine. Check network access and GitHub availability before dispatching the workflow from here.")) {
        throw new Error(`dispatch-github-aws-deploy did not surface the gh connectivity guidance cleanly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
      }
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }), results);

  runCase("dispatch-github-aws-deploy can skip gh auth check explicitly", () => withFailingGhForDispatchGithubAwsDeploy((env) => {
    const tempDir = path.join(rootDir, ".tmp-dispatch-github-deploy-skip-auth");

    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      fs.mkdirSync(tempDir, { recursive: true });

      for (const fileName of [
        "bootstrap-parameters.json",
        "backend-parameters.json",
        "frontend-parameters.json",
        "app-config-secret.template.json",
      ]) {
        fs.copyFileSync(
          path.join(rootDir, "infrastructure", "environments", "staging", fileName),
          path.join(tempDir, fileName),
        );
      }

      const prepareResult = runJsonScript("scripts/prepare-environment-starter.mjs", [
        "--environment=staging",
        "--environment-dir=.tmp-dispatch-github-deploy-skip-auth",
        "--account-id=123456789012",
        "--write=true",
        "--output=json",
      ]);
      if (prepareResult.status !== 0) {
        throw new Error(`prepare-environment-starter should succeed before dispatch-github-aws-deploy skip-auth verification.\nSTDOUT:\n${prepareResult.stdout}\nSTDERR:\n${prepareResult.stderr}`);
      }

      replaceStarterBackendDefaults(tempDir, "staging");
      fs.writeFileSync(path.join(tempDir, "package-manifest.json"), `${JSON.stringify({ artifactPath: "./api.zip" }, null, 2)}\n`);

      const result = runJsonScriptWithEnv("scripts/dispatch-github-aws-deploy.mjs", [
        "--environment=staging",
        "--environment-dir=.tmp-dispatch-github-deploy-skip-auth",
        "--deployment-source=package-manifest",
        "--package-manifest-file=.tmp-dispatch-github-deploy-skip-auth/package-manifest.json",
        "--repo=ChurchApps/B1Admin",
        "--dry-run=true",
        "--skip-gh-auth-check=true",
        "--output=json",
      ], env);

      if (result.status !== 0) {
        throw new Error(`dispatch-github-aws-deploy skip-gh-auth-check verification failed unexpectedly.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
      }

      const actual = result.parsed || {};
      if (actual.action !== "validated" || actual.secretSync?.attempted !== true) {
        throw new Error(`dispatch-github-aws-deploy should still produce a dry-run validation result when skip-gh-auth-check=true.\nSTDOUT:\n${result.stdout}`);
      }
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }), results);

  runCase("upload-backend-artifact unreadable bootstrap stack", () => expectScriptError("upload-backend-artifact unreadable bootstrap stack", "scripts/upload-backend-artifact.mjs", [
    "--source-file=package.json",
    "--artifact-key=test.zip",
    "--bootstrap-stack-name=definitely-not-a-real-bootstrap-stack",
  ], 'Could not read bootstrap stack "definitely-not-a-real-bootstrap-stack"'), results);

  runCase("sync-legacy-ssm unreadable stack", () => expectScriptErrorClean("sync-legacy-ssm unreadable stack", "scripts/sync-legacy-ssm-parameters.mjs", [
    "--stack-name=test",
    "--environment=prod",
    "--dry-run=true",
  ], 'Could not read stack "test"'), results);

  const failed = results.filter((result) => !result.ok);
  const summary = {
    ok: failed.length === 0,
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    results,
  };

  if (jsonOutput) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    if (failed.length > 0) process.exit(1);
    return;
  }

  if (failed.length > 0) {
    failed.forEach((result) => process.stderr.write(`FAILED: ${result.name}\n${result.error}\n\n`));
    process.exit(1);
  }

  process.stdout.write("AWS tooling smoke checks passed.\n");
}

main();
