import React, { useEffect } from "react";
import { useDrag } from "react-dnd";
import { Locale } from "@churchapps/apphelper";

type Props = {
  children?: React.ReactNode;
  dndType: string;
  data: any;
  onDoubleClick?: () => void;
  draggingCallback?: (isDragging: boolean) => void;
  /** When set, only the first descendant with this class starts a drag (the whole
   * element still renders as the drag preview). Without it, the whole element drags. */
  handleClassName?: string;
};

export function DraggableWrapper(props: Props) {
  const { dndType, data, draggingCallback, onDoubleClick, children, handleClassName } = props;
  const callbackRef = React.useRef(draggingCallback);

  useEffect(() => {
    callbackRef.current = draggingCallback;
  }, [draggingCallback]);

  const [{ isDragging }, drag, preview] = useDrag(
    () => ({
      type: dndType,
      item: { data },
      collect: (monitor) => {
        const isDragging = !!monitor.isDragging();
        return { isDragging };
      },
      end: (_item, monitor) => {
        monitor.didDrop();
      }
    }),
    [data, dndType]
  );

  const opacity = isDragging ? 0.5 : 1;

  useEffect(() => {
    if (callbackRef.current) callbackRef.current(isDragging);
  }, [isDragging]);

  return (
    <div
      ref={(node) => {
        if (handleClassName) {
          preview(node);
          const handle = node?.querySelector("." + handleClassName) as HTMLElement | null;
          drag(handle || node);
        } else {
          drag(node);
        }
      }}
      style={{ opacity, transition: "opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1)", ...(handleClassName ? {} : { cursor: isDragging ? "grabbing" : "grab" }) }}
      className="dragButton"
      onDoubleClick={onDoubleClick}
      data-testid="draggable-wrapper"
      aria-label={Locale.label("components.draggableWrapper.ariaLabel")}
    >
      {children}
    </div>
  );
}
