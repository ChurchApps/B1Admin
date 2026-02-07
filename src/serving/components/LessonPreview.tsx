import React, { memo } from "react";
import { Box, Button, Typography } from "@mui/material";
import { Locale } from "@churchapps/apphelper";
import { type PlanItemInterface } from "../../helpers";
import { getSectionDuration } from "./PlanUtils";
import { PlanItem } from "./PlanItem";

interface Props {
  lessonItems: PlanItemInterface[];
  venueName: string;
  onCustomize: () => void;
  associatedProviderId?: string;
  associatedVenueId?: string;
  ministryId?: string;
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
          associatedVenueId={props.associatedVenueId}
          ministryId={props.ministryId}
        />
      );
      cumulativeTime += getSectionDuration(item);
    });

    return result;
  };

  return (
    <Box sx={{ position: "relative" }}>
      {/* Top header with label and Customize button */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {Locale.label("plans.serviceOrder.lessonPreview") || "Lesson Preview"}: {props.venueName}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          size="small"
          onClick={props.onCustomize}
          sx={{
            textTransform: "none",
            fontWeight: 600,
          }}
        >
          {Locale.label("plans.serviceOrder.customizeLesson") || "Customize"}
        </Button>
      </Box>

      {/* Preview explanation banner */}
      <Box sx={{ textAlign: "center", py: 1, px: 2, bgcolor: "info.light", borderRadius: 1, mb: 1 }}>
        <Typography variant="body2" color="info.contrastText">
          {Locale.label("plans.serviceOrder.previewBanner") || "This is a preview of the associated lesson. Click \"Customize\" to edit."}
        </Typography>
      </Box>

      {/* Grayed out preview content */}
      <Box
        sx={{
          opacity: 0.7,
          filter: "grayscale(0.3)",
        }}
      >
        {renderPreviewItems()}
      </Box>
    </Box>
  );
});
