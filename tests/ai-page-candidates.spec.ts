import { test, expect } from "@playwright/test";
import { register } from "node:module";

// @churchapps/apphelper can't be resolved outside the bundler; stub its ApiHelper so
// /stock/search answers with a URL derived from the search term.
const hook = `
  export async function resolve(spec, ctx, next) {
    if (spec === "@churchapps/apphelper") return { url: "stub:apphelper", shortCircuit: true };
    return next(spec, ctx);
  }
  export async function load(url, ctx, next) {
    if (url === "stub:apphelper") return {
      format: "module",
      shortCircuit: true,
      source: "export const ApiHelper = { post: async (_path, body) => [{ large: 'https://img/' + body.term.replace(/ /g, '_') }] };"
    };
    return next(url, ctx);
  }
`;
register("data:text/javascript," + encodeURIComponent(hook));

const { resolvePhotos } = await import("../src/site/aiPageCandidates");

test.describe("resolvePhotos", () => {
  test("a term that prefixes a longer term doesn't mangle the longer placeholder", async () => {
    const sections = [{ a: "pexels:worship", b: "pexels:worship team" }];
    const [resolved] = await resolvePhotos(sections);
    expect(resolved.a).toBe("https://img/worship");
    expect(resolved.b).toBe("https://img/worship_team");
  });
});
