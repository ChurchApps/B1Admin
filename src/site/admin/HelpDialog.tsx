import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Icon } from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import { AppIconButton } from "../../components/ui/AppIconButton";

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
      title: Locale.label("site.helpDialog.addTitle"),
      body: Locale.label("site.helpDialog.addBody")
    },
    {
      icon: "edit",
      title: Locale.label("site.helpDialog.editTitle"),
      body: Locale.label("site.helpDialog.editBody")
    },
    {
      icon: "open_with",
      title: Locale.label("site.helpDialog.moveTitle"),
      body: Locale.label("site.helpDialog.moveBody")
    },
    {
      icon: "history",
      title: Locale.label("site.helpDialog.undoTitle"),
      body: Locale.label("site.helpDialog.undoBody")
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
          {Locale.label("site.helpDialog.title")}
        </Box>
        <AppIconButton label={Locale.label("common.close")} icon={<CloseIcon />} onClick={onClose} />
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
          {Locale.label("site.helpDialog.fullDocs")}
        </Button>
        <Button
          variant="contained"
          color="primary"
          disableElevation
          onClick={onClose}
          sx={{ textTransform: "none" }}
        >
          {Locale.label("common.close")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
