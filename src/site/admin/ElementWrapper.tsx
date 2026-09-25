import React from "react";
import { Element } from "@churchapps/apphelper/website";
import "./elements/SafeRawHTMLElement";
import type { ElementInterface } from "../../helpers";
import type { ChurchInterface } from "@churchapps/helpers";

interface Props {
  element: ElementInterface;
  church?: ChurchInterface;
  churchSettings: any;
  textColor: string;
  onEdit?: (section: any, element: ElementInterface) => void;
  onMove?: () => void;
}

/** Wrapper component for Element that handles dragging and double-click editing. */
export const ElementWrapper: React.FC<Props> = (props) => {
  return <Element {...props} />;
};
