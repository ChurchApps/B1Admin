import React, { useEffect, useState, useMemo } from "react";
import { Dialog, DialogTitle, DialogContent, Icon, InputAdornment, TextField, Tabs, Tab, Box, Fade } from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { ElementTypes } from "@churchapps/helpers";
import type { BlockInterface } from "../../../helpers";
import { AppIconButton } from "../../../components/ui/AppIconButton";
import { useDrag } from "react-dnd";

type Props = {
  includeBlocks: boolean
  includeSection: boolean
  updateCallback: () => void
  draggingCallback: () => void
  onSelect?: (config: { type: string; dndType: string; blockId?: string }) => void
  inPanel?: boolean
};

type CategoryType = "layout" | "content" | "media" | "church" | "advanced";

interface ElementConfig {
  type: string;
  dndType: string;
  icon: string;
  label: string;
  description: string;
  category: CategoryType;
  preview?: string;
  blockId?: string;
}

function DraggableElement({ config, draggingCallback, index, onSelect }: { config: ElementConfig; draggingCallback: () => void; index: number; onSelect?: (config: { type: string; dndType: string; blockId?: string }) => void; }) {
  const dragRef = React.useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: config.dndType,
      item: { elementType: config.type, blockId: config.blockId },
      collect: (monitor) => ({ isDragging: !!monitor.isDragging() })
    }),
    [config]
  );

  useEffect(() => {
    if (isDragging) draggingCallback();
  }, [isDragging, draggingCallback]);

  drag(dragRef);

  return (
    <Box
      ref={dragRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => {
        if (isDragging) return;
        onSelect?.({ type: config.type, dndType: config.dndType, blockId: config.blockId });
      }}
      sx={{
        bgcolor: isHovered ? "action.hover" : "background.paper",
        border: 1,
        borderColor: isHovered ? "primary.main" : "divider",
        borderRadius: "var(--b1-radius-control)",
        px: 1.5,
        py: 1.5,
        cursor: isDragging ? "grabbing" : "grab",
        opacity: isDragging ? 0.6 : 1,
        transition: "background-color 140ms, border-color 140ms",
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        minHeight: 48
      }}
      title={config.description}
      tabIndex={index}
      data-testid={`draggable-element-${config.type}${config.blockId ? "-" + config.blockId : ""}`}
    >
      <Icon sx={{ color: "text.secondary", fontSize: 20, flexShrink: 0 }}>{config.icon}</Icon>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ color: "text.primary", fontSize: 14, fontWeight: 600, lineHeight: "21px" }}>
          {config.label}
        </Box>
        {isHovered && (
          <Box sx={{ color: "text.secondary", fontSize: 12, lineHeight: "18px", mt: 0.5 }}>
            {config.description}
          </Box>
        )}
      </Box>
      <Icon sx={{ color: "text.secondary", fontSize: 16, flexShrink: 0 }}>drag_indicator</Icon>
    </Box>
  );
}

type TabKey = "all" | "common" | "media" | "church" | "advanced" | "blocks";

