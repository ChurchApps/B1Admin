import React, { useEffect, useState, useMemo } from "react";
import { Dialog, Icon, InputAdornment, TextField, Tabs, Tab, Box, Fade, Grow, Chip } from "@mui/material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import type { BlockInterface } from "../../../helpers";
import { useDrag } from 'react-dnd';

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

interface CategoryInfo {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}

const getCategoryStyles = (): Record<CategoryType, CategoryInfo> => ({
  layout: { label: Locale.label("site.elementAdd.layout"), color: "#1565C0", bgColor: "rgba(21, 101, 192, 0.08)", borderColor: "rgba(21, 101, 192, 0.3)", icon: "view_quilt" },
  content: { label: Locale.label("site.elementAdd.content"), color: "#2e7d32", bgColor: "rgba(46, 125, 50, 0.08)", borderColor: "rgba(46, 125, 50, 0.3)", icon: "text_fields" },
  media: { label: Locale.label("site.elementAdd.media"), color: "#ed6c02", bgColor: "rgba(237, 108, 2, 0.08)", borderColor: "rgba(237, 108, 2, 0.3)", icon: "perm_media" },
  church: { label: Locale.label("site.elementAdd.church"), color: "#7b1fa2", bgColor: "rgba(123, 31, 162, 0.08)", borderColor: "rgba(123, 31, 162, 0.3)", icon: "church" },
  advanced: { label: Locale.label("site.elementAdd.advanced"), color: "#455a64", bgColor: "rgba(69, 90, 100, 0.08)", borderColor: "rgba(69, 90, 100, 0.3)", icon: "code" },
});

