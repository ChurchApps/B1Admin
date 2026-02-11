import { Grid, Icon } from "@mui/material";
import React, { useEffect, useState } from "react";
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
  const [isHovered, setIsHovered] = useState(false);

  const [{ isDragging }, drag, preview] = useDrag(
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

  const opacity = isDragging ? 0.8 : 1;
  const cursor = isDragging ? "grabbing" : "grab";
  const boxShadow = isHovered && !isDragging
    ? "0 4px 12px rgba(0,0,0,0.15)"
    : "0 2px 4px rgba(0,0,0,0.1)";
  const transform = isHovered && !isDragging ? "scale(1.02)" : "scale(1)";

  const baseStyle: any = {
    paddingLeft: 10,
    borderRadius: 8,
    paddingTop: 10,
    paddingBottom: 10,
    opacity,
    cursor,
    color: "#FFF",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow,
    transform
  };

  const style = (props.dndType === "section" || props.dndType === "sectionBlock")
    ? {
      ...baseStyle,
      border: "1px solid rgba(25, 118, 210, 1)",
      background: "linear-gradient(135deg, rgba(25, 118, 210, 1) 0%, rgba(21, 101, 192, 1) 100%)"
    }
    : {
      ...baseStyle,
      border: "1px solid rgba(46, 125, 50, 1)",
      background: "linear-gradient(135deg, rgba(46, 125, 50, 1) 0%, rgba(56, 142, 60, 1) 100%)"
    };

  return (
    <Grid size={{ xs: 12 }}>
      <div
        ref={dragRef}
        style={style}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Icon>{props.icon}</Icon>
          <span>{props.label}</span>
        </div>
      </div>
    </Grid>
  );

}
