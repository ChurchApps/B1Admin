import React from "react";
import { Breadcrumbs as MuiBreadcrumbs, Link, Typography } from "@mui/material";
import { NavigateNext as NavigateNextIcon, Home as HomeIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useHeaderTone } from "./headerTone";

export interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
}

const linkReset = { display: "flex", alignItems: "center", textDecoration: "none", cursor: "pointer", border: "none", background: "none", padding: 0, font: "inherit", fontSize: "0.875rem" } as const;

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, showHome = true }) => {
  const navigate = useNavigate();
  const light = useHeaderTone() === "light";
  const c = light
    ? { sep: "text.secondary", text: "text.secondary", link: "primary.main", current: "text.primary", hover: "primary.dark" }
    : { sep: "rgba(255,255,255,0.7)", text: "rgba(255,255,255,0.9)", link: "rgba(255,255,255,0.9)", current: "#FFF", hover: "#FFF" };

  const handleClick = (event: React.MouseEvent<HTMLElement>, path?: string) => {
    event.preventDefault();
    if (path) navigate(path);
  };

  return (
    <MuiBreadcrumbs
      separator={<NavigateNextIcon fontSize="small" sx={{ color: c.sep }} />}
      sx={{ color: c.text, fontSize: "0.875rem", "& .MuiBreadcrumbs-separator": { mx: 0.5 } }}
    >
      {showHome && (
        <Link component="button" onClick={(e) => handleClick(e, "/")} aria-label="Home" sx={{ ...linkReset, color: c.link, "&:hover": { color: c.hover, textDecoration: "underline" } }}>
          <HomeIcon sx={{ fontSize: 18, mr: 0.5 }} />
        </Link>
      )}

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        if (isLast || !item.path) {
          return (
            <Typography key={index} aria-current={isLast ? "page" : undefined} sx={{ color: c.current, fontSize: "0.875rem", fontWeight: 500, display: "flex", alignItems: "center" }}>
              {item.icon && <span style={{ display: "flex", marginRight: 4 }}>{item.icon}</span>}
              {item.label}
            </Typography>
          );
        }

        return (
          <Link key={index} component="button" onClick={(e) => handleClick(e, item.path)} sx={{ ...linkReset, color: c.link, "&:hover": { color: c.hover, textDecoration: "underline" } }}>
            {item.icon && <span style={{ display: "flex", marginRight: 4 }}>{item.icon}</span>}
            {item.label}
          </Link>
        );
      })}
    </MuiBreadcrumbs>
  );
};
