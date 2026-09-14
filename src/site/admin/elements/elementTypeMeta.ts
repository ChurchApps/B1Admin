import { Locale } from "@churchapps/apphelper";

interface ElementTypeMeta {
  label: string;
  icon: string;
}

const META: Record<string, { getLabel: () => string; icon: string }> = {
  section: { getLabel: () => Locale.label("site.elementAdd.section", "Section"), icon: "view_agenda" },
  row: { getLabel: () => Locale.label("site.elementAdd.row", "Row"), icon: "view_column" },
  column: { getLabel: () => Locale.label("site.elementAdd.column", "Column"), icon: "view_week" },
  box: { getLabel: () => Locale.label("site.elementAdd.box", "Box"), icon: "crop_square" },
  carousel: { getLabel: () => Locale.label("site.elementAdd.carousel", "Carousel"), icon: "view_carousel" },
  text: { getLabel: () => Locale.label("site.elementAdd.text", "Text"), icon: "text_fields" },
  textWithPhoto: { getLabel: () => Locale.label("site.elementAdd.textWithPhoto", "Text with Photo"), icon: "article" },
  card: { getLabel: () => Locale.label("site.elementAdd.card", "Card"), icon: "dashboard" },
  faq: { getLabel: () => Locale.label("site.elementAdd.expandable", "Expandable"), icon: "help_outline" },
  iconFeature: { getLabel: () => Locale.label("site.elementAdd.iconFeature", "Icon Feature"), icon: "stars" },
  gallery: { getLabel: () => Locale.label("site.elementAdd.gallery", "Gallery"), icon: "collections" },
  testimonial: { getLabel: () => Locale.label("site.elementAdd.testimonial", "Testimonial"), icon: "format_quote" },
  socialIcons: { getLabel: () => Locale.label("site.elementAdd.socialIcons", "Social Icons"), icon: "share" },
  countdown: { getLabel: () => Locale.label("site.elementAdd.countdown", "Countdown"), icon: "timer" },
  stats: { getLabel: () => Locale.label("site.elementAdd.stats", "Stats"), icon: "insights" },
  table: { getLabel: () => Locale.label("site.elementAdd.table", "Table"), icon: "table_chart" },
  image: { getLabel: () => Locale.label("site.elementAdd.image", "Image"), icon: "image" },
  video: { getLabel: () => Locale.label("site.elementAdd.video", "Video"), icon: "play_circle" },
  map: { getLabel: () => Locale.label("site.elementAdd.location", "Location"), icon: "place" },
  logo: { getLabel: () => Locale.label("site.elementAdd.logo", "Logo"), icon: "church" },
  sermons: { getLabel: () => Locale.label("common.sermons", "Sermons"), icon: "video_library" },
  podcast: { getLabel: () => Locale.label("site.elementAdd.podcast", "Podcast"), icon: "podcasts" },
  stream: { getLabel: () => Locale.label("site.elementAdd.stream", "Stream"), icon: "live_tv" },
  donation: { getLabel: () => Locale.label("site.elementAdd.donation", "Donation"), icon: "favorite" },
  donateLink: { getLabel: () => Locale.label("site.elementAdd.donateLink", "Donate Link"), icon: "volunteer_activism" },
  form: { getLabel: () => Locale.label("site.elementAdd.form", "Form"), icon: "assignment" },
  calendar: { getLabel: () => Locale.label("site.elementAdd.calendar", "Calendar"), icon: "event" },
  groupList: { getLabel: () => Locale.label("site.elementAdd.groupList", "Group List"), icon: "groups" },
  campaignProgress: { getLabel: () => Locale.label("site.elementAdd.campaignProgress", "Campaign Progress"), icon: "savings" },
  staffGrid: { getLabel: () => Locale.label("site.elementAdd.staffGrid", "Staff Grid"), icon: "groups_2" },
  serviceTimes: { getLabel: () => Locale.label("site.elementAdd.serviceTimes", "Service Times"), icon: "schedule" },
  rawHTML: { getLabel: () => Locale.label("site.elementAdd.html", "HTML"), icon: "code" },
  iframe: { getLabel: () => Locale.label("site.elementAdd.embedPage", "Embedded Page"), icon: "web" },
  block: { getLabel: () => Locale.label("site.elementAdd.block", "Block"), icon: "widgets" }
};

export function getElementTypeMeta(elementType?: string | null): ElementTypeMeta {
  if (!elementType) return { label: Locale.label("common.element", "Element"), icon: "tune" };
  const entry = META[elementType];
  if (!entry) return { label: elementType, icon: "tune" };
  return {
    label: entry.getLabel(),
    icon: entry.icon
  };
}
