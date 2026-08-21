import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Issue #996: lesson content in a service plan could not be scrolled. The serving
// dialogs overrode MUI's scrolling DialogContent with `overflow: "hidden"`, so any
// section taller than the dialog paper (capped at calc(100% - 64px)) was clipped
// with no scrollbar and the trailing items looked missing.
const srcDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
const read = (rel: string) => fs.readFileSync(path.join(srcDir, rel), "utf8");

const DIALOGS = [
  { name: "LessonDialog", file: "serving/components/LessonDialog.tsx" },
  { name: "ActionDialog", file: "serving/components/ActionDialog.tsx" }
];

// The opening <DialogContent ...> tag, sx prop included.
const dialogContentTag = (source: string, file: string) => {
  const start = source.indexOf("<DialogContent");
  expect(start, `<DialogContent> not found in ${file}`).toBeGreaterThan(-1);
  const end = source.indexOf(">", start);
  expect(end, `unterminated <DialogContent> in ${file}`).toBeGreaterThan(start);
  return source.slice(start, end + 1);
};

test.describe("issue-996 serving dialogs scroll their content", () => {
  for (const dialog of DIALOGS) {
    test(`${dialog.name} does not clip overflowing content`, () => {
      const tag = dialogContentTag(read(dialog.file), dialog.file);
      expect(tag, `${dialog.name} DialogContent must not hide overflow`).not.toMatch(/overflow:\s*["']hidden["']/);
      expect(tag, `${dialog.name} DialogContent must not hide vertical overflow`).not.toMatch(/overflowY:\s*["']hidden["']/);
      expect(tag, `${dialog.name} DialogContent must scroll vertically`).toMatch(/overflowY:\s*["']auto["']/);
    });
  }

  test("the lesson children list adds no clipping container of its own", () => {
    const source = read("serving/components/LessonDialog.tsx");
    const childrenBranch = source.slice(source.indexOf("if (hasChildren)"), source.indexOf("plans.lessonDialog.previewUnavailable"));
    expect(childrenBranch, "children branch not located").toContain("ContentItemRow");
    expect(childrenBranch).not.toMatch(/overflow(Y)?:\s*["']hidden["']/);
    expect(childrenBranch).not.toMatch(/maxHeight/);
  });
});
