import React from "react";
import { useDrop } from "react-dnd";

interface Props {
  accept: string;
  /** "reorder": drop above/below based on cursor half, shown as an insertion line.
   *  "into": whole child is one target (e.g. a section header = add to that section). */
  mode?: "reorder" | "into";
  onDrop: (data: any, position: "before" | "after") => void;
  children: React.ReactNode;
}

/**
 * Makes its child row a drop target for plan item drags. Unlike separate drop-zone
 * boxes, rows are always targets, so nothing shifts or appears when a drag starts —
 * a blue insertion line previews exactly where the item will land.
 */
export const RowDropZone: React.FC<Props> = ({ accept, mode = "reorder", onDrop, children }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [hoverHalf, setHoverHalf] = React.useState<"before" | "after">("before");

  const getHalf = (monitor: { getClientOffset: () => { y: number } | null }): "before" | "after" => {
    const rect = ref.current?.getBoundingClientRect();
    const y = monitor.getClientOffset()?.y;
    if (!rect || y == null) return "after";
    return y < rect.top + rect.height / 2 ? "before" : "after";
  };

  const [{ isOver }, drop] = useDrop(() => ({
    accept,
    hover: (_item: any, monitor: any) => {
      if (mode === "reorder") setHoverHalf(getHalf(monitor));
    },
    drop: (item: any, monitor: any) => {
      onDrop(item, mode === "reorder" ? getHalf(monitor) : "after");
    },
    collect: (monitor) => ({ isOver: !!monitor.isOver({ shallow: true }) })
  }), [accept, mode, onDrop]);

  drop(ref);

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        ...(mode === "into" && isOver
          ? { outline: "2px solid var(--c1)", outlineOffset: -2, borderRadius: 4, background: "rgba(21, 101, 192, 0.06)" }
          : {})
      }}
    >
      {children}
      {isOver && mode === "reorder" && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            [hoverHalf === "before" ? "top" : "bottom"]: -2,
            height: 4,
            background: "var(--c1)",
            borderRadius: 2,
            zIndex: 10,
            pointerEvents: "none",
            boxShadow: "0 0 4px rgba(21, 101, 192, 0.6)"
          }}
        />
      )}
    </div>
  );
};
