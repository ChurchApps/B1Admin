import React, { useState, useCallback, useEffect } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Typography,
  Box,
} from "@mui/material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { type LessonActionTreeInterface, type VenueActionResponseInterface } from "./PlanUtils";
import { type ExternalVenueRefInterface } from "../../helpers";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (actionId: string, actionName: string, seconds?: number) => void;
  venueId?: string;
  externalRef?: ExternalVenueRefInterface;
}

export const ActionSelector: React.FC<Props> = ({ open, onClose, onSelect, venueId, externalRef }) => {
  const [actionTree, setActionTree] = useState<LessonActionTreeInterface>({});
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [selectedStudy, setSelectedStudy] = useState<string>("");
  const [selectedLesson, setSelectedLesson] = useState<string>("");
  const [selectedVenue, setSelectedVenue] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [venueActions, setVenueActions] = useState<VenueActionResponseInterface | null>(null);

  const loadActionTree = useCallback(async () => {
    // If venueId is provided, load actions for that venue only
    if (venueId) {
      try {
        let data;
        if (externalRef) {
          data = await ApiHelper.getAnonymous(`/externalProviders/${externalRef.externalProviderId}/venue/${externalRef.venueId}/actions`, "LessonsApi");
        } else {
          data = await ApiHelper.getAnonymous("/venues/public/actions/" + venueId, "LessonsApi");
        }
        setVenueActions(data || { sections: [] });

        // Auto-select first section and action
        if (data?.sections?.length > 0) {
          const firstSection = data.sections[0];
          setSelectedSection(firstSection.id);
          if (firstSection.actions?.length > 0) {
            setSelectedAction(firstSection.actions[0].id);
          }
        }
      } catch (error) {
        console.error("Error loading venue actions:", error);
        setVenueActions({ sections: [] });
      }
      return;
    }

    try {
      const data = await ApiHelper.getAnonymous("/lessons/public/actionTree", "LessonsApi");
      setActionTree(data || {});

      // Auto-select defaults
      if (data?.programs?.length > 0) {
        const firstProgram = data.programs[0];
        setSelectedProgram(firstProgram.id);

        if (firstProgram.studies?.length > 0) {
          const firstStudy = firstProgram.studies[0];
          setSelectedStudy(firstStudy.id);

          if (firstStudy.lessons?.length > 0) {
            const firstLesson = firstStudy.lessons[0];
            setSelectedLesson(firstLesson.id);

            if (firstLesson.venues?.length > 0) {
              const firstVenue = firstLesson.venues[0];
              setSelectedVenue(firstVenue.id);

              if (firstVenue.sections?.length > 0) {
                const firstSection = firstVenue.sections[0];
                setSelectedSection(firstSection.id);

                if (firstSection.actions?.length > 0) {
                  setSelectedAction(firstSection.actions[0].id);
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error loading action tree:", error);
      setActionTree({});
    }
  }, [venueId, externalRef]);

  const getCurrentProgram = useCallback(() => {
    return actionTree?.programs?.find((p: any) => p.id === selectedProgram);
  }, [actionTree, selectedProgram]);

  const getCurrentStudy = useCallback(() => {
    const program = getCurrentProgram();
    return program?.studies?.find((s: any) => s.id === selectedStudy);
  }, [getCurrentProgram, selectedStudy]);

  const getCurrentLesson = useCallback(() => {
    const study = getCurrentStudy();
    return study?.lessons?.find((l: any) => l.id === selectedLesson);
  }, [getCurrentStudy, selectedLesson]);

  const getCurrentVenue = useCallback(() => {
    const lesson = getCurrentLesson();
    return lesson?.venues?.find((v: any) => v.id === selectedVenue);
  }, [getCurrentLesson, selectedVenue]);

  const getCurrentSection = useCallback(() => {
    const venue = getCurrentVenue();
    return venue?.sections?.find((s: any) => s.id === selectedSection);
  }, [getCurrentVenue, selectedSection]);

  const getCurrentVenueSection = useCallback(() => {
    return venueActions?.sections?.find((s: any) => s.id === selectedSection);
  }, [venueActions, selectedSection]);

  const handleProgramChange = useCallback((programId: string) => {
    setSelectedProgram(programId);
    setSelectedStudy("");
    setSelectedLesson("");
    setSelectedVenue("");
    setSelectedSection("");
    setSelectedAction("");
  }, []);

  const handleStudyChange = useCallback((studyId: string) => {
    setSelectedStudy(studyId);
    setSelectedLesson("");
    setSelectedVenue("");
    setSelectedSection("");
    setSelectedAction("");
  }, []);

  const handleLessonChange = useCallback((lessonId: string) => {
    setSelectedLesson(lessonId);
    setSelectedVenue("");
    setSelectedSection("");
    setSelectedAction("");
  }, []);

  const handleVenueChange = useCallback((venueId: string) => {
    setSelectedVenue(venueId);
    setSelectedSection("");
    setSelectedAction("");
  }, []);

  const handleSectionChange = useCallback((sectionId: string) => {
    setSelectedSection(sectionId);
    setSelectedAction("");
  }, []);

  const handleActionChange = useCallback((actionId: string) => {
    setSelectedAction(actionId);
  }, []);

  const handleSelect = useCallback(() => {
    if (selectedAction) {
      const section = venueId ? getCurrentVenueSection() : getCurrentSection();
      const action = section?.actions?.find((a: any) => a.id === selectedAction);
      onSelect(selectedAction, action?.name || "Action", action?.seconds);
      onClose();
    }
  }, [selectedAction, venueId, getCurrentVenueSection, getCurrentSection, onSelect, onClose]);

  const handleClose = useCallback(() => {
    setSelectedProgram("");
    setSelectedStudy("");
    setSelectedLesson("");
    setSelectedVenue("");
    setSelectedSection("");
    setSelectedAction("");
    setVenueActions(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) loadActionTree();
  }, [open, loadActionTree]);

  const currentProgram = getCurrentProgram();
  const currentStudy = getCurrentStudy();
  const currentLesson = getCurrentLesson();
  const currentVenue = getCurrentVenue();
  const currentSection = getCurrentSection();
  const currentVenueSection = getCurrentVenueSection();

  // If venueId is provided, show simplified view with just section and action
  if (venueId) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{Locale.label("plans.actionSelector.selectAction") || "Select Action"}</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {Locale.label("plans.actionSelector.fromAssociatedLesson") || "From associated lesson:"}
              <Typography component="span" sx={{ fontWeight: 600, ml: 1, color: "primary.main" }}>
                {venueActions?.venueName || "Loading..."}
              </Typography>
            </Typography>
          </Box>
          <Stack spacing={3}>
            <FormControl fullWidth>
              <InputLabel>{Locale.label("plans.actionSelector.section") || "Section"}</InputLabel>
              <Select
                value={selectedSection}
                onChange={(e) => handleSectionChange(e.target.value)}
                label={Locale.label("plans.actionSelector.section") || "Section"}
              >
                {venueActions?.sections?.map((section: any) => (
                  <MenuItem key={section.id} value={section.id}>
                    {section.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth disabled={!selectedSection}>
              <InputLabel>{Locale.label("plans.actionSelector.action") || "Action"}</InputLabel>
              <Select
                value={selectedAction}
                onChange={(e) => handleActionChange(e.target.value)}
                label={Locale.label("plans.actionSelector.action") || "Action"}
              >
                {currentVenueSection?.actions?.map((action: any) => (
                  <MenuItem key={action.id} value={action.id}>
                    {action.name} ({action.actionType})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>{Locale.label("common.cancel")}</Button>
          <Button onClick={handleSelect} disabled={!selectedAction} variant="contained">
            {Locale.label("plans.actionSelector.selectAction") || "Select Action"}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{Locale.label("plans.actionSelector.selectAction") || "Select Action"}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>{Locale.label("plans.lessonSelector.program")}</InputLabel>
            <Select
              value={selectedProgram}
              onChange={(e) => handleProgramChange(e.target.value)}
              label={Locale.label("plans.lessonSelector.program")}
            >
              {actionTree?.programs?.map((program: any) => (
                <MenuItem key={program.id} value={program.id}>
                  {program.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth disabled={!selectedProgram}>
            <InputLabel>{Locale.label("plans.lessonSelector.study")}</InputLabel>
            <Select
              value={selectedStudy}
              onChange={(e) => handleStudyChange(e.target.value)}
              label={Locale.label("plans.lessonSelector.study")}
            >
              {currentProgram?.studies?.map((study: any) => (
                <MenuItem key={study.id} value={study.id}>
                  {study.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth disabled={!selectedStudy}>
            <InputLabel>{Locale.label("plans.lessonSelector.lesson")}</InputLabel>
            <Select
              value={selectedLesson}
              onChange={(e) => handleLessonChange(e.target.value)}
              label={Locale.label("plans.lessonSelector.lesson")}
            >
              {currentStudy?.lessons?.map((lesson: any) => (
                <MenuItem key={lesson.id} value={lesson.id}>
                  {lesson.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth disabled={!selectedLesson}>
            <InputLabel>{Locale.label("plans.lessonSelector.venue")}</InputLabel>
            <Select
              value={selectedVenue}
              onChange={(e) => handleVenueChange(e.target.value)}
              label={Locale.label("plans.lessonSelector.venue")}
            >
              {currentLesson?.venues?.map((venue: any) => (
                <MenuItem key={venue.id} value={venue.id}>
                  {venue.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth disabled={!selectedVenue}>
            <InputLabel>{Locale.label("plans.actionSelector.section") || "Section"}</InputLabel>
            <Select
              value={selectedSection}
              onChange={(e) => handleSectionChange(e.target.value)}
              label={Locale.label("plans.actionSelector.section") || "Section"}
            >
              {currentVenue?.sections?.map((section: any) => (
                <MenuItem key={section.id} value={section.id}>
                  {section.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth disabled={!selectedSection}>
            <InputLabel>{Locale.label("plans.actionSelector.action") || "Action"}</InputLabel>
            <Select
              value={selectedAction}
              onChange={(e) => handleActionChange(e.target.value)}
              label={Locale.label("plans.actionSelector.action") || "Action"}
            >
              {currentSection?.actions?.map((action: any) => (
                <MenuItem key={action.id} value={action.id}>
                  {action.name} ({action.actionType})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{Locale.label("common.cancel")}</Button>
        <Button onClick={handleSelect} disabled={!selectedAction} variant="contained">
          {Locale.label("plans.actionSelector.selectAction") || "Select Action"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
