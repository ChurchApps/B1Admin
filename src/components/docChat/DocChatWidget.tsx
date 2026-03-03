import React from "react";
import { Fab, Drawer, useMediaQuery, useTheme } from "@mui/material";
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswer";
import { DocChatPanel } from "./DocChatPanel";

export const DocChatWidget: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <>
      {!open && (
        <Fab
          color="primary"
          onClick={() => setOpen(true)}
          sx={{ position: "fixed", bottom: 24, right: 24, zIndex: 1200 }}
          aria-label="Open help chat"
        >
          <QuestionAnswerIcon />
        </Fab>
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
        <DocChatPanel onClose={() => setOpen(false)} />
      </Drawer>
    </>
  );
};
