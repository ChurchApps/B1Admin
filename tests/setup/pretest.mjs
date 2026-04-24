import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyEnv, VerifyEnvError } from "./verify-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_DIR = path.resolve(__dirname, "..", "..", "..", "Api");

async function main() {
  try {
    await verifyEnv({ fullCheck: false });
  } catch (err) {
    if (err instanceof VerifyEnvError) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }

  console.log(`pretest: resetting demo databases via ${API_DIR}...\n`);
  const result = spawnSync("npm", ["run", "reset-demo"], {
    cwd: API_DIR,
    stdio: "inherit",
    shell: true,
  });

  if (result.status !== 0) {
    console.error(`\npretest: reset-demo exited with code ${result.status}. Aborting.`);
    process.exit(result.status ?? 1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
