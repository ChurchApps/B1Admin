import React from "react";
import { Box } from "@mui/material";
import { Delete, ContentCopy, ArrowUpward, ArrowDownward } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import type { ElementInterface } from "../../helpers";
import { SpacingHandles } from "./SpacingHandles";
import { AppIconButton } from "../../components/ui/AppIconButton";

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
  "&:hover": { backgroundColor: "action.hover" }
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
        outline: isSelected ? "1.5px solid var(--focus)" : "none",
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
              border: "1px solid var(--border-main)",
              padding: "1px",
              zIndex: 1002,
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)"
            }}
          >
            <AppIconButton label={Locale.label("common.duplicate")} icon={<ContentCopy sx={{ fontSize: 14 }} />} onClick={onDuplicate} sx={actionButtonSx} />

            <AppIconButton label={Locale.label("site.elementSelection.moveUp")} icon={<ArrowUpward sx={{ fontSize: 14 }} />} onClick={onMoveUp} sx={actionButtonSx} />

            <AppIconButton label={Locale.label("site.elementSelection.moveDown")} icon={<ArrowDownward sx={{ fontSize: 14 }} />} onClick={onMoveDown} sx={actionButtonSx} />

            <AppIconButton label={Locale.label("common.delete")} icon={<Delete sx={{ fontSize: 14 }} />} intent="remove" onClick={onDelete} sx={actionButtonSx} />
          </Box>
        </>
      )}
    </Box>
  );
};
