import React from "react";
import { Card, CardActionArea, Box, Typography, alpha } from "@mui/material";
import { ChevronRight, OpenInNew } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

interface Props {
  icon: React.ReactNode;
  title: string;
  description: string;
  linkUrl?: string;
  external?: boolean;
  onClick?: () => void;
}

export const FeatureCard: React.FC<Props> = ({ icon, title, description, linkUrl, external, onClick }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) onClick();
    else if (external && linkUrl) window.open(linkUrl, "_blank", "noopener,noreferrer");
    else if (linkUrl) navigate(linkUrl);
  };

  const ArrowIcon = external ? OpenInNew : ChevronRight;

  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
        "&:hover": (theme) => ({
          transform: "translateY(-2px)",
          boxShadow: theme.palette.mode === "light" ? "0 6px 16px rgba(0,0,0,0.08)" : "0 6px 16px rgba(0,0,0,0.5)",
          borderColor: alpha(theme.palette.primary.main, 0.4)
        })
      }}
    >
      <CardActionArea onClick={handleClick} sx={{ p: 2, height: "100%", display: "flex", alignItems: "stretch" }}>
        <Box
          sx={(theme) => ({
            color: "primary.main",
            mr: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            borderRadius: 2,
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            flexShrink: 0,
            "& .MuiSvgIcon-root": { fontSize: 24 }
          })}
        >
          {icon}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.3, mb: 0.5 }}>{title}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4 }}>{description}</Typography>
        </Box>
        <ArrowIcon fontSize="small" sx={{ color: "text.secondary", ml: 1, flexShrink: 0, alignSelf: "center" }} />
      </CardActionArea>
    </Card>
  );
};
