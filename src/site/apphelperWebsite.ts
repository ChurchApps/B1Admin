import type React from "react";
import { Element as BaseElement, StyleHelper as BaseStyleHelper } from "@churchapps/apphelper/website";
import type { ElementInterface, SectionInterface } from "../helpers";

// @churchapps/apphelper 1.10.11 types the website ElementInterface.parentId as `string | undefined`, but the Content Api
// sends null for top-level elements, so the local interfaces say `string | null`. The renderers only copy parentId through,
// so these re-typed exports accept the local interfaces. Drop this file once Packages widens parentId to `string | null`.
type ElementProps = Omit<React.ComponentProps<typeof BaseElement>, "element" | "onEdit"> & {
  element: ElementInterface;
  onEdit?: (section: SectionInterface | null, element: ElementInterface) => void;
};
export const Element = BaseElement as React.FC<ElementProps>;

export const StyleHelper = BaseStyleHelper as Omit<typeof BaseStyleHelper, "getCss" | "getFontUrls"> & {
  getCss: (sections: SectionInterface[], forceDevice?: string) => string;
  getFontUrls: (sections: SectionInterface[]) => string[];
};
