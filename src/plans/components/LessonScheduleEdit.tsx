import React, { useEffect, useState, useCallback } from "react";
import { FormControl, InputLabel, MenuItem, Select, TextField, type SelectChangeEvent } from "@mui/material";
import { ApiHelper, ArrayHelper, DateHelper, ErrorMessages, InputBox, Locale } from "@churchapps/apphelper";
import { type PlanInterface } from "../../helpers";

interface LessonTreeInterface {
  programs?: Array<{
    id: string;
    name: string;
    studies?: Array<{
      id: string;
      name: string;
      lessons?: Array<{
        id: string;
        name: string;
        venues?: Array<{
          id: string;
          name: string;
        }>;
      }>;
    }>;
  }>;
}

interface Props {
  ministryId: string;
  planTypeId?: string;
  onSave: (plan: PlanInterface) => void;
  onCancel: () => void;
}

export const LessonScheduleEdit: React.FC<Props> = (props) => {
  const [scheduledDate, setScheduledDate] = useState<Date>(() => {
    const date = DateHelper.getLastSunday();
    date.setDate(date.getDate() + 7);
    return date;
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [lessonTree, setLessonTree] = useState<LessonTreeInterface>({});

  const [programId, setProgramId] = useState<string>("");
  const [studyId, setStudyId] = useState<string>("");
  const [lessonId, setLessonId] = useState<string>("");
  const [venueId, setVenueId] = useState<string>("");

  const getDefault = useCallback((array: Array<{ id: string }> | undefined, currentId: string) => {
    if (!array || array.length === 0) return "";
    if (currentId && ArrayHelper.getOne(array, "id", currentId)) return currentId;
    return array[0].id;
  }, []);

  const currentProgram = ArrayHelper.getOne(lessonTree?.programs || [], "id", programId);
  const currentStudy = ArrayHelper.getOne(currentProgram?.studies || [], "id", studyId);
  const currentLesson = ArrayHelper.getOne(currentStudy?.lessons || [], "id", lessonId);
  const currentVenue = ArrayHelper.getOne(currentLesson?.venues || [], "id", venueId);

  // Auto-select defaults when data loads
  useEffect(() => {
    if (lessonTree?.programs?.length > 0 && !programId) {
      setProgramId(getDefault(lessonTree.programs, programId));
    }
  }, [lessonTree, programId, getDefault]);

  useEffect(() => {
    if (currentProgram?.studies?.length > 0) {
      setStudyId(getDefault(currentProgram.studies, studyId));
    }
  }, [currentProgram, studyId, getDefault]);

  useEffect(() => {
    if (currentStudy?.lessons?.length > 0) {
      setLessonId(getDefault(currentStudy.lessons, lessonId));
    }
  }, [currentStudy, lessonId, getDefault]);

  useEffect(() => {
    if (currentLesson?.venues?.length > 0) {
      setVenueId(getDefault(currentLesson.venues, venueId));
    }
  }, [currentLesson, venueId, getDefault]);

  const loadLessonTree = useCallback(async () => {
    const data = await ApiHelper.getAnonymous("/lessons/public/tree", "LessonsApi");
    setLessonTree(data || {});
  }, []);

  useEffect(() => {
    loadLessonTree();
  }, [loadLessonTree]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrors([]);
    setScheduledDate(new Date(e.target.value));
  };

  const handleProgramChange = (e: SelectChangeEvent<string>) => {
    setProgramId(e.target.value);
    setStudyId("");
    setLessonId("");
    setVenueId("");
  };

  const handleStudyChange = (e: SelectChangeEvent<string>) => {
    setStudyId(e.target.value);
    setLessonId("");
    setVenueId("");
  };

  const handleLessonChange = (e: SelectChangeEvent<string>) => {
    setLessonId(e.target.value);
    setVenueId("");
  };

  const handleVenueChange = (e: SelectChangeEvent<string>) => {
    setVenueId(e.target.value);
  };

  const validate = () => {
    const result: string[] = [];
    if (!scheduledDate) result.push(Locale.label("plans.lessonScheduleEdit.dateRequired") || "Please select a date");
    if (!venueId) result.push(Locale.label("plans.lessonScheduleEdit.venueRequired") || "Please select a venue");
    setErrors(result);
    return result.length === 0;
  };

  const getDisplayName = () => {
    const studyName = currentStudy?.name || "";
    const lessonName = currentLesson?.name || "";
    return studyName + " - " + lessonName;
  };

  const handleSave = async () => {
    if (validate()) {
      const displayName = getDisplayName();
      const formattedDate = DateHelper.prettyDate(scheduledDate);

      // Create the plan with the lesson venue association
      const newPlan: PlanInterface = {
        ministryId: props.ministryId,
        planTypeId: props.planTypeId,
        serviceDate: scheduledDate,
        name: `${formattedDate} - ${displayName}`,
        notes: "",
        serviceOrder: true,
        contentType: "venue",
        contentId: venueId,
      };

      const savedPlans = await ApiHelper.post("/plans", [newPlan], "DoingApi");
      if (savedPlans && savedPlans.length > 0) {
        props.onSave(savedPlans[0]);
      }
    }
  };

  const getProgramOptions = () => {
    return lessonTree?.programs?.map((p) => (
      <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
    )) || [];
  };

  const getStudyOptions = () => {
    return currentProgram?.studies?.map((s) => (
      <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
    )) || [];
  };

  const getLessonOptions = () => {
    return currentStudy?.lessons?.map((l) => (
      <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>
    )) || [];
  };

  const getVenueOptions = () => {
    return currentLesson?.venues?.map((v) => (
      <MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>
    )) || [];
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

        <FormControl fullWidth>
          <InputLabel>{Locale.label("plans.lessonSelector.program") || "Program"}</InputLabel>
          <Select
            label={Locale.label("plans.lessonSelector.program") || "Program"}
            value={programId}
            onChange={handleProgramChange}
          >
            {getProgramOptions()}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>{Locale.label("plans.lessonSelector.study") || "Study"}</InputLabel>
          <Select
            label={Locale.label("plans.lessonSelector.study") || "Study"}
            value={studyId}
            onChange={handleStudyChange}
            disabled={!programId}
          >
            {getStudyOptions()}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>{Locale.label("plans.lessonSelector.lesson") || "Lesson"}</InputLabel>
          <Select
            label={Locale.label("plans.lessonSelector.lesson") || "Lesson"}
            value={lessonId}
            onChange={handleLessonChange}
            disabled={!studyId}
          >
            {getLessonOptions()}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>{Locale.label("plans.lessonSelector.venue") || "Venue"}</InputLabel>
          <Select
            label={Locale.label("plans.lessonSelector.venue") || "Venue"}
            value={venueId}
            onChange={handleVenueChange}
            disabled={!lessonId}
          >
            {getVenueOptions()}
          </Select>
        </FormControl>
      </InputBox>
    </>
  );
};
