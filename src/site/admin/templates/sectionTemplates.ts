import type { ElementInterface, SectionInterface } from "../../../helpers";

export interface TemplateElementDef {
  elementType: string;
  answers?: Record<string, unknown>;
  styles?: { all?: any; desktop?: any; mobile?: any };
  animations?: { onShow?: string; onShowSpeed?: string };
  elements?: TemplateElementDef[];
}

export interface SectionContentDef {
  section: {
    background: string;
    textColor: string;
    headingColor?: string;
    linkColor?: string;
    answers?: Record<string, unknown>;
    styles?: { all?: any; desktop?: any; mobile?: any };
  };
  elements: TemplateElementDef[];
}

export interface SectionTemplateDef extends SectionContentDef {
  key: string;
  category: "hero" | "about" | "services" | "people" | "media" | "giving" | "cta";
}

export const STOCK = "https://content.churchapps.org/stockPhotos";

// Columns stack full width on phones unless the template gives its own phone widths.
export const row = (columns: number[], children: TemplateElementDef[][], mobileSizes: number[] = columns.map(() => 12)): TemplateElementDef => ({
  elementType: "row",
  answers: { columns: columns.join(","), mobileSizes: mobileSizes.join(",") },
  elements: columns.map((size, i) => ({
    elementType: "column",
    answers: { size, mobileSize: mobileSizes[i] },
    elements: children[i] || []
  }))
});

export const text = (html: string, textAlignment: "left" | "center" | "right" = "left"): TemplateElementDef => ({ elementType: "text", answers: { text: html, textAlignment } });

export const button = (buttonLinkText: string, buttonLinkUrl: string, variant: "contained" | "outlined" = "contained"): TemplateElementDef => ({
  elementType: "buttonLink",
  answers: { buttonLinkText, buttonLinkUrl, buttonLinkVariant: variant, buttonLinkColor: "primary", external: "false", fullWidth: "false" }
});

export const card = (title: string, html: string, photo?: string, photoAlt?: string): TemplateElementDef => ({
  elementType: "card",
  answers: { title, titleAlignment: "center", text: html, textAlignment: "center", ...(photo ? { photo, photoAlt: photoAlt || title } : {}) }
});

const faq = (title: string, description: string): TemplateElementDef => ({ elementType: "faq", answers: { headingType: "h6", title, description, iconColor: "#03a9f4" } });

