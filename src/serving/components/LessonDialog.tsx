import React, { useEffect, useState, useMemo } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography, Box } from "@mui/material";
import { Locale } from "@churchapps/apphelper";
import { EnvironmentHelper } from "../../helpers/EnvironmentHelper";
import { type ExternalVenueRefInterface } from "../../helpers";
import { useProviderContent } from "../hooks/useProviderContent";
import { ContentRenderer } from "./ContentRenderer";

interface Props {
  sectionId: string;
  sectionName?: string;
  onClose: () => void;
  onExpandToActions?: () => void;
  externalRef?: ExternalVenueRefInterface;
  // Provider-based section support
  providerId?: string;
  embedUrl?: string;
  /** Provider path for fetching content dynamically */
  providerPath?: string;
  /** Dot-notation path to specific content item */
  providerContentPath?: string;
  /** Ministry ID for auth */
  ministryId?: string;
}

export const LessonDialog: React.FC<Props> = (props) => {
  const [iframeHeight, setIframeHeight] = useState(window.innerHeight * 0.7);

  // Build fallback URL for legacy lessons.church items
  const legacyFallbackUrl = useMemo(() => {
    // Only use legacy fallback if no embedUrl and no provider path info
    if (props.embedUrl) return props.embedUrl;
    if (props.providerPath && props.providerContentPath) return undefined;

    // Legacy fallback for Lessons.church items
    const isLessonsChurch = !props.providerId || props.providerId === "lessonschurch";
    if (props.externalRef) {
      return `${EnvironmentHelper.LessonsUrl}/embed/external/${props.externalRef.externalProviderId}/section/${props.sectionId}`;
    } else if (isLessonsChurch) {
      return `${EnvironmentHelper.LessonsUrl}/embed/section/${props.sectionId}`;
    }

    return undefined;
  }, [props.embedUrl, props.providerId, props.externalRef, props.sectionId, props.providerPath, props.providerContentPath]);

  // Use the hook to fetch content from provider
  const { content, loading, error } = useProviderContent({
    providerId: props.providerId,
    providerPath: props.providerPath,
    providerContentPath: props.providerContentPath,
    ministryId: props.ministryId,
    fallbackUrl: legacyFallbackUrl,
    relatedId: props.sectionId
  });

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "lessonSectionHeight" && typeof event.data.height === "number") {
        const contentHeight = event.data.height + 20;
        const minHeight = window.innerHeight * 0.7;
        setIframeHeight(Math.max(contentHeight, minHeight));
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // If we have no content and no URL, show message with expand option
  const showExpandMessage = !loading && !error && !content?.url && !content?.description && props.onExpandToActions;

  return (
    <Dialog open={true} onClose={props.onClose} fullWidth maxWidth="lg">
      <DialogTitle>{props.sectionName || "Lesson Section"}</DialogTitle>
      <DialogContent sx={{ p: 0, overflow: "hidden" }}>
        {showExpandMessage ? (
          <Box sx={{ p: 4, textAlign: "center", minHeight: 200, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <Typography variant="h6" gutterBottom>{props.sectionName}</Typography>
            <Typography color="text.secondary">
              This section contains multiple items. Click 'Expand to Actions' to import the individual actions.
            </Typography>
          </Box>
        ) : (
          <ContentRenderer
            url={content?.url}
            mediaType={content?.mediaType}
            title={props.sectionName}
            description={content?.description}
            loading={loading}
            error={error || undefined}
            iframeHeight={iframeHeight}
          />
        )}
      </DialogContent>
      <DialogActions>
        {props.onExpandToActions && (
          <Button variant="contained" onClick={props.onExpandToActions}>
            {Locale.label("plans.planItem.expandToActions") || "Expand to Actions"}
          </Button>
        )}
        <Button variant="outlined" onClick={props.onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
