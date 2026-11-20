import type { CSSProperties } from "react";
import React, { useEffect } from "react";
import { useDrop } from "react-dnd";
import { Locale } from "@churchapps/apphelper";

type Props<T> = {
  children?: React.ReactNode;
  accept: string | string[];
  onDrop: (data: T) => void;
  dndDeps?: unknown;
  updateIsDragging?: (isDragging: boolean) => void;
  hideWhenInactive?: boolean;
};

export function DroppableWrapper<T = unknown>(props: Props<T>) {
  const { accept, onDrop, dndDeps, updateIsDragging, hideWhenInactive, children } = props;

  const [isDragging, setIsDragging] = React.useState(false);

  const [{ isOver, canDrop }, drop] = useDrop<T, void, { isOver: boolean; canDrop: boolean }>(
    () => ({
      accept,
      drop: (data) => {
        onDrop(data);
      },
      canDrop: (_item, _monitor) => {
        const canDropResult = true;
        return canDropResult;
      },
      collect: (monitor) => {
        const isOver = !!monitor.isOver({ shallow: true });
        const itemType = monitor.getItemType();
        const acceptTypes = Array.isArray(accept) ? accept : [accept];
        const matchesType = itemType ? acceptTypes.includes(itemType as string) : false;
        return { isOver, canDrop: matchesType };
      }
    }),
    [accept, onDrop, dndDeps]
  );

  // Stable while `drop` is, like passing `drop` directly; the wrapper only drops the connector's return value from the ref type.
  const dropRef = React.useCallback((node: HTMLDivElement | null) => { drop(node); }, [drop]);

  // Update dragging state via effect to avoid state updates during render
  useEffect(() => {
    setIsDragging(canDrop);
  }, [canDrop]);

  useEffect(() => {
    if (updateIsDragging) updateIsDragging(isDragging);
  }, [isDragging, updateIsDragging]);

  // Reserve identical box geometry to prevent reflow when canDrop changes mid-drag (use longhand border properties to avoid React's conflicting-property error).
  const baseStyle: CSSProperties = {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: "transparent",
    borderRadius: "4px"
  };

  // Use opacity not visibility so hit-testing still works when hidden.
  const hidden = hideWhenInactive && !canDrop;

  const dropZoneStyle: CSSProperties = canDrop ? {
    ...baseStyle,
    zIndex: 1,
    backgroundColor: isOver ? "rgba(25, 118, 210, 0.15)" : "rgba(25, 118, 210, 0.08)",
    borderStyle: "dashed",
    borderColor: isOver ? "rgba(25, 118, 210, 0.8)" : "rgba(25, 118, 210, 0.3)",
    transition: "background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
  } : { ...baseStyle, ...(hidden ? { opacity: 0 } : {}) };

  return (
    <div ref={dropRef} style={dropZoneStyle} data-testid="droppable-wrapper" aria-label={Locale.label("components.droppableWrapper.ariaLabel")}>
      {children}
    </div>
  );
}
