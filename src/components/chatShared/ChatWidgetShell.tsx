import React from "react";
import { Drawer, useMediaQuery, useTheme } from "@mui/material";

interface Props {
  renderTrigger: (open: () => void) => React.ReactNode;
  renderPanel: (close: () => void) => React.ReactNode;
}

export const ChatWidgetShell: React.FC<Props> = ({ renderTrigger, renderPanel }) => {
  const [open, setOpen] = React.useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <>
      {!open && renderTrigger(() => setOpen(true))}
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
        {renderPanel(() => setOpen(false))}
      </Drawer>
    </>
  );
};
