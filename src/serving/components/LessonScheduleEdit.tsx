import React, { useState, useCallback } from "react";
import { FormControl, InputLabel, MenuItem, Select, TextField, Box, Typography, Button } from "@mui/material";
import { MenuBook as MenuBookIcon } from "@mui/icons-material";
import { ApiHelper, DateHelper, ErrorMessages, InputBox, Locale } from "@churchapps/apphelper";
import { type PlanInterface } from "../../helpers";
import { LessonSelector } from "./LessonSelector";

interface Props {
  ministryId: string;
  planTypeId?: string;
  plans?: PlanInterface[];
  onSave: (plan: PlanInterface) => void;
  onCancel: () => void;
}

export const LessonScheduleEdit: React.FC<Props> = (props) => {
  const [scheduledDate, setScheduledDate] = useState<Date>(() => {
    const lastSunday = DateHelper.getLastSunday();
    // Create a new date using local year/month/day to avoid timezone issues
    return new Date(lastSunday.getFullYear(), lastSunday.getMonth(), lastSunday.getDate() + 7, 12, 0, 0);
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [copyMode, setCopyMode] = useState<string>("all"); // "none" | "positions" | "all"

  // Selected lesson state
  const [selectedVenueId, setSelectedVenueId] = useState<string>("");
  const [selectedVenueName, setSelectedVenueName] = useState<string>("");
  const [selectedContentPath, setSelectedContentPath] = useState<string>("");
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");

  // Lesson selector modal state
  const [showLessonSelector, setShowLessonSelector] = useState(false);

  // Get the most recent plan that is before the new plan's scheduled date
  const previousPlan = React.useMemo(() => {
    if (!props.plans || props.plans.length === 0 || !scheduledDate) return null;
    const currentDate = new Date(scheduledDate).getTime();
    const sorted = [...props.plans]
      .filter(p => {
        const planDate = p.serviceDate ? new Date(p.serviceDate).getTime() : 0;
        return planDate < currentDate;  // Only include plans before new plan's date
      })
      .sort((a, b) => {
        const dateA = a.serviceDate ? new Date(a.serviceDate).getTime() : 0;
        const dateB = b.serviceDate ? new Date(b.serviceDate).getTime() : 0;
        return dateB - dateA;  // Sort descending to get most recent previous plan first
      });
    return sorted[0] || null;
  }, [props.plans, scheduledDate]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrors([]);
    setScheduledDate(DateHelper.toDate(e.target.value));
  };

  const handleLessonSelect = useCallback((venueId: string, venueName?: string, contentPath?: string, providerId?: string) => {
    setSelectedVenueId(venueId);
    setSelectedVenueName(venueName || "");
    setSelectedContentPath(contentPath || "");
    setSelectedProviderId(providerId || "");
    setShowLessonSelector(false);
  }, []);

  const validate = () => {
    const result: string[] = [];
    if (!scheduledDate) result.push(Locale.label("plans.lessonScheduleEdit.dateRequired") || "Please select a date");
    if (!selectedVenueId) result.push(Locale.label("plans.lessonScheduleEdit.venueRequired") || "Please select a lesson venue");
    setErrors(result);
    return result.length === 0;
  };

  const handleSave = async () => {
    if (validate()) {
      const formattedDate = DateHelper.prettyDate(scheduledDate);
      const displayName = selectedVenueName || "Lesson";

      const newPlan: PlanInterface = {
        ministryId: props.ministryId,
        planTypeId: props.planTypeId,
        serviceDate: scheduledDate,
        name: `${formattedDate} - ${displayName}`,
        notes: "",
        serviceOrder: true,
        // New provider system
        providerId: selectedProviderId,
        providerPlanId: selectedContentPath || selectedVenueId,
        providerPlanName: displayName,
        // Backward compat
        contentType: "provider",
        contentId: selectedVenueId
      };

      let savedPlan: PlanInterface;
      if (copyMode === "none" || !previousPlan) {
        const savedPlans = await ApiHelper.post("/plans", [newPlan], "DoingApi");
        savedPlan = savedPlans?.[0];
      } else {
        savedPlan = await ApiHelper.post("/plans/copy/" + previousPlan.id, { ...newPlan, copyMode }, "DoingApi");
      }

      if (savedPlan) {
        props.onSave(savedPlan);
      }
    }
  };

  return (
    <>
      <ErrorMessages errors={errors} />
      <InputBox
        headerText={Locale.label("plans.lessonScheduleEdit.scheduleLesson") || "Schedule Lesson"}
        headerIcon="menu_book"
        saveFunction={handleSave}
        cancelFunction={props.onCancel}
      >
        <TextField
          fullWidth
          label={Locale.label("plans.lessonScheduleEdit.scheduledDate") || "Scheduled Date"}
          type="date"
          value={DateHelper.formatHtml5Date(scheduledDate)}
          onChange={handleDateChange}
          data-testid="scheduled-date-input"
          aria-label="Scheduled date"
        />

        {/* Lesson Selection */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {Locale.label("plans.lessonSelector.lesson") || "Lesson"}
          </Typography>
          {selectedVenueId ? (
            <Box
              sx={{
                p: 2,
                border: 1,
                borderColor: "primary.main",
                borderRadius: 1,
                bgcolor: "action.hover",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <MenuBookIcon color="primary" />
                <Typography variant="subtitle1">{selectedVenueName || selectedVenueId}</Typography>
              </Box>
              <Button
                size="small"
                onClick={() => setShowLessonSelector(true)}
              >
                {Locale.label("common.change") || "Change"}
              </Button>
            </Box>
          ) : (
            <Button
              variant="outlined"
              fullWidth
              onClick={() => setShowLessonSelector(true)}
              startIcon={<MenuBookIcon />}
              sx={{ py: 2 }}
            >
              {Locale.label("plans.lessonScheduleEdit.selectLesson") || "Select Lesson"}
            </Button>
          )}
        </Box>

        {previousPlan && (
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>{Locale.label("plans.planEdit.copyPrevious") || "Copy from previous plan"}</InputLabel>
            <Select
              label={Locale.label("plans.planEdit.copyPrevious") || "Copy from previous plan"}
              value={copyMode}
              onChange={(e) => setCopyMode(e.target.value)}
              data-testid="copy-mode-select"
            >
              <MenuItem value="none">{Locale.label("plans.planEdit.copyNothing") || "Nothing"}</MenuItem>
              <MenuItem value="positions">{Locale.label("plans.planEdit.copyPositions") || "Positions Only"}</MenuItem>
              <MenuItem value="all">{Locale.label("plans.planEdit.copyAll") || "Positions and Assignments"}</MenuItem>
            </Select>
          </FormControl>
        )}
      </InputBox>

      <LessonSelector
        open={showLessonSelector}
        onClose={() => setShowLessonSelector(false)}
        onSelect={handleLessonSelect}
        returnVenueName={true}
        ministryId={props.ministryId}
        initialNavigationPath={previousPlan?.providerPlanId}
        initialProviderId={previousPlan?.providerId}
        previousVenueName={previousPlan?.providerPlanName}
      />
    </>
  );
};
