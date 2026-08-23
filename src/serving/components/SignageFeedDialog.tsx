import React from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, Typography } from "@mui/material";
import { ContentCopy as CopyIcon, Check as CheckIcon } from "@mui/icons-material";
import { CommonEnvironmentHelper, Locale } from "@churchapps/apphelper";

interface Props {
  planTypeId: string;
  onClose: () => void;
}

export const SignageFeedDialog: React.FC<Props> = ({ planTypeId, onClose }) => {
  const [copied, setCopied] = React.useState(false);
  const feedUrl = CommonEnvironmentHelper.DoingApi + "/planFeed/signage/" + planTypeId;

  const handleCopy = () => {
    navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{Locale.label("plans.signageFeed.title") || "Digital Signage Feed"}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {Locale.label("plans.signageFeed.description") || "This feed always plays the current plan's lesson content. Paste the url below into digital signage software like SignPresenter as an external feed url."}
        </Typography>
        <TextField
          fullWidth
          label={Locale.label("plans.signageFeed.feedUrl") || "Feed Url"}
          value={feedUrl}
          slotProps={{
            input: {
              readOnly: true,
              endAdornment: (
                <IconButton onClick={handleCopy} title={Locale.label("plans.signageFeed.copy") || "Copy"} data-testid="copy-signage-feed-url">
                  {copied ? <CheckIcon color="success" /> : <CopyIcon />}
                </IconButton>
              )
            },
            htmlInput: { "data-testid": "signage-feed-url" }
          }}
        />
        <Typography variant="body2" sx={{ mt: 2 }}>
          <a href="https://support.signpresenter.com/topics/lessons-dot-church.html" target="_blank" rel="noreferrer noopener">
            {Locale.label("plans.signageFeed.instructions") || "Instructions for connecting to SignPresenter"}
          </a>
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose} data-testid="close-signage-feed">{Locale.label("common.done") || "Done"}</Button>
      </DialogActions>
    </Dialog>
  );
};
