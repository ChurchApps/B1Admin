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
    <div
      ref={dragRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => {
        if (isDragging) return;
        onSelect?.({ type: config.type, dndType: config.dndType, blockId: config.blockId });
      }}
      style={{
        background: "#fff",
        border: `1px solid ${isHovered ? "var(--c1)" : "var(--border-main)"}`,
        borderRadius: "8px",
        padding: "10px 12px",
        cursor: isDragging ? "grabbing" : "grab",
        opacity: isDragging ? 0.6 : 1,
        boxShadow: isHovered && !isDragging ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        minHeight: "48px"
      }}
      title={config.description}
      tabIndex={index}
      data-testid={`draggable-element-${config.type}${config.blockId ? "-" + config.blockId : ""}`}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: "6px",
          background: "var(--bg-sub)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0
        }}
      >
        <Icon sx={{ color: "text.primary", fontSize: 18 }}>{config.icon}</Icon>
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ color: "text.primary", fontSize: "0.85rem", fontWeight: 600, lineHeight: 1.2 }}>
          {config.label}
        </Box>
        {isHovered && (
          <Box sx={{ color: "text.secondary", fontSize: "0.72rem", lineHeight: 1.3, mt: 0.25 }}>
            {config.description}
          </Box>
        )}
      </Box>
      <Icon sx={{ color: "divider", fontSize: 14, flexShrink: 0 }}>drag_indicator</Icon>
    </div>
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
    carousel: { icon: "view_carousel", labelKey: "site.elementAdd.carousel", descKey: "site.elementAdd.descCarousel" },
    text: { icon: "text_fields", labelKey: "site.elementAdd.text", descKey: "site.elementAdd.descText" },
    textWithPhoto: { icon: "article", labelKey: "site.elementAdd.textWithPhoto", descKey: "site.elementAdd.descTextWithPhoto" },
    card: { icon: "dashboard", labelKey: "site.elementAdd.card", descKey: "site.elementAdd.descCard" },
    faq: { icon: "help_outline", labelKey: "site.elementAdd.expandable", descKey: "site.elementAdd.descExpandable" },
    table: { icon: "table_chart", labelKey: "site.elementAdd.table", descKey: "site.elementAdd.descTable" },
    image: { icon: "image", labelKey: "site.elementAdd.image", descKey: "site.elementAdd.descImage" },
    video: { icon: "play_circle", labelKey: "site.elementAdd.video", descKey: "site.elementAdd.descVideo" },
    map: { icon: "place", labelKey: "site.elementAdd.location", descKey: "site.elementAdd.descLocation" },
    logo: { icon: "church", labelKey: "site.elementAdd.logo", descKey: "site.elementAdd.descLogo" },
    sermons: { icon: "video_library", labelKey: "common.sermons", descKey: "site.elementAdd.descSermons" },
    stream: { icon: "live_tv", labelKey: "site.elementAdd.stream", descKey: "site.elementAdd.descStream" },
    donation: { icon: "favorite", labelKey: "site.elementAdd.donation", descKey: "site.elementAdd.descDonation" },
    donateLink: { icon: "volunteer_activism", labelKey: "site.elementAdd.donateLink", descKey: "site.elementAdd.descDonateLink" },
    form: { icon: "assignment", labelKey: "site.elementAdd.form", descKey: "site.elementAdd.descForm" },
    calendar: { icon: "event", labelKey: "site.elementAdd.calendar", descKey: "site.elementAdd.descCalendar" },
    groupList: { icon: "groups", labelKey: "site.elementAdd.groupList", descKey: "site.elementAdd.descGroupList" },
    groups: { icon: "manage_search", label: "Groups Browser", description: "Filterable directory of all church groups, with optional search and category filters." },
    rawHTML: { icon: "code", labelKey: "site.elementAdd.html", descKey: "site.elementAdd.descHtml" },
    iframe: { icon: "web", labelKey: "site.elementAdd.embedPage", descKey: "site.elementAdd.descEmbedPage" }
  };

  const hiddenTypes = ["column", "block", "whiteSpace", "buttonLink"];

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
          textTransform: "none",
          fontSize: "0.8rem",
          fontWeight: 500,
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
      <Box sx={{ fontSize: "0.85rem", fontWeight: 500 }}>
        {Locale.label("site.elementAdd.noElementsFound")}
      </Box>
      <Box sx={{ fontSize: "0.75rem", mt: 0.25 }}>
        {Locale.label("site.elementAdd.tryDifferentSearch")}
      </Box>
    </Box>
  );

  if (props.inPanel) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <Box sx={{ px: 1.5, pt: 1.5, pb: 1, flexShrink: 0 }}>{searchField}</Box>
        <Box sx={{ borderBottom: "1px solid var(--border-main)", px: 1, flexShrink: 0 }}>{tabsBar}</Box>
        <Box sx={{ flex: 1, overflowY: "auto", overflowX: "hidden", p: 1.25, background: "var(--bg-sub)" }}>
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
      PaperProps={{ sx: { borderRadius: "10px", maxHeight: "80vh", display: "flex", flexDirection: "column" } }}
      TransitionComponent={Fade}
      transitionDuration={150}
    >
      <DialogTitle sx={{ p: 2.5, pb: 2, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-main)" }}>
        <Box sx={{ fontSize: "1.05rem", fontWeight: 600, color: "text.primary" }}>
          {Locale.label("site.elementAdd.addElements")}
        </Box>
        <AppIconButton label={Locale.label("common.close", "Close")} icon={<CloseIcon />} onClick={props.updateCallback} />
      </DialogTitle>

      <Box sx={{ px: 2.5, pt: 1.5, pb: 1, flexShrink: 0 }}>{searchField}</Box>

      <Box sx={{ borderBottom: "1px solid var(--border-main)", px: 1.5, flexShrink: 0 }}>{tabsBar}</Box>

      <DialogContent sx={{ p: 2, overflowY: "auto", background: "var(--bg-sub)", flex: 1 }}>
        {filteredElements.length === 0 ? (
          emptyState
        ) : (
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 1.25 }}>
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
