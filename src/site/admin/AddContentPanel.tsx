import { Box } from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import { AppIconButton } from "../../components/ui/AppIconButton";

interface AddContentPanelProps {
  open: boolean;
  onClose: () => void;
  width?: number;
  children: React.ReactNode;
}

export function AddContentPanel({ open, onClose, width = 300, children }: AddContentPanelProps) {
  return (
    <Box
      sx={{
        width: open ? width : 0,
        flexShrink: 0,
        overflow: "hidden",
        transition: "width 0.18s ease-out",
        borderRight: open ? 1 : 0,
        borderColor: "divider",
        backgroundColor: "background.paper",
        display: "flex",
        flexDirection: "column"
      }}
    >
      <Box
        sx={{
          width,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            py: 1.25,
            borderBottom: 1,
            borderColor: "divider",
            flexShrink: 0
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ fontSize: 16, fontWeight: 600, color: "text.primary" }}>
              {Locale.label("site.elementAdd.addElements")}
            </Box>
          </Box>
          <AppIconButton label={Locale.label("common.close", "Close")} icon={<CloseIcon />} onClick={onClose} />
        </Box>
        <Box sx={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
