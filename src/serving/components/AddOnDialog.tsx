import React, { useEffect, useState, useMemo } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { EnvironmentHelper } from "../../helpers/EnvironmentHelper";
import { useProviderContent } from "../hooks/useProviderContent";
import { ContentRenderer } from "./ContentRenderer";

interface Props {
  addOnId: string;
  addOnName?: string;
  onClose: () => void;
  providerId?: string;
  /** Embed URL from provider - either iframe URL or direct media URL */
  embedUrl?: string;
  /** Provider path for fetching content dynamically */
  providerPath?: string;
  /** Dot-notation path to specific content item */
  providerContentPath?: string;
  /** Ministry ID for auth */
  ministryId?: string;
}

export const AddOnDialog: React.FC<Props> = (props) => {
  const [iframeHeight, setIframeHeight] = useState(window.innerHeight * 0.7);

  // Build fallback URL for legacy lessons.church items
  const legacyFallbackUrl = useMemo(() => {
    // Only use legacy fallback if no embedUrl and no provider path info
    if (props.embedUrl) return props.embedUrl;
    if (props.providerPath && props.providerContentPath) return undefined;

    // Legacy fallback for Lessons.church items
    if (!props.providerId || props.providerId === "lessonschurch") {
      return `${EnvironmentHelper.LessonsUrl}/embed/addon/${props.addOnId}`;
    }

    return undefined;
  }, [props.embedUrl, props.providerId, props.addOnId, props.providerPath, props.providerContentPath]);

  // Use the hook to fetch content from provider
  const { content, loading, error } = useProviderContent({
    providerId: props.providerId,
    providerPath: props.providerPath,
    providerContentPath: props.providerContentPath,
    ministryId: props.ministryId,
    fallbackUrl: legacyFallbackUrl,
    relatedId: props.addOnId
  });

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "lessonAddOnHeight" && typeof event.data.height === "number") {
        const contentHeight = event.data.height + 20;
        const minHeight = window.innerHeight * 0.7;
        setIframeHeight(Math.max(contentHeight, minHeight));
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <Dialog open={true} onClose={props.onClose} fullWidth maxWidth="lg">
      <DialogTitle>{props.addOnName || "Add-On"}</DialogTitle>
      <DialogContent sx={{ p: 0, overflow: "hidden" }}>
        <ContentRenderer
          url={content?.url}
          mediaType={content?.mediaType}
          title={props.addOnName}
          description={content?.description}
          loading={loading}
          error={error || undefined}
          iframeHeight={iframeHeight}
        />
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={props.onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
