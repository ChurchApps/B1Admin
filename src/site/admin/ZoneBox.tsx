import { Chip, Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import type { SectionInterface } from "../../helpers/Interfaces";

interface ZoneBoxProps {
  sections: SectionInterface[];
  name: string;
  keyName: string;
  deviceType: string;
  children: React.ReactNode;
}

export function ZoneBox(props: ZoneBoxProps) {
  const { keyName, deviceType, children } = props;
  const theme = useTheme();

  return (
    <Box sx={{ minHeight: "100px", position: "relative" }}>
      <Box
        sx={{
          position: "absolute",
          right: 2,
          top: 1,
          zIndex: 99,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}>
        <Chip
          label={`Zone: ${keyName}`}
          size="small"
          sx={{
            backgroundColor: "rgba(25, 118, 210, 0.9)",
            color: "#ffffff",
            border: "1px solid rgba(25, 118, 210, 1)",
            fontWeight: 600,
            fontSize: "0.75rem",
            letterSpacing: "0.5px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
            "&:hover": { backgroundColor: "rgba(21, 101, 192, 0.95)" },
          }}
        />
      </Box>
      <Box sx={{ minHeight: "100px" }}>
        <div className="page" style={deviceType === "mobile" ? { width: 400, marginLeft: "auto", marginRight: "auto" } : {}}>
          {children}
        </div>
      </Box>
      <Box sx={{ height: theme.spacing(3.875) }}></Box>
    </Box>
  );
}
