import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress } from "@mui/material";

interface Props {
  onClose: () => void;
  maxWidth?: "sm" | "md";
  title: React.ReactNode;
  isComplete: boolean;
  resultContent: React.ReactNode;
  sending: boolean;
  canSend: boolean;
  onSend: () => void;
  closeLabel: string;
  cancelLabel: string;
  sendLabel: string;
  sendingLabel: string;
  children: React.ReactNode;
}

export const SendDialogShell: React.FC<Props> = (props) => (
  <Dialog open onClose={props.onClose} maxWidth={props.maxWidth || "md"} fullWidth>
    <DialogTitle>{props.title}</DialogTitle>
    <DialogContent>{props.isComplete ? props.resultContent : props.children}</DialogContent>
    <DialogActions>
      {props.isComplete ? (
        <Button onClick={props.onClose}>{props.closeLabel}</Button>
      ) : (
        <>
          <Button onClick={props.onClose} disabled={props.sending}>{props.cancelLabel}</Button>
          <Button
            variant="contained"
            onClick={props.onSend}
            disabled={!props.canSend}
            startIcon={props.sending ? <CircularProgress size={16} /> : null}
          >
            {props.sending ? props.sendingLabel : props.sendLabel}
          </Button>
        </>
      )}
    </DialogActions>
  </Dialog>
);
