import { Box, Icon } from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import { AppIconButton } from "../../components/ui/AppIconButton";

interface PropertyPanelProps {
  open: boolean;
  title: string;
  subtitle?: string;
  icon?: string;
  onClose: () => void;
  width?: number;
  children: React.ReactNode;
}

export function PropertyPanel({ open, title, subtitle, icon, onClose, width = 400, children }: PropertyPanelProps) {
  return (
    <Box
      sx={{
        width: open ? width : 0,
        flexShrink: 0,
        overflow: "hidden",
        transition: "width 0.18s ease-out",
        borderLeft: open ? "1px solid var(--border-main)" : "none",
        backgroundColor: "#ffffff",
        display: "flex",
        flexDirection: "column",
        boxShadow: open ? "-4px 0 12px rgba(0, 0, 0, 0.04)" : "none"
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
            borderBottom: "1px solid var(--border-main)",
            flexShrink: 0,
            backgroundColor: "var(--bg-sub)"
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
            {icon && (
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: "6px",
                  background: "var(--c1l7)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}
              >
                <Icon sx={{ color: "primary.main", fontSize: 18 }}>{icon}</Icon>
              </Box>
            )}
            <Box sx={{ minWidth: 0 }}>
              <Box
                sx={{
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: "text.primary",
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}
              >
                {title}
              </Box>
              {subtitle && (
                <Box
                  sx={{
                    fontSize: "0.7rem",
                    color: "text.secondary",
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}
                >
                  {subtitle}
                </Box>
              )}
            </Box>
          </Box>
          <AppIconButton label={Locale.label("common.close", "Close")} icon={<CloseIcon />} onClick={onClose} />
        </Box>
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            px: 1.5,
            py: 1,
            "& #input-box": {
              boxShadow: "none",
              marginBottom: 0,
              padding: "8px"
            },
            "& #input-box-header": { display: "none" },
            "& .MuiCard-root": {
              boxShadow: "none",
              marginBottom: 0
            },
            "& .MuiCard-root > .MuiBox-root:first-of-type": { display: "none" }
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
