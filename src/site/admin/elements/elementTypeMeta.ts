import { Locale } from "@churchapps/apphelper";

interface ElementTypeMeta {
  label: string;
  icon: string;
}

const META: Record<string, { labelKey: string; fallback: string; icon: string }> = {
  section: { labelKey: "site.elementAdd.section", fallback: "Section", icon: "view_agenda" },
  row: { labelKey: "site.elementAdd.row", fallback: "Row", icon: "view_column" },
  box: { labelKey: "site.elementAdd.box", fallback: "Box", icon: "crop_square" },
  carousel: { labelKey: "site.elementAdd.carousel", fallback: "Carousel", icon: "view_carousel" },
  text: { labelKey: "site.elementAdd.text", fallback: "Text", icon: "text_fields" },
  textWithPhoto: { labelKey: "site.elementAdd.textWithPhoto", fallback: "Text with Photo", icon: "article" },
  card: { labelKey: "site.elementAdd.card", fallback: "Card", icon: "dashboard" },
  faq: { labelKey: "site.elementAdd.expandable", fallback: "Expandable", icon: "help_outline" },
  table: { labelKey: "site.elementAdd.table", fallback: "Table", icon: "table_chart" },
  image: { labelKey: "site.elementAdd.image", fallback: "Image", icon: "image" },
  video: { labelKey: "site.elementAdd.video", fallback: "Video", icon: "play_circle" },
  map: { labelKey: "site.elementAdd.location", fallback: "Location", icon: "place" },
  logo: { labelKey: "site.elementAdd.logo", fallback: "Logo", icon: "church" },
  sermons: { labelKey: "common.sermons", fallback: "Sermons", icon: "video_library" },
  stream: { labelKey: "site.elementAdd.stream", fallback: "Stream", icon: "live_tv" },
  donation: { labelKey: "site.elementAdd.donation", fallback: "Donation", icon: "favorite" },
  donateLink: { labelKey: "site.elementAdd.donateLink", fallback: "Donate Link", icon: "volunteer_activism" },
  form: { labelKey: "site.elementAdd.form", fallback: "Form", icon: "assignment" },
  calendar: { labelKey: "site.elementAdd.calendar", fallback: "Calendar", icon: "event" },
  groupList: { labelKey: "site.elementAdd.groupList", fallback: "Group List", icon: "groups" },
  rawHTML: { labelKey: "site.elementAdd.html", fallback: "HTML", icon: "code" },
  iframe: { labelKey: "site.elementAdd.embedPage", fallback: "Embedded Page", icon: "web" },
  block: { labelKey: "site.elementAdd.block", fallback: "Block", icon: "widgets" }
};

export function getElementTypeMeta(elementType?: string | null): ElementTypeMeta {
  if (!elementType) return { label: Locale.label("common.element", "Element"), icon: "tune" };
  const entry = META[elementType];
  if (!entry) return { label: elementType, icon: "tune" };
  return {
    label: Locale.label(entry.labelKey, entry.fallback),
    icon: entry.icon
  };
}
