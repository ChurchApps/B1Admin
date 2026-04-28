import React from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import { Delete, ContentCopy, ArrowUpward, ArrowDownward } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import type { ElementInterface } from "../../helpers";
import { SpacingHandles } from "./SpacingHandles";

interface Props {
  element: ElementInterface;
  isSelected: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUpdate: (element: ElementInterface) => void;
  children: React.ReactNode;
}

const actionButtonSx = {
  padding: "3px",
  color: "#4b5563",
  "&:hover": { backgroundColor: "#f3f4f6" }
};

export const ElementSelection: React.FC<Props> = ({
  element,
  isSelected,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onUpdate,
  children
}) => {
  return (
    <Box
      sx={{
        position: "relative",
        outline: isSelected ? "1.5px solid #1976d2" : "none",
        outlineOffset: "1px",
        transition: "outline 0.15s ease"
      }}
    >
      {children}

      {isSelected && (
        <>
          <SpacingHandles element={element} onUpdate={onUpdate} />

          <Box
            sx={{
              position: "absolute",
              top: -28,
              right: 0,
              display: "flex",
              gap: 0,
              backgroundColor: "rgba(255, 255, 255, 0.96)",
              borderRadius: "4px",
              border: "1px solid #e5e7eb",
              padding: "1px",
              zIndex: 1002,
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)"
            }}
          >
            <Tooltip title={Locale.label("common.duplicate")} placement="top">
              <IconButton size="small" onClick={onDuplicate} sx={actionButtonSx}>
                <ContentCopy sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>

            <Tooltip title={Locale.label("site.elementSelection.moveUp", "Move up")} placement="top">
              <IconButton size="small" onClick={onMoveUp} sx={actionButtonSx}>
                <ArrowUpward sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>

            <Tooltip title={Locale.label("site.elementSelection.moveDown", "Move down")} placement="top">
              <IconButton size="small" onClick={onMoveDown} sx={actionButtonSx}>
                <ArrowDownward sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>

            <Tooltip title={Locale.label("common.delete")} placement="top">
              <IconButton
                size="small"
                onClick={onDelete}
                sx={{
                  ...actionButtonSx,
                  color: "#dc2626",
                  "&:hover": { backgroundColor: "#fef2f2", color: "#b91c1c" }
                }}
              >
                <Delete sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </>
      )}
    </Box>
  );
};
