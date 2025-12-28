import React, { useEffect, useState, useCallback } from "react";
import { FormControl, InputLabel, MenuItem, Select, TextField, ToggleButton, ToggleButtonGroup, Box, Typography, type SelectChangeEvent } from "@mui/material";
import { ApiHelper, ArrayHelper, DateHelper, ErrorMessages, InputBox, Locale } from "@churchapps/apphelper";
import { type PlanInterface, type ExternalProviderInterface, type ExternalVenueRefInterface } from "../../helpers";
import { type LessonTreeInterface } from "./PlanUtils";

interface Props {
  ministryId: string;
  planTypeId?: string;
  plans?: PlanInterface[];
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
  const [copyMode, setCopyMode] = useState<string>("all"); // "none" | "positions" | "all"

  const [programId, setProgramId] = useState<string>("");
  const [studyId, setStudyId] = useState<string>("");
  const [lessonId, setLessonId] = useState<string>("");
  const [venueId, setVenueId] = useState<string>("");

  // External provider state
  const [providerType, setProviderType] = useState<"internal" | "external">("internal");
  const [externalProviders, setExternalProviders] = useState<ExternalProviderInterface[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ExternalProviderInterface | null>(null);

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

  const getDefault = useCallback((array: Array<{ id: string }> | undefined, currentId: string) => {
    if (!array || array.length === 0) return "";
    if (currentId && ArrayHelper.getOne(array, "id", currentId)) return currentId;
    return array[0].id;
  }, []);

  const currentProgram = ArrayHelper.getOne(lessonTree?.programs || [], "id", programId);
  const currentStudy = ArrayHelper.getOne(currentProgram?.studies || [], "id", studyId);
  const currentLesson = ArrayHelper.getOne(currentStudy?.lessons || [], "id", lessonId);

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

  const loadExternalProviders = useCallback(async () => {
    try {
      const providers = await ApiHelper.get("/externalProviders", "LessonsApi");
      setExternalProviders(providers || []);
    } catch (error) {
      console.error("Error loading external providers:", error);
      setExternalProviders([]);
    }
  }, []);

  const loadExternalLessonTree = useCallback(async (provider: ExternalProviderInterface) => {
    if (!provider?.apiUrl) return;
    try {
      const response = await fetch(provider.apiUrl);
      const data = await response.json();
      setLessonTree(data || {});
      // Auto-select defaults for external tree
      if (data?.programs?.length > 0) {
        const firstProgram = data.programs[0];
        setProgramId(firstProgram.id);
        if (firstProgram.studies?.length > 0) {
          const firstStudy = firstProgram.studies[0];
          setStudyId(firstStudy.id);
          if (firstStudy.lessons?.length > 0) {
            const firstLesson = firstStudy.lessons[0];
            setLessonId(firstLesson.id);
            if (firstLesson.venues?.length > 0) {
              setVenueId(firstLesson.venues[0].id);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error loading external lesson tree:", error);
      setLessonTree({});
    }
  }, []);

  const handleProviderTypeChange = useCallback((newType: "internal" | "external") => {
    setProviderType(newType);
    setSelectedProvider(null);
    setLessonTree({});
    setProgramId("");
    setStudyId("");
    setLessonId("");
    setVenueId("");
    if (newType === "internal") {
      loadLessonTree();
    }
  }, [loadLessonTree]);

  const handleProviderChange = useCallback((providerId: string) => {
    const provider = externalProviders.find(p => p.id === providerId);
    setSelectedProvider(provider || null);
    setProgramId("");
    setStudyId("");
    setLessonId("");
    setVenueId("");
    if (provider) {
      loadExternalLessonTree(provider);
    }
  }, [externalProviders, loadExternalLessonTree]);

  useEffect(() => {
    loadLessonTree();
    loadExternalProviders();
  }, [loadLessonTree, loadExternalProviders]);

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
      let contentType: string;
      let contentId: string;

      if (providerType === "external" && selectedProvider) {
        // External venue - store the full ref as JSON in contentId
        const externalRef: ExternalVenueRefInterface = {
          externalProviderId: selectedProvider.id!,
          programId,
          studyId,
          lessonId,
          venueId
        };
        contentType = "externalVenue";
        contentId = JSON.stringify(externalRef);
      } else {
        contentType = "venue";
        contentId = venueId;
      }

      const newPlan: PlanInterface = {
        ministryId: props.ministryId,
        planTypeId: props.planTypeId,
        serviceDate: scheduledDate,
        name: `${formattedDate} - ${displayName}`,
        notes: "",
        serviceOrder: true,
        contentType,
        contentId,
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

        {externalProviders.length > 0 && (
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>{Locale.label("plans.lessonSelector.lessonSource") || "Lesson Source"}</Typography>
            <ToggleButtonGroup
              value={providerType}
              exclusive
              onChange={(_, value) => value && handleProviderTypeChange(value)}
              size="small"
              fullWidth
            >
              <ToggleButton value="internal">{Locale.label("plans.lessonSelector.lessonsChurch") || "Lessons.church"}</ToggleButton>
              <ToggleButton value="external">{Locale.label("plans.lessonSelector.externalProvider") || "External Provider"}</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}

        {providerType === "external" && (
          <FormControl fullWidth>
            <InputLabel>{Locale.label("plans.lessonSelector.provider") || "Provider"}</InputLabel>
            <Select
              label={Locale.label("plans.lessonSelector.provider") || "Provider"}
              value={selectedProvider?.id || ""}
              onChange={(e) => handleProviderChange(e.target.value)}
            >
              {externalProviders.map((provider) => (
                <MenuItem key={provider.id} value={provider.id}>
                  {provider.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <FormControl fullWidth disabled={providerType === "external" && !selectedProvider}>
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

        {previousPlan && (
          <FormControl fullWidth>
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
    </>
  );
};
