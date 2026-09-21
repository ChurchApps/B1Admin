import React, { useEffect, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography, Box, Divider } from "@mui/material";
import { ArrowBack as ArrowBackIcon, Close as CloseIcon, Undo as UndoIcon, RestartAlt as RestartAltIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { MarkdownPreviewLight } from "@churchapps/apphelper/markdown";
import { useProviderContent, type ProviderContentChild } from "../hooks/useProviderContent";
import { ContentRenderer } from "./ContentRenderer";
import { ContentItemRow } from "./planItem/ContentItemRow";
import { InlineEditableText } from "./planItem/InlineEditableText";
import { type PlanItemInterface } from "../../helpers";
import { type SectionEdits } from "./planItem/usePlanItemExpand";
import { findRowForChild } from "./planItemUtils";

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
  if (lowerUrl.includes("/embed/")) {
    return "iframe";
  }
  return "image";
}

interface Props {
  sectionId: string;
  sectionName?: string;
  onClose: () => void;
  providerId?: string;
  downloadUrl?: string;
  /** Provider path for fetching content dynamically */
  providerPath?: string;
  /** Dot-notation path to specific content item */
  providerContentPath?: string;
  /** Stable content id, preferred over the index-based path */
  relatedId?: string;
  /** Ministry ID for auth */
  ministryId?: string;
  /** Enables editing: lines can be reworded or taken out, then saved back to the plan. */
  onSaveEdits?: (edits: SectionEdits) => Promise<void>;
  /** Plan rows this section was already turned into; the dialog shows the original with those changes applied. */
  rows?: PlanItemInterface[];
  onRestoreSection?: () => void;
}

