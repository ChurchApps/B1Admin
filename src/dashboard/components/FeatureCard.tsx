import React from "react";
import { Card, CardActionArea, Box, Typography } from "@mui/material";
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
      <CardActionArea onClick={handleClick} sx={{ p: 3, height: "100%", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "flex-start" }}>
        <Box sx={{ color: "var(--c1)", mb: 2, display: "flex", alignItems: "center", justifyContent: "center", width: 48, height: 48, borderRadius: 2, backgroundColor: "rgba(var(--c1-rgb, 0,0,0), 0.08)" }}>
          {icon}
        </Box>
        <Typography variant="h6" sx={{ mb: 0.5 }}>{title}</Typography>
        <Typography variant="body2" color="text.secondary">{description}</Typography>
      </CardActionArea>
    </Card>
  );
};