// Draggable element card component
function DraggableElement({ config, draggingCallback, index, showCategoryBadge, categoryStyles }: { config: ElementConfig; draggingCallback: () => void; index: number; showCategoryBadge?: boolean; categoryStyles: Record<CategoryType, CategoryInfo>; }) {
  const dragRef = React.useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: config.dndType,
      item: { elementType: config.type, blockId: config.blockId },
      collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
    }),
    [config],
  );

  useEffect(() => {
    if (isDragging) draggingCallback();
  }, [isDragging, draggingCallback]);

  drag(dragRef);

  const catStyle = categoryStyles[config.category] || categoryStyles.advanced;

  return (
    <Grow in={true} style={{ transformOrigin: '0 0 0' }} timeout={100 + index * 20}>
      <div
        ref={dragRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ background: "#fff", border: `1px solid ${isHovered ? catStyle.borderColor : "#e0e0e0"}`, borderRadius: "10px", padding: "14px", cursor: isDragging ? "grabbing" : "grab", opacity: isDragging ? 0.6 : 1, transform: isHovered && !isDragging ? "translateY(-3px)" : "translateY(0)", boxShadow: isHovered && !isDragging ? "0 8px 24px rgba(0,0,0,0.12)" : "0 1px 4px rgba(0,0,0,0.06)", transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)", display: "flex", flexDirection: "column", gap: "8px", minHeight: "90px", position: "relative" }}
      >
        {showCategoryBadge && (
          <div style={{ position: "absolute", top: "8px", right: "8px" }}>
            <Chip size="small" label={catStyle.label} sx={{ height: "20px", fontSize: "10px", fontWeight: 600, backgroundColor: catStyle.bgColor, color: catStyle.color, border: `1px solid ${catStyle.borderColor}`, "& .MuiChip-label": { px: 1 } }} />
          </div>
        )}

        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: catStyle.bgColor, border: `1px solid ${catStyle.borderColor}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon sx={{ color: catStyle.color, fontSize: "22px" }}>{config.icon}</Icon>
          </div>
          <div style={{ flex: 1, minWidth: 0, paddingRight: showCategoryBadge ? "60px" : "20px" }}>
            <div style={{ color: "#333", fontSize: "14px", fontWeight: 600, marginBottom: "3px" }}>{config.label}</div>
            <div style={{ color: "#666", fontSize: "12px", lineHeight: 1.4 }}>{config.description}</div>
          </div>
        </div>

        <div style={{ position: "absolute", bottom: "8px", right: "8px", opacity: isHovered ? 0.5 : 0.2, transition: "opacity 0.2s" }}>
          <Icon sx={{ color: "#666", fontSize: "16px" }}>drag_indicator</Icon>
        </div>
      </div>
    </Grow>
  );
}


export function ElementAdd(props: Props) {
  const [blocks, setBlocks] = useState<BlockInterface[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState(0);

  const showBlocks = props.includeBlocks && blocks.length > 0;
  const categoryStyles = useMemo(() => getCategoryStyles(), []);

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
      { type: "iframe", dndType: "element", icon: "web", label: Locale.label("site.elementAdd.embedPage"), description: Locale.label("site.elementAdd.descEmbedPage"), category: "advanced" },
    );

    return elements;
  }, [props.includeSection]);

  const blockElements: ElementConfig[] = useMemo(() => {
    return blocks.map(b => ({ type: "block", dndType: b.blockType || "elementBlock", icon: b.blockType === "sectionBlock" ? "view_agenda" : "widgets", label: b.name || Locale.label("site.elementAdd.untitledBlock"), description: b.blockType === "sectionBlock" ? Locale.label("site.elementAdd.descReusableSection") : Locale.label("site.elementAdd.descReusableElement"), category: "layout" as const, blockId: b.id }));
  }, [blocks]);

  const filteredElements = useMemo(() => {
    let elements = [...allElements];

    if (activeTab === 1) elements = elements.filter(e => e.category === "layout");
    else if (activeTab === 2) elements = elements.filter(e => e.category === "content");
    else if (activeTab === 3) elements = elements.filter(e => e.category === "media");
    else if (activeTab === 4) elements = elements.filter(e => e.category === "church");
    else if (activeTab === 5) elements = elements.filter(e => e.category === "advanced");
    else if (activeTab === 6 && showBlocks) return blockElements;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      elements = elements.filter(e => e.label.toLowerCase().includes(query) || e.description.toLowerCase().includes(query) || e.type.toLowerCase().includes(query));
    }

    return elements;
  }, [allElements, blockElements, activeTab, searchQuery, showBlocks]);

  const tabLabels = [
    { label: Locale.label("site.elementAdd.all"), icon: "apps" },
    { label: Locale.label("site.elementAdd.layout"), icon: "view_quilt" },
    { label: Locale.label("site.elementAdd.content"), icon: "text_fields" },
    { label: Locale.label("site.elementAdd.media"), icon: "perm_media" },
    { label: Locale.label("site.elementAdd.church"), icon: "church" },
    { label: Locale.label("site.elementAdd.advanced"), icon: "code" },
  ];

  if (showBlocks) tabLabels.push({ label: Locale.label("site.elementAdd.blocks"), icon: "widgets" });

  return (
    <Dialog open={true} onClose={props.updateCallback} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: "12px", overflow: "hidden", maxHeight: "85vh", display: "flex", flexDirection: "column" } }} TransitionComponent={Fade} transitionDuration={200}>
      <Box sx={{ background: "linear-gradient(135deg, #1565C0 0%, #1976d2 100%)", px: 3, pt: 2.5, pb: 2, position: "relative", overflow: "hidden", flexShrink: 0 }}>
        <Box sx={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.1)", pointerEvents: "none" }} />
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: "8px", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon sx={{ color: "#fff", fontSize: 22 }}>add_box</Icon>
              </Box>
              <Box sx={{ color: "#fff", fontSize: "20px", fontWeight: 600 }}>{Locale.label("site.elementAdd.addElements")}</Box>
            </Box>
            <Box sx={{ color: "rgba(255,255,255,0.8)", fontSize: "13px", pl: "48px" }}>{Locale.label("site.elementAdd.dragAndDrop")}</Box>
          </Box>
          <Box onClick={props.updateCallback} sx={{ width: 32, height: 32, borderRadius: "8px", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s", "&:hover": { background: "rgba(255,255,255,0.25)" } }}>
            <Icon sx={{ color: "#fff", fontSize: 18 }}>close</Icon>
          </Box>
        </Box>
        <TextField placeholder={Locale.label("site.elementAdd.searchElements")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} size="small" fullWidth sx={{ mt: 2, "& .MuiOutlinedInput-root": { background: "#fff", borderRadius: "8px", fontSize: "14px", "& fieldset": { border: "none" }, "&.Mui-focused": { boxShadow: "0 4px 12px rgba(0,0,0,0.15)" } } }} InputProps={{ startAdornment: (<InputAdornment position="start"><Icon sx={{ color: "#999", fontSize: 20 }}>search</Icon></InputAdornment>) }} />
      </Box>

      <Box sx={{ borderBottom: "1px solid #e0e0e0", background: "#fafafa", px: 1, flexShrink: 0 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto" sx={{ minHeight: 48, "& .MuiTab-root": { minHeight: 48, textTransform: "none", fontSize: "13px", fontWeight: 500, color: "#666", minWidth: "auto", px: 2, "&.Mui-selected": { color: "#1565C0", fontWeight: 600 } }, "& .MuiTabs-indicator": { height: 3, borderRadius: "3px 3px 0 0", backgroundColor: "#1565C0" } }}>
          {tabLabels.map((tab, i) => (
            <Tab key={i} label={<Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}><Icon sx={{ fontSize: 18 }}>{tab.icon}</Icon><span>{tab.label}</span></Box>} />
          ))}
        </Tabs>
      </Box>

      <Box sx={{ p: 2.5, overflowY: "auto", background: "#fff", minHeight: 280, flex: 1 }}>
        {filteredElements.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 6, color: "#888" }}>
            <Icon sx={{ fontSize: 48, mb: 2, opacity: 0.4 }}>search_off</Icon>
            <Box sx={{ fontSize: "15px", fontWeight: 500 }}>{Locale.label("site.elementAdd.noElementsFound")}</Box>
            <Box sx={{ fontSize: "13px", mt: 0.5 }}>{Locale.label("site.elementAdd.tryDifferentSearch")}</Box>
          </Box>
        ) : (
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 2 }}>
            {filteredElements.map((config, index) => (
              <DraggableElement key={`${config.type}-${config.blockId || index}`} config={config} draggingCallback={props.draggingCallback} index={index} showCategoryBadge={activeTab === 0} categoryStyles={categoryStyles} />
            ))}
          </Box>
        )}
      </Box>

      <Box sx={{ px: 2.5, py: 1.5, background: "#fafafa", borderTop: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "center", gap: 1, flexShrink: 0 }}>
        <Icon sx={{ fontSize: 16, color: "#999" }}>info_outline</Icon>
        <Box sx={{ fontSize: "12px", color: "#666" }}>{Locale.label("site.elementAdd.dragHint")}</Box>
      </Box>
    </Dialog>
  );
}
