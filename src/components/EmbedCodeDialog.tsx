import React from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Link, Stack, TextField, Typography } from "@mui/material";
import { ContentCopy as CopyIcon, Check as CheckIcon } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { ApiHelper, Locale, UserHelper } from "@churchapps/apphelper";
import { EnvironmentHelper } from "../helpers/EnvironmentHelper";
import { buildEmbedCode, EMBED_DOMAINS_FIELD_ID, type EmbedKind } from "../helpers/embedCode";
import { parseEmbedDomains } from "../helpers/embedDomains";

interface Props {
  open: boolean;
  onClose: () => void;
  kind: EmbedKind;
  /** The form or curated calendar; not used for giving. */
  id?: string;
  /** The form or calendar name: the dialog heading and the iframe title. */
  name?: string;
}

export const EmbedCodeDialog: React.FC<Props> = (props) => {
  const [copied, setCopied] = React.useState(false);
  const [hasDomains, setHasDomains] = React.useState<boolean | null>(null);
  const church = UserHelper.currentUserChurch?.church;

  React.useEffect(() => {
    if (!props.open || !church?.id) return;
    // The public endpoint, so staff without settings access (a forms editor) still get the notice.
    ApiHelper.getAnonymous("/settings/public/" + church.id, "ContentApi")
      .then((settings: { embedDomains?: string }) => setHasDomains(parseEmbedDomains(settings?.embedDomains).hosts.length > 0))
      .catch(() => setHasDomains(null));
  }, [props.open, church?.id]);

  const heading = props.kind === "giving" ? Locale.label("site.embed.givingName") : props.name || "";
  const frameTitle = props.kind === "giving" ? Locale.label("site.embed.givingFrameTitle").replace("{church}", church?.name || "") : props.name || "";
  const siteUrl = EnvironmentHelper.B1Url.replace("{subdomain}", church?.subDomain || "");
  const code = buildEmbedCode(siteUrl, props.kind, frameTitle, props.id);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={props.open} onClose={props.onClose} maxWidth="sm" fullWidth data-testid="embed-code-dialog">
      <DialogTitle>{Locale.label("site.embed.dialogTitle").replace("{name}", heading)}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {hasDomains === false && (
            <Alert severity="warning" data-testid="embed-code-no-domains">
              {Locale.label("site.embed.noDomains")}{" "}
              <Link component={RouterLink} to={"/site/pages#" + EMBED_DOMAINS_FIELD_ID} onClick={props.onClose} data-testid="embed-code-domains-link">{Locale.label("site.embed.noDomainsLink")}</Link>
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary">{Locale.label("site.embed.instructions")}</Typography>
          <TextField
            multiline
            fullWidth
            minRows={6}
            maxRows={14}
            value={code}
            slotProps={{ htmlInput: { readOnly: true, spellCheck: false, "aria-label": Locale.label("site.embed.embedCode"), "data-testid": "embed-code-text" } }}
            sx={{ "& .MuiInputBase-input": { fontFamily: "Monaco, Menlo, \"Ubuntu Mono\", monospace", fontSize: "0.8125rem", whiteSpace: "pre", overflowX: "auto" } }}
            onFocus={(e) => e.target.select()}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose} data-testid="embed-code-close">{Locale.label("common.close")}</Button>
        <Button variant="contained" startIcon={copied ? <CheckIcon data-testid="embed-code-copied" /> : <CopyIcon />} onClick={handleCopy} disabled={!code} data-testid="embed-code-copy">
          {copied ? Locale.label("site.embed.copied") : Locale.label("common.copy")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
