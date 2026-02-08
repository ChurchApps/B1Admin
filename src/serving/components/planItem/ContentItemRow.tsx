import React from "react";
import { Box } from "@mui/material";
import { Schedule as ScheduleIcon } from "@mui/icons-material";
import { MarkdownPreviewLight } from "@churchapps/apphelper-markdown";
import { formatTime } from "../PlanUtils";
import { PlanItemIcon } from "./PlanItemIcon";

export interface ContentItemData {
  id?: string;
  label?: string;
  description?: string;
  seconds?: number;
  thumbnailUrl?: string;
  itemType?: string;
}

interface Props {
  item: ContentItemData;
  onClick?: () => void;
}

/**
 * A simple content item row displaying thumbnail/icon, label, description, and duration.
 * Used in both plan item rows and modal section previews.
 */
export const ContentItemRow: React.FC<Props> = ({ item, onClick }) => {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        cursor: onClick ? "pointer" : "default",
        py: 1,
        px: 1,
        "&:hover": onClick ? { bgcolor: "action.hover" } : undefined,
        borderRadius: 1
      }}
      onClick={onClick}
    >
      <Box sx={{ width: 80, height: 45, mr: 1.5, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {item.thumbnailUrl ? (
          <Box
            component="img"
            src={item.thumbnailUrl}
            alt=""
            sx={{ width: 80, height: 45, objectFit: "cover", borderRadius: 1 }}
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              e.currentTarget.style.display = "none";
              if (e.currentTarget.nextElementSibling) {
                (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex";
              }
            }}
          />
        ) : null}
        <Box
          component="span"
          sx={{
            display: item.thumbnailUrl ? "none" : "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 80,
            height: 45,
            backgroundColor: "grey.200",
            borderRadius: 1
          }}
        >
          <PlanItemIcon itemType={item.itemType || "action"} />
        </Box>
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ fontWeight: 500 }}>{item.label}</Box>
        {item.description && (
          <Box
            sx={{
              fontSize: "0.85rem",
              color: "text.secondary",
              mt: 0.25,
              "& p": { margin: 0 }
            }}
          >
            <MarkdownPreviewLight value={item.description} />
          </Box>
        )}
      </Box>
      <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0, ml: 1.5 }}>
        <ScheduleIcon sx={{ fontSize: 16, color: "text.secondary" }} />
        <Box
          component="span"
          sx={{
            color: "text.secondary",
            fontSize: "0.85rem",
            minWidth: 40,
            textAlign: "right"
          }}
        >
          {formatTime(item.seconds || 0)}
        </Box>
      </Box>
    </Box>
  );
};
