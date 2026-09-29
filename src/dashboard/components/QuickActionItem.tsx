import React from "react";
import { ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import { useNavigate } from "react-router-dom";

interface Props {
  icon: React.ReactNode;
  title: string;
  linkUrl?: string;
  external?: boolean;
  onClick?: () => void;
}

export const QuickActionItem: React.FC<Props> = ({ icon, title, linkUrl, external, onClick }) => {
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
    <ListItemButton onClick={handleClick} sx={{ borderRadius: "var(--b1-radius-control)", py: 1, px: 1 }}>
      <ListItemIcon sx={{ minWidth: 0, mr: 1.5, color: "text.secondary", display: "flex", alignItems: "center" }}>
        {icon}
      </ListItemIcon>
      <ListItemText primary={title} slotProps={{ primary: { variant: "body2", noWrap: true } }} />
    </ListItemButton>
  );
};
