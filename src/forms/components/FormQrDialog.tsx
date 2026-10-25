import React from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Icon, Link, Stack, Typography } from "@mui/material";
import { QRCodeCanvas } from "qrcode.react";
import { Locale } from "@churchapps/apphelper";

interface Props {
  open: boolean;
  onClose: () => void;
  formName: string;
  formUrl: string;
}

export const FormQrDialog: React.FC<Props> = (props) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const slug = props.formName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "form";
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `form-qr-${slug}.png`;
    link.click();
  };

  return (
    <Dialog open={props.open} onClose={props.onClose} maxWidth="xs" fullWidth data-testid="form-qr-dialog">
      <DialogTitle>{Locale.label("forms.formsPage.qrCode")}: {props.formName}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} alignItems="center">
          <Box sx={{ p: 1.5, backgroundColor: "common.white", border: 1, borderColor: "divider", borderRadius: "var(--b1-radius-control)" }}>
            <QRCodeCanvas ref={canvasRef} value={props.formUrl} size={1024} marginSize={2} style={{ width: 220, height: 220, display: "block" }} data-testid="form-qr-canvas" />
          </Box>
          <Link href={props.formUrl} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ overflowWrap: "anywhere", textAlign: "center" }}>{props.formUrl}</Link>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>{Locale.label("forms.formsPage.qrHint")}</Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose} data-testid="form-qr-close">{Locale.label("common.close")}</Button>
        <Button variant="contained" startIcon={<Icon>download</Icon>} onClick={handleDownload} data-testid="form-qr-download">
          {Locale.label("forms.formsPage.downloadQr")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
