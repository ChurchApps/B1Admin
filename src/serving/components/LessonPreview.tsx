import { memo } from "react";
import { Box, Button, Typography } from "@mui/material";
import { Locale } from "@churchapps/apphelper";
import { type PlanItemInterface } from "../../helpers";
import { getSectionDuration } from "./PlanUtils";
import { PlanItem } from "./PlanItem";
import { type ProviderMediaInfo } from "./planItemUtils";

interface Props {
  lessonItems: PlanItemInterface[];
  contentName: string;
  onCustomize: () => void;
  associatedProviderId?: string;
  associatedContentPath?: string;
  ministryId?: string;
  mediaLookup?: Record<string, ProviderMediaInfo>;
}

export const LessonPreview = memo((props: Props) => {
  const renderPreviewItems = () => {
    const result: JSX.Element[] = [];
    let cumulativeTime = 0;

    props.lessonItems.forEach((item, index) => {
      const startTime = cumulativeTime;
      result.push(
        <PlanItem
          key={item.id || `preview-${index}`}
          planItem={item}
          setEditPlanItem={null}
          showItemDrop={false}
          onDragChange={() => {}}
          onChange={() => {}}
          readOnly={true}
          startTime={startTime}
          associatedProviderId={props.associatedProviderId}
          associatedContentPath={props.associatedContentPath}
          ministryId={props.ministryId}
          mediaLookup={props.mediaLookup}
        />
      );
      cumulativeTime += getSectionDuration(item);
    });

    return result;
  };

  return (
    <Box sx={{ position: "relative" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2
        }}
      >
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {Locale.label("plans.serviceOrder.lessonPreview") || "Lesson Preview"}: {props.contentName}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          size="small"
          onClick={props.onCustomize}
          sx={{
            textTransform: "none",
            fontWeight: 600
          }}
        >
          {Locale.label("plans.serviceOrder.customizeLesson") || "Customize"}
        </Button>
      </Box>

      <Box sx={{ textAlign: "center", py: 1, px: 2, bgcolor: "info.light", borderRadius: 1, mb: 1 }}>
        <Typography variant="body2" color="info.contrastText">
          {Locale.label("plans.serviceOrder.previewBanner") || "This is a preview of the associated lesson. Click \"Customize\" to edit."}
        </Typography>
      </Box>

      <Box
        sx={{
          opacity: 0.7,
          filter: "grayscale(0.3)"
        }}
      >
        {renderPreviewItems()}
      </Box>
    </Box>
  );
});
