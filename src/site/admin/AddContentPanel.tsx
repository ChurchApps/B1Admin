import { Box, Icon } from "@mui/material";
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
        borderRight: open ? "1px solid #e5e7eb" : "none",
        backgroundColor: "#ffffff",
        display: "flex",
        flexDirection: "column",
        boxShadow: open ? "4px 0 12px rgba(0, 0, 0, 0.04)" : "none"
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
            borderBottom: "1px solid #e5e7eb",
            flexShrink: 0,
            backgroundColor: "#fafafa"
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: "6px",
                background: "#eff6ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Icon sx={{ color: "#1d4ed8", fontSize: 18 }}>add</Icon>
            </Box>
            <Box sx={{ fontSize: "0.9rem", fontWeight: 600, color: "#111827" }}>
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
