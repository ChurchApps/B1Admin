import React from "react";
import { Box, Drawer, useMediaQuery, useTheme } from "@mui/material";
import { BezChatPanel } from "./BezChatPanel";

export const BezChatWidget: React.FC = () => {
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
            boxShadow: "0 3px 10px rgba(0,0,0,0.2)",
            overflow: "hidden",
            transition: "transform 0.2s ease",
            "&:hover": { transform: "scale(1.08)" }
          }}
          aria-label="Open Bez chat"
        >
          <Box
            component="img"
            src="/images/bez-icon.png"
            alt="Ask Bez"
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
        <BezChatPanel onClose={() => setOpen(false)} />
      </Drawer>
    </>
  );
};
