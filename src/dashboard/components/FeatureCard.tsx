import React from "react";
import { Card, CardActionArea, Box, Typography, alpha } from "@mui/material";
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
    if (onClick) {
      onClick();
    } else if (external && linkUrl) {
      window.open(linkUrl, "_blank", "noopener,noreferrer");
    } else if (linkUrl) {
      navigate(linkUrl);
    }
  };

  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardActionArea onClick={handleClick} sx={{ p: 2, height: "100%", display: "flex", alignItems: "flex-start" }}>
        <Box sx={(theme) => ({ color: "primary.main", mr: 2, display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 1.5, backgroundColor: alpha(theme.palette.primary.main, 0.08), flexShrink: 0 })}>
          {icon}
        </Box>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>{title}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>{description}</Typography>
        </Box>
      </CardActionArea>
    </Card>
  );
};
