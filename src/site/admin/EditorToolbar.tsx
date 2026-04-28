import { useEffect, useState } from "react";
import { Box, Button, Divider, Icon, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import { Locale } from "@churchapps/apphelper";
import type { PageInterface, BlockInterface } from "../../helpers/Interfaces";

interface EditorToolbarProps {
  onDone: () => void;
  container: PageInterface | BlockInterface | null;
  isPageMode: boolean;
  showHelp: boolean;
  onToggleHelp: () => void;
  showAdd: boolean;
  onToggleAdd: () => void;
  deviceType: string;
  onDeviceTypeChange: (deviceType: string) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onShowHistory?: () => void;
  lastSavedAt?: number | null;
}

function formatRelative(ts: number): string {
  const diffSec = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (diffSec < 5) return Locale.label("site.editorToolbar.justNow", "just now");
  if (diffSec < 60) return `${diffSec}s ${Locale.label("site.editorToolbar.ago", "ago")}`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ${Locale.label("site.editorToolbar.ago", "ago")}`;
  const diffH = Math.round(diffMin / 60);
  return `${diffH}h ${Locale.label("site.editorToolbar.ago", "ago")}`;
}

export function EditorToolbar(props: EditorToolbarProps) {
  const {
    onDone,
    container,
    isPageMode,
    showAdd,
    onToggleAdd,
    deviceType,
    onDeviceTypeChange,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onShowHistory,
    onToggleHelp,
    lastSavedAt
  } = props;

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [, setTick] = useState(0);

  // Refresh the "saved Xs ago" label every 15s without re-rendering the whole tree
  useEffect(() => {
    if (!lastSavedAt) return;
    const t = setInterval(() => setTick((n) => n + 1), 15000);
    return () => clearInterval(t);
  }, [lastSavedAt]);

  const containerName = isPageMode
    ? (container as PageInterface)?.title
    : (container as BlockInterface)?.name;

  const savedLabel = lastSavedAt
    ? `${Locale.label("site.editorToolbar.savedAllChanges", "All changes saved")} · ${formatRelative(lastSavedAt)}`
    : Locale.label("site.editorToolbar.notSavedYet", "No changes yet");

  return (
    <Box
      sx={{
        backgroundColor: "#FFF",
        width: "100%",
        zIndex: 1200,
        borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
        display: "flex",
        alignItems: "center",
        gap: 2,
        px: 2,
        py: 1,
        minHeight: 56
      }}
    >
      {/* LEFT: Exit + page title */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, flex: "0 0 auto" }}>
        <Button
          variant="text"
          color="inherit"
          onClick={onDone}
          startIcon={<Icon>arrow_back</Icon>}
          data-testid="content-editor-done-button"
          sx={{ textTransform: "none", color: "#374151", fontWeight: 500 }}
        >
          {Locale.label("site.editorToolbar.exit", "Exit")}
        </Button>
        <Divider orientation="vertical" flexItem sx={{ my: 1 }} />
        <Box sx={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Box
            component="span"
            sx={{
              fontSize: "0.65rem",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#9ca3af",
              lineHeight: 1
            }}
          >
            {isPageMode
              ? Locale.label("site.editorToolbar.page")
              : Locale.label("site.editorToolbar.block")}
          </Box>
          <Box
            component="span"
            sx={{
              fontSize: "0.95rem",
              fontWeight: 500,
              color: "#374151",
              lineHeight: 1.3,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 320
            }}
          >
            {containerName || ""}
          </Box>
        </Box>
      </Box>

      {/* CENTER: undo/redo + saved indicator */}
      <Box
        sx={{
          flex: "1 1 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1.5,
          minWidth: 0
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Tooltip title={Locale.label("site.editorToolbar.undoTip", "Undo (Ctrl+Z)")} placement="bottom">
            <span>
              <IconButton size="small" onClick={onUndo} disabled={!canUndo} sx={{ color: "#4b5563" }}>
                <Icon fontSize="small">undo</Icon>
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={Locale.label("site.editorToolbar.redoTip", "Redo (Ctrl+Shift+Z)")} placement="bottom">
            <span>
              <IconButton size="small" onClick={onRedo} disabled={!canRedo} sx={{ color: "#4b5563" }}>
                <Icon fontSize="small">redo</Icon>
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        <Box
          sx={{
            display: { xs: "none", md: "flex" },
            alignItems: "center",
            gap: 0.5,
            color: lastSavedAt ? "#16a34a" : "#9ca3af",
            fontSize: "0.8rem",
            fontWeight: 500,
            whiteSpace: "nowrap"
          }}
        >
          <Icon fontSize="inherit" sx={{ fontSize: "0.95rem" }}>
            {lastSavedAt ? "cloud_done" : "cloud_outlined"}
          </Icon>
          <span>{savedLabel}</span>
        </Box>
      </Box>

      {/* RIGHT: Device toggle + Add + overflow */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: "0 0 auto" }}>
        <ToggleButtonGroup
          size="small"
          value={deviceType}
          exclusive
          onChange={(_e, newDeviceType) => {
            if (newDeviceType !== null) onDeviceTypeChange(newDeviceType);
          }}
          data-testid="device-type-toggle"
          sx={{
            "& .MuiToggleButton-root": {
              border: "1px solid #e5e7eb",
              color: "#6b7280",
              px: 1,
              "&.Mui-selected": {
                backgroundColor: "#eff6ff",
                color: "#1d4ed8",
                "&:hover": { backgroundColor: "#dbeafe" }
              }
            }
          }}
        >
          <ToggleButton value="desktop" data-testid="device-type-desktop">
            <Tooltip title={Locale.label("site.editorToolbar.switchToDesktop")} placement="bottom">
              <Icon fontSize="small">computer</Icon>
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="mobile" data-testid="device-type-mobile">
            <Tooltip title={Locale.label("site.editorToolbar.switchToMobile")} placement="bottom">
              <Icon fontSize="small">smartphone</Icon>
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>

        <Button
          variant="contained"
          color="primary"
          onClick={onToggleAdd}
          startIcon={<Icon>add</Icon>}
          disableElevation
          sx={{
            textTransform: "none",
            fontWeight: 600,
            backgroundColor: showAdd ? "#1565c0" : "#1976d2",
            "&:hover": { backgroundColor: "#1565c0" }
          }}
          data-testid="content-editor-add-button"
        >
          {Locale.label("site.editorToolbar.addContent")}
        </Button>

        <Tooltip title={Locale.label("common.more", "More")} placement="bottom">
          <IconButton
            size="small"
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            sx={{ color: "#4b5563" }}
            data-testid="content-editor-overflow-button"
          >
            <Icon fontSize="small">more_vert</Icon>
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              onShowHistory?.();
            }}
          >
            <ListItemIcon>
              <Icon fontSize="small">history</Icon>
            </ListItemIcon>
            <ListItemText>
              {Locale.label("site.editorToolbar.viewHistory", "View history")}
            </ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              onToggleHelp();
            }}
          >
            <ListItemIcon>
              <Icon fontSize="small">help_outline</Icon>
            </ListItemIcon>
            <ListItemText>{Locale.label("common.help")}</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
}
