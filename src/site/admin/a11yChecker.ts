import type { ElementInterface, SectionInterface } from "../../helpers/Interfaces";

type A11ySeverity = "error" | "warning";
export type A11yRule = "missing-alt" | "contrast" | "heading-order" | "empty-link-text";

export interface A11yIssue {
  severity: A11ySeverity;
  rule: A11yRule;
  message: string;
  sectionId: string;
  elementId?: string;
  messageKey: string;
  params?: Record<string, string>;
}

// Keep module Locale-free so assertA11ySelfCheck() runs under Node without DOM/apphelper.
const EN: Record<string, string> = {
  missingAltImage: "Image is missing alt text. Add a description so screen readers can convey it.",
  missingAltGallery: "Gallery image {n} is missing alt text.",
  contrastLow: "Text {fg} on background {bg} has a {ratio}:1 contrast ratio, below the 4.5:1 minimum.",
  contrastLowHeading: "Heading color {fg} on background {bg} has a {ratio}:1 contrast ratio, below the 4.5:1 minimum.",
  headingNoH1: "This page has no H1 heading. Add one top-level heading as the page title.",
  headingMultipleH1: "This page has more than one H1 heading. Use a single H1 as the page title.",
  headingSkipped: "Heading level jumps from H{from} to H{to}. Increase heading levels one at a time.",
  emptyLinkAnchor: "A link has no readable text. Add text so its purpose is clear.",
  emptyButtonText: "This button links to {url} but has no text label.",
  emptyCardText: "This card links to {url} but has no title or text."
};

const applyParams = (template: string, params?: Record<string, string>): string =>
  params ? Object.keys(params).reduce((acc, k) => acc.replace("{" + k + "}", params[k]), template) : template;

const parseAnswers = (source?: { answers?: any; answersJSON?: string }): Record<string, any> => {
  if (source?.answers) return source.answers;
  if (!source?.answersJSON) return {};
  try {
    return JSON.parse(source.answersJSON);
  } catch {
    return {};
  }
};

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const isHex = (value?: string): boolean => !!value && HEX_RE.test(value.trim());

const parseHex = (hex: string): [number, number, number] => {
  let h = hex.trim().slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

const relativeLuminance = (hex: string): number => {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = parseHex(hex).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrastRatio = (fg: string, bg: string): number => {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
};

const CONTRAST_MIN = 4.5;

// DOMParser in browser, regex fallback for Node (self-check).
const extractHtml = (html: string): { headings: number[]; emptyAnchors: number } => {
  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const headings = Array.from(doc.querySelectorAll("h1,h2,h3,h4,h5,h6")).map((h) => parseInt(h.tagName.substring(1), 10));
    let emptyAnchors = 0;
    doc.querySelectorAll("a").forEach((a) => {
      const label = a.getAttribute("aria-label") || a.getAttribute("title");
      const text = (a.textContent || "").trim();
      const imgAlt = Array.from(a.querySelectorAll("img")).some((img) => (img.getAttribute("alt") || "").trim());
      if (!text && !label && !imgAlt) emptyAnchors++;
    });
    return { headings, emptyAnchors };
  }
  const headings = Array.from(html.matchAll(/<h([1-6])[\s>]/gi)).map((m) => parseInt(m[1], 10));
  let emptyAnchors = 0;
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const attrs = m[1];
    const inner = m[2].replace(/<[^>]*>/g, "").replace(/&[a-z]+;/gi, "").trim();
    const hasLabel = /\b(aria-label|title)\s*=\s*["'][^"']+["']/i.test(attrs);
    const hasImgAlt = /<img\b[^>]*\balt\s*=\s*["'][^"']+["']/i.test(m[2]);
    if (!inner && !hasLabel && !hasImgAlt) emptyAnchors++;
  }
  return { headings, emptyAnchors };
};

const IMAGE_ALT_TYPES = ["image", "textWithPhoto", "card"];
const HTML_FIELDS: Record<string, string[]> = {
  text: ["text"],
  textWithPhoto: ["text"],
  card: ["text"],
  faq: ["description"]
};

