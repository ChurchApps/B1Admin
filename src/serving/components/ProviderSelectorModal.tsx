import React from "react";
import { Box, Button, Card, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { Link as LinkIcon } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { Locale } from "@churchapps/apphelper";
import { type ProviderInfo } from "@churchapps/content-providers";

interface Props {
  open: boolean;
  onClose: () => void;
  providers: ProviderInfo[];
  onSelectProvider: (providerId: string) => void;
}

export const ProviderSelectorModal: React.FC<Props> = ({ open, onClose, providers, onSelectProvider }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {Locale.label("plans.contentProviderAuth.selectProvider") || "Link Content Provider"}
      </DialogTitle>
      <DialogContent>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 2,
            py: 2
          }}
        >
          {providers.map((providerInfo) => (
            <Card
              key={providerInfo.id}
              variant="outlined"
              sx={{
                textAlign: "center",
                p: 2,
                cursor: "pointer",
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 4
                }
              }}
              onClick={() => onSelectProvider(providerInfo.id)}
            >
              <Box sx={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", mb: 2 }}>
                <img
                  src={isDark ? providerInfo.logos?.dark : providerInfo.logos?.light}
                  alt={providerInfo.name}
                  style={{ maxHeight: 80, maxWidth: "100%", objectFit: "contain" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </Box>
              <Typography variant="subtitle1" fontWeight={600}>
                {providerInfo.name}
              </Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<LinkIcon />}
                sx={{ mt: 2 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectProvider(providerInfo.id);
                }}
              >
                {Locale.label("plans.contentProviderAuth.link") || "Link"}
              </Button>
            </Card>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          {Locale.label("common.close") || "Close"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
