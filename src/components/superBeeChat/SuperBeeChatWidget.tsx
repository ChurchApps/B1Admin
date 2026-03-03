import React from "react";
import { Box, Drawer, useMediaQuery, useTheme } from "@mui/material";
import { SuperBeeChatPanel } from "./SuperBeeChatPanel";

export const SuperBeeChatWidget: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <>
      {!open && (
        <Box
          onClick={() => setOpen(true)}
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 1200,
            width: 56,
            height: 56,
            borderRadius: "50%",
            cursor: "pointer",
            boxShadow: "0 3px 10px rgba(21,101,192,0.4)",
            overflow: "hidden",
            transition: "transform 0.2s ease",
            "&:hover": { transform: "scale(1.08)" }
          }}
          aria-label="Open SuperBee chat"
        >
          <Box
            component="img"
            src="/images/superbee-icon.png"
            alt="SuperBee"
            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </Box>
      )}
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        variant="persistent"
        sx={{
          "& .MuiDrawer-paper": {
            width: isMobile ? "100%" : 400,
            maxWidth: "100vw"
          }
        }}
      >
        <SuperBeeChatPanel onClose={() => setOpen(false)} />
      </Drawer>
    </>
  );
};
