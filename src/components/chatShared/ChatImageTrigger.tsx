import React from "react";
import { Box } from "@mui/material";

interface Props {
  onClick: () => void;
  src: string;
  alt: string;
  ariaLabel: string;
  boxShadow: string;
}

export const ChatImageTrigger: React.FC<Props> = ({ onClick, src, alt, ariaLabel, boxShadow }) => (
  <Box
    onClick={onClick}
    sx={{
      position: "fixed",
      bottom: 24,
      right: 24,
      zIndex: 1200,
      width: 56,
      height: 56,
      borderRadius: "50%",
      cursor: "pointer",
      boxShadow,
      overflow: "hidden",
      transition: "transform 0.2s ease",
      "&:hover": { transform: "scale(1.08)" }
    }}
    aria-label={ariaLabel}
  >
    <Box component="img" src={src} alt={alt} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
  </Box>
);
