const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1", "0.0.0.0"]);

/**
 * Report to Sentry only from a real deployment: never from a self-hosted build, and never from a
 * dev server or a Playwright run on localhost, which were the project's noisiest "production" issues.
 */
export function sentryEnabled(stage: string | undefined, hostname: string | undefined): boolean {
  if (stage === "selfhost") return false;
  if (!hostname) return true;
  const host = hostname.toLowerCase();
  if (LOCAL_HOSTS.has(host)) return false;
  if (host.endsWith(".localhost")) return false;
  return true;
}
