import React, { useEffect, useState, useMemo } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { EnvironmentHelper } from "../../helpers/EnvironmentHelper";

interface Props {
  addOnId: string;
  addOnName?: string;
  onClose: () => void;
  providerId?: string;
  /** Embed URL from provider - either iframe URL or direct media URL */
  embedUrl?: string;
}

// Helper to detect if a URL is a video (direct media, not iframe)
function isVideoUrl(url: string): boolean {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.m3u8', '.mov', '.avi'];
  const lowerUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowerUrl.includes(ext));
}

// Helper to detect if a URL is an iframe embed URL
function isIframeUrl(url: string): boolean {
  return url.includes('/embed/');
}

export const AddOnDialog: React.FC<Props> = (props) => {
  const [iframeHeight, setIframeHeight] = useState(window.innerHeight * 0.7);

  // Determine the URL to use for preview
  // Priority: embedUrl from provider > fallback to Lessons.church embed for legacy items
  const previewUrl = useMemo(() => {
    if (props.embedUrl) return props.embedUrl;

    // Fallback for Lessons.church items without embedUrl (legacy support)
    if (!props.providerId || props.providerId === "lessonschurch") {
      return `${EnvironmentHelper.LessonsUrl}/embed/addon/${props.addOnId}`;
    }

    return null;
  }, [props.embedUrl, props.providerId, props.addOnId]);

  // Determine if this is an iframe embed or direct media
  const isIframe = useMemo(() => {
    if (!previewUrl) return false;
    return isIframeUrl(previewUrl);
  }, [previewUrl]);

  // Detect if direct media is video or image
  const isVideo = useMemo(() => {
    if (!previewUrl || isIframe) return false;
    return isVideoUrl(previewUrl);
  }, [previewUrl, isIframe]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "lessonAddOnHeight" && typeof event.data.height === "number") {
        // Use content height but ensure minimum of 70vh
        const contentHeight = event.data.height + 20;
        const minHeight = window.innerHeight * 0.7;
        setIframeHeight(Math.max(contentHeight, minHeight));
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Render content based on URL type
  const renderContent = () => {
    if (!previewUrl) {
      return (
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">
            Preview not available for this content.
          </Typography>
        </Box>
      );
    }

    // For iframe embed URLs, use iframe
    if (isIframe) {
      return (
        <iframe
          src={previewUrl}
          title="Add-On Content"
          style={{
            width: "100%",
            height: iframeHeight,
            border: "none",
            display: "block"
          }}
        />
      );
    }

    // For direct media URLs
    if (isVideo) {
      return (
        <Box sx={{ width: "100%", display: "flex", justifyContent: "center", bgcolor: "black" }}>
          <video
            controls
            autoPlay={false}
            style={{ maxWidth: "100%", maxHeight: "70vh" }}
            src={previewUrl}
          >
            Your browser does not support the video tag.
          </video>
        </Box>
      );
    }

    // Image
    return (
      <Box sx={{ width: "100%", display: "flex", justifyContent: "center", p: 2 }}>
        <img
          src={previewUrl}
          alt={props.addOnName || "Preview"}
          style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain" }}
        />
      </Box>
    );
  };

  return (
    <Dialog open={true} onClose={props.onClose} fullWidth maxWidth="lg">
      <DialogTitle>{props.addOnName || "Add-On"}</DialogTitle>
      <DialogContent sx={{ p: 0, overflow: "hidden" }}>
        {renderContent()}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={props.onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
