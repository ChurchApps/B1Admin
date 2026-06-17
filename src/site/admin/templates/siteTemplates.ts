import { sectionTemplates, button, card, row, text, STOCK, type SectionContentDef } from "./sectionTemplates";

export interface SiteTemplatePageDef {
  titleKey?: string;
  url: string;
  navKey?: string;
  navIcon?: string;
  sections?: (string | SectionContentDef)[];
}

export interface SiteTemplateTheme {
  palette: { light: string; lightAccent: string; accent: string; darkAccent: string; dark: string; radius?: { sm: string; md: string; lg: string; xl: string }; typeScale?: number };
  fonts: { heading: string; body: string };
}

export interface SiteTemplateDef {
  key: string;
  theme: SiteTemplateTheme;
  pages: SiteTemplatePageDef[];
}

const sharp = { sm: "2px", md: "4px", lg: "6px", xl: "8px" };
const soft = { sm: "6px", md: "12px", lg: "18px", xl: "24px" };
const round = { sm: "10px", md: "18px", lg: "26px", xl: "32px" };

// Each template ships a distinct palette + font pairing + corner style so fresh sites
// open with a real visual identity instead of all defaulting to blue / Roboto / 8px.
const themes: Record<string, SiteTemplateTheme> = {
  classic: { palette: { light: "#ffffff", lightAccent: "#ece3cf", accent: "#1f3a5f", darkAccent: "#b8902f", dark: "#14233a", radius: sharp }, fonts: { heading: "Playfair Display", body: "Lato" } },
  simple: { palette: { light: "#ffffff", lightAccent: "#d6edf2", accent: "#0f766e", darkAccent: "#134e4a", dark: "#0b1f1d", radius: soft }, fonts: { heading: "Inter", body: "Inter" } },
  modern: { palette: { light: "#ffffff", lightAccent: "#e0e7ff", accent: "#4f46e5", darkAccent: "#312e81", dark: "#1e1b3a", radius: round, typeScale: 1.05 }, fonts: { heading: "Poppins", body: "Open Sans" } },
  visitor: { palette: { light: "#ffffff", lightAccent: "#ffe1d4", accent: "#ef5a2a", darkAccent: "#0b4a7f", dark: "#1a1a1a", radius: round }, fonts: { heading: "Montserrat", body: "Open Sans" } },
  community: { palette: { light: "#ffffff", lightAccent: "#dde8d3", accent: "#4d7c3a", darkAccent: "#2f5128", dark: "#18220f", radius: soft }, fonts: { heading: "Raleway", body: "Lato" } },
  media: { palette: { light: "#ffffff", lightAccent: "#d4d6e0", accent: "#dc2626", darkAccent: "#1f2937", dark: "#0a0a0f", radius: sharp }, fonts: { heading: "Oswald", body: "Roboto" } },
  heritage: { palette: { light: "#fffdf8", lightAccent: "#ece0cf", accent: "#7a2e2e", darkAccent: "#4a1f1f", dark: "#261410", radius: sharp }, fonts: { heading: "Playfair Display", body: "Lato" } }
};

const sermonsNav: SiteTemplatePageDef = { url: "/sermons", navKey: "sermons", navIcon: "play_circle" };
const giveNav: SiteTemplatePageDef = { url: "/donate", navKey: "give", navIcon: "favorite" };
const liveNav: SiteTemplatePageDef = { url: "/stream", navKey: "live", navIcon: "live_tv" };

// Per-template heroes so each site (and its picker thumbnail) opens with a genuinely
// different layout, not just different copy — composing all templates from the same
// library heroes made them look identical.

// Card-overlay hero: white content card floating on the left half of a full-bleed photo.
const visitorHero: SectionContentDef = {
  section: { background: STOCK + "/4/hands2.png", textColor: "light", styles: { all: { "padding-top": "70px", "padding-bottom": "70px" } } },
  elements: [
    row([6, 6], [
      [
        {
          elementType: "box",
          answers: { background: "#FFFFFF", rounded: "true", textColor: "var(--dark)", headingColor: "var(--dark)" },
          styles: { all: { "text-align": "center" } },
          elements: [
            text("<h2>New Here? We Saved You a Seat</h2><p>No pressure and no expectations &mdash; just friendly people and a place to belong. Here is everything you need to know for your first visit.</p>", "center"),
            button("Plan Your Visit", "/visit")
          ]
        }
      ],
      []
    ])
  ]
};

// Split hero: photo left, headline and CTA right, on the light accent band.
const communityHero: SectionContentDef = {
  section: { background: "var(--lightAccent)", textColor: "dark", styles: { all: { "padding-top": "70px", "padding-bottom": "70px" } } },
  elements: [
    row([6, 6], [
      [{ elementType: "image", answers: { photo: STOCK + "/1.78/hands.png", photoAlt: "Hands joined together" } }],
      [
        text("<h1>Find Your People</h1><p>Life is better together. From small groups to serving teams, there is a place for you to belong and people ready to walk with you.</p>"),
        button("Browse Groups", "/connect")
      ]
    ])
  ]
};

// Broadcast hero: left-aligned with a LIVE eyebrow line — deliberately not centered.
const mediaHero: SectionContentDef = {
  section: { background: STOCK + "/4/bible2.png", textColor: "light", styles: { all: { "padding-top": "120px", "padding-bottom": "120px" } } },
  elements: [
    text("<p><b>LIVE &middot; SUNDAYS 9:00 &amp; 11:00 AM</b></p><h1>Church, Wherever You Are</h1><p>Join us live from anywhere, or catch up on past messages anytime.</p>", "left"),
    button("Watch Live", "/stream")
  ]
};

