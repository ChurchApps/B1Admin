import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import * as esbuild from "esbuild";
import { type FeedVenueInterface, type PlanItemInterface } from "../src/helpers";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

// planItemUtils pulls in apphelper, which node can't resolve unbundled, so bundle the
// module under test with its imports stubbed and load it from memory.
let filterFeedByPlanItems: (feed: FeedVenueInterface | null, planItems: PlanItemInterface[]) => FeedVenueInterface | null;

test.beforeAll(async () => {
  const built = await esbuild.build({
    entryPoints: [path.join(root, "src/serving/components/planItemUtils.ts")],
    bundle: true,
    write: false,
    format: "esm",
    platform: "neutral",
    plugins: [
      {
        name: "stub-imports",
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) => (args.kind === "entry-point" ? undefined : { path: args.path, namespace: "stub" }));
          build.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: "export const ApiHelper = {};", loader: "js" }));
        }
      }
    ]
  });
  const code = built.outputFiles[0].text;
  const mod = await import("data:text/javascript;base64," + Buffer.from(code).toString("base64"));
  filterFeedByPlanItems = mod.filterFeedByPlanItems;
});

const lessonFeed = (): FeedVenueInterface => ({
  id: "v1",
  lessonId: "l1",
  lessonName: "Sample Lesson",
  sections: [
    { id: "s1", name: "Welcome", actions: [{ id: "a1", content: "Greet the kids" }, { id: "a2", content: "Opening prayer" }] },
    { id: "s2", name: "Deleted Section", actions: [{ id: "a3", content: "Craft time" }, { id: "a4", content: "Snack" }] },
    { id: "s3", name: "Bible Story", actions: [{ id: "a5", content: "Read the story" }, { id: "a6", content: "Watch the video" }] }
  ]
});

// Section s1 left untouched, s2 deleted, s3 expanded to actions with a6 deleted.
const customizedPlanItems = (): PlanItemInterface[] => [
  { id: "pi1", itemType: "providerSection", relatedId: "s1", label: "Welcome" },
  {
    id: "pi2",
    itemType: "header",
    label: "Lesson",
    children: [{ id: "pi3", itemType: "providerPresentation", relatedId: "a5", label: "Read the story" }]
  }
];

test.describe("Issue 979: lesson print formats honor plan customizations", () => {
  test("drops sections the church deleted from the plan", () => {
    const result = filterFeedByPlanItems(lessonFeed(), customizedPlanItems());
    expect(result?.sections?.map((s) => s.id)).toEqual(["s1", "s3"]);
  });

  test("keeps an untouched section's actions intact", () => {
    const result = filterFeedByPlanItems(lessonFeed(), customizedPlanItems());
    const welcome = result?.sections?.find((s) => s.id === "s1");
    expect(welcome?.actions?.map((a) => a.id)).toEqual(["a1", "a2"]);
  });

  test("keeps only the surviving actions of an expanded section", () => {
    const result = filterFeedByPlanItems(lessonFeed(), customizedPlanItems());
    const story = result?.sections?.find((s) => s.id === "s3");
    expect(story?.actions?.map((a) => a.id)).toEqual(["a5"]);
  });

  test("matches id-less actions by content when a plan item carries the same label", () => {
    const feed = lessonFeed();
    feed.sections![2].actions = [{ content: "Read the story" }, { content: "Watch the video" }];
    const result = filterFeedByPlanItems(feed, customizedPlanItems());
    const story = result?.sections?.find((s) => s.id === "s3");
    expect(story?.actions?.map((a) => a.content)).toEqual(["Read the story"]);
  });

  test("does not mutate the feed it was handed", () => {
    const feed = lessonFeed();
    filterFeedByPlanItems(feed, customizedPlanItems());
    expect(feed.sections).toHaveLength(3);
    expect(feed.sections?.[2].actions).toHaveLength(2);
  });

  test("leaves the feed alone when the plan has no items", () => {
    const result = filterFeedByPlanItems(lessonFeed(), []);
    expect(result?.sections?.map((s) => s.id)).toEqual(["s1", "s2", "s3"]);
  });
});
