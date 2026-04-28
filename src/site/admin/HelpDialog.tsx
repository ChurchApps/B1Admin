import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Icon, IconButton } from "@mui/material";
import { Locale } from "@churchapps/apphelper";

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
}

interface Tip {
  icon: string;
  title: string;
  body: string;
}

export function HelpDialog(props: HelpDialogProps) {
  const { open, onClose } = props;

  const tips: Tip[] = [
    {
      icon: "add",
      title: Locale.label("site.helpDialog.addTitle", "Add content"),
      body: Locale.label(
        "site.helpDialog.addBody",
        "Click Add Content in the toolbar, then drag a section or element onto the page."
      )
    },
    {
      icon: "edit",
      title: Locale.label("site.helpDialog.editTitle", "Edit anything"),
      body: Locale.label(
        "site.helpDialog.editBody",
        "Double-click any section or element to open its settings. Click once to select and use the floating toolbar."
      )
    },
    {
      icon: "open_with",
      title: Locale.label("site.helpDialog.moveTitle", "Rearrange"),
      body: Locale.label(
        "site.helpDialog.moveBody",
        "Drag sections and elements to reorder them. Use the up/down arrows on the selection toolbar for precise moves."
      )
    },
    {
      icon: "history",
      title: Locale.label("site.helpDialog.undoTitle", "Undo & history"),
      body: Locale.label(
        "site.helpDialog.undoBody",
        "Use Ctrl+Z to undo and Ctrl+Shift+Z to redo. Open the History panel from the menu to jump to any earlier state."
      )
    }
  ];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "1.05rem",
          fontWeight: 600,
          borderBottom: "1px solid #e5e7eb"
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Icon fontSize="small" sx={{ color: "#6b7280" }}>help_outline</Icon>
          {Locale.label("site.helpDialog.title", "Page editor basics")}
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="close">
          <Icon fontSize="small">close</Icon>
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {tips.map((tip, i) => (
            <Box key={i} sx={{ display: "flex", gap: 1.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "8px",
                  background: "#f3f4f6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}
              >
                <Icon sx={{ color: "#374151", fontSize: 20 }}>{tip.icon}</Icon>
              </Box>
              <Box>
                <Box sx={{ fontWeight: 600, color: "#111827", fontSize: "0.9rem", mb: 0.25 }}>
                  {tip.title}
                </Box>
                <Box sx={{ color: "#4b5563", fontSize: "0.825rem", lineHeight: 1.45 }}>
                  {tip.body}
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, borderTop: "1px solid #e5e7eb", justifyContent: "space-between" }}>
        <Button
          variant="text"
          color="primary"
          href="https://support.churchapps.org/docs/b1-admin/website/managing-pages"
          target="_blank"
          rel="noopener noreferrer"
          endIcon={<Icon fontSize="small">open_in_new</Icon>}
          sx={{ textTransform: "none" }}
        >
          {Locale.label("site.helpDialog.fullDocs", "Full documentation")}
        </Button>
        <Button
          variant="contained"
          color="primary"
          disableElevation
          onClick={onClose}
          sx={{ textTransform: "none" }}
        >
          {Locale.label("common.close", "Close")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
