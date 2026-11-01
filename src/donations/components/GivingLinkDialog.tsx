import React from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Icon, IconButton, TextField, Typography } from "@mui/material";
import { ContentCopy as CopyIcon, Check as CheckIcon } from "@mui/icons-material";
import { QRCodeCanvas } from "qrcode.react";
import { Locale, UserHelper } from "@churchapps/apphelper";
import { type FundInterface } from "@churchapps/helpers";
import { EnvironmentHelper } from "../../helpers";

interface Props {
  fund: FundInterface;
  onClose: () => void;
}

export const GivingLinkDialog: React.FC<Props> = ({ fund, onClose }) => {
  const [amount, setAmount] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const subDomain = UserHelper.currentUserChurch?.church?.subDomain || "";
  const base = subDomain ? EnvironmentHelper.B1Url.replace("{subdomain}", subDomain) : "";
  const url = `${base}/donate?fundId=${fund.id}${amount ? `&amount=${amount}` : ""}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const slug = (fund.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "fund";
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `giving-qr-${slug}.png`;
    link.click();
  };

  return (
    <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{Locale.label("donations.givingLink.title")}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>{Locale.label("donations.givingLink.description")}</Typography>
        <TextField
          fullWidth
          type="number"
          label={Locale.label("donations.givingLink.amount")}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          sx={{ mb: 2 }}
          slotProps={{ htmlInput: { "data-testid": "giving-link-amount" } }}
        />
        <TextField
          fullWidth
          label={Locale.label("donations.givingLink.url")}
          value={url}
          slotProps={{
            input: {
              readOnly: true,
              endAdornment: (
                <IconButton onClick={handleCopy} title={Locale.label("common.copy")} data-testid="copy-giving-link">
                  {copied ? <CheckIcon color="success" /> : <CopyIcon />}
                </IconButton>
              )
            },
            htmlInput: { "data-testid": "giving-link-url" }
          }}
        />
        <Box sx={{ mt: 2, mx: "auto", p: 1.5, width: "fit-content", backgroundColor: "common.white", border: 1, borderColor: "divider", borderRadius: "var(--b1-radius-control)" }}>
          <QRCodeCanvas ref={canvasRef} value={url} size={1024} marginSize={2} style={{ width: 220, height: 220, display: "block" }} data-testid="giving-link-qr" />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button startIcon={<Icon>download</Icon>} onClick={handleDownload} data-testid="giving-link-download">{Locale.label("donations.givingLink.downloadQr")}</Button>
        <Button variant="contained" onClick={onClose} data-testid="close-giving-link">{Locale.label("common.done")}</Button>
      </DialogActions>
    </Dialog>
  );
};
