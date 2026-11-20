import type { ChurchInterface, LoginUserChurchInterface } from "@churchapps/helpers";
import type { GlobalStyleInterface } from "../../helpers/Interfaces";
import type { ChurchSettings } from "../types";

// The logged-in church as held in UserContext; some callers read a `settings` map that isn't in the shared interface.
export type UserChurchWithSettings = LoginUserChurchInterface & { settings?: ChurchSettings };

// Config passed from PageEdit / BlockEditPage into the ContentEditor.
export interface SiteEditorConfig {
  globalStyles?: GlobalStyleInterface;
  appearance?: ChurchSettings;
  church?: ChurchInterface;
}
