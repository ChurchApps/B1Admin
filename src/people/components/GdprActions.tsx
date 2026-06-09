"use client";
import React, { useState } from "react";
import { Accordion, AccordionDetails, AccordionSummary, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { ApiHelper, Locale } from "@churchapps/apphelper";

interface Props {
  personId: string;
  personName: string;
  onAnonymized?: () => void;
}

export const GdprActions: React.FC<Props> = (props) => {
  const [exporting, setExporting] = useState(false);
  const [anonymizeOpen, setAnonymizeOpen] = useState(false);
  const [anonymizing, setAnonymizing] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await ApiHelper.get("/gdpr/people/" + props.personId + "/export", "MembershipApi");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `person-data-${props.personId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleAnonymize = async () => {
    setAnonymizing(true);
    try {
      await ApiHelper.delete("/gdpr/people/" + props.personId + "/anonymize", "MembershipApi");
      setAnonymizeOpen(false);
      setConfirmText("");
      if (props.onAnonymized) props.onAnonymized();
    } catch {
      setAnonymizing(false);
    }
  };

  return (
    <>
      <Accordion defaultExpanded={false} sx={{ mt: 3 }} variant="outlined">
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2" color="text.secondary">{Locale.label("people.gdprActions.dataManagement")}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {Locale.label("people.gdprActions.description")}
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button variant="outlined" size="small" onClick={handleExport} disabled={exporting}>
              {exporting ? Locale.label("people.gdprActions.exporting") : Locale.label("people.gdprActions.exportData")}
            </Button>
            <Button variant="outlined" size="small" onClick={() => setAnonymizeOpen(true)}>
              {Locale.label("people.gdprActions.anonymize")}
            </Button>
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Dialog open={anonymizeOpen} onClose={() => { if (!anonymizing) setAnonymizeOpen(false); }}>
        <DialogTitle>{Locale.label("people.gdprActions.anonymizeTitle").replace("{personName}", props.personName)}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {Locale.label("people.gdprActions.anonymizeDescription")}
          </DialogContentText>
          <DialogContentText sx={{ mb: 2, fontWeight: 600 }}>
            {Locale.label("people.gdprActions.anonymizeConfirmType")}
          </DialogContentText>
          <TextField
            fullWidth
            size="small"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={Locale.label("people.gdprActions.anonymizePlaceholder")}
            disabled={anonymizing}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnonymizeOpen(false)} disabled={anonymizing}>Cancel</Button>
          <Button onClick={handleAnonymize} color="error" disabled={confirmText !== "ANONYMIZE" || anonymizing}>
            {anonymizing ? Locale.label("people.gdprActions.anonymizing") : Locale.label("people.gdprActions.anonymize")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
