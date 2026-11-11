// Runs the Playwright specs for the areas a branch touches, using tests/areas.json.
//   node tests/setup/affected.mjs                 run specs affected by changes vs origin/main
//   node tests/setup/affected.mjs --list          print the spec files instead of running them
//   node tests/setup/affected.mjs --check         fail if a spec is in no area or a pattern matches nothing
//   node tests/setup/affected.mjs --base <ref>    diff against another ref
//   node tests/setup/affected.mjs --files a,b     use these paths instead of git
//   node tests/setup/affected.mjs -- --workers=1  pass the rest to playwright
// A changed source file in no area and not ignored runs the whole suite. Changed spec files always run.
// Screenshots and other images are evidence, not shared code, and never do.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "tests/areas.json"), "utf8"));
const specDir = manifest.specDir ?? "tests";
const specSuffix = manifest.specSuffix ?? ".spec.ts";

const dash = process.argv.indexOf("--");
const args = dash >= 0 ? process.argv.slice(2, dash) : process.argv.slice(2);
const passThrough = dash >= 0 ? process.argv.slice(dash + 1) : [];
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };

const globToRegExp = (glob) => {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") { re += glob[i + 2] === "/" ? "(?:.*/)?" : ".*"; i += glob[i + 2] === "/" ? 2 : 1; }
    else if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp("^" + re + "$");
};
const matcher = (globs = []) => { const res = globs.map(globToRegExp); return (f) => res.some((r) => r.test(f)); };

const allSpecs = fs.readdirSync(path.join(root, specDir), { recursive: true })
  .map((f) => f.split(path.sep).join("/"))
  .filter((f) => f.endsWith(specSuffix))
  .sort();
const specsFor = (globs) => { const m = matcher(globs); return allSpecs.filter(m); };

const areas = Object.entries(manifest.areas).map(([name, a]) => ({ name, src: matcher(a.src), specGlobs: a.specs, specs: specsFor(a.specs) }));
const always = specsFor(manifest.always ?? []);
const ignored = matcher(manifest.ignore);
const nonSource = matcher([".pr-screenshots/**", "**/*.png", "**/*.jpg", "**/*.jpeg", "**/*.gif", "**/*.webp"]);

if (args.includes("--check")) {
  const problems = [];
  const covered = new Set(always);
  for (const a of areas) {
    a.specs.forEach((s) => covered.add(s));
    for (const g of a.specGlobs) if (!specsFor([g]).length) problems.push(`area "${a.name}": spec pattern "${g}" matches no file`);
  }
  for (const s of allSpecs) if (!covered.has(s)) problems.push(`${specDir}/${s} is in no area of tests/areas.json`);
  if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
  console.log(`areas ok: ${allSpecs.length} specs in ${areas.length} areas`);
  process.exit(0);
}

const git = (...a) => execFileSync("git", a, { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean);
let changed;
if (opt("--files")) changed = opt("--files").split(",");
else {
  const base = opt("--base") ?? "origin/main";
  const mergeBase = git("merge-base", base, "HEAD")[0];
  changed = [...new Set([
    ...git("diff", "--name-only", mergeBase),
    ...git("ls-files", "--others", "--exclude-standard")
  ])];
}

const specPrefix = specDir + "/";
const picked = new Set(always);
const reasons = [];
let full = null;
for (const f of changed) {
  if (f.startsWith(specPrefix) && f.endsWith(specSuffix)) {
    const rel = f.slice(specPrefix.length);
    if (fs.existsSync(path.join(root, f))) { picked.add(rel); reasons.push(`${f} (changed spec)`); }
    continue;
  }
  if (ignored(f) || nonSource(f)) continue;
  const hits = areas.filter((a) => a.src(f));
  if (!hits.length) { full ??= f; continue; }
  for (const a of hits) a.specs.forEach((s) => picked.add(s));
  reasons.push(`${f} -> ${hits.map((a) => a.name).join(", ")}`);
}

if (full) console.log(`full suite: ${full} is shared code (in no area of tests/areas.json)`);
else if (!reasons.length) console.log("no app or spec changes; running the always-on specs only");
else console.log("affected:\n  " + reasons.join("\n  "));

const files = full ? [] : [...picked].sort().map((s) => `${specDir}/${s}`);
if (args.includes("--list")) { console.log(full ? "(all specs)" : files.join("\n")); process.exit(0); }

console.log(full ? "running every spec" : `running ${files.length} of ${allSpecs.length} spec files`);
const r = spawnSync("npx", ["playwright", "test", ...files, ...passThrough], { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
process.exit(r.status ?? 1);
