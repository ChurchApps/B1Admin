import React, { memo } from "react";
import { Box, Button, Typography, Icon, Stack } from "@mui/material";
import { Locale } from "@churchapps/apphelper";
import { type PlanItemInterface } from "../../helpers";
import { formatTime, getSectionDuration } from "./PlanUtils";

interface Props {
  lessonItems: PlanItemInterface[];
  venueName: string;
  onCustomize: () => void;
}

export const LessonPreview = memo((props: Props) => {
  const renderPreviewItem = (item: PlanItemInterface, isChild: boolean = false) => {
    if (item.itemType === "header") {
      const sectionDuration = getSectionDuration(item);
      return (
        <Box key={item.id} sx={{ mb: 2 }}>
          <Box
            className="planItemHeader"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              p: 1,
              backgroundColor: "grey.100",
              borderRadius: 1,
            }}
          >
            <Typography sx={{ fontWeight: 600 }}>{item.label}</Typography>
            {sectionDuration > 0 && (
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Icon sx={{ fontSize: 16, color: "grey.500" }}>schedule</Icon>
                <Typography variant="body2" sx={{ color: "grey.600" }}>
                  {formatTime(sectionDuration)}
                </Typography>
              </Stack>
            )}
          </Box>
          {item.children?.map((child) => renderPreviewItem(child, true))}
        </Box>
      );
    }

    return (
      <Box
        key={item.id}
        className="planItem"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 1,
          pl: isChild ? 3 : 1,
          borderBottom: "1px solid",
          borderColor: "grey.200",
        }}
      >
        <Box>
          <Typography variant="body2">{item.label}</Typography>
          {item.description && (
            <Typography variant="caption" sx={{ color: "grey.600", fontStyle: "italic" }}>
              {item.description}
            </Typography>
          )}
        </Box>
        {item.seconds > 0 && (
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Icon sx={{ fontSize: 16, color: "grey.500" }}>schedule</Icon>
            <Typography variant="body2" sx={{ color: "grey.600" }}>
              {formatTime(item.seconds)}
            </Typography>
          </Stack>
        )}
      </Box>
    );
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
          opacity: 0.5,
          pointerEvents: "none",
          filter: "grayscale(0.3)",
        }}
      >
        {props.lessonItems.map((item) => renderPreviewItem(item))}
      </Box>
    </Box>
  );
});
