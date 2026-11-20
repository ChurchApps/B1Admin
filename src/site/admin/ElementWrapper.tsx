import React from "react";
import { Element } from "../apphelperWebsite";
import "./elements/SafeRawHTMLElement";
import type { ElementInterface, SectionInterface } from "../../helpers";
import type { ChurchSettings } from "../types";
import type { ChurchInterface } from "@churchapps/helpers";

interface Props {
  element: ElementInterface;
  church?: ChurchInterface;
  churchSettings: ChurchSettings;
  textColor: string;
  onEdit?: (section: SectionInterface | null, element: ElementInterface) => void;
  onMove?: () => void;
}

/** Wrapper component for Element that handles dragging and double-click editing. */
export const ElementWrapper: React.FC<Props> = (props) => {
  return <Element {...props} />;
};