interface HeadingEntry {
  level: number;
  sectionId: string;
  elementId?: string;
}

const sortedElements = (elements?: ElementInterface[]): ElementInterface[] =>
  [...(elements || [])].sort((a, b) => (a.sort || 0) - (b.sort || 0));

const walkElement = (element: ElementInterface, sectionId: string, issues: A11yIssue[], headings: HeadingEntry[]) => {
  const type = element.elementType || "";
  const answers = parseAnswers(element);
  const eid = element.id;

  const push = (severity: A11ySeverity, rule: A11yRule, messageKey: string, params?: Record<string, string>) =>
    issues.push({ severity, rule, messageKey, params, message: applyParams(EN[messageKey], params), sectionId, elementId: eid });

  if (IMAGE_ALT_TYPES.includes(type) && answers.photo && !(answers.photoAlt || "").trim()) {
    push("error", "missing-alt", "missingAltImage");
  }

  if (type === "gallery" && Array.isArray(answers.photos)) {
    answers.photos.forEach((photo: any, i: number) => {
      if (photo?.url && !(photo.alt || "").trim()) push("error", "missing-alt", "missingAltGallery", { n: String(i + 1) });
    });
  }

  if (type === "buttonLink" && (answers.buttonLinkUrl || "").trim() && !(answers.buttonLinkText || "").trim()) {
    push("warning", "empty-link-text", "emptyButtonText", { url: answers.buttonLinkUrl });
  }

  if (type === "card" && (answers.url || "").trim()) {
    const cardText = (answers.text || "").replace(/<[^>]*>/g, "").trim();
    if (!(answers.title || "").trim() && !cardText) push("warning", "empty-link-text", "emptyCardText", { url: answers.url });
  }

  (HTML_FIELDS[type] || []).forEach((field) => {
    const html = answers[field];
    if (typeof html !== "string" || !html) return;
    const { headings: hs, emptyAnchors } = extractHtml(html);
    hs.forEach((level) => headings.push({ level, sectionId, elementId: eid }));
    for (let i = 0; i < emptyAnchors; i++) push("warning", "empty-link-text", "emptyLinkAnchor");
  });

  sortedElements(element.elements).forEach((child) => walkElement(child, sectionId, issues, headings));
};

const checkContrast = (section: SectionInterface, sectionId: string, issues: A11yIssue[]) => {
  const bg = section.background;
  if (!isHex(bg)) return;
  const add = (fg: string, messageKey: string) => {
    const ratio = contrastRatio(fg, bg!);
    if (ratio < CONTRAST_MIN) {
      const params = { fg, bg: bg!, ratio: ratio.toFixed(2) };
      issues.push({ severity: "warning", rule: "contrast", messageKey, params, message: applyParams(EN[messageKey], params), sectionId });
    }
  };
  if (isHex(section.textColor)) add(section.textColor!, "contrastLow");
  if (isHex(section.headingColor)) add(section.headingColor!, "contrastLowHeading");
};

const analyzeHeadings = (headings: HeadingEntry[], issues: A11yIssue[]) => {
  const add = (messageKey: string, sectionId: string, elementId?: string, params?: Record<string, string>) =>
    issues.push({ severity: "warning", rule: "heading-order", messageKey, params, message: applyParams(EN[messageKey], params), sectionId, elementId });

  if (headings.length === 0) return;
  const h1s = headings.filter((h) => h.level === 1);
  if (h1s.length === 0) add("headingNoH1", "");
  if (h1s.length > 1) add("headingMultipleH1", h1s[1].sectionId, h1s[1].elementId);

  for (let i = 1; i < headings.length; i++) {
    const prev = headings[i - 1].level;
    const cur = headings[i].level;
    if (cur > prev + 1) add("headingSkipped", headings[i].sectionId, headings[i].elementId, { from: String(prev), to: String(cur) });
  }
};

export const checkPageAccessibility = (sections: SectionInterface[] | undefined): A11yIssue[] => {
  const issues: A11yIssue[] = [];
  const headings: HeadingEntry[] = [];
  [...(sections || [])].sort((a, b) => (a.sort || 0) - (b.sort || 0)).forEach((section) => {
    const sectionId = section.id || "";
    checkContrast(section, sectionId, issues);
    sortedElements(section.elements).forEach((element) => walkElement(element, sectionId, issues, headings));
  });
  analyzeHeadings(headings, issues);
  return issues;
};

