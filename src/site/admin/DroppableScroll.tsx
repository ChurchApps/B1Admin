

import { Box } from "@mui/material";
import React, { type CSSProperties } from "react";
import { useDrop } from "react-dnd";

type Props = {
  direction: "up" | "down",
  text?: string
  dndDeps?: any
  acceptTypes?: string[]
  scrollRef?: React.RefObject<HTMLElement | null>
};

export function DroppableScroll(props: Props) {
  const intervalIdRef = React.useRef<number | null>(null);
  const stepsRef = React.useRef<number>(0);

  const defaultTypes = ["section", "sectionBlock", "element", "elementBlock"];
  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: props.acceptTypes || defaultTypes,
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
        canDrop: !!monitor.canDrop(),
        item: monitor.getDropResult()
      })
    }), [props?.dndDeps, props.acceptTypes]
  );

  React.useEffect(() => () => handleMouseOut(), []);

  const getScrollTop = () => props.scrollRef?.current ? props.scrollRef.current.scrollTop : window.scrollY;
  const scrollToY = (top: number) => (props.scrollRef?.current || window).scrollTo({ top, behavior: "auto" });

  const scrollUp = () => {
    stepsRef.current++;
    const acceleration = Math.min(10 + stepsRef.current * 2, 100);
    const newY = getScrollTop() - acceleration;
    if (newY < 0 && intervalIdRef.current) clearInterval(intervalIdRef.current);
    else scrollToY(newY);
    if (stepsRef.current > 100) handleMouseOut();
  };

  const scrollDown = () => {
    stepsRef.current++;
    const acceleration = Math.min(10 + stepsRef.current * 2, 100);
    const newY = getScrollTop() + acceleration;
    scrollToY(newY);
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
    backgroundColor: isOver ? "var(--b1-primary-hover)" : "var(--b1-primary)",
    borderRadius: "var(--b1-radius-control)",
    transition: "background-color 140ms",
    animation: canDrop && !isOver ? "pulse 1.5s ease-in-out infinite" : "none"
  };


  if (canDrop) {
    return (
      <div style={{ position: "relative" }}>
        <div style={droppableStyle}>
          <div style={{ textAlign: "center", color: "var(--b1-on-primary)", width: "100%" }} ref={drop as any}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mt: "4px" }} onDragEnter={handleMouseOver} onDragLeave={handleMouseOut} onDrop={handleMouseOut}>
              <span>{props.text}</span>
            </Box>
          </div>
        </div>
      </div>
    );
  } else return <></>;
}
