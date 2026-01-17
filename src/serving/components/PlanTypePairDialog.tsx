import React from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, TextField, Typography } from "@mui/material";
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
      <DialogTitle>{Locale.label("plans.planTypePairDialog.title") || "Pair TV App"}</DialogTitle>
      <DialogContent>
        {success ? (
          <Alert severity="success" sx={{ mt: 1 }}>
            {Locale.label("plans.planTypePairDialog.success") || "Successfully paired! The TV app will now show content from this plan type."}
          </Alert>
        ) : (
          <Box sx={{ pt: 1 }}>
            {/* Download section */}
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              {Locale.label("plans.planTypePairDialog.downloadTitle") || "Download the TV App"}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {Locale.label("plans.planTypePage.tvAppDescription") || "Show your lesson content on any TV or display using our free app"}
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
              <a href="https://play.google.com/store/apps/details?id=church.lessons.screen" target="_blank" rel="noopener noreferrer">
                <Box
                  component="img"
                  src="https://lessons.church/images/apps/google.png"
                  alt="Google Play"
                  sx={{ height: 40 }}
                />
              </a>
              <a href="https://www.amazon.com/Live-Church-Solutions-Lessons-church/dp/B09T38BNQG/" target="_blank" rel="noopener noreferrer">
                <Box
                  component="img"
                  src="https://lessons.church/images/apps/amazon.png"
                  alt="Amazon App Store"
                  sx={{ height: 40 }}
                />
              </a>
            </Stack>

            <Divider sx={{ my: 2 }} />

            {/* Pairing section */}
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              {Locale.label("plans.planTypePairDialog.pairTitle") || "Pair Your Device"}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {Locale.label("plans.planTypePairDialog.instructions") || "Enter the 4-character code displayed on the TV app screen:"}
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
              placeholder={Locale.label("placeholders.pairScreen.code")}
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
