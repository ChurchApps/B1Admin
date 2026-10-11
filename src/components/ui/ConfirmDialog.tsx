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
  "data-testid"?: string;
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
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="xs" data-testid={props["data-testid"]}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: "1.125rem", lineHeight: "25px", fontWeight: 650 }}>
        {destructive && (
          <Icon fontSize="small" sx={{ color: "error.main" }}>warning_amber</Icon>
        )}
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ color: "text.primary" }}>{message}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" onClick={onCancel}>
          {cancelLabel || Locale.label("common.cancel")}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={destructive ? "error" : "primary"}
        >
          {confirmLabel || Locale.label("common.confirm", "Confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
