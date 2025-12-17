import React, { useEffect, useState, useRef } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { EnvironmentHelper } from "../../helpers/EnvironmentHelper";

interface Props {
  sectionId: string;
  sectionName?: string;
  onClose: () => void;
}

export const LessonDialog: React.FC<Props> = (props) => {
  const iframeUrl = `${EnvironmentHelper.LessonsUrl}/embed/section/${props.sectionId}`;
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
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={props.onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
