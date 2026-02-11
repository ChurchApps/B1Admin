import { Grid, Icon, ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import { SmallButton, Locale } from "@churchapps/apphelper";
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
}

export function EditorToolbar(props: EditorToolbarProps) {
  const {
    onDone,
    container,
    isPageMode,
    showHelp,
    onToggleHelp,
    showAdd,
    onToggleAdd,
    deviceType,
    onDeviceTypeChange,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onShowHistory
  } = props;

  const toggleButtonStyles = {
    "& .MuiToggleButton-root": {
      border: "1px solid rgba(0, 0, 0, 0.23)",
      backgroundColor: "#f5f5f5",
      color: "#666",
      "&:hover": { backgroundColor: "#e0e0e0" },
      "&.Mui-selected": {
        backgroundColor: "#1976d2",
        color: "#FFF",
        border: "1px solid #1976d2",
        "&:hover": { backgroundColor: "#1565c0" }
      }
    }
  };

  return (
    <div style={{ backgroundColor: "#FFF", width: "100%", zIndex: 1200, boxShadow: "0 2px 12px rgba(0, 0, 0, 0.15)", borderBottom: "1px solid rgba(0, 0, 0, 0.12)" }}>
      <Grid container spacing={0} sx={{ margin: 0, padding: 2 }}>
        <Grid size={{ xs: 4 }} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <SmallButton icon={"done"} text={Locale.label("common.done")} onClick={onDone} data-testid="content-editor-done-button" />
          <ToggleButtonGroup size="small" sx={toggleButtonStyles}>
            <ToggleButton value="undo" onClick={onUndo} disabled={!canUndo}>
              <Tooltip title="Undo (Ctrl+Z)" placement="top">
                <Icon>undo</Icon>
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="redo" onClick={onRedo} disabled={!canRedo}>
              <Tooltip title="Redo (Ctrl+Shift+Z)" placement="top">
                <Icon>redo</Icon>
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="history" onClick={onShowHistory}>
              <Tooltip title="View History" placement="top">
                <Icon>history</Icon>
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Grid>
        <Grid size={{ xs: 4 }} sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <b style={{ fontSize: "1rem", fontWeight: 600, color: "#333" }}>
            {isPageMode && Locale.label("site.editorToolbar.page") + ": " + (container as PageInterface)?.title}
            {!isPageMode && Locale.label("site.editorToolbar.block") + ": " + (container as BlockInterface)?.name}
          </b>
        </Grid>
        <Grid size={{ xs: 4 }} sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1 }}>
          <ToggleButtonGroup
            value={showHelp ? "true" : "false"}
            exclusive
            size="small"
            sx={toggleButtonStyles}
          >
            <ToggleButton value="true" onClick={onToggleHelp}>
              <Tooltip title={Locale.label("common.help")} placement="top">
                <Icon>help</Icon>
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>

          <ToggleButtonGroup
            value={showAdd ? "true" : "false"}
            exclusive
            size="small"
            sx={toggleButtonStyles}
          >
            <ToggleButton value="true" onClick={onToggleAdd}>
              <Tooltip title={Locale.label("site.editorToolbar.addContent")} placement="top">
                <Icon>add</Icon>
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>

          <ToggleButtonGroup
            size="small"
            value={deviceType}
            exclusive
            onChange={(e, newDeviceType) => { if (newDeviceType !== null) onDeviceTypeChange(newDeviceType); }}
            sx={toggleButtonStyles}
            data-testid="device-type-toggle"
          >
            <ToggleButton value="desktop" data-testid="device-type-desktop">
              <Tooltip title={Locale.label("site.editorToolbar.switchToDesktop")} placement="top">
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <Icon fontSize="small">computer</Icon>
                  <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{Locale.label("site.editorToolbar.desktop")}</span>
                </div>
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="mobile" data-testid="device-type-mobile">
              <Tooltip title={Locale.label("site.editorToolbar.switchToMobile")} placement="top">
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <Icon fontSize="small">smartphone</Icon>
                  <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{Locale.label("site.editorToolbar.mobile")}</span>
                </div>
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Grid>
      </Grid>
    </div>
  );
}
