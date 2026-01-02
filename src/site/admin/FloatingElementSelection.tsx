import React, { useEffect, useState, useRef } from "react";
import { Box, IconButton, Tooltip, Portal } from "@mui/material";
import { Edit, Delete, ContentCopy, ArrowUpward, ArrowDownward } from "@mui/icons-material";
import type { ElementInterface } from "../../helpers";

interface Props {
  element: ElementInterface;
  targetSelector: string; // CSS selector to find the target element in DOM
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export const FloatingElementSelection: React.FC<Props> = ({
  element,
  targetSelector,
  onEdit,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}) => {
  const [position, setPosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const rafRef = useRef<number>();

  useEffect(() => {
    const updatePosition = () => {
      const targetEl = document.querySelector(targetSelector);
      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();

        // Use viewport-relative position (for position: fixed)
        const newPosition = {
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };

        // Only update state if position actually changed to avoid re-render loops
        setPosition(prev => {
          const changed = !prev ||
              prev.top !== newPosition.top ||
              prev.left !== newPosition.left ||
              prev.width !== newPosition.width ||
              prev.height !== newPosition.height;

          if (changed) {
            return newPosition;
          }
          return prev;
        });
      } else {
        setPosition(prev => prev === null ? null : null);
      }

      rafRef.current = requestAnimationFrame(updatePosition);
    };

    updatePosition();

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [targetSelector]);

  if (!position) return null;

  return (
    <Portal>
      {/* Selection outline */}
      <Box
        sx={{
          position: "fixed",
          top: position.top,
          left: position.left,
          width: position.width,
          height: position.height,
          outline: "2px solid #2196f3",
          outlineOffset: "2px",
          pointerEvents: "none",
          zIndex: 1001,
        }}
      />

      {/* Quick action buttons */}
      <Box
        sx={{
          position: "fixed",
          top: position.top - 40,
          left: position.left + position.width - 200,
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
    </Portal>
  );
};
