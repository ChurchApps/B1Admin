import React from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from "@mui/material";
import { ApiHelper, Locale } from "@churchapps/apphelper";

interface Props {
  planTypeId: string;
  onClose: () => void;
}

export const PlanTypePairDialog: React.FC<Props> = ({ planTypeId, onClose }) => {
  const [pairingCode, setPairingCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);

  const handlePair = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await ApiHelper.get(
        `/devices/pair/${pairingCode.toUpperCase()}?contentType=planType&contentId=${planTypeId}`,
        "MessagingApi"
      );

      if (result.success) {
        setSuccess(true);
        setTimeout(() => onClose(), 2000);
      } else {
        setError(result.error || "Pairing failed. Please check the code and try again.");
      }
    } catch (err: any) {
      setError("Pairing failed. Please check the code and try again.");
    }

    setLoading(false);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (value.length <= 4) {
      setPairingCode(value);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Pair LessonsApp</DialogTitle>
      <DialogContent>
        {success ? (
          <Alert severity="success" sx={{ mt: 1 }}>
            Successfully paired! The LessonsApp will now show content from this plan type.
          </Alert>
        ) : (
          <Box sx={{ pt: 1 }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Enter the 4-character code displayed on the LessonsApp screen:
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <TextField
              fullWidth
              label="Pairing Code"
              value={pairingCode}
              onChange={handleCodeChange}
              inputProps={{
                maxLength: 4,
                style: {
                  textTransform: "uppercase",
                  letterSpacing: "0.5em",
                  fontSize: "1.5rem",
                  textAlign: "center",
                  fontFamily: "monospace"
                }
              }}
              placeholder="XXXX"
              autoFocus
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {success ? Locale.label("common.close") : Locale.label("common.cancel")}
        </Button>
        {!success && (
          <Button
            onClick={handlePair}
            variant="contained"
            disabled={loading || pairingCode.length !== 4}
          >
            {loading ? "Pairing..." : "Pair"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
