import type { ElementInterface, SectionInterface } from "../../helpers/Interfaces";

export const WEBSITE_ELEMENT_TYPES = [
  "text",
  "textWithPhoto",
  "card",
  "faq",
  "iconFeature",
  "testimonial",
  "stats",
  "gallery",
  "socialIcons",
  "countdown",
  "table",
  "image",
  "video",
  "map",
  "logo",
  "sermons",
  "stream",
  "donation",
  "donateLink",
  "form",
  "calendar",
  "groupList",
  "row",
  "box",
  "carousel",
  "rawHTML",
  "iframe",
  "buttonLink",
  "whiteSpace",
  "block"
];

const getAnswers = (element: ElementInterface): Record<string, unknown> => {
  if (element.answers) return element.answers;
  if (!element.answersJSON) return {};
  try { return JSON.parse(element.answersJSON); } catch { return {}; }
};

const stripHtml = (value: string): string => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const TEXT_FIELDS = [
  "text", "title", "description", "subtitle", "caption", "buttonLinkText", "name", "quote"
];

const walkElements = (elements: ElementInterface[] | undefined, into: string[]) => {
  (elements || []).forEach((el) => {
    const answers = getAnswers(el);
    TEXT_FIELDS.forEach((field) => {
      const v = answers[field];
      if (typeof v === "string" && v.trim()) into.push(stripHtml(v));
    });
    if (el.elements?.length) walkElements(el.elements, into);
  });
};

// Flattens all human-readable text from a page's section tree, for AI meta-description input.
export const extractPageText = (sections: SectionInterface[]): string => {
  const parts: string[] = [];
  (sections || []).forEach((s) => walkElements(s.elements, parts));
  return parts.join(" ").replace(/\s+/g, " ").trim();
};
