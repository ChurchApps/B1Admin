import React, { useState, useRef, useEffect } from "react";
import { Box } from "@mui/material";
import type { ElementInterface } from "../../helpers";
import { ApiHelper } from "@churchapps/apphelper";

interface Props {
  element: ElementInterface;
  onUpdate: (element: ElementInterface) => void;
}

const SPACING_TOKENS: Record<string, number> = {
  "0": 0,
  "xs": 4,
  "sm": 8,
  "md": 16,
  "lg": 24,
  "xl": 32,
  "xxl": 48,
};

const snapToToken = (px: number): string => {
  let closest = "0";
  let minDiff = Math.abs(px - 0);

  Object.entries(SPACING_TOKENS).forEach(([token, value]) => {
    const diff = Math.abs(px - value);
    if (diff < minDiff) {
      minDiff = diff;
      closest = token;
    }
  });

  return closest;
};

const getTokenValue = (token: string): number => {
  return SPACING_TOKENS[token] || parseInt(token) || 0;
};

export const SpacingHandles: React.FC<Props> = ({ element, onUpdate }) => {
  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null);
  const [draggingHandle, setDraggingHandle] = useState<string | null>(null);
  const [localStyles, setLocalStyles] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use refs for all drag-related state
  const draggingRef = useRef<string | null>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const startValueRef = useRef(0);
  const elementRef = useRef(element);
  const onUpdateRef = useRef(onUpdate);
  const localStylesRef = useRef<any>(null);

  // Keep refs up to date
  useEffect(() => {
    elementRef.current = element;
    onUpdateRef.current = onUpdate;
  }, [element, onUpdate]);

  // Sync localStyles state to ref
  useEffect(() => {
    localStylesRef.current = localStyles;
  }, [localStyles]);

  // Reset local styles when element changes externally (not during drag)
  useEffect(() => {
    if (!draggingRef.current) {
      setLocalStyles(null);
    }
  }, [element.stylesJSON]);

  // Single effect to attach listeners on mount
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;

      const [handleType, side] = draggingRef.current.split("-");
      // For top: drag up = increase (startY - currentY = positive)
      // For bottom: drag down = increase (currentY - startY = positive)
      // For left: drag left = increase (startX - currentX = positive)
      // For right: drag right = increase (currentX - startX = positive)
      let delta: number;
      if (side === "top") {
        delta = startPosRef.current.y - e.clientY;
      } else if (side === "bottom") {
        delta = e.clientY - startPosRef.current.y;
      } else if (side === "left") {
        delta = startPosRef.current.x - e.clientX;
      } else {
        // right
        delta = e.clientX - startPosRef.current.x;
      }

      // Reduce sensitivity - require more drag distance to change values
      const sensitivity = 0.4;
      const newValue = Math.max(0, startValueRef.current + delta * sensitivity);
      const snappedToken = snapToToken(newValue);

      const currentElement = elementRef.current;
      const parsedStyles = currentElement?.stylesJSON ? JSON.parse(currentElement.stylesJSON) : {};

      const updatedStyles = { ...parsedStyles };
      if (!updatedStyles[handleType]) {
        updatedStyles[handleType] = { top: "0", right: "0", bottom: "0", left: "0" };
      }
      updatedStyles[handleType][side] = snappedToken;

      localStylesRef.current = updatedStyles;
      setLocalStyles(updatedStyles);
    };

    const handleMouseUp = () => {
      if (draggingRef.current && localStylesRef.current) {
        const updatedElement = { ...elementRef.current, stylesJSON: JSON.stringify(localStylesRef.current) };
        ApiHelper.post("/elements", [updatedElement], "ContentApi");
        onUpdateRef.current(updatedElement);
        localStylesRef.current = null;
        setLocalStyles(null);
      }
      draggingRef.current = null;
      setDraggingHandle(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []); // Empty deps - only run once on mount

  const handleMouseDown = (e: React.MouseEvent, handleType: string, side: string) => {
    e.preventDefault();
    e.stopPropagation();

    draggingRef.current = `${handleType}-${side}`;
    setDraggingHandle(`${handleType}-${side}`);
    startPosRef.current = { x: e.clientX, y: e.clientY };

    const parsedStyles = element?.stylesJSON ? JSON.parse(element.stylesJSON) : {};
    const margin = parsedStyles.margin || { top: "0", right: "0", bottom: "0", left: "0" };
    const padding = parsedStyles.padding || { top: "0", right: "0", bottom: "0", left: "0" };

    const isMargin = handleType === "margin";
    const currentValue = isMargin ? margin[side] : padding[side];
    startValueRef.current = getTokenValue(currentValue);

    localStylesRef.current = parsedStyles;
    setLocalStyles(parsedStyles);
  };

  // Use local styles during drag, otherwise use element styles
  const displayStyles = localStyles || (element?.stylesJSON ? JSON.parse(element.stylesJSON) : {});
  const margin = displayStyles.margin || { top: "0", right: "0", bottom: "0", left: "0" };
  const padding = displayStyles.padding || { top: "0", right: "0", bottom: "0", left: "0" };

  const getHandleStyle = (type: string, side: string): React.CSSProperties => {
    const isMargin = type === "margin";
    const baseSize = 8;
    const color = isMargin ? "#2196f3" : "#ff9800";
    const isHovered = hoveredHandle === `${type}-${side}`;

    const base: React.CSSProperties = {
      position: "absolute",
      backgroundColor: color,
      cursor: side === "top" || side === "bottom" ? "ns-resize" : "ew-resize",
      zIndex: 1000,
      opacity: isHovered ? 1 : 0.6,
      transition: "opacity 0.2s",
      borderRadius: "2px",
    };

    switch (side) {
      case "top":
        return {
          ...base,
          top: isMargin ? -16 : -8,
          left: "50%",
          transform: "translateX(-50%)",
          width: "40px",
          height: `${baseSize}px`
        };
      case "bottom":
        return {
          ...base,
          bottom: isMargin ? -16 : -8,
          left: "50%",
          transform: "translateX(-50%)",
          width: "40px",
          height: `${baseSize}px`
        };
      case "left":
        return {
          ...base,
          left: isMargin ? -16 : -8,
          top: "50%",
          transform: "translateY(-50%)",
          width: `${baseSize}px`,
          height: "40px"
        };
      case "right":
        return {
          ...base,
          right: isMargin ? -16 : -8,
          top: "50%",
          transform: "translateY(-50%)",
          width: `${baseSize}px`,
          height: "40px"
        };
    }
  };

  const getTooltipStyle = (side: string): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: "absolute",
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      color: "white",
      padding: "4px 8px",
      borderRadius: "4px",
      fontSize: "12px",
      whiteSpace: "nowrap",
      pointerEvents: "none",
      zIndex: 1001,
    };

    switch (side) {
      case "top":
        return { ...base, top: -40, left: "50%", transform: "translateX(-50%)" };
      case "bottom":
        return { ...base, bottom: -40, left: "50%", transform: "translateX(-50%)" };
      case "left":
        return { ...base, left: -80, top: "50%", transform: "translateY(-50%)" };
      case "right":
        return { ...base, right: -80, top: "50%", transform: "translateY(-50%)" };
    }
  };

  const renderHandle = (type: string, side: string) => {
    const isMargin = type === "margin";
    const value = isMargin ? margin[side] : padding[side];
    const handleKey = `${type}-${side}`;
    const isHovered = hoveredHandle === handleKey;
    const isDragging = draggingHandle === handleKey;
    const showTooltip = isHovered || isDragging;
    const pixelValue = SPACING_TOKENS[value] ?? value;

    return (
      <div
        key={handleKey}
        style={getHandleStyle(type, side)}
        onMouseDown={(e) => handleMouseDown(e, type, side)}
        onMouseEnter={() => { if (!draggingHandle) setHoveredHandle(handleKey); }}
        onMouseLeave={() => { if (!draggingHandle) setHoveredHandle(null); }}
      >
        {showTooltip && (
          <div style={getTooltipStyle(side)}>
            {type}: {value} ({pixelValue}px)
          </div>
        )}
      </div>
    );
  };

  return (
    <Box
      ref={containerRef}
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: "none",
        "& > div": {
          pointerEvents: "auto",
        },
      }}
    >
      {/* Margin handles */}
      {renderHandle("margin", "top")}
      {renderHandle("margin", "right")}
      {renderHandle("margin", "bottom")}
      {renderHandle("margin", "left")}

      {/* Padding handles */}
      {renderHandle("padding", "top")}
      {renderHandle("padding", "right")}
      {renderHandle("padding", "bottom")}
      {renderHandle("padding", "left")}
    </Box>
  );
};
