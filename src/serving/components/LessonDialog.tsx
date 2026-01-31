import React, { useEffect, useState, useRef } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography, Box } from "@mui/material";
import { Locale } from "@churchapps/apphelper";
import { EnvironmentHelper } from "../../helpers/EnvironmentHelper";
import { type ExternalVenueRefInterface } from "../../helpers";

interface Props {
  sectionId: string;
  sectionName?: string;
  onClose: () => void;
  onExpandToActions?: () => void;
  externalRef?: ExternalVenueRefInterface;
  // Provider-based section support
  providerId?: string;
  embedUrl?: string;
}

export const LessonDialog: React.FC<Props> = (props) => {
  // Determine how to display content based on available data
  const isLessonsChurch = !props.providerId || props.providerId === "lessonschurch";
  const hasEmbedUrl = !!props.embedUrl;

  // Construct URL based on content source
  let iframeUrl: string | null = null;
  if (hasEmbedUrl) {
    iframeUrl = props.embedUrl!;
  } else if (props.externalRef) {
    iframeUrl = `${EnvironmentHelper.LessonsUrl}/embed/external/${props.externalRef.externalProviderId}/section/${props.sectionId}`;
  } else if (isLessonsChurch) {
    iframeUrl = `${EnvironmentHelper.LessonsUrl}/embed/section/${props.sectionId}`;
  }

  console.log("LessonDialog render:", { providerId: props.providerId, embedUrl: props.embedUrl, isLessonsChurch, hasEmbedUrl, iframeUrl, hasExpandButton: !!props.onExpandToActions });

  const [iframeHeight, setIframeHeight] = useState(window.innerHeight * 0.7);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "lessonSectionHeight" && typeof event.data.height === "number") {
        // Use content height but ensure minimum of 70vh
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
      <DialogTitle>{props.sectionName || "Lesson Section"}</DialogTitle>
      <DialogContent sx={{ p: 0, overflow: "hidden" }}>
        {iframeUrl ? (
          <iframe
            ref={iframeRef}
            src={iframeUrl}
            title="Lesson Content"
            style={{
              width: "100%",
              height: iframeHeight,
              border: "none",
              display: "block"
            }}
          />
        ) : (
          <Box sx={{ p: 4, textAlign: "center", minHeight: 200, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <Typography variant="h6" gutterBottom>{props.sectionName}</Typography>
            <Typography color="text.secondary">
              Preview not available for this content provider.
              {props.onExpandToActions && " Click 'Expand to Actions' to import the individual actions."}
            </Typography>
          </Box>
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
