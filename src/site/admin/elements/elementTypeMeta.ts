import { Locale } from "@churchapps/apphelper";

interface ElementTypeMeta {
  label: string;
  icon: string;
}

const META: Record<string, { getLabel: () => string; icon: string }> = {
  section: { getLabel: () => Locale.label("site.elementAdd.section", "Section"), icon: "view_agenda" },
  row: { getLabel: () => Locale.label("site.elementAdd.row", "Row"), icon: "view_column" },
  box: { getLabel: () => Locale.label("site.elementAdd.box", "Box"), icon: "crop_square" },
  carousel: { getLabel: () => Locale.label("site.elementAdd.carousel", "Carousel"), icon: "view_carousel" },
  text: { getLabel: () => Locale.label("site.elementAdd.text", "Text"), icon: "text_fields" },
  textWithPhoto: { getLabel: () => Locale.label("site.elementAdd.textWithPhoto", "Text with Photo"), icon: "article" },
  card: { getLabel: () => Locale.label("site.elementAdd.card", "Card"), icon: "dashboard" },
  faq: { getLabel: () => Locale.label("site.elementAdd.expandable", "Expandable"), icon: "help_outline" },
  table: { getLabel: () => Locale.label("site.elementAdd.table", "Table"), icon: "table_chart" },
  image: { getLabel: () => Locale.label("site.elementAdd.image", "Image"), icon: "image" },
  video: { getLabel: () => Locale.label("site.elementAdd.video", "Video"), icon: "play_circle" },
  map: { getLabel: () => Locale.label("site.elementAdd.location", "Location"), icon: "place" },
  logo: { getLabel: () => Locale.label("site.elementAdd.logo", "Logo"), icon: "church" },
  sermons: { getLabel: () => Locale.label("common.sermons", "Sermons"), icon: "video_library" },
  stream: { getLabel: () => Locale.label("site.elementAdd.stream", "Stream"), icon: "live_tv" },
  donation: { getLabel: () => Locale.label("site.elementAdd.donation", "Donation"), icon: "favorite" },
  donateLink: { getLabel: () => Locale.label("site.elementAdd.donateLink", "Donate Link"), icon: "volunteer_activism" },
  form: { getLabel: () => Locale.label("site.elementAdd.form", "Form"), icon: "assignment" },
  calendar: { getLabel: () => Locale.label("site.elementAdd.calendar", "Calendar"), icon: "event" },
  groupList: { getLabel: () => Locale.label("site.elementAdd.groupList", "Group List"), icon: "groups" },
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
