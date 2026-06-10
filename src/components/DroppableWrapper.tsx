import type { CSSProperties } from "react";
import React, { useEffect } from "react";
import { useDrop } from "react-dnd";
import { Locale } from "@churchapps/apphelper";

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
      canDrop: (_item, _monitor) => {
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

  // Reserve identical box geometry in both states so that flipping canDrop
  // mid-drag never reflows the page. A reflow shifts the drag source out
  // from under the user's mouse and breaks the drag — see the equivalent
  // fix in @churchapps/apphelper's DroppableArea. We use longhand border
  // properties exclusively because React errors when a shorthand `border`
  // and longhand `borderColor`/`borderStyle` are set on the same element
  // across renders ("Updating a style property during rerender ... when a
  // conflicting property is set").
  const baseStyle: CSSProperties = {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: "transparent",
    borderRadius: "4px"
  };

  // hideWhenInactive: hide the contents when no compatible drag is active,
  // but keep the wrapper laid out so its surrounding row doesn't resize
  // when the drag begins. Use opacity, not visibility, so the wrapper still
  // participates in pointer hit-testing.
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
    <div ref={drop as any} style={dropZoneStyle} data-testid="droppable-wrapper" aria-label={Locale.label("components.droppableWrapper.ariaLabel")}>
      {children}
    </div>
  );
}