// Runnable invariant check; throws on any failure. Mirrors assertRemapSelfCheck.
export const assertA11ySelfCheck = (): true => {
  const fail = (msg: string): never => { throw new Error("assertA11ySelfCheck: " + msg); };
  const el = (elementType: string, answers: Record<string, any>, sort = 1, elements?: ElementInterface[]): ElementInterface =>
    ({ id: elementType + "-" + sort, elementType, answersJSON: JSON.stringify(answers), sort, elements });

  // contrastRatio: white on white = 1, black on white = 21.
  if (Math.round(contrastRatio("#FFFFFF", "#FFFFFF")) !== 1) fail("white/white ratio should be 1");
  if (Math.round(contrastRatio("#000000", "#FFFFFF")) !== 21) fail("black/white ratio should be 21");

  const sections: SectionInterface[] = [
    {
      id: "S1",
      sort: 1,
      background: "#FFFFFF",
      textColor: "#EEEEEE", // very low contrast on white
      elements: [
        el("text", { text: "<h1>Welcome</h1>" }, 1),
        el("image", { photo: "/a.png" }, 2), // missing alt
        el("image", { photo: "/b.png", photoAlt: "Described" }, 3) // fine
      ]
    },
    {
      id: "S2",
      sort: 2,
      background: "#123456", // photo/gradient-free concrete hex, dark
      textColor: "dark", // named, not hex -> skipped
      elements: [
        el("text", { text: "<h1>Second H1</h1><h4>Skipped from h1</h4>" }, 1),
        el("gallery", { photos: [{ url: "/g1.png" }, { url: "/g2.png", alt: "ok" }] }, 2),
        el("buttonLink", { buttonLinkUrl: "/x" }, 3), // empty text
        el("card", { url: "/y", title: "", text: "" }, 4), // empty card link
        el("testimonial", { quotes: [{ text: "Q", author: "A", photoUrl: "/p.png" }] }, 5) // exempt
      ]
    }
  ];

  const issues = checkPageAccessibility(sections);
  const by = (rule: A11yRule) => issues.filter((i) => i.rule === rule);

  const alt = by("missing-alt");
  if (alt.length !== 2) fail("expected 2 missing-alt (1 image + 1 gallery photo), got " + alt.length);
  if (!alt.some((i) => i.messageKey === "missingAltGallery" && i.params?.n === "1")) fail("gallery photo 1 should be flagged");
  if (alt.some((i) => i.elementId === "image-3")) fail("described image must not be flagged");

  const contrast = by("contrast");
  if (contrast.length !== 1 || contrast[0].sectionId !== "S1") fail("expected 1 contrast issue on S1, got " + contrast.length);

  const links = by("empty-link-text");
  if (!links.some((i) => i.messageKey === "emptyButtonText")) fail("empty button not flagged");
  if (!links.some((i) => i.messageKey === "emptyCardText")) fail("empty card link not flagged");

  const heading = by("heading-order");
  if (!heading.some((i) => i.messageKey === "headingMultipleH1")) fail("multiple h1 not flagged");
  if (!heading.some((i) => i.messageKey === "headingSkipped" && i.params?.from === "1" && i.params?.to === "4")) fail("h1->h4 skip not flagged");

  // No decorative testimonial photo leaks into missing-alt.
  if (issues.some((i) => i.elementId?.startsWith("testimonial"))) fail("testimonial photoUrl must be exempt");

  // Clean page yields nothing.
  const clean = checkPageAccessibility([{ id: "C1", sort: 1, background: "#FFFFFF", textColor: "#000000", elements: [el("text", { text: "<h1>Title</h1><h2>Sub</h2>" }, 1), el("image", { photo: "/c.png", photoAlt: "A cat" }, 2)] }]);
  if (clean.length !== 0) fail("clean page should have no issues, got " + JSON.stringify(clean));

  return true;
};
