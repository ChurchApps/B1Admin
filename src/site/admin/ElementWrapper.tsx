import React from "react";
import { Element } from "@churchapps/apphelper-website";
import type { ElementInterface } from "../../helpers";
import type { ChurchInterface } from "@churchapps/helpers";

interface Props {
  element: ElementInterface;
  church?: ChurchInterface;
  churchSettings: any;
  textColor?: string;
  onEdit?: (section: any, element: ElementInterface) => void;
  onMove?: () => void;
}

/**
 * Wrapper component for Element that handles dragging and double-click editing.
 * All element types now use the package's Element component with the enhanced
 * DroppableArea styling that was integrated into the AppHelper package.
 */
export const ElementWrapper: React.FC<Props> = (props) => {
  // Simply pass all props through to Element and let it handle drag/drop
  return <Element {...props} />;
};