export const sectionTemplates: SectionTemplateDef[] = [
  {
    key: "heroCentered",
    category: "hero",
    // text-align centers the inline MUI button: buttonLink elements have no wrapper or alignment answer of their own.
    section: { background: STOCK + "/4/worship.png", textColor: "light", styles: { all: { "padding-top": "110px", "padding-bottom": "110px", "text-align": "center" } } },
    elements: [
      text("<h1>Welcome Home</h1><p>Join us this Sunday as we worship together and grow in faith. Wherever you are on your journey, you belong here.</p>", "center"),
      button("Plan Your Visit", "/about")
    ]
  },
  {
    key: "heroSplit",
    category: "hero",
    section: { background: "#FFFFFF", textColor: "dark", styles: { all: { "padding-top": "60px", "padding-bottom": "60px" } } },
    elements: [
      row([6, 6], [
        [
          text("<h1>A Church For Your Whole Family</h1><p>We are a community of people learning to follow Jesus together. Come as you are &mdash; there is a place for you here.</p>"),
          button("Join Us Sunday", "/about")
        ],
        [{ elementType: "image", answers: { photo: STOCK + "/1.78/worship2.png", photoAlt: "Worship service" } }]
      ])
    ]
  },
  {
    key: "heroGradient",
    category: "hero",
    section: { background: "linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)", textColor: "light", styles: { all: { "padding-top": "100px", "padding-bottom": "100px", "text-align": "center" } } },
    elements: [
      text("<h1>Love God. Love People.</h1><p>Sundays at 9:00 &amp; 11:00 AM</p>", "center"),
      button("Watch Online", "/sermons", "outlined")
    ]
  },
  {
    key: "welcome",
    category: "about",
    section: { background: "#FFFFFF", textColor: "dark" },
    elements: [text("<h2>We're Glad You're Here</h2><p>Our church is a family of believers committed to knowing Christ and making Him known. We would love to meet you and help you find your place in our community.</p>", "center")]
  },
  {
    key: "aboutSplit",
    category: "about",
    section: { background: "var(--light)", textColor: "dark" },
    elements: [
      {
        elementType: "textWithPhoto",
        answers: {
          text: "<h2>Our Story</h2><p>What started as a small gathering of families has grown into a vibrant church community. Through every season, our mission has stayed the same: helping people take their next step with Jesus.</p>",
          textAlignment: "left",
          photo: STOCK + "/0/comfort.jpg",
          photoAlt: "Church community",
          photoPosition: "right"
        }
      }
    ]
  },
  {
    key: "storyColumns",
    category: "about",
    section: { background: "#FFFFFF", textColor: "dark" },
    elements: [
      text("<h2>What We Believe</h2>", "center"),
      row([4, 4, 4], [
        [text("<h3>Gather</h3><p>We worship together weekly, encountering God through music, prayer, and teaching.</p>", "center")],
        [text("<h3>Grow</h3><p>We grow in faith through small groups, classes, and serving alongside one another.</p>", "center")],
        [text("<h3>Go</h3><p>We carry the love of Christ into our neighborhoods, our city, and the world.</p>", "center")]
      ])
    ]
  },
  {
    key: "testimony",
    category: "about",
    section: { background: "var(--lightAccent)", textColor: "dark", styles: { all: { "padding-top": "70px", "padding-bottom": "70px" } } },
    elements: [text("<h3>&ldquo;This church changed our lives. We found a family here, and our kids love it as much as we do.&rdquo;</h3><p>&mdash; The Johnson Family</p>", "center")]
  },
  {
    key: "serviceTimes",
    category: "services",
    section: { background: "#FFFFFF", textColor: "dark" },
    elements: [
      text("<h2>Join Us This Weekend</h2>", "center"),
      row([4, 4, 4], [
        [card("Sunday 9:00 AM", "<p>Traditional service with choir and hymns.</p>")],
        [card("Sunday 11:00 AM", "<p>Contemporary worship with full band.</p>")],
        [card("Wednesday 6:30 PM", "<p>Midweek studies and student ministries.</p>")]
      ])
    ]
  },
  {
    key: "findUs",
    category: "services",
    section: { background: "var(--light)", textColor: "dark" },
    elements: [
      row([6, 6], [
        [text("<h2>Find Us</h2><p>123 Main Street<br />Your City, ST 00000</p><p>We meet every Sunday at 9:00 and 11:00 AM. Guest parking is available right by the main entrance, and our welcome team will help you find everything you need.</p>"), button("Get Directions", "/about", "outlined")],
        [{ elementType: "image", answers: { photo: STOCK + "/1.78/votd.png", photoAlt: "The road to church" } }]
      ])
    ]
  },
  {
    key: "staffGrid",
    category: "people",
    section: { background: "#FFFFFF", textColor: "dark" },
    elements: [
      text("<h2>Meet Our Team</h2>", "center"),
      row([4, 4, 4], [
        [card("Pastor Name", "<p>Lead Pastor</p>", STOCK + "/1.78/comfort.png", "Lead Pastor")],
        [card("Pastor Name", "<p>Worship Pastor</p>", STOCK + "/1.78/worship.png", "Worship Pastor")],
        [card("Pastor Name", "<p>Youth Pastor</p>", STOCK + "/1.78/hands.png", "Youth Pastor")]
      ])
    ]
  },
  {
    key: "ministriesCards",
    category: "people",
    section: { background: "var(--light)", textColor: "dark" },
    elements: [
      text("<h2>Ministries For Every Age</h2>", "center"),
      row([4, 4, 4], [
        [card("Kids", "<p>A safe, fun place for children to discover God's love.</p>", STOCK + "/1.78/lessons.png", "Kids ministry")],
        [card("Students", "<p>Middle and high schoolers building real friendships and real faith.</p>", STOCK + "/1.78/bible2.png", "Student ministry")],
        [card("Adults", "<p>Groups and studies that help you grow wherever you are.</p>", STOCK + "/1.78/hands.png", "Adult ministry")]
      ])
    ]
  },
  {
    key: "groupsBrowser",
    category: "people",
    section: { background: "#FFFFFF", textColor: "dark" },
    elements: [
      text("<h2>Find Your Group</h2><p>Life is better together. Browse our groups and find one that fits.</p>", "center"),
      { elementType: "groups", answers: { showSearch: "true", showCategory: "true" } }
    ]
  },
  {
    key: "groupListSection",
    category: "people",
    section: { background: "#FFFFFF", textColor: "dark" },
    elements: [
      text("<h2>Our Groups</h2>", "center"),
      { elementType: "groupList", answers: {} }
    ]
  },
  {
    key: "faqSection",
    category: "people",
    section: { background: "var(--light)", textColor: "dark" },
    elements: [
      text("<h2>Common Questions</h2>", "center"),
      faq("What should I wear?", "<p>Come as you are! You'll see everything from jeans to suits on a Sunday morning.</p>"),
      faq("What about my kids?", "<p>We offer safe, age-appropriate environments for children from birth through high school at every service.</p>"),
      faq("How long are services?", "<p>Services typically last about 75 minutes, including worship and the message.</p>"),
      faq("Where do I park?", "<p>Guest parking is available near the main entrance. Our parking team will point you in the right direction.</p>")
    ]
  },
  {
    key: "sermonsLatest",
    category: "media",
    section: { background: "#FFFFFF", textColor: "dark" },
    elements: [
      text("<h2>Recent Messages</h2>", "center"),
      { elementType: "sermons", answers: {} }
    ]
  },
  {
    key: "watchOnline",
    category: "media",
    section: { background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", textColor: "light", styles: { all: { "padding-top": "70px", "padding-bottom": "70px" } } },
    elements: [
      row([6, 6], [
        [text("<h2>Can't Make It In Person?</h2><p>Join us live online every Sunday, or catch up on past messages anytime.</p>"), button("Watch Now", "/stream")],
        [{ elementType: "image", answers: { photo: STOCK + "/1.78/worship.png", photoAlt: "Watch online" } }]
      ])
    ]
  },
  {
    key: "givingBanner",
    category: "giving",
    section: { background: "var(--accent)", textColor: "light", styles: { all: { "padding-top": "60px", "padding-bottom": "60px", "text-align": "center" } } },
    elements: [
      text("<h2>Generosity Changes Lives</h2><p>Your giving fuels ministry in our church, our city, and around the world.</p>", "center"),
      button("Give Now", "/donate")
    ]
  },
  {
    key: "givingOptions",
    category: "giving",
    section: { background: "#FFFFFF", textColor: "dark" },
    elements: [
      row([6, 6], [
        [text("<h2>Ways To Give</h2><p>Give securely online with a one-time gift or set up recurring giving. You can also give in person at any service.</p>")],
        [{ elementType: "donateLink", answers: { url: "/donate", text: "Give Now", amounts: "[25,50,100]" } }]
      ])
    ]
  },
  {
    key: "ctaBanner",
    category: "cta",
    section: { background: "var(--primary)", textColor: "light", styles: { all: { "padding-top": "60px", "padding-bottom": "60px", "text-align": "center" } } },
    elements: [
      text("<h2>Ready To Take Your Next Step?</h2><p>We'd love to help you get connected.</p>", "center"),
      button("Get Connected", "/about", "outlined")
    ]
  },
  {
    key: "connectColumns",
    category: "cta",
    section: { background: "var(--dark)", textColor: "light" },
    elements: [
      row([4, 4, 4], [
        [text("<h3>Visit</h3><p>123 Main Street<br />Your City, ST 00000</p>")],
        [text("<h3>Service Times</h3><p>Sundays 9:00 &amp; 11:00 AM<br />Wednesdays 6:30 PM</p>")],
        [text("<h3>Contact</h3><p>(555) 555-0100<br />hello@yourchurch.org</p>")]
      ])
    ]
  },
  {
    key: "galleryRow",
    category: "cta",
    section: { background: "#FFFFFF", textColor: "dark" },
    elements: [
      text("<h2>Life At Our Church</h2>", "center"),
      row([4, 4, 4], [
        [{ elementType: "image", answers: { photo: STOCK + "/1.78/worship.png", photoAlt: "Worship" } }],
        [{ elementType: "image", answers: { photo: STOCK + "/1.78/hands.png", photoAlt: "Community" } }],
        [{ elementType: "image", answers: { photo: STOCK + "/1.78/baptize.png", photoAlt: "Baptism" } }]
      ])
    ]
  },
  {
    key: "verseBanner",
    category: "cta",
    section: { background: STOCK + "/4/bible.png", textColor: "light", styles: { all: { "padding-top": "90px", "padding-bottom": "90px" } } },
    elements: [text("<h3>&ldquo;For where two or three gather in my name, there am I with them.&rdquo;</h3><p>Matthew 18:20</p>", "center")]
  }
];

export const templateCategories: SectionTemplateDef["category"][] = ["hero", "about", "services", "people", "media", "giving", "cta"];

const toElement = (def: TemplateElementDef, sort: number): ElementInterface => ({
  elementType: def.elementType,
  sort,
  answersJSON: JSON.stringify(def.answers || {}),
  stylesJSON: def.styles ? JSON.stringify(def.styles) : undefined,
  animationsJSON: def.animations ? JSON.stringify(def.animations) : undefined,
  elements: def.elements?.map((child, i) => toElement(child, i + 1))
});

const getAnswers = (source: { answers?: Record<string, any>; answersJSON?: string }): Record<string, any> => {
  if (source?.answers) return source.answers;
  if (!source?.answersJSON) return {};
  try {
    return JSON.parse(source.answersJSON);
  } catch {
    return {};
  }
};

interface ExtractedContent {
  texts: string[];
  images: { photo: string; photoAlt?: string }[];
  buttons: Record<string, any>[];
}

const TEXT_TYPES = ["text", "textWithPhoto", "card"];
const IMAGE_TYPES = ["image", "textWithPhoto", "card"];

const collectContent = (elements: ElementInterface[] | undefined, into: ExtractedContent) => {
  const ordered = [...(elements || [])].sort((a, b) => (a.sort || 0) - (b.sort || 0));
  ordered.forEach((element) => {
    const type = element.elementType || "";
    const answers = getAnswers(element);
    if (TEXT_TYPES.includes(type) && answers.text) into.texts.push(answers.text);
    else if (type === "faq" && answers.description) into.texts.push(answers.description);
    if (IMAGE_TYPES.includes(type) && answers.photo) into.images.push({ photo: answers.photo, photoAlt: answers.photoAlt });
    if (type === "buttonLink" && answers.buttonLinkText) into.buttons.push({ ...answers });
    if (element.elements?.length) collectContent(element.elements, into);
  });
};

export const extractSectionContent = (section: { elements?: ElementInterface[] }): ExtractedContent => {
  const content: ExtractedContent = { texts: [], images: [], buttons: [] };
  collectContent(section?.elements, content);
  return content;
};

export const hasExtractableContent = (section: { elements?: ElementInterface[] }): boolean => {
  const c = extractSectionContent(section);
  return c.texts.length + c.images.length + c.buttons.length > 0;
};

interface RemapCursors {
  text: number;
  image: number;
  button: number;
}

const pourInto = (def: TemplateElementDef, content: ExtractedContent, cursors: RemapCursors): TemplateElementDef => {
  const answers = { ...(def.answers || {}) };
  const type = def.elementType;
  if (TEXT_TYPES.includes(type) && cursors.text < content.texts.length) answers.text = content.texts[cursors.text++];
  else if (type === "faq" && cursors.text < content.texts.length) answers.description = content.texts[cursors.text++];
  if (IMAGE_TYPES.includes(type) && cursors.image < content.images.length) {
    const img = content.images[cursors.image++];
    answers.photo = img.photo;
    answers.photoAlt = img.photoAlt;
  }
  if (type === "buttonLink" && cursors.button < content.buttons.length) Object.assign(answers, content.buttons[cursors.button++]);
  return { ...def, answers, elements: def.elements?.map((child) => pourInto(child, content, cursors)) };
};

export const remapSectionContent = (
  source: { elements?: ElementInterface[] },
  template: SectionContentDef,
  target: { pageId?: string; blockId?: string; zone?: string; sort: number }
): SectionInterface => {
  const content = extractSectionContent(source);
  const cursors: RemapCursors = { text: 0, image: 0, button: 0 };
  const elements = template.elements.map((def) => pourInto(def, content, cursors));
  return buildTemplateSection({ section: template.section, elements }, target);
};

// Runnable invariant check for the content-preserving remap; throws on any failure.
export const assertRemapSelfCheck = (): true => {
  const src = {
    elements: [
      { elementType: "text", answersJSON: JSON.stringify({ text: "T1" }), sort: 1 },
      { elementType: "buttonLink", answersJSON: JSON.stringify({ buttonLinkText: "B1", buttonLinkUrl: "/b1" }), sort: 2 },
      {
        elementType: "row",
        sort: 3,
        elements: [
          {
            elementType: "column",
            sort: 1,
            elements: [
              { elementType: "text", answersJSON: JSON.stringify({ text: "T2" }), sort: 1 },
              { elementType: "image", answersJSON: JSON.stringify({ photo: "/p.png", photoAlt: "alt" }), sort: 2 }
            ]
          }
        ]
      }
    ]
  } as { elements: ElementInterface[] };

  const content = extractSectionContent(src);
  const fail = (msg: string): never => { throw new Error("assertRemapSelfCheck: " + msg); };
  if (content.texts.join(",") !== "T1,T2") fail("text extraction order wrong: " + content.texts.join(","));
  if (content.images.length !== 1 || content.images[0].photo !== "/p.png") fail("image extraction wrong");
  if (content.buttons.length !== 1 || content.buttons[0].buttonLinkText !== "B1") fail("button extraction wrong");

  const first = (s: SectionInterface): any => JSON.parse(s.elements![0].answersJSON || "{}");

  // Fewer slots than content: only the first text survives (lossy drop of the rest).
  const oneSlot: SectionContentDef = { section: { background: "#FFF", textColor: "dark" }, elements: [text("<h1>placeholder</h1>")] };
  const lossy = remapSectionContent(src, oneSlot, { sort: 1 });
  if (first(lossy).text !== "T1") fail("single-slot remap should keep first text");

  // Independent cursors: image slot pulls from images even when it precedes the text slot.
  const imageFirst: SectionContentDef = {
    section: { background: "#FFF", textColor: "dark" },
    elements: [
      { elementType: "image", answers: { photo: "/placeholder.png" } },
      text("<h1>placeholder</h1>"),
      button("Placeholder", "/x")
    ]
  };
  const full = remapSectionContent(src, imageFirst, { sort: 1 });
  if (JSON.parse(full.elements![0].answersJSON || "{}").photo !== "/p.png") fail("image cursor not independent of text");
  if (JSON.parse(full.elements![1].answersJSON || "{}").text !== "T1") fail("text slot not filled");
  if (JSON.parse(full.elements![2].answersJSON || "{}").buttonLinkText !== "B1") fail("button slot not filled");

  // More slots than content: extra template slots keep their placeholder text.
  const threeText: SectionContentDef = { section: { background: "#FFF", textColor: "dark" }, elements: [text("<p>a</p>"), text("<p>b</p>"), text("<p>keep</p>")] };
  const padded = remapSectionContent(src, threeText, { sort: 1 });
  if (JSON.parse(padded.elements![2].answersJSON || "{}").text !== "<p>keep</p>") fail("unfilled slot should keep placeholder");

  return true;
};

export const buildTemplateSection = (template: SectionContentDef, target: { pageId?: string; blockId?: string; zone?: string; sort: number }): SectionInterface => ({
  pageId: target.pageId,
  blockId: target.blockId,
  zone: target.zone,
  sort: target.sort,
  background: template.section.background,
  textColor: template.section.textColor,
  headingColor: template.section.headingColor,
  linkColor: template.section.linkColor,
  answersJSON: JSON.stringify(template.section.answers || {}),
  stylesJSON: template.section.styles ? JSON.stringify(template.section.styles) : undefined,
  elements: template.elements.map((def, i) => toElement(def, i + 1))
});
