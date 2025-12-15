import React from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import { Edit, Delete, ContentCopy, ArrowUpward, ArrowDownward } from "@mui/icons-material";
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

export const ElementSelection: React.FC<Props> = ({
  element,
  isSelected,
  onEdit,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onUpdate,
  children,
}) => {
  return (
    <Box
      sx={{
        position: "relative",
        outline: isSelected ? "2px solid #2196f3" : "none",
        outlineOffset: "2px",
        transition: "outline 0.2s ease",
      }}
    >
      {children}

      {isSelected && (
        <>
          <SpacingHandles element={element} onUpdate={onUpdate} />

          {/* Quick action buttons */}
          <Box
            sx={{
              position: "absolute",
              top: -40,
              right: 0,
              display: "flex",
              gap: 0.5,
              backgroundColor: "white",
              borderRadius: 1,
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              padding: 0.5,
              zIndex: 1002,
            }}
          >
            <Tooltip title="Edit">
              <IconButton size="small" onClick={onEdit} sx={{ padding: "4px" }}>
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Duplicate">
              <IconButton size="small" onClick={onDuplicate} sx={{ padding: "4px" }}>
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Move Up">
              <IconButton size="small" onClick={onMoveUp} sx={{ padding: "4px" }}>
                <ArrowUpward fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Move Down">
              <IconButton size="small" onClick={onMoveDown} sx={{ padding: "4px" }}>
                <ArrowDownward fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Delete">
              <IconButton
                size="small"
                onClick={onDelete}
                sx={{ padding: "4px", color: "error.main" }}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </>
      )}
    </Box>
  );
};
