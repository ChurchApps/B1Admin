import { useState, useEffect, useMemo } from "react";
import { getProvider, navigateToPath, type Instructions, type InstructionItem } from "@churchapps/content-provider-helper";
import { ApiHelper } from "@churchapps/apphelper";
import { ContentProviderAuthHelper } from "../../helpers/ContentProviderAuthHelper";

export interface ProviderContentChild {
  id?: string;
  label?: string;
  description?: string;
  seconds?: number;
  embedUrl?: string;
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
  relatedId?: string;
}

// Helper to detect media type from URL
function detectMediaType(url: string): "video" | "image" | "iframe" {
  const lowerUrl = url.toLowerCase();
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.m3u8', '.mov', '.avi'];
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];

  if (videoExtensions.some(ext => lowerUrl.includes(ext))) {
    return "video";
  }
  if (imageExtensions.some(ext => lowerUrl.includes(ext))) {
    return "image";
  }
  // If URL contains /embed/, treat as iframe
  if (lowerUrl.includes('/embed/')) {
    return "iframe";
  }
  // Default to image for unknown types
  return "image";
}

export function useProviderContent(params: UseProviderContentParams): UseProviderContentResult {
  const { providerId, providerPath, providerContentPath, ministryId, fallbackUrl, relatedId } = params;
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
      // For lessons.church legacy items, we might still have a relatedId but no providerPath
      // In that case, we leave content as null and let the dialog handle the fallback
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
        if (provider.capabilities.expandedInstructions && provider.getExpandedInstructions) {
          instructions = await provider.getExpandedInstructions(providerPath, auth);
        } else if (provider.capabilities.instructions && provider.getInstructions) {
          instructions = await provider.getInstructions(providerPath, auth);
        }

        // If client-side fails and we have ministryId, try the API proxy
        if (!instructions && ministryId) {
          try {
            instructions = await ApiHelper.post(
              "/providerProxy/getExpandedInstructions",
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
          // Look for embedUrl on the item itself, or on the first child with an embedUrl
          let embedUrl = item.embedUrl;

          // If item doesn't have embedUrl, check children (actions often have file children with the actual URL)
          if (!embedUrl && item.children && item.children.length > 0) {
            const childWithUrl = item.children.find(child => child.embedUrl);
            if (childWithUrl) {
              embedUrl = childWithUrl.embedUrl;
            }
          }

          if (embedUrl) {
            setContent({
              url: embedUrl,
              mediaType: detectMediaType(embedUrl),
              description: item.description,
              label: item.label
            });
          } else if (providerId === "lessonschurch" && relatedId) {
            // Fallback for lessons.church: construct embed URL from relatedId
            const lessonsEmbedUrl = `https://lessons.church/embed/action/${relatedId}`;
            setContent({
              url: lessonsEmbedUrl,
              mediaType: "iframe",
              description: item.description,
              label: item.label
            });
          } else if (item.children && item.children.length > 0) {
            // Item has children (e.g., a section with actions) - return them for display
            const children: ProviderContentChild[] = item.children.map(child => {
              // Look for embedUrl on the child itself, or on its first child with an embedUrl
              let childEmbedUrl = child.embedUrl;
              if (!childEmbedUrl && child.children && child.children.length > 0) {
                const grandchildWithUrl = child.children.find(gc => gc.embedUrl);
                if (grandchildWithUrl) {
                  childEmbedUrl = grandchildWithUrl.embedUrl;
                }
              }
              return {
                id: child.relatedId || child.id,
                label: child.label,
                description: child.description,
                seconds: child.seconds,
                embedUrl: childEmbedUrl
              };
            });
            setContent({
              description: item.description,
              label: item.label,
              children
            });
          } else {
            // Item exists but has no embedUrl and no children - show as text content
            setContent({
              description: item.description,
              label: item.label,
              mediaType: "text"
            });
          }
        } else if (providerId === "lessonschurch" && relatedId) {
          // Content path not found but we have a lessons.church relatedId - use embed URL
          const lessonsEmbedUrl = `https://lessons.church/embed/action/${relatedId}`;
          setContent({
            url: lessonsEmbedUrl,
            mediaType: "iframe"
          });
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
  }, [providerId, providerPath, providerContentPath, ministryId, fallbackUrl, relatedId, hasFallback]);

  return { content, loading, error };
}