export function ElementAdd(props: Props) {
  const [blocks, setBlocks] = useState<BlockInterface[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  const showBlocks = props.includeBlocks && blocks.length > 0;

  const loadData = () => { ApiHelper.get("/blocks", "ContentApi").then((b: BlockInterface[]) => setBlocks(b)); };

  useEffect(loadData, []);

  const elementUI: Record<string, { icon: string; labelKey?: string; descKey?: string; label?: string; description?: string }> = {
    row: { icon: "view_column", labelKey: "site.elementAdd.row", descKey: "site.elementAdd.descRow" },
    box: { icon: "crop_square", labelKey: "site.elementAdd.box", descKey: "site.elementAdd.descBox" },
    whiteSpace: { icon: "space_bar" },
    carousel: { icon: "view_carousel", labelKey: "site.elementAdd.carousel", descKey: "site.elementAdd.descCarousel" },
    text: { icon: "text_fields", labelKey: "site.elementAdd.text", descKey: "site.elementAdd.descText" },
    buttonLink: { icon: "smart_button" },
    textWithPhoto: { icon: "article", labelKey: "site.elementAdd.textWithPhoto", descKey: "site.elementAdd.descTextWithPhoto" },
    card: { icon: "dashboard", labelKey: "site.elementAdd.card", descKey: "site.elementAdd.descCard" },
    faq: { icon: "help_outline", labelKey: "site.elementAdd.expandable", descKey: "site.elementAdd.descExpandable" },
    iconFeature: { icon: "stars", labelKey: "site.elementAdd.iconFeature", descKey: "site.elementAdd.descIconFeature" },
    gallery: { icon: "collections", labelKey: "site.elementAdd.gallery", descKey: "site.elementAdd.descGallery" },
    testimonial: { icon: "format_quote", labelKey: "site.elementAdd.testimonial", descKey: "site.elementAdd.descTestimonial" },
    socialIcons: { icon: "share", labelKey: "site.elementAdd.socialIcons", descKey: "site.elementAdd.descSocialIcons" },
    countdown: { icon: "timer", labelKey: "site.elementAdd.countdown", descKey: "site.elementAdd.descCountdown" },
    stats: { icon: "insights", labelKey: "site.elementAdd.stats", descKey: "site.elementAdd.descStats" },
    table: { icon: "table_chart", labelKey: "site.elementAdd.table", descKey: "site.elementAdd.descTable" },
    image: { icon: "image", labelKey: "site.elementAdd.image", descKey: "site.elementAdd.descImage" },
    video: { icon: "play_circle", labelKey: "site.elementAdd.video", descKey: "site.elementAdd.descVideo" },
    map: { icon: "place", labelKey: "site.elementAdd.location", descKey: "site.elementAdd.descLocation" },
    logo: { icon: "church", labelKey: "site.elementAdd.logo", descKey: "site.elementAdd.descLogo" },
    sermons: { icon: "video_library", labelKey: "common.sermons", descKey: "site.elementAdd.descSermons" },
    podcast: { icon: "podcasts", labelKey: "site.elementAdd.podcast", descKey: "site.elementAdd.descPodcast" },
    stream: { icon: "live_tv", labelKey: "site.elementAdd.stream", descKey: "site.elementAdd.descStream" },
    donation: { icon: "favorite", labelKey: "site.elementAdd.donation", descKey: "site.elementAdd.descDonation" },
    donateLink: { icon: "volunteer_activism", labelKey: "site.elementAdd.donateLink", descKey: "site.elementAdd.descDonateLink" },
    form: { icon: "assignment", labelKey: "site.elementAdd.form", descKey: "site.elementAdd.descForm" },
    calendar: { icon: "event", labelKey: "site.elementAdd.calendar", descKey: "site.elementAdd.descCalendar" },
    groupList: { icon: "groups", labelKey: "site.elementAdd.groupList", descKey: "site.elementAdd.descGroupList" },
    groups: { icon: "manage_search", label: "Groups Browser", description: "Filterable directory of all church groups, with optional search and category filters." },
    campaignProgress: { icon: "savings", labelKey: "site.elementAdd.campaignProgress", descKey: "site.elementAdd.descCampaignProgress" },
    staffGrid: { icon: "groups_2", labelKey: "site.elementAdd.staffGrid", descKey: "site.elementAdd.descStaffGrid" },
    serviceTimes: { icon: "schedule", labelKey: "site.elementAdd.serviceTimes", descKey: "site.elementAdd.descServiceTimes" },
    rawHTML: { icon: "code", labelKey: "site.elementAdd.html", descKey: "site.elementAdd.descHtml" },
    iframe: { icon: "web", labelKey: "site.elementAdd.embedPage", descKey: "site.elementAdd.descEmbedPage" }
  };

  const hiddenTypes = ["column", "block"];

  const allElements: ElementConfig[] = useMemo(() => {
    const elements: ElementConfig[] = [];

    if (props.includeSection) {
      elements.push({ type: "section", dndType: "section", icon: "view_agenda", label: Locale.label("site.elementAdd.section"), description: Locale.label("site.elementAdd.descSection"), category: "layout" });
    }

    Object.values(ElementTypes).forEach((def) => {
      if (hiddenTypes.includes(def.elementType)) return;
      const ui = elementUI[def.elementType];
      elements.push({
        type: def.elementType,
        dndType: "element",
        icon: ui?.icon || "widgets",
        label: ui?.label || (ui?.labelKey ? Locale.label(ui.labelKey) : def.label),
        description: ui?.description || (ui?.descKey ? Locale.label(ui.descKey) : def.label),
        category: def.category
      });
    });

    return elements;
  }, [props.includeSection]);

  const blockElements: ElementConfig[] = useMemo(() => {
    return blocks.map(b => ({ type: "block", dndType: b.blockType || "elementBlock", icon: b.blockType === "sectionBlock" ? "view_agenda" : "widgets", label: b.name || Locale.label("site.elementAdd.untitledBlock"), description: b.blockType === "sectionBlock" ? Locale.label("site.elementAdd.descReusableSection") : Locale.label("site.elementAdd.descReusableElement"), category: "layout" as const, blockId: b.id }));
  }, [blocks]);

  const filteredElements = useMemo(() => {
    let elements = [...allElements];

    if (activeTab === "common") elements = elements.filter(e => e.category === "layout" || e.category === "content");
    else if (activeTab === "media") elements = elements.filter(e => e.category === "media");
    else if (activeTab === "church") elements = elements.filter(e => e.category === "church");
    else if (activeTab === "advanced") elements = elements.filter(e => e.category === "advanced");
    else if (activeTab === "blocks" && showBlocks) return blockElements;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      elements = elements.filter(e => e.label.toLowerCase().includes(query) || e.description.toLowerCase().includes(query) || e.type.toLowerCase().includes(query));
    }

    return elements;
  }, [allElements, blockElements, activeTab, searchQuery, showBlocks]);

  type TabDef = { key: TabKey; label: string };
  const tabs: TabDef[] = [
    { key: "all", label: Locale.label("site.elementAdd.all") },
    { key: "common", label: Locale.label("site.elementAdd.common") },
    { key: "media", label: Locale.label("site.elementAdd.media") },
    { key: "church", label: Locale.label("site.elementAdd.church") },
    { key: "advanced", label: Locale.label("site.elementAdd.advanced") }
  ];
  if (showBlocks) tabs.push({ key: "blocks", label: Locale.label("site.elementAdd.blocks") });

  const searchField = (
    <TextField
      autoFocus
      placeholder={Locale.label("site.elementAdd.searchElements")}
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      size="small"
      fullWidth
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Icon sx={{ color: "text.secondary", fontSize: 20 }}>search</Icon>
          </InputAdornment>
        )
      }}
    />
  );

  const tabsBar = (
    <Tabs
      value={activeTab}
      onChange={(_, v) => setActiveTab(v)}
      variant="scrollable"
      scrollButtons="auto"
      sx={{
        minHeight: 36,
        "& .MuiTab-root": {
          minHeight: 36,
          fontSize: 14,
          fontWeight: 600,
          color: "text.secondary",
          minWidth: "auto",
          px: 1.5,
          py: 0.5,
          "&.Mui-selected": { color: "primary.main", fontWeight: 600 }
        },
        "& .MuiTabs-indicator": { height: 2, backgroundColor: "primary.main" }
      }}
    >
      {tabs.map((tab) => (
        <Tab key={tab.key} value={tab.key} label={tab.label} />
      ))}
    </Tabs>
  );

  const emptyState = (
    <Box sx={{ textAlign: "center", py: 5, color: "text.secondary" }}>
      <Icon sx={{ fontSize: 36, mb: 1, opacity: 0.5 }}>search_off</Icon>
      <Box sx={{ fontSize: 14, fontWeight: 600 }}>
        {Locale.label("site.elementAdd.noElementsFound")}
      </Box>
      <Box sx={{ fontSize: 12, mt: 0.5 }}>
        {Locale.label("site.elementAdd.tryDifferentSearch")}
      </Box>
    </Box>
  );

  if (props.inPanel) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <Box sx={{ px: 1.5, pt: 1.5, pb: 1, flexShrink: 0 }}>{searchField}</Box>
        <Box sx={{ borderBottom: 1, borderBottomColor: "divider", px: 1, flexShrink: 0 }}>{tabsBar}</Box>
        <Box sx={{ flex: 1, overflowY: "auto", overflowX: "hidden", p: 1.5, bgcolor: "background.default" }}>
          {filteredElements.length === 0 ? (
            emptyState
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {filteredElements.map((config, index) => (
                <DraggableElement
                  key={`${config.type}-${config.blockId || index}`}
                  config={config}
                  draggingCallback={props.draggingCallback}
                  index={index}
                  onSelect={props.onSelect}
                />
              ))}
            </Box>
          )}
        </Box>
      </Box>
    );
  }

  return (
    <Dialog
      open={true}
      onClose={props.updateCallback}
      fullWidth
      maxWidth="md"
      PaperProps={{ sx: { borderRadius: "var(--b1-radius-panel)", maxHeight: "80vh", display: "flex", flexDirection: "column" } }}
      TransitionComponent={Fade}
      transitionDuration={150}
    >
      <DialogTitle sx={{ p: 2.5, pb: 2, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderBottomColor: "divider" }}>
        <Box sx={{ fontSize: 18, fontWeight: 600, color: "text.primary" }}>
          {Locale.label("site.elementAdd.addElements")}
        </Box>
        <AppIconButton label={Locale.label("common.close", "Close")} icon={<CloseIcon />} onClick={props.updateCallback} />
      </DialogTitle>

      <Box sx={{ px: 2.5, pt: 1.5, pb: 1, flexShrink: 0 }}>{searchField}</Box>

      <Box sx={{ borderBottom: 1, borderBottomColor: "divider", px: 1.5, flexShrink: 0 }}>{tabsBar}</Box>

      <DialogContent sx={{ p: 2, overflowY: "auto", bgcolor: "background.default", flex: 1 }}>
        {filteredElements.length === 0 ? (
          emptyState
        ) : (
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 1.5 }}>
            {filteredElements.map((config, index) => (
              <DraggableElement
                key={`${config.type}-${config.blockId || index}`}
                config={config}
                draggingCallback={props.draggingCallback}
                index={index}
                onSelect={props.onSelect}
              />
            ))}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
