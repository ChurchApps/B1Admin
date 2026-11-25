// "Embed on your own website": the church lists the domains of its own site in the public content setting
// embedDomains, and B1App then lets those domains frame its /embed/* pages.
//
// B1App turns the saved setting into a Content-Security-Policy header with the same rules
// (B1App/src/helpers/embed.ts). Keep parseEmbedDomains identical there and here, so what this screen
// accepts or rejects is what the public site will accept or reject.

export const MAX_EMBED_DOMAINS = 10;
const MAX_HOST_LENGTH = 100;
// Bounds the work a huge paste can cost per keystroke.
const MAX_TOKENS = 50;

// Labels of a-z, 0-9 and "-" that neither start nor end with "-", at least one dot, and a last label that
// starts with a letter (which also rules out IP addresses).
const LABEL = "[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?";
const HOST_PATTERN = new RegExp("^(?:" + LABEL + "\\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])$");

export interface EmbedDomains {
  /** Accepted hostnames: lowercased, no scheme, port, path or leading "www.", de-duplicated, at most MAX_EMBED_DOMAINS. */
  hosts: string[];
  /** Entries that are not a plain hostname. */
  rejected: string[];
  /** Valid hostnames dropped because the list was already full. */
  overLimit: string[];
}

const toHost = (token: string): string | null => {
  if (token.length > MAX_HOST_LENGTH * 3) return null;
  const host = token.toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
    .split(/[/?#]/)[0]
    .replace(/:\d+$/, "")
    .replace(/^www\./, "");
  return host.length <= MAX_HOST_LENGTH && HOST_PATTERN.test(host) ? host : null;
};

export const parseEmbedDomains = (raw: unknown): EmbedDomains => {
  const result: EmbedDomains = { hosts: [], rejected: [], overLimit: [] };
  if (typeof raw !== "string") return result;
  let examined = 0;
  for (const [token] of raw.matchAll(/[^\s,]+/g)) {
    if (++examined > MAX_TOKENS) break;
    const host = toHost(token);
    if (!host) {
      const shown = token.length > 60 ? token.slice(0, 60) + "…" : token;
      if (!result.rejected.includes(shown)) result.rejected.push(shown);
    } else if (result.hosts.includes(host) || result.overLimit.includes(host)) continue;
    else if (result.hosts.length < MAX_EMBED_DOMAINS) result.hosts.push(host);
    else result.overLimit.push(host);
  }
  return result;
};
