import { Box, Icon } from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import { AppIconButton } from "../../components/ui/AppIconButton";

interface PropertyPanelProps {
  open: boolean;
  title: string;
  subtitle?: string;
  breadcrumb?: React.ReactNode;
  icon?: string;
  onClose: () => void;
  width?: number;
  children: React.ReactNode;
}

export function PropertyPanel({ open, title, subtitle, breadcrumb, icon, onClose, width = 400, children }: PropertyPanelProps) {
  return (
    <Box
      sx={{
        width: open ? width : 0,
        flexShrink: 0,
        overflow: "hidden",
        transition: "width 0.18s ease-out",
        borderLeft: open ? 1 : 0,
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
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
            {icon && <Icon sx={{ color: "text.secondary", fontSize: 20, flexShrink: 0 }}>{icon}</Icon>}
            <Box sx={{ minWidth: 0 }}>
              <Box
                sx={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "text.primary",
                  lineHeight: 1.3,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}
              >
                {title}
              </Box>
              {breadcrumb || (subtitle && (
                <Box
                  sx={{
                    fontSize: 12,
                    color: "text.secondary",
                    lineHeight: 1.4,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}
                >
                  {subtitle}
                </Box>
              ))}
            </Box>
          </Box>
          <AppIconButton label={Locale.label("common.close", "Close")} icon={<CloseIcon />} onClick={onClose} data-testid="property-panel-close" />
        </Box>
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            px: 1.5,
            pt: 1,
            pb: 0,
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