export const LessonDialog: React.FC<Props> = (props) => {
  const [iframeHeight, setIframeHeight] = useState(window.innerHeight * 0.7);
  const [selectedChild, setSelectedChild] = useState<ProviderContentChild | null>(null);

  const { content, loading, error } = useProviderContent({
    providerId: props.providerId,
    providerPath: props.providerPath,
    providerContentPath: props.providerContentPath,
    relatedId: props.relatedId,
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

  const hasChildren = content?.children && content.children.length > 0;

  const [removed, setRemoved] = useState<Set<number>>(new Set());
  const [texts, setTexts] = useState<Record<number, string>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const editable = !!props.onSaveEdits && !!hasChildren;

  // A section that is already rows opens showing what was taken out or reworded earlier.
  useEffect(() => {
    if (!props.rows || !content?.children || !props.providerContentPath) return;
    const gone = new Set<number>();
    const changed: Record<number, string> = {};
    content.children.forEach((child, i) => {
      const row = findRowForChild(props.rows || [], child.id, props.providerContentPath || "", i);
      if (!row) gone.add(i);
      else if (!child.downloadUrl && (row.description || "") !== (child.description || "")) changed[i] = row.description || "";
    });
    setRemoved(gone);
    setTexts(changed);
  }, [props.rows, content, props.providerContentPath]);

  const toggleRemoved = (index: number) => {
    setRemoved((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
    setDirty(true);
  };

  const setText = (index: number, text: string | undefined) => {
    setTexts((prev) => {
      const next = { ...prev };
      if (text === undefined) delete next[index];
      else next[index] = text;
      return next;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const edits: SectionEdits = { removed: Array.from(removed), texts: { ...texts } };
    // Restoring a reworded line means writing the original text back onto its row.
    if (props.rows) content?.children?.forEach((child, i) => { if (edits.texts[i] === undefined && !child.downloadUrl) edits.texts[i] = child.description || ""; });
    await props.onSaveEdits?.(edits);
    props.onClose();
  };

  const renderLine = (child: ProviderContentChild, index: number) => {
    const isRemoved = removed.has(index);
    const isText = !child.downloadUrl;
    const isEdited = texts[index] !== undefined;
    const text = isEdited ? texts[index] : (child.description || child.label || "");
    return (
      <Box data-testid="section-line" sx={{ display: "flex", alignItems: "flex-start", gap: 1, opacity: isRemoved ? 0.45 : 1 }}>
        <Box sx={{ flex: 1, minWidth: 0, textDecoration: isRemoved ? "line-through" : "none" }}>
          {isText ? (
            <Box sx={{ display: "flex", gap: 1.5, py: 1, px: 1 }}>
              <Box sx={{ width: 80, flexShrink: 0, textAlign: "right", pt: 0.25, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "text.secondary" }}>
                {child.actionType || Locale.label("plans.lessonDialog.text") || "Text"}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0, fontSize: "0.95rem", "& p": { mt: 0, mb: 0.5 } }}>
                {editable && !isRemoved
                  ? <InlineEditableText value={text} onSave={(value) => setText(index, value)} data-testid="section-line-text" />
                  : <MarkdownPreviewLight value={text} />}
                {isEdited && !isRemoved && (
                  <Button size="small" startIcon={<RestartAltIcon />} onClick={() => setText(index, undefined)} sx={{ textTransform: "none", p: 0, minWidth: 0 }}>
                    {Locale.label("plans.lessonDialog.restoreText") || "Edited — restore original wording"}
                  </Button>
                )}
              </Box>
            </Box>
          ) : (
            <ContentItemRow
              item={{ id: child.id, label: child.label, seconds: child.seconds, thumbnailUrl: child.thumbnailUrl, itemType: "action" }}
              onClick={isRemoved ? undefined : () => handleChildClick(child)}
            />
          )}
        </Box>
        {editable && (
          <AppIconButton
            label={isRemoved ? (Locale.label("plans.lessonDialog.putBack") || "Put back") : (Locale.label("plans.lessonDialog.takeOut") || "Take out of my plan")}
            icon={isRemoved ? <UndoIcon /> : <CloseIcon />}
            onClick={() => toggleRemoved(index)}
            data-testid={isRemoved ? "section-line-restore" : "section-line-remove"}
            sx={{ mt: 0.75, flexShrink: 0 }}
          />
        )}
      </Box>
    );
  };

  const handleChildClick = (child: ProviderContentChild) => {
    setSelectedChild(child);
  };

  const handleBackToList = () => {
    setSelectedChild(null);
  };

  const renderContent = () => {
    if (loading) {
      return <ContentRenderer loading={true} />;
    }

    if (error) {
      return <ContentRenderer error={error} />;
    }

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
          <Box sx={{ p: 3 }}>
            {selectedChild.description ? (
              <MarkdownPreviewLight value={selectedChild.description} />
            ) : (
              <Typography color="text.secondary" sx={{ textAlign: "center" }}>{Locale.label("plans.lessonDialog.noPreviewItem")}</Typography>
            )}
          </Box>
        );
      }
    }

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

    if (hasChildren) {
      return (
        <Box sx={{ p: 2 }}>
          {content.description && (
            <Box sx={{ mb: 2 }}>
              <MarkdownPreviewLight value={content.description} />
            </Box>
          )}
          {editable && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, px: 1 }}>
              {Locale.label("plans.lessonDialog.editHint") || "Use × to take anything out of your plan, or click any text to reword it. The original is never changed."}
            </Typography>
          )}
          <Box>
            {content.children!.map((child, index) => (
              <React.Fragment key={child.id || index}>
                {index > 0 && <Divider />}
                {renderLine(child, index)}
              </React.Fragment>
            ))}
          </Box>
        </Box>
      );
    }

    return (
      <Box sx={{ p: 4, textAlign: "center", minHeight: 200, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <Typography color="text.secondary">
          {Locale.label("plans.lessonDialog.previewUnavailable")}
        </Typography>
      </Box>
    );
  };

  return (
    <Dialog open={true} onClose={props.onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {selectedChild && (
          <AppIconButton label={Locale.label("common.back")} icon={<ArrowBackIcon />} onClick={handleBackToList} sx={{ mr: 1 }} />
        )}
        {selectedChild ? selectedChild.label : (props.sectionName || Locale.label("plans.lessonDialog.fallbackTitle"))}
      </DialogTitle>
      <DialogContent sx={{ p: 0, overflowY: "auto" }}>
        {renderContent()}
      </DialogContent>
      <DialogActions>
        {props.onRestoreSection && !selectedChild && (
          <Button startIcon={<RestartAltIcon />} onClick={props.onRestoreSection} sx={{ mr: "auto" }} data-testid="section-restore-original">
            {Locale.label("plans.lessonDialog.restoreSection") || "Restore original section"}
          </Button>
        )}
        {editable && !selectedChild && (
          <Button variant="contained" disabled={!dirty || saving || removed.size === content!.children!.length} onClick={handleSave} data-testid="section-save">
            {Locale.label("common.save") || "Save"}
          </Button>
        )}
        <Button variant="outlined" onClick={selectedChild ? handleBackToList : props.onClose}>
          {selectedChild ? Locale.label("plans.lessonDialog.back") : Locale.label("plans.lessonDialog.close")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
