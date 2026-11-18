import React from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Icon, IconButton, Link, Stack, Typography } from "@mui/material";
import { ContentCopy as CopyIcon, Check as CheckIcon } from "@mui/icons-material";
import { QRCodeCanvas } from "qrcode.react";
import { Locale } from "@churchapps/apphelper";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  url: string;
  hint: string;
  fileName: string;
  testIdPrefix?: string;
}

export const ShareLinkDialog: React.FC<Props> = (props) => {
  const prefix = props.testIdPrefix || "share-link";
  const [copied, setCopied] = React.useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(props.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${props.fileName}.png`;
    link.click();
  };

  return (
    <Dialog open={props.open} onClose={props.onClose} maxWidth="xs" fullWidth data-testid={`${prefix}-dialog`}>
      <DialogTitle>{props.title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} alignItems="center">
          <Box sx={{ p: 1.5, backgroundColor: "common.white", border: 1, borderColor: "divider", borderRadius: "var(--b1-radius-control)" }}>
            <QRCodeCanvas ref={canvasRef} value={props.url} size={1024} marginSize={2} style={{ width: 220, height: 220, display: "block" }} data-testid={`${prefix}-canvas`} />
          </Box>
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ maxWidth: "100%" }}>
            <Link href={props.url} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ overflowWrap: "anywhere", textAlign: "center" }} data-testid={`${prefix}-url`}>{props.url}</Link>
            <IconButton size="small" onClick={handleCopy} title={Locale.label("common.copy")} aria-label={Locale.label("common.copy")} data-testid={`${prefix}-copy`}>
              {copied ? <CheckIcon fontSize="small" color="success" data-testid={`${prefix}-copied`} /> : <CopyIcon fontSize="small" />}
            </IconButton>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>{props.hint}</Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose} data-testid={`${prefix}-close`}>{Locale.label("common.close")}</Button>
        <Button variant="contained" startIcon={<Icon>download</Icon>} onClick={handleDownload} data-testid={`${prefix}-download`}>
          {Locale.label("forms.formsPage.downloadQr")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
