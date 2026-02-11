import { Icon } from "@mui/material";
import React from "react";
import { useDrag } from "react-dnd";

type Props = {
  dndType: string, elementType: string, data: any
};

export function DraggableIcon(props: Props) {
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: props.dndType,
      item: { elementType: props.elementType, data: props.data },
      collect: (monitor) => ({ isDragging: !!monitor.isDragging() })
    }),
    [props.data]
  );

  const opacity = isDragging ? 0.5 : 1;

  return (
    <div ref={drag} style={{ opacity, transition: "opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1)", cursor: isDragging ? "grabbing" : "grab" }} className="dragButton">
      <Icon>open_with</Icon><br />
    </div>
  );

  /*
  return (
    <div>
      <div ref={dragRef} className="dragButton" style={{ opacity }}>
        <Icon>open_with</Icon>
      </div>
    </div>
  );*/
}
