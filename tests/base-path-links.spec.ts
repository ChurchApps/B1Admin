import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Issue #1569: the self-host image serves B1Admin under /admin/. Links that bypass the router (a plain href,
// window.open, location.href) with a root-relative path land on B1App's 404 there, so they go through withBase.
const srcDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
const ROOT_RELATIVE = /(?:href=\{?|window\.open\(\s*|location\.href\s*=\s*)["'`]\/(?!\/)/;

const sourceFiles = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const full = path.join(dir, e.name);
  if (e.isDirectory()) return sourceFiles(full);
  return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [full] : [];
});

test("links outside the router carry the app base path", () => {
  const offenders: string[] = [];
  for (const file of sourceFiles(srcDir)) {
    fs.readFileSync(file, "utf8").split("\n").forEach((line, i) => {
      // A router Link's href is display-only when its click is routed through navigate().
      if (ROOT_RELATIVE.test(line) && !/navigate\(/.test(line)) offenders.push(`${path.relative(srcDir, file)}:${i + 1}`);
    });
  }
  expect(offenders, "use withBase() from src/helpers/basePath.ts").toEqual([]);
});
