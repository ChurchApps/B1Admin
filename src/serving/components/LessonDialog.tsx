import React, { useEffect, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography, Box, List, ListItem, ListItemText, ListItemIcon, Divider, IconButton } from "@mui/material";
import { PlayArrow as PlayArrowIcon, Schedule as ScheduleIcon, ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import { MarkdownPreviewLight } from "@churchapps/apphelper-markdown";
import { useProviderContent, type ProviderContentChild } from "../hooks/useProviderContent";
import { ContentRenderer } from "./ContentRenderer";

// Helper to format seconds as MM:SS
function formatDuration(seconds?: number): string {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
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
  if (lowerUrl.includes('/embed/')) {
    return "iframe";
  }
  return "image";
}

interface Props {
  sectionId: string;
  sectionName?: string;
  onClose: () => void;
  onExpandToActions?: () => void;
  // Provider-based section support
  providerId?: string;
  downloadUrl?: string;
  /** Provider path for fetching content dynamically */
  providerPath?: string;
  /** Dot-notation path to specific content item */
  providerContentPath?: string;
  /** Ministry ID for auth */
  ministryId?: string;
}

export const LessonDialog: React.FC<Props> = (props) => {
  const [iframeHeight, setIframeHeight] = useState(window.innerHeight * 0.7);
  const [selectedChild, setSelectedChild] = useState<ProviderContentChild | null>(null);

  // Use the hook to fetch content from provider
  const { content, loading, error } = useProviderContent({
    providerId: props.providerId,
    providerPath: props.providerPath,
    providerContentPath: props.providerContentPath,
    ministryId: props.ministryId,
    fallbackUrl: props.downloadUrl
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

  // Check if we have children to display (section with actions)
  const hasChildren = content?.children && content.children.length > 0;

  // Handle clicking on a child item to preview it
  const handleChildClick = (child: ProviderContentChild) => {
    setSelectedChild(child);
  };

  // Handle going back to the list
  const handleBackToList = () => {
    setSelectedChild(null);
  };

  // Render the content area
  const renderContent = () => {
    if (loading) {
      return <ContentRenderer loading={true} />;
    }

    if (error) {
      return <ContentRenderer error={error} />;
    }

    // If a child is selected, show its content
    if (selectedChild) {
      const childUrl = selectedChild.downloadUrl;

      if (childUrl) {
        return (
          <ContentRenderer
            url={childUrl}
            mediaType={detectMediaType(childUrl)}
            title={selectedChild.label}
            description={selectedChild.description}
            iframeHeight={iframeHeight}
          />
        );
      } else {
        return (
          <Box sx={{ p: 4 }}>
            <Typography variant="h6" gutterBottom>{selectedChild.label}</Typography>
            {selectedChild.description && (
              <MarkdownPreviewLight value={selectedChild.description} />
            )}
            {!selectedChild.description && (
              <Typography color="text.secondary" sx={{ textAlign: "center" }}>No preview available for this item.</Typography>
            )}
          </Box>
        );
      }
    }

    // If we have a URL, show the content
    if (content?.url) {
      return (
        <ContentRenderer
          url={content.url}
          mediaType={content.mediaType}
          title={props.sectionName}
          description={content.description}
          iframeHeight={iframeHeight}
        />
      );
    }

    // If we have children (section with actions), show them as a list
    if (hasChildren) {
      return (
        <Box sx={{ p: 2 }}>
          {content.description && (
            <Box sx={{ mb: 2 }}>
              <MarkdownPreviewLight value={content.description} />
            </Box>
          )}
          <List>
            {content.children!.map((child, index) => (
              <React.Fragment key={child.id || index}>
                {index > 0 && <Divider />}
                <ListItem
                  component="div"
                  onClick={() => handleChildClick(child)}
                  sx={{
                    cursor: "pointer",
                    "&:hover": { bgcolor: "action.hover" },
                    borderRadius: 1
                  }}
                >
                  <ListItemIcon>
                    <PlayArrowIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={child.label}
                    secondary={
                      <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {child.description && <span>{child.description}</span>}
                        {child.seconds && (
                          <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: "text.secondary" }}>
                            <ScheduleIcon sx={{ fontSize: 14 }} />
                            {formatDuration(child.seconds)}
                          </Box>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Box>
      );
    }

    // Fallback - no content available
    return (
      <Box sx={{ p: 4, textAlign: "center", minHeight: 200, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <Typography color="text.secondary">
          Preview not available for this section.
        </Typography>
      </Box>
    );
  };

  return (
    <Dialog open={true} onClose={props.onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {selectedChild && (
          <IconButton size="small" onClick={handleBackToList} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
        )}
        {selectedChild ? selectedChild.label : (props.sectionName || "Lesson Section")}
      </DialogTitle>
      <DialogContent sx={{ p: 0, overflow: "hidden" }}>
        {renderContent()}
      </DialogContent>
      <DialogActions>
        {props.onExpandToActions && !selectedChild && (
          <Button variant="contained" onClick={props.onExpandToActions}>
            {Locale.label("plans.planItem.expandToActions") || "Expand to Actions"}
          </Button>
        )}
        <Button variant="outlined" onClick={selectedChild ? handleBackToList : props.onClose}>
          {selectedChild ? "Back" : "Close"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
