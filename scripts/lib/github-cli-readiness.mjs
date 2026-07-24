import { spawnSync } from "node:child_process";

export function getGithubCliReadiness({
  cwd,
  connectivityAction = "dispatching the workflow from here.",
} = {}) {
  const result = spawnSync("gh", ["auth", "status", "-h", "github.com"], {
    cwd,
    encoding: "utf8",
  });
  const combinedOutput = `${result.stdout || ""}\n${result.stderr || ""}`.toLowerCase();

  if (result.error && result.error.code === "ENOENT") {
    return {
      ok: false,
      blockerCount: 1,
      blockers: [
        "GitHub CLI (`gh`) is not installed or not available on PATH from this workspace. Install it or dispatch the workflow from another machine.",
      ],
    };
  }

  if (result.status !== 0) {
    if (combinedOutput.includes("error connecting to github.com")
      || combinedOutput.includes("check your internet connection")
      || combinedOutput.includes("could not resolve host")
      || combinedOutput.includes("dial tcp")
      || combinedOutput.includes("i/o timeout")
      || combinedOutput.includes("timeout")) {
      return {
        ok: false,
        blockerCount: 1,
        blockers: [
          `GitHub CLI could not reach github.com from this machine. Check network access and GitHub availability before ${connectivityAction}`,
        ],
      };
    }

    if (combinedOutput.includes("the token in") && combinedOutput.includes("is invalid")) {
      return {
        ok: false,
        blockerCount: 1,
        blockers: [
          "GitHub CLI is not authenticated with a valid token. Re-authenticate with `gh auth login -h github.com` and try again.",
        ],
      };
    }

    return {
      ok: false,
      blockerCount: 1,
      blockers: [
        "GitHub CLI auth check failed for an unknown reason. Re-run `gh auth status -h github.com` locally for details.",
      ],
    };
  }

  return {
    ok: true,
    blockerCount: 0,
    blockers: [],
  };
}
