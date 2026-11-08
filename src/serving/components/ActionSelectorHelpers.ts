import { type Instructions, type IProvider } from "@churchapps/content-providers";

export const generatePath = (indices: number[]): string => indices.join(".");

export async function getProviderInstructions(provider: IProvider, path: string, auth?: any): Promise<Instructions | null> {
  const capabilities = provider.capabilities;
  if (capabilities.instructions && provider.getInstructions) {
    return provider.getInstructions(path, auth);
  }
  return null;
}

type ProviderItemType = "providerSection" | "providerPresentation" | "providerFile";

/** One picked row from the External Item picker; the dialog collects several and imports them together. */
export interface ProviderItemSelection {
  actionId: string;
  actionName: string;
  seconds?: number;
  providerId?: string;
  itemType: ProviderItemType;
  image?: string;
  mediaUrl?: string;
  providerPath?: string;
  providerContentPath?: string;
}

/** Stable identity for a selection so the same row toggles off again, even across folders and providers. */
export const selectionKey = (s: ProviderItemSelection): string =>
  [s.itemType, s.providerId || "", s.providerPath || "", s.providerContentPath || "", s.actionId].join("|");

export interface ActionSelectorProps {
  open: boolean;
  onClose: () => void;
  /** Fires once with every ticked item when the user presses Import. */
  onImport: (items: ProviderItemSelection[]) => void;
  /** Provider-defined path to the leaf folder whose contents should be offered as actions. */
  contentPath?: string;
  /** Provider ID for the associated content */
  providerId?: string;
  /** Ministry ID for auth */
  ministryId?: string;
}
