import { createContext, useContext } from "react";

// "dark" = legacy apphelper gradient PageHeader; "light" = Soft Blue ui/PageHeader on the page canvas.
export type HeaderTone = "dark" | "light";
export const HeaderToneContext = createContext<HeaderTone>("dark");
export const useHeaderTone = () => useContext(HeaderToneContext);
