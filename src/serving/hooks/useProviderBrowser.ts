import { useState, useCallback, useEffect, useMemo } from "react";
import { ApiHelper } from "@churchapps/apphelper";
import { getProvider, getAvailableProviders, type ContentFolder, type ContentFile, type ContentItem } from "@churchapps/content-providers";
import { type ContentProviderAuthInterface } from "../../helpers";
import { ContentProviderAuthHelper } from "../../helpers/ContentProviderAuthHelper";

interface UseProviderBrowserOptions {
  ministryId?: string;
  defaultProviderId?: string;
  providerFilter?: string[];
  /** Whether to track files in addition to folders */
  includeFiles?: boolean;
  /** Whether to auto-load content on provider change */
  autoLoad?: boolean;
}

export function useProviderBrowser(options: UseProviderBrowserOptions) {
  const { ministryId, defaultProviderId, providerFilter = ["lessonschurch", "signpresenter", "bibleproject"], includeFiles = false, autoLoad = true } = options;

  // Provider state
  const [selectedProviderId, setSelectedProviderId] = useState<string>(defaultProviderId || "");
  const [linkedProviders, setLinkedProviders] = useState<ContentProviderAuthInterface[]>([]);
  const [showAllProviders, setShowAllProviders] = useState(false);

  // Navigation state
  const [currentPath, setCurrentPath] = useState<string>("");
  const [breadcrumbTitles, setBreadcrumbTitles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Content state
  const [currentItems, setCurrentItems] = useState<ContentFolder[]>([]);
  const [currentFiles, setCurrentFiles] = useState<ContentFile[]>([]);

  const availableProviders = useMemo(() => getAvailableProviders(providerFilter), [providerFilter]);

  const currentProviderInfo = useMemo(
    () => availableProviders.find(p => p.id === selectedProviderId),
    [availableProviders, selectedProviderId]
  );

  const isCurrentProviderLinked = useMemo(() => {
    const info = availableProviders.find(p => p.id === selectedProviderId);
    if (info && !info.requiresAuth) return true;
    return linkedProviders.some(lp => lp.providerId === selectedProviderId);
  }, [linkedProviders, selectedProviderId, availableProviders]);

  // Load linked providers
  const loadLinkedProviders = useCallback(async () => {
    if (!ministryId) {
      setLinkedProviders([]);
      return;
    }
    try {
      const linked = await ContentProviderAuthHelper.getLinkedProviders(ministryId);
      setLinkedProviders(linked || []);
    } catch (error) {
      console.error("Error loading linked providers:", error);
      setLinkedProviders([]);
    }
  }, [ministryId]);

  // Browse content at a given path and return all items (without setting state)
  const browseRaw = useCallback(async (path: string, provId: string): Promise<ContentItem[]> => {
    const provider = getProvider(provId);
    if (!provider) return [];
    if (ministryId && provider.requiresAuth) {
      return await ApiHelper.post("/providerProxy/browse", { ministryId, providerId: provId, path: path || null }, "DoingApi");
    }
    return await provider.browse(path || null, null);
  }, [ministryId]);

  // Load browse content for a given path
  const loadContent = useCallback(async (path: string, provId?: string) => {
    const pid = provId || selectedProviderId;
    setLoading(true);
    try {
      const items = await browseRaw(path, pid);
      const folders = items.filter((item): item is ContentFolder => item.type === "folder");
      setCurrentItems(folders);
      if (includeFiles) {
        const files = items.filter((item): item is ContentFile => item.type === "file");
        setCurrentFiles(files);
      }
    } catch (error) {
      console.error("Error loading browse content:", error);
      setCurrentItems([]);
      if (includeFiles) setCurrentFiles([]);
    } finally {
      setLoading(false);
    }
  }, [selectedProviderId, includeFiles, browseRaw]);

  // Navigate directly to a deep path, resolving breadcrumb titles along the way.
  // Returns the folders loaded at the target path.
  const navigateToPath = useCallback(async (targetPath: string, provId?: string): Promise<ContentFolder[]> => {
    const pid = provId || selectedProviderId;
    if (pid !== selectedProviderId) setSelectedProviderId(pid);

    const segments = targetPath.replace(/^\//, "").split("/").filter(Boolean);
    if (segments.length === 0) {
      setCurrentPath("");
      setBreadcrumbTitles([]);
      setCurrentItems([]);
      return [];
    }

    setLoading(true);
    try {
      // Build breadcrumb titles by loading each intermediate level in parallel
      const titlePromises = segments.map((seg, i) => {
        const parentPath = i === 0 ? "" : "/" + segments.slice(0, i).join("/");
        return browseRaw(parentPath, pid).then(items => {
          const folders = items.filter((item): item is ContentFolder => item.type === "folder");
          const match = folders.find(f => {
            const fSegs = f.path.replace(/^\//, "").split("/").filter(Boolean);
            return fSegs[fSegs.length - 1] === seg;
          });
          return match?.title || seg;
        }).catch(() => seg);
      });

      const titles = await Promise.all(titlePromises);

      // Load the target path content
      const targetItems = await browseRaw(targetPath, pid);
      const targetFolders = targetItems.filter((item): item is ContentFolder => item.type === "folder");

      setCurrentPath(targetPath);
      setBreadcrumbTitles(titles);
      setCurrentItems(targetFolders);
      return targetFolders;
    } catch (error) {
      console.error("Error navigating to path:", error);
      setCurrentItems([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [selectedProviderId, browseRaw]);

  // Navigate into a folder (non-leaf)
  const navigateToFolder = useCallback((folder: ContentFolder) => {
    setCurrentPath(folder.path);
    setBreadcrumbTitles(prev => [...prev, folder.title]);
    loadContent(folder.path);
  }, [loadContent]);

  // Navigate back one level
  const navigateBack = useCallback(() => {
    const segments = currentPath.split("/").filter(Boolean);
    segments.pop();
    const newPath = segments.length > 0 ? "/" + segments.join("/") : "";
    setCurrentPath(newPath);
    setBreadcrumbTitles(prev => prev.slice(0, -1));
    loadContent(newPath);
  }, [currentPath, loadContent]);

  // Navigate to a breadcrumb level (-1 = root)
  const navigateToBreadcrumb = useCallback((index: number) => {
    if (index < 0) {
      setCurrentPath("");
      setBreadcrumbTitles([]);
      loadContent("");
    } else {
      const segments = currentPath.split("/").filter(Boolean);
      const newSegments = segments.slice(0, index + 1);
      const newPath = "/" + newSegments.join("/");
      setCurrentPath(newPath);
      setBreadcrumbTitles(prev => prev.slice(0, index + 1));
      loadContent(newPath);
    }
  }, [currentPath, loadContent]);

  // Change provider and reset navigation
  const changeProvider = useCallback(async (newProviderId: string) => {
    setSelectedProviderId(newProviderId);
    setCurrentPath("");
    setBreadcrumbTitles([]);
    setCurrentItems([]);
    if (includeFiles) setCurrentFiles([]);
    if (autoLoad) {
      await loadContent("", newProviderId);
    }
  }, [includeFiles, autoLoad, loadContent]);

  // Reset all state
  const reset = useCallback(() => {
    setCurrentPath("");
    setBreadcrumbTitles([]);
    setCurrentItems([]);
    if (includeFiles) setCurrentFiles([]);
    setShowAllProviders(false);
    if (defaultProviderId) setSelectedProviderId(defaultProviderId);
  }, [includeFiles, defaultProviderId]);

  // Check if a folder is a leaf
  const isLeafFolder = useCallback((folder: ContentFolder): boolean => {
    return !!folder.isLeaf;
  }, []);

  // Build breadcrumb items
  const breadcrumbItems = useMemo(() => {
    const providerName = currentProviderInfo?.name || selectedProviderId;
    const items: { label: string; onClick?: () => void }[] = [{ label: providerName, onClick: () => navigateToBreadcrumb(-1) }];
    breadcrumbTitles.forEach((title, index) => {
      items.push({ label: title, onClick: () => navigateToBreadcrumb(index) });
    });
    return items;
  }, [breadcrumbTitles, navigateToBreadcrumb, currentProviderInfo, selectedProviderId]);

  // Auto-select first implemented provider if none is set
  useEffect(() => {
    if (!selectedProviderId && availableProviders.length > 0) {
      const firstImplemented = availableProviders.find(p => p.implemented);
      if (firstImplemented) setSelectedProviderId(firstImplemented.id);
    }
  }, [selectedProviderId, availableProviders]);

  return {
    // Provider state
    selectedProviderId,
    setSelectedProviderId,
    linkedProviders,
    showAllProviders,
    setShowAllProviders,
    availableProviders,
    currentProviderInfo,
    isCurrentProviderLinked,

    // Navigation state
    currentPath,
    setCurrentPath,
    breadcrumbTitles,
    setBreadcrumbTitles,
    loading,
    setLoading,

    // Content
    currentItems,
    setCurrentItems,
    currentFiles,
    setCurrentFiles,

    // Computed
    breadcrumbItems,

    // Actions
    loadLinkedProviders,
    loadContent,
    navigateToFolder,
    navigateBack,
    navigateToBreadcrumb,
    navigateToPath,
    changeProvider,
    reset,
    isLeafFolder
  };
}
