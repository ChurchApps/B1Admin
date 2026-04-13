"use client";
import React, { useState } from "react";
import { Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { ApiHelper } from "@churchapps/apphelper";

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
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>Data Management</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Export or anonymize this person&apos;s data for GDPR compliance.
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button variant="outlined" size="small" onClick={handleExport} disabled={exporting}>
              {exporting ? "Exporting..." : "Export Data"}
            </Button>
            <Button variant="outlined" size="small" color="error" onClick={() => setAnonymizeOpen(true)}>
              Anonymize
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Dialog open={anonymizeOpen} onClose={() => { if (!anonymizing) setAnonymizeOpen(false); }}>
        <DialogTitle>Anonymize {props.personName}?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            This will replace all personal information with generic values and remove the person
            from groups, forms, and messaging. Donation amounts and attendance dates will be
            preserved for reporting but unlinked from this person. This cannot be undone.
          </DialogContentText>
          <DialogContentText sx={{ mb: 2, fontWeight: 600 }}>
            Type &quot;ANONYMIZE&quot; to confirm:
          </DialogContentText>
          <TextField
            fullWidth
            size="small"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="ANONYMIZE"
            disabled={anonymizing}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnonymizeOpen(false)} disabled={anonymizing}>Cancel</Button>
          <Button onClick={handleAnonymize} color="error" disabled={confirmText !== "ANONYMIZE" || anonymizing}>
            {anonymizing ? "Anonymizing..." : "Anonymize"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
