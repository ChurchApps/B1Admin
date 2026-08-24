import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Issue #1020: adding a user to a role (reported against "Domain Admins") wrote two
// roleMembers rows every time. UserAdd auto-saves the instant a person with an email on
// file is picked from the search results, but leaves the form — and its always-enabled
// Save button — mounted. The user then clicks Save, saveUserFromPerson() runs against the
// same selectedPerson, and createUserAndToGroup() POSTs a second id-less RoleMember.
// Contract: one add == one POST. The auto-save must close the form, and the Save button
// must be guarded while a save is in flight.
const srcDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
const file = "settings/components/UserAdd.tsx";
const source = fs.readFileSync(path.join(srcDir, file), "utf8");

// Balanced-brace body of the function/branch introduced at `marker`.
const bodyAfter = (marker: string) => {
  const start = source.indexOf(marker);
  expect(start, `"${marker}" not found in ${file}`).toBeGreaterThan(-1);
  const open = source.indexOf("{", start);
  expect(open, `no body found for "${marker}" in ${file}`).toBeGreaterThan(start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}" && --depth === 0) return source.slice(open, i + 1);
  }
  throw new Error(`unbalanced body for "${marker}" in ${file}`);
};

// The opening <FormCard ...> tag, props included.
const formCardTag = () => {
  const start = source.indexOf("<FormCard");
  expect(start, `<FormCard> not found in ${file}`).toBeGreaterThan(-1);
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") depth--;
    else if (source[i] === ">" && depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`unterminated <FormCard> in ${file}`);
};

test.describe("issue-1020 adding a role member saves exactly one record", () => {
  test("the Save button is disabled while a save is in flight", () => {
    const tag = formCardTag();
    expect(tag, "FormCard must receive isSubmitting so Save cannot be clicked twice").toMatch(/isSubmitting=\{/);
    expect(tag, "FormCard must receive disabled so Save cannot be clicked twice").toMatch(/disabled=\{/);
  });

  test("handleSave refuses to re-enter while a save is already running", () => {
    const body = bodyAfter("const handleSave");
    expect(body, "handleSave must bail out when a save is already in flight").toMatch(/if\s*\(\s*isSubmitting\s*\)\s*return/);
    expect(body, "handleSave must raise the in-flight flag").toMatch(/setIsSubmitting\(true\)/);
    expect(body, "handleSave must clear the in-flight flag in a finally block").toMatch(/finally\s*\{[^}]*setIsSubmitting\(false\)/);
  });

  test("the auto-save on person select records the person it committed", () => {
    const body = bodyAfter("const handleAssociatePerson");
    expect(body, "the auto-save branch must post the role member").toContain("createUserAndToGroup");
    expect(body, "a successful auto-save must record which person was already saved").toMatch(/setSavedPersonId\(/);
  });

  test("the form closes once the auto-save has committed the role member", () => {
    const guard = source.indexOf("if (savedPersonId)");
    const formCard = source.indexOf("<FormCard");
    expect(guard, "UserAdd must short-circuit its render once a person has been auto-saved").toBeGreaterThan(-1);
    expect(guard, "the savedPersonId guard must run before <FormCard> is rendered").toBeLessThan(formCard);
    expect(bodyAfter("if (savedPersonId)"), "the savedPersonId guard must return instead of rendering the form").toMatch(/return/);
  });

  test("saveUserFromPerson cannot re-post a person the auto-save already added", () => {
    const body = bodyAfter("const saveUserFromPerson");
    const post = body.indexOf("createUserAndToGroup");
    expect(post, "saveUserFromPerson must post the role member").toBeGreaterThan(-1);
    const beforePost = body.slice(0, post);
    expect(beforePost, "saveUserFromPerson must bail out for an already-auto-saved person before posting").toMatch(/savedPersonId[\s\S]*return/);
  });

  test("there is still exactly one place that posts a roleMember", () => {
    expect(source.match(/ApiHelper\.post\("\/rolemembers\//g) || []).toHaveLength(1);
  });
});
