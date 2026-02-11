import React from "react";
import { Breadcrumbs as MuiBreadcrumbs, Link, Typography } from "@mui/material";
import { NavigateNext as NavigateNextIcon, Home as HomeIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

export interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, showHome = true }) => {
  const navigate = useNavigate();

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>, path?: string) => {
    event.preventDefault();
    if (path) navigate(path);
  };

  return (
    <MuiBreadcrumbs
      separator={<NavigateNextIcon fontSize="small" sx={{ color: "rgba(255,255,255,0.7)" }} />}
      sx={{
        color: "rgba(255,255,255,0.9)",
        fontSize: "0.875rem",
        "& .MuiBreadcrumbs-separator": { mx: 0.5 }
      }}
    >
      {showHome && (
        <Link
          component="button"
          onClick={(e) => handleClick(e, "/")}
          sx={{
            display: "flex",
            alignItems: "center",
            color: "rgba(255,255,255,0.9)",
            textDecoration: "none",
            cursor: "pointer",
            "&:hover": { color: "#FFF", textDecoration: "underline" },
            border: "none",
            background: "none",
            padding: 0,
            font: "inherit"
          }}
        >
          <HomeIcon sx={{ fontSize: 18, mr: 0.5 }} />
        </Link>
      )}

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        if (isLast || !item.path) {
          return (
            <Typography
              key={index}
              sx={{
                color: "#FFF",
                fontSize: "0.875rem",
                fontWeight: 500,
                display: "flex",
                alignItems: "center"
              }}
            >
              {item.icon && <span style={{ display: "flex", marginRight: 4 }}>{item.icon}</span>}
              {item.label}
            </Typography>
          );
        }

        return (
          <Link
            key={index}
            component="button"
            onClick={(e) => handleClick(e, item.path)}
            sx={{
              display: "flex",
              alignItems: "center",
              color: "rgba(255,255,255,0.9)",
              textDecoration: "none",
              cursor: "pointer",
              "&:hover": { color: "#FFF", textDecoration: "underline" },
              border: "none",
              background: "none",
              padding: 0,
              font: "inherit",
              fontSize: "0.875rem"
            }}
          >
            {item.icon && <span style={{ display: "flex", marginRight: 4 }}>{item.icon}</span>}
            {item.label}
          </Link>
        );
      })}
    </MuiBreadcrumbs>
  );
};
