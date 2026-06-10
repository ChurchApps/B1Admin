import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import type { SectionInterface } from "../../helpers/Interfaces";

interface ZoneBoxProps {
  sections: SectionInterface[];
  name: string;
  keyName: string;
  deviceType: string;
  showZoneLabel?: boolean;
  children: React.ReactNode;
}

export function ZoneBox(props: ZoneBoxProps) {
  const { keyName, name, deviceType, showZoneLabel, children } = props;
  const theme = useTheme();

  return (
    <Box sx={{ minHeight: "100px", position: "relative" }}>
      {showZoneLabel && (
        <Box
          sx={{
            position: "absolute",
            right: 8,
            top: 6,
            zIndex: 99,
            px: 1,
            py: 0.25,
            borderRadius: "4px",
            backgroundColor: "rgba(243, 244, 246, 0.85)",
            color: "text.secondary",
            fontWeight: 500,
            fontSize: "0.7rem",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)"
          }}
        >
          {name || keyName}
        </Box>
      )}
      <Box sx={{ minHeight: "100px" }}>
        <div className="page" style={deviceType === "mobile" ? { width: 400, marginLeft: "auto", marginRight: "auto" } : {}} data-testid={`preview-${deviceType}`}>
          {children}
        </div>
      </Box>
      <Box sx={{ height: theme.spacing(3.875) }}></Box>
    </Box>
  );
}
