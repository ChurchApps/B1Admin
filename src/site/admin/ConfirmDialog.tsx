import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Icon } from "@mui/material";
import { Locale } from "@churchapps/apphelper";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  const {
    open,
    title,
    message,
    confirmLabel,
    cancelLabel,
    destructive,
    onConfirm,
    onCancel
  } = props;

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: "1rem", fontWeight: 600 }}>
        {destructive && (
          <Icon fontSize="small" sx={{ color: "error.main" }}>warning_amber</Icon>
        )}
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ color: "text.secondary", fontSize: "0.9rem" }}>{message}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} sx={{ textTransform: "none" }}>
          {cancelLabel || Locale.label("common.cancel")}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          disableElevation
          color={destructive ? "error" : "primary"}
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          {confirmLabel || Locale.label("common.confirm", "Confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
