import React, { useEffect, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { useProviderContent } from "../hooks/useProviderContent";
import { ContentRenderer } from "./ContentRenderer";

interface Props {
  actionId: string;
  actionName?: string;
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

export const ActionDialog: React.FC<Props> = (props) => {
  const [iframeHeight, setIframeHeight] = useState(window.innerHeight * 0.7);

  // Use the hook to fetch content from provider
  const { content, loading, error } = useProviderContent({
    providerId: props.providerId,
    providerPath: props.providerPath,
    providerContentPath: props.providerContentPath,
    ministryId: props.ministryId,
    fallbackUrl: props.embedUrl
  });

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data?.height === "number") {
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
      <DialogTitle>{props.actionName || "Action"}</DialogTitle>
      <DialogContent sx={{ p: 0, overflow: "hidden" }}>
        <ContentRenderer
          url={content?.url}
          mediaType={content?.mediaType}
          title={props.actionName}
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
