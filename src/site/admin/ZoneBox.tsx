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
        {deviceType === "mobile" ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <Box
              data-testid="mobile-device-frame"
              sx={{
                width: 424,
                borderRadius: "36px",
                border: "12px solid",
                borderColor: "grey.900",
                boxShadow: "0 16px 48px rgba(0, 0, 0, 0.25)",
                backgroundColor: "common.white",
                overflow: "hidden"
              }}
            >
              <div className="page" style={{ width: 400 }} data-testid="preview-mobile">
                {children}
              </div>
            </Box>
          </Box>
        ) : (
          <div
            className="page"
            style={{ backgroundColor: "#fff", marginTop: 24, marginBottom: 24, boxShadow: "0 1px 2px rgba(0, 0, 0, 0.06), 0 12px 32px rgba(0, 0, 0, 0.08)" }}
            data-testid="preview-desktop"
          >
            {children}
          </div>
        )}
      </Box>
      <Box sx={{ height: theme.spacing(3.875) }}></Box>
    </Box>
  );
}
