import { CSSProperties } from "react";
import React, { useEffect } from "react";
import { useDrop } from "react-dnd";

type Props = {
  children?: React.ReactNode;
  accept: any;
  onDrop: (data: any) => void;
  dndDeps?: any;
  updateIsDragging?: (isDragging: boolean) => void;
  hideWhenInactive?: boolean;
};

export function DroppableWrapper(props: Props) {
  const { accept, onDrop, dndDeps, updateIsDragging, hideWhenInactive, children } = props;

  const [isDragging, setIsDragging] = React.useState(false);

  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept,
      drop: (data) => {
        onDrop(data);
      },
      canDrop: (_item, monitor) => {
        // Always allow drop if types match - let the parent handle validation
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

  // Update dragging state via effect to avoid state updates during render
  useEffect(() => {
    setIsDragging(canDrop);
  }, [canDrop]);

  useEffect(() => {
    if (updateIsDragging) updateIsDragging(isDragging);
  }, [isDragging, updateIsDragging]);

  // If hideWhenInactive is true and nothing is being dragged, don't render anything
  if (hideWhenInactive && !canDrop) {
    return <></>;
  }

  // Always set base styles for proper dimensions
  const baseStyle: CSSProperties = {
    display: "block",
    width: "100%"
  };

  // Add visual feedback when canDrop
  const dropZoneStyle: CSSProperties = canDrop ? {
    ...baseStyle,
    zIndex: 1,
    backgroundColor: isOver ? "rgba(25, 118, 210, 0.15)" : "rgba(25, 118, 210, 0.08)",
    border: isOver ? "2px dashed rgba(25, 118, 210, 0.8)" : "2px dashed rgba(25, 118, 210, 0.3)",
    borderRadius: "4px",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
  } : baseStyle;

  return (
    <div ref={drop as any} style={dropZoneStyle} data-testid="droppable-wrapper" aria-label="Drop zone">
      {children}
    </div>
  );
}
