import React, { useEffect, useState, useRef } from "react";
import { Box, IconButton, Tooltip, Portal } from "@mui/material";
import { Delete, ContentCopy, ArrowUpward, ArrowDownward } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
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

const actionButtonSx = {
  padding: "3px",
  color: "#4b5563",
  "&:hover": { backgroundColor: "#f3f4f6" }
};

export const FloatingElementSelection: React.FC<Props> = ({
  element,
  targetSelector,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown
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
          height: Math.round(rect.height)
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
      <Box
        sx={{
          position: "fixed",
          top: position.top,
          left: position.left,
          width: position.width,
          height: position.height,
          outline: "1.5px solid #1976d2",
          outlineOffset: "1px",
          pointerEvents: "none",
          zIndex: 1001
        }}
      />

      <Box
        sx={{
          position: "fixed",
          top: position.top - 28,
          left: position.left + position.width - 130,
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

        <Tooltip title={Locale.label("site.elementSelection.moveUp")} placement="top">
          <IconButton size="small" onClick={onMoveUp} sx={actionButtonSx}>
            <ArrowUpward sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>

        <Tooltip title={Locale.label("site.elementSelection.moveDown")} placement="top">
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
    </Portal>
  );
};
