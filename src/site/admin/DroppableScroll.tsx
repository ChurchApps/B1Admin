

import { Box } from "@mui/material";
import React, { CSSProperties } from "react";
import { useDrop } from "react-dnd";

type Props = {
  direction: "up" | "down",
  text?: string
  dndDeps?: any
  acceptTypes?: string[]
};

export function DroppableScroll(props: Props) {
  const intervalIdRef = React.useRef<number | null>(null);
  const stepsRef = React.useRef<number>(0);

  const defaultTypes = ["section", "sectionBlock", "element", "elementBlock"];
  const [{ isOver, canDrop, item }, drop] = useDrop(
    () => ({
      accept: props.acceptTypes || defaultTypes,
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
        canDrop: !!monitor.canDrop(),
        item: monitor.getDropResult()
      })
    }), [props?.dndDeps, props.acceptTypes]
  );

  const scrollUp = () => {
    stepsRef.current++;
    const acceleration = Math.min(10 + stepsRef.current * 2, 100);
    const newY = window.scrollY - acceleration;
    if (newY < 0 && intervalIdRef.current) clearInterval(intervalIdRef.current);
    else window.scrollTo({ top: newY, behavior: "auto" });
    if (stepsRef.current > 100) handleMouseOut();
  };

  const scrollDown = () => {
    stepsRef.current++;
    const acceleration = Math.min(10 + stepsRef.current * 2, 100);
    const newY = window.scrollY + acceleration;
    window.scrollTo({ top: newY, behavior: "auto" });
    if (stepsRef.current > 100) handleMouseOut();
  };

  const handleMouseOver = () => {
    handleMouseOut();
    stepsRef.current = 0;
    const id: any = setInterval((props.direction === "up") ? scrollUp : scrollDown, 50);
    intervalIdRef.current = id as number;
  };

  const handleMouseOut = () => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    stepsRef.current = 0;
  };

  const droppableStyle:CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    height: 30,
    width: "100%",
    zIndex: 1,
    backgroundColor: isOver ? "rgba(25, 118, 210, 0.9)" : "rgba(25, 118, 210, 0.75)",
    borderRadius: "4px",
    background: isOver
      ? "linear-gradient(to bottom, rgba(25, 118, 210, 0.9), rgba(21, 101, 192, 0.9))"
      : "linear-gradient(to bottom, rgba(25, 118, 210, 0.75), rgba(21, 101, 192, 0.75))",
    backdropFilter: "blur(8px)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    animation: canDrop && !isOver ? "pulse 1.5s ease-in-out infinite" : "none"
  };


  if (canDrop) {
    return (
      <div style={{ position: "relative" }}>
        <div style={droppableStyle}>
          <div style={{ textAlign: "center", color: "#FFFFFF", width: "100%" }} ref={drop as any}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mt: "4px" }} onDragEnter={handleMouseOver} onDragLeave={handleMouseOut} onDrop={handleMouseOut}>
              <span>{props.text}</span>
            </Box>
          </div>
        </div>
      </div>
    );
  } else return <></>;
}
