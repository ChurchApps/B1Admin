import React from "react";
import { ListItemButton, ListItemIcon, ListItemText, alpha } from "@mui/material";
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
    <ListItemButton onClick={handleClick} sx={{ borderRadius: 1, py: 0.5, px: 1 }}>
      <ListItemIcon
        sx={(theme) => ({ minWidth: 0, mr: 1.5, color: "primary.main", display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 1, backgroundColor: alpha(theme.palette.primary.main, 0.08) })}>
        {icon}
      </ListItemIcon>
      <ListItemText primary={title} slotProps={{ primary: { variant: "body2", fontWeight: 500, noWrap: true } }} />
    </ListItemButton>
  );
};
