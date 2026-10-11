import React from "react";
import { Box } from "@mui/material";
import { Settings, ArrowUpward, ArrowDownward, ContentCopy, Delete, DragIndicator, ViewQuilt, AutoAwesome } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import { AppIconButton } from "../../components/ui/AppIconButton";

interface Props {
  isFirst: boolean;
  isLast: boolean;
  visible?: boolean;
  dragHandle?: React.ReactNode;
  onSettings: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSwitchLayout?: () => void;
  onAiRewrite?: () => void;
}

const actionButtonSx = {
  padding: "3px",
  "&:hover": { backgroundColor: "action.hover" }
};

export const SectionToolbar: React.FC<Props> = (props) => (
  <Box
    className={"sectionToolbarPill" + (props.visible ? " pillVisible" : "")}
    data-testid="section-toolbar"
    onClick={(e) => e.stopPropagation()}
    onDoubleClick={(e) => e.stopPropagation()}
    sx={{
      position: "absolute",
      top: 8,
      right: 8,
      display: "flex",
      alignItems: "center",
      backgroundColor: "background.paper",
      borderRadius: "var(--b1-radius-control)",
      border: 1,
      borderColor: "divider",
      padding: "1px",
      zIndex: 1001
    }}
  >
    {props.dragHandle || (
      <Box
        sx={{ display: "flex", alignItems: "center", px: 0.5, cursor: "grab", color: "text.secondary" }}
        title={Locale.label("site.sectionToolbar.dragToReorder")}
        data-testid="section-toolbar-drag"
      >
        <DragIndicator sx={{ fontSize: 16 }} />
      </Box>
    )}
    <AppIconButton label={Locale.label("site.sectionToolbar.settings")} icon={<Settings sx={{ fontSize: 14 }} />} onClick={props.onSettings} sx={actionButtonSx} data-testid="section-toolbar-settings" />
    <AppIconButton label={Locale.label("site.sectionToolbar.moveUp")} icon={<ArrowUpward sx={{ fontSize: 14 }} />} onClick={props.onMoveUp} disabled={props.isFirst} sx={actionButtonSx} data-testid="section-toolbar-move-up" />
    <AppIconButton label={Locale.label("site.sectionToolbar.moveDown")} icon={<ArrowDownward sx={{ fontSize: 14 }} />} onClick={props.onMoveDown} disabled={props.isLast} sx={actionButtonSx} data-testid="section-toolbar-move-down" />
    <AppIconButton label={Locale.label("site.sectionToolbar.duplicate")} icon={<ContentCopy sx={{ fontSize: 14 }} />} onClick={props.onDuplicate} sx={actionButtonSx} data-testid="section-toolbar-duplicate" />
    {props.onSwitchLayout && (
      <AppIconButton label={Locale.label("site.sectionToolbar.switchLayout")} icon={<ViewQuilt sx={{ fontSize: 14 }} />} onClick={props.onSwitchLayout} sx={actionButtonSx} data-testid="section-toolbar-switch-layout" />
    )}
    {/* ponytail: AI rewrite temporarily disabled — restore to re-enable */}
    {false && props.onAiRewrite && (
      <AppIconButton label={Locale.label("site.sectionToolbar.aiRewrite")} icon={<AutoAwesome sx={{ fontSize: 14 }} />} onClick={props.onAiRewrite} sx={actionButtonSx} data-testid="section-toolbar-ai-rewrite" />
    )}
    <AppIconButton label={Locale.label("site.sectionToolbar.delete")} icon={<Delete sx={{ fontSize: 14 }} />} intent="remove" onClick={props.onDelete} sx={actionButtonSx} data-testid="section-toolbar-delete" />
  </Box>
);
