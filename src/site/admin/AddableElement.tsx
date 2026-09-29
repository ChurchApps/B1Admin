import { Box, Grid, Icon } from "@mui/material";
import React, { useEffect } from "react";
import { useDrag } from "react-dnd";

type Props = {
  dndType: string;
  elementType: string;
  icon: string;
  label: string;
  blockId?: string;
  draggingCallback?: () => void;
};

export function AddableElement(props: Props) {
  const dragRef = React.useRef(null);

  const [{ isDragging }, drag] = useDrag(
    () => {
      const result = {
        type: props.dndType,
        item: { elementType: props.elementType, blockId: props.blockId },
        collect: (monitor:any) => ({ isDragging: !!monitor.isDragging() })
      };
      return result;
    },
    []
  );

  useEffect(() => {
    if (isDragging && props.draggingCallback) props.draggingCallback();
  }, [isDragging]);

  drag(dragRef);

  const isSection = props.dndType === "section" || props.dndType === "sectionBlock";

  return (
    <Grid size={{ xs: 12 }}>
      <Box
        ref={dragRef}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 1.5,
          py: 1.5,
          minHeight: 44,
          opacity: isDragging ? 0.8 : 1,
          cursor: isDragging ? "grabbing" : "grab",
          bgcolor: "background.paper",
          border: 1,
          borderColor: "divider",
          borderLeft: 3,
          borderLeftColor: isSection ? "primary.main" : "divider",
          borderRadius: "var(--b1-radius-control)",
          color: "text.primary",
          fontSize: 14,
          fontWeight: 600,
          transition: "background-color 140ms",
          "&:hover": { bgcolor: "action.hover" }
        }}
      >
        <Icon sx={{ color: isSection ? "primary.main" : "text.secondary", fontSize: 20 }}>{props.icon}</Icon>
        <span>{props.label}</span>
      </Box>
    </Grid>
  );

}
