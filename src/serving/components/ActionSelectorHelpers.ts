import { getProvider, type Instructions, type InstructionItem, type IProvider } from "@churchapps/content-provider-helper";

// Generate a dot-notation path from indices array (e.g., [0, 2, 1] -> "0.2.1")
export const generatePath = (indices: number[]): string => indices.join('.');

// Helper to get instructions from provider based on its capabilities
export async function getProviderInstructions(provider: IProvider, path: string, auth?: any): Promise<Instructions | null> {
  const capabilities = provider.capabilities;
  if (capabilities.instructions && provider.getInstructions) {
    return provider.getInstructions(path, auth);
  }
  return null;
}

// Extract sections from instructions that contain actions
export function extractSections(instructions: Instructions): InstructionItem[] {
  const sections: InstructionItem[] = [];

  // Recursively find all items with itemType 'section'
  function findSections(items: InstructionItem[]) {
    for (const item of items) {
      if (item.itemType === 'section' && item.children && item.children.length > 0) {
        sections.push(item);
      }
      // Continue searching in children
      if (item.children) {
        findSections(item.children);
      }
    }
  }

  findSections(instructions.items);

  // If no sections found by itemType, fall back to structure-based detection
  // Look for items whose children are actions (have 'action' itemType or no grandchildren)
  if (sections.length === 0) {
    for (const item of instructions.items) {
      if (item.children && item.children.length > 0) {
        const hasActionChildren = item.children.some(c =>
          c.itemType === 'action' || c.itemType === 'providerPresentation' ||
          !c.children || c.children.length === 0
        );
        if (hasActionChildren) {
          sections.push(item);
        }
      }
    }
  }

  return sections;
}

export interface ActionSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (actionId: string, actionName: string, seconds?: number, providerId?: string, itemType?: "providerSection" | "providerPresentation" | "providerFile", image?: string, mediaUrl?: string, providerPath?: string, providerContentPath?: string) => void;
  /** Full content path for the associated content (e.g., /lessons/program-1/study-1/lesson-1/venue-1) */
  contentPath?: string;
  /** Provider ID for the associated content */
  providerId?: string;
  /** Ministry ID for auth */
  ministryId?: string;
}
