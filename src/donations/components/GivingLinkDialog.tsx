import React from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, Typography } from "@mui/material";
import { ContentCopy as CopyIcon, Check as CheckIcon } from "@mui/icons-material";
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

  const subDomain = UserHelper.currentUserChurch?.church?.subDomain || "";
  const base = subDomain ? EnvironmentHelper.B1Url.replace("{subdomain}", subDomain) : "";
  const url = `${base}/donate?fundId=${fund.id}${amount ? `&amount=${amount}` : ""}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose} data-testid="close-giving-link">{Locale.label("common.done")}</Button>
      </DialogActions>
    </Dialog>
  );
};
