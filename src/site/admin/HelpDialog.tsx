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
    },
    {
      icon: "keyboard",
      title: Locale.label("site.helpDialog.shortcutsTitle"),
      body: Locale.label("site.helpDialog.shortcutsBody")
    }
  ];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 18,
          fontWeight: 600,
          borderBottom: 1,
          borderColor: "divider"
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Icon fontSize="small" sx={{ color: "text.secondary" }}>help_outline</Icon>
          {Locale.label("site.helpDialog.title")}
        </Box>
        <AppIconButton label={Locale.label("common.close")} icon={<CloseIcon />} onClick={onClose} />
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 3 }}>
          {tips.map((tip, i) => (
            <Box key={i} sx={{ display: "flex", gap: 1.5 }}>
              <Icon sx={{ color: "text.secondary", fontSize: 20, mt: 0.25, flexShrink: 0 }}>{tip.icon}</Icon>
              <Box>
                <Box sx={{ fontWeight: 600, color: "text.primary", fontSize: 14, mb: 0.5 }}>
                  {tip.title}
                </Box>
                <Box sx={{ color: "text.secondary", fontSize: 14, lineHeight: "21px" }}>
                  {tip.body}
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, borderTop: 1, borderColor: "divider", justifyContent: "space-between" }}>
        <Button
          variant="text"
          color="primary"
          href="https://support.churchapps.org/docs/b1-admin/website/managing-pages"
          target="_blank"
          rel="noopener noreferrer"
          endIcon={<Icon fontSize="small">open_in_new</Icon>}
        >
          {Locale.label("site.helpDialog.fullDocs")}
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={onClose}
        >
          {Locale.label("common.close")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
