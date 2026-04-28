import React, { useEffect, useState, useMemo } from "react";
import { Dialog, DialogTitle, DialogContent, Icon, IconButton, InputAdornment, TextField, Tabs, Tab, Box, Fade } from "@mui/material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import type { BlockInterface } from "../../../helpers";
import { useDrag } from "react-dnd";

type Props = {
  includeBlocks: boolean
  includeSection: boolean
  updateCallback: () => void
  draggingCallback: () => void
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

// Draggable element card component
function DraggableElement({ config, draggingCallback, index }: { config: ElementConfig; draggingCallback: () => void; index: number; }) {
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
      style={{
        background: "#fff",
        border: `1px solid ${isHovered ? "#1976d2" : "#e5e7eb"}`,
        borderRadius: "8px",
        padding: "12px",
        cursor: isDragging ? "grabbing" : "grab",
        opacity: isDragging ? 0.6 : 1,
        boxShadow: isHovered && !isDragging ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        minHeight: "56px"
      }}
      title={config.description}
      tabIndex={index}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: "6px",
          background: "#f3f4f6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0
        }}
      >
        <Icon sx={{ color: "#374151", fontSize: 20 }}>{config.icon}</Icon>
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ color: "#111827", fontSize: "0.875rem", fontWeight: 600, lineHeight: 1.2 }}>
          {config.label}
        </Box>
        {isHovered && (
          <Box sx={{ color: "#6b7280", fontSize: "0.75rem", lineHeight: 1.3, mt: 0.25 }}>
            {config.description}
          </Box>
        )}
      </Box>
      <Icon sx={{ color: "#d1d5db", fontSize: 16, flexShrink: 0 }}>drag_indicator</Icon>
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

  // Define all available elements with descriptions
  const allElements: ElementConfig[] = useMemo(() => {
    const elements: ElementConfig[] = [];

    if (props.includeSection) {
      elements.push({ type: "section", dndType: "section", icon: "view_agenda", label: Locale.label("site.elementAdd.section"), description: Locale.label("site.elementAdd.descSection"), category: "layout" });
    }

    elements.push(
      { type: "row", dndType: "element", icon: "view_column", label: Locale.label("site.elementAdd.row"), description: Locale.label("site.elementAdd.descRow"), category: "layout" },
      { type: "box", dndType: "element", icon: "crop_square", label: Locale.label("site.elementAdd.box"), description: Locale.label("site.elementAdd.descBox"), category: "layout" },
      { type: "carousel", dndType: "element", icon: "view_carousel", label: Locale.label("site.elementAdd.carousel"), description: Locale.label("site.elementAdd.descCarousel"), category: "layout" },
      { type: "text", dndType: "element", icon: "text_fields", label: Locale.label("site.elementAdd.text"), description: Locale.label("site.elementAdd.descText"), category: "content" },
      { type: "textWithPhoto", dndType: "element", icon: "article", label: Locale.label("site.elementAdd.textWithPhoto"), description: Locale.label("site.elementAdd.descTextWithPhoto"), category: "content" },
      { type: "card", dndType: "element", icon: "dashboard", label: Locale.label("site.elementAdd.card"), description: Locale.label("site.elementAdd.descCard"), category: "content" },
      { type: "faq", dndType: "element", icon: "help_outline", label: Locale.label("site.elementAdd.expandable"), description: Locale.label("site.elementAdd.descExpandable"), category: "content" },
      { type: "table", dndType: "element", icon: "table_chart", label: Locale.label("site.elementAdd.table"), description: Locale.label("site.elementAdd.descTable"), category: "content" },
      { type: "image", dndType: "element", icon: "image", label: Locale.label("site.elementAdd.image"), description: Locale.label("site.elementAdd.descImage"), category: "media" },
      { type: "video", dndType: "element", icon: "play_circle", label: Locale.label("site.elementAdd.video"), description: Locale.label("site.elementAdd.descVideo"), category: "media" },
      { type: "map", dndType: "element", icon: "place", label: Locale.label("site.elementAdd.location"), description: Locale.label("site.elementAdd.descLocation"), category: "media" },
      { type: "logo", dndType: "element", icon: "church", label: Locale.label("site.elementAdd.logo"), description: Locale.label("site.elementAdd.descLogo"), category: "church" },
      { type: "sermons", dndType: "element", icon: "video_library", label: Locale.label("common.sermons"), description: Locale.label("site.elementAdd.descSermons"), category: "church" },
      { type: "stream", dndType: "element", icon: "live_tv", label: Locale.label("site.elementAdd.stream"), description: Locale.label("site.elementAdd.descStream"), category: "church" },
      { type: "donation", dndType: "element", icon: "favorite", label: Locale.label("site.elementAdd.donation"), description: Locale.label("site.elementAdd.descDonation"), category: "church" },
      { type: "donateLink", dndType: "element", icon: "volunteer_activism", label: Locale.label("site.elementAdd.donateLink"), description: Locale.label("site.elementAdd.descDonateLink"), category: "church" },
      { type: "form", dndType: "element", icon: "assignment", label: Locale.label("site.elementAdd.form"), description: Locale.label("site.elementAdd.descForm"), category: "church" },
      { type: "calendar", dndType: "element", icon: "event", label: Locale.label("site.elementAdd.calendar"), description: Locale.label("site.elementAdd.descCalendar"), category: "church" },
      { type: "groupList", dndType: "element", icon: "groups", label: Locale.label("site.elementAdd.groupList"), description: Locale.label("site.elementAdd.descGroupList"), category: "church" },
      { type: "rawHTML", dndType: "element", icon: "code", label: Locale.label("site.elementAdd.html"), description: Locale.label("site.elementAdd.descHtml"), category: "advanced" },
      { type: "iframe", dndType: "element", icon: "web", label: Locale.label("site.elementAdd.embedPage"), description: Locale.label("site.elementAdd.descEmbedPage"), category: "advanced" }
    );

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
    { key: "common", label: Locale.label("site.elementAdd.common", "Common") },
    { key: "media", label: Locale.label("site.elementAdd.media") },
    { key: "church", label: Locale.label("site.elementAdd.church") },
    { key: "advanced", label: Locale.label("site.elementAdd.advanced") }
  ];
  if (showBlocks) tabs.push({ key: "blocks", label: Locale.label("site.elementAdd.blocks") });

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
      <DialogTitle sx={{ p: 2.5, pb: 2, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e5e7eb" }}>
        <Box sx={{ fontSize: "1.05rem", fontWeight: 600, color: "#111827" }}>
          {Locale.label("site.elementAdd.addElements")}
        </Box>
        <IconButton size="small" onClick={props.updateCallback} aria-label="close">
          <Icon fontSize="small">close</Icon>
        </IconButton>
      </DialogTitle>

      <Box sx={{ px: 2.5, pt: 1.5, pb: 1, flexShrink: 0 }}>
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
                <Icon sx={{ color: "#9ca3af", fontSize: 20 }}>search</Icon>
              </InputAdornment>
            )
          }}
        />
      </Box>

      <Box sx={{ borderBottom: "1px solid #e5e7eb", px: 1.5, flexShrink: 0 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 40,
            "& .MuiTab-root": {
              minHeight: 40,
              textTransform: "none",
              fontSize: "0.8125rem",
              fontWeight: 500,
              color: "#6b7280",
              minWidth: "auto",
              px: 1.75,
              "&.Mui-selected": { color: "#1d4ed8", fontWeight: 600 }
            },
            "& .MuiTabs-indicator": { height: 2, backgroundColor: "#1d4ed8" }
          }}
        >
          {tabs.map((tab) => (
            <Tab key={tab.key} value={tab.key} label={tab.label} />
          ))}
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 2, overflowY: "auto", background: "#f9fafb", flex: 1 }}>
        {filteredElements.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 6, color: "#6b7280" }}>
            <Icon sx={{ fontSize: 40, mb: 1.5, opacity: 0.5 }}>search_off</Icon>
            <Box sx={{ fontSize: "0.9rem", fontWeight: 500 }}>
              {Locale.label("site.elementAdd.noElementsFound")}
            </Box>
            <Box sx={{ fontSize: "0.8rem", mt: 0.5 }}>
              {Locale.label("site.elementAdd.tryDifferentSearch")}
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 1.25 }}>
            {filteredElements.map((config, index) => (
              <DraggableElement
                key={`${config.type}-${config.blockId || index}`}
                config={config}
                draggingCallback={props.draggingCallback}
                index={index}
              />
            ))}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