// Asymmetric hero: headline left, white service-times card right, on the gradient.
const modernHero: SectionContentDef = {
  section: { background: "linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)", textColor: "light", styles: { all: { "padding-top": "80px", "padding-bottom": "80px" } } },
  elements: [
    row([7, 5], [
      [
        text("<h1>Love God. Love People.</h1><p>We are a church that believes everyone matters to God. Join us this weekend and see for yourself.</p>"),
        button("Plan Your Visit", "/about")
      ],
      [card("Join Us This Weekend", "<p>Sundays 9:00 &amp; 11:00 AM<br />123 Main Street, Your City</p>")]
    ])
  ]
};

// Two-band hero: a quiet scripture banner over the photo, then a solid accent CTA strip.
const heritageHeroQuote: SectionContentDef = {
  section: { background: STOCK + "/4/storm.png", textColor: "light", styles: { all: { "padding-top": "120px", "padding-bottom": "120px", "text-align": "center" } } },
  elements: [text("<h1>Rooted in Faith. Growing in Grace.</h1><p><em>&ldquo;For where two or three gather in my name, there am I with them.&rdquo; &mdash; Matthew 18:20</em></p>", "center")]
};

const heritageHeroBand: SectionContentDef = {
  section: { background: "var(--accent)", textColor: "light", styles: { all: { "padding-top": "40px", "padding-bottom": "40px", "text-align": "center" } } },
  elements: [
    text("<p>For generations our church family has gathered to worship, serve, and walk through life together. Come grow with us.</p>", "center"),
    button("Join Us Sunday", "/about", "outlined")
  ]
};

export const siteTemplates: SiteTemplateDef[] = [
  {
    key: "classic",
    theme: themes.classic,
    pages: [
      { titleKey: "home", url: "/", navKey: "home", navIcon: "home", sections: ["heroCentered", "welcome", "serviceTimes", "ministriesCards", "testimony", "ctaBanner"] },
      { titleKey: "about", url: "/about", navKey: "about", navIcon: "info", sections: ["aboutSplit", "storyColumns", "staffGrid", "verseBanner"] },
      { titleKey: "visit", url: "/visit", navKey: "visit", navIcon: "location_on", sections: ["findUs", "faqSection", "ctaBanner"] },
      sermonsNav,
      giveNav
    ]
  },
  {
    key: "simple",
    theme: themes.simple,
    pages: [
      { titleKey: "home", url: "/", navKey: "home", navIcon: "home", sections: ["heroSplit", "serviceTimes", "findUs", "givingBanner", "connectColumns"] },
      { titleKey: "about", url: "/about", navKey: "about", navIcon: "info", sections: ["welcome", "storyColumns", "staffGrid", "faqSection"] },
      giveNav
    ]
  },
  {
    key: "modern",
    theme: themes.modern,
    pages: [
      { titleKey: "home", url: "/", navKey: "home", navIcon: "home", sections: [modernHero, "galleryRow", "serviceTimes", "watchOnline", "givingBanner", "connectColumns"] },
      { titleKey: "about", url: "/about", navKey: "about", navIcon: "info", sections: ["aboutSplit", "staffGrid", "faqSection"] },
      { titleKey: "connect", url: "/connect", navKey: "connect", navIcon: "groups", sections: ["groupsBrowser", "ctaBanner"] },
      sermonsNav,
      giveNav
    ]
  },
  {
    key: "visitor",
    theme: themes.visitor,
    pages: [
      { titleKey: "home", url: "/", navKey: "home", navIcon: "home", sections: [visitorHero, "faqSection", "serviceTimes", "testimony", "ctaBanner"] },
      { titleKey: "visit", url: "/visit", navKey: "visit", navIcon: "location_on", sections: ["findUs", "ministriesCards", "faqSection"] },
      { titleKey: "about", url: "/about", navKey: "about", navIcon: "info", sections: ["storyColumns", "staffGrid", "galleryRow"] },
      sermonsNav,
      giveNav
    ]
  },
  {
    key: "community",
    theme: themes.community,
    pages: [
      { titleKey: "home", url: "/", navKey: "home", navIcon: "home", sections: [communityHero, "ministriesCards", "testimony", "ctaBanner"] },
      { titleKey: "connect", url: "/connect", navKey: "connect", navIcon: "groups", sections: ["groupsBrowser", "faqSection"] },
      { titleKey: "about", url: "/about", navKey: "about", navIcon: "info", sections: ["aboutSplit", "staffGrid", "galleryRow"] },
      { titleKey: "visit", url: "/visit", navKey: "visit", navIcon: "location_on", sections: ["findUs", "serviceTimes"] },
      giveNav
    ]
  },
  {
    key: "media",
    theme: themes.media,
    pages: [
      { titleKey: "home", url: "/", navKey: "home", navIcon: "home", sections: [mediaHero, "sermonsLatest", "watchOnline", "givingBanner"] },
      { titleKey: "about", url: "/about", navKey: "about", navIcon: "info", sections: ["welcome", "staffGrid", "connectColumns"] },
      sermonsNav,
      liveNav,
      giveNav
    ]
  },
  {
    key: "heritage",
    theme: themes.heritage,
    pages: [
      { titleKey: "home", url: "/", navKey: "home", navIcon: "home", sections: [heritageHeroQuote, heritageHeroBand, "serviceTimes", "findUs", "connectColumns"] },
      { titleKey: "about", url: "/about", navKey: "about", navIcon: "info", sections: ["storyColumns", "aboutSplit", "staffGrid", "testimony"] },
      sermonsNav,
      giveNav
    ]
  }
];

export const getSectionDefs = (sections?: (string | SectionContentDef)[]): SectionContentDef[] =>
  (sections || [])
    .map((s) => (typeof s === "string" ? sectionTemplates.find((t) => t.key === s) : s))
    .filter(Boolean) as SectionContentDef[];
