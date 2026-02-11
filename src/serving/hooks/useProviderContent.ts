import { useState, useEffect, useMemo } from "react";
import { getProvider, navigateToPath, type Instructions } from "@churchapps/content-provider-helper";
import { ApiHelper } from "@churchapps/apphelper";
import { ContentProviderAuthHelper } from "../../helpers/ContentProviderAuthHelper";

export interface ProviderContentChild {
  id?: string;
  label?: string;
  description?: string;
  seconds?: number;
  downloadUrl?: string;
  thumbnailUrl?: string;
}

export interface ProviderContent {
  url?: string;
  mediaType?: "video" | "image" | "text" | "iframe";
  description?: string;
  label?: string;
  children?: ProviderContentChild[];
}

export interface UseProviderContentResult {
  content: ProviderContent | null;
  loading: boolean;
  error: string | null;
}

export interface UseProviderContentParams {
  providerId?: string;
  providerPath?: string;
  providerContentPath?: string;
  ministryId?: string;
  fallbackUrl?: string;
}

// Helper to detect media type from URL
function detectMediaType(url: string): "video" | "image" | "iframe" {
  const lowerUrl = url.toLowerCase();
  const videoExtensions = [".mp4", ".webm", ".ogg", ".m3u8", ".mov", ".avi"];
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"];

  if (videoExtensions.some(ext => lowerUrl.includes(ext))) {
    return "video";
  }
  if (imageExtensions.some(ext => lowerUrl.includes(ext))) {
    return "image";
  }
  // If URL contains /embed/, treat as iframe
  if (lowerUrl.includes("/embed/")) {
    return "iframe";
  }
  // Default to image for unknown types
  return "image";
}

export function useProviderContent(params: UseProviderContentParams): UseProviderContentResult {
  const { providerId, providerPath, providerContentPath, ministryId, fallbackUrl } = params;
  const [content, setContent] = useState<ProviderContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If fallbackUrl is provided, use it immediately
  const hasFallback = useMemo(() => !!fallbackUrl, [fallbackUrl]);

  useEffect(() => {
    // If we have a fallback URL, use it directly
    if (fallbackUrl) {
      setContent({
        url: fallbackUrl,
        mediaType: detectMediaType(fallbackUrl)
      });
      setLoading(false);
      setError(null);
      return;
    }

    // If we don't have provider data, we can't fetch
    if (!providerId || !providerPath || !providerContentPath) {
      // Legacy items without provider data will show "no preview available"
      setContent(null);
      setLoading(false);
      return;
    }

    // Fetch content from provider
    const fetchContent = async () => {
      setLoading(true);
      setError(null);

      try {
        const provider = getProvider(providerId);
        if (!provider) {
          setError(`Provider ${providerId} not found`);
          setLoading(false);
          return;
        }

        // Get auth if provider requires it
        let auth = null;
        if (ministryId && provider.requiresAuth) {
          auth = await ContentProviderAuthHelper.getValidAuth(ministryId, providerId);
        }

        // Fetch expanded instructions
        let instructions: Instructions | null = null;

        // Try to get instructions from provider directly (client-side)
        if (provider.capabilities.instructions && provider.getInstructions) {
          instructions = await provider.getInstructions(providerPath, auth);
        }

        // If client-side fails and we have ministryId, try the API proxy
        if (!instructions && ministryId) {
          try {
            instructions = await ApiHelper.post(
              "/providerProxy/getInstructions",
              { ministryId, providerId, path: providerPath },
              "DoingApi"
            );
          } catch (proxyError) {
            console.warn("API proxy failed, content may not be available:", proxyError);
          }
        }

        if (!instructions) {
          setError("Could not load content from provider");
          setLoading(false);
          return;
        }

        // Navigate to the specific item using providerContentPath
        const item = navigateToPath(instructions, providerContentPath);

        if (item) {
          // Look for downloadUrl on the item itself, or on the first child with a downloadUrl
          let downloadUrl = item.downloadUrl;

          // For sections, we want to show the children list, not find a URL to display
          const isSection = item.itemType === "section";

          // If item doesn't have downloadUrl, check children (actions often have file children with the actual URL)
          // But skip this for sections - they should show children as a list
          if (!isSection && !downloadUrl && item.children && item.children.length > 0) {
            const childWithUrl = item.children.find(child => child.downloadUrl);
            if (childWithUrl) {
              downloadUrl = childWithUrl.downloadUrl;
            }
          }

          if (downloadUrl && !isSection) {
            setContent({
              url: downloadUrl,
              mediaType: detectMediaType(downloadUrl),
              description: item.content,
              label: item.label
            });
          } else if (item.children && item.children.length > 0) {
            // Item has children (e.g., a section with actions) - return them for display
            const children: ProviderContentChild[] = item.children.map(child => {
              // Look for downloadUrl on the child itself, or on its first child with a downloadUrl
              let childDownloadUrl = child.downloadUrl;
              let childThumbnail = child.thumbnail;
              if (!childDownloadUrl && child.children && child.children.length > 0) {
                const grandchildWithUrl = child.children.find(gc => gc.downloadUrl);
                if (grandchildWithUrl) {
                  childDownloadUrl = grandchildWithUrl.downloadUrl;
                  childThumbnail = childThumbnail || grandchildWithUrl.thumbnail;
                }
              }
              return {
                id: child.relatedId || child.id,
                label: child.label,
                description: child.content,
                seconds: child.seconds,
                downloadUrl: childDownloadUrl,
                thumbnailUrl: childThumbnail
              };
            });
            setContent({
              description: item.content,
              label: item.label,
              children
            });
          } else {
            // Item exists but has no downloadUrl and no children - show as text content
            setContent({
              description: item.content,
              label: item.label,
              mediaType: "text"
            });
          }
        } else {
          setError("Content not found at specified path");
        }
      } catch (err) {
        console.error("Error fetching provider content:", err);
        setError(err instanceof Error ? err.message : "Failed to load content");
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [providerId, providerPath, providerContentPath, ministryId, fallbackUrl, hasFallback]);

  return { content, loading, error };
}
