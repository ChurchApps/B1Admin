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

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (venueId: string, venueName?: string) => void;
  venueId?: string;
  returnVenueName?: boolean;
}

export const LessonSelector: React.FC<Props> = ({ open, onClose, onSelect, venueId, returnVenueName }) => {
  const [lessonTree, setLessonTree] = useState<any>({});
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [selectedStudy, setSelectedStudy] = useState<string>("");
  const [selectedLesson, setSelectedLesson] = useState<string>("");
  const [selectedVenue, setSelectedVenue] = useState<string>("");
  const [venueInfo, setVenueInfo] = useState<any>(null);

  const loadLessonTree = useCallback(async () => {
    // If venueId is provided, skip loading the tree
    if (venueId) {
      try {
        const venueData = await ApiHelper.getAnonymous("/venues/public/" + venueId, "LessonsApi");
        setVenueInfo(venueData);
      } catch (error) {
        console.error("Error loading venue info:", error);
      }
      return;
    }

    try {
      const data = await ApiHelper.getAnonymous("/lessons/public/tree", "LessonsApi");
      setLessonTree(data || {});

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
              setSelectedVenue(firstLesson.venues[0].id);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error loading lesson tree:", error);
      setLessonTree({});
    }
  }, [venueId]);

  const getCurrentProgram = useCallback(() => {
    return lessonTree?.programs?.find((p: any) => p.id === selectedProgram);
  }, [lessonTree, selectedProgram]);

  const getCurrentStudy = useCallback(() => {
    const program = getCurrentProgram();
    return program?.studies?.find((s: any) => s.id === selectedStudy);
  }, [getCurrentProgram, selectedStudy]);

  const getCurrentLesson = useCallback(() => {
    const study = getCurrentStudy();
    return study?.lessons?.find((l: any) => l.id === selectedLesson);
  }, [getCurrentStudy, selectedLesson]);

  const handleProgramChange = useCallback((programId: string) => {
    setSelectedProgram(programId);
    setSelectedStudy("");
    setSelectedLesson("");
    setSelectedVenue("");
  }, []);

  const handleStudyChange = useCallback((studyId: string) => {
    setSelectedStudy(studyId);
    setSelectedLesson("");
    setSelectedVenue("");
  }, []);

  const handleLessonChange = useCallback((lessonId: string) => {
    setSelectedLesson(lessonId);
    setSelectedVenue("");
  }, []);

  const handleVenueChange = useCallback((venueId: string) => {
    setSelectedVenue(venueId);
  }, []);

  const handleSelect = useCallback(() => {
    if (venueId) {
      // Use the pre-associated venue
      onSelect(venueId, venueInfo?.name);
      onClose();
    } else if (selectedVenue) {
      const currentLessonData = getCurrentLesson();
      const selectedVenueData = currentLessonData?.venues?.find((v: any) => v.id === selectedVenue);
      onSelect(selectedVenue, returnVenueName ? selectedVenueData?.name : undefined);
      onClose();
    }
  }, [venueId, venueInfo, selectedVenue, getCurrentLesson, returnVenueName, onSelect, onClose]);

  const handleClose = useCallback(() => {
    setSelectedProgram("");
    setSelectedStudy("");
    setSelectedLesson("");
    setSelectedVenue("");
    setVenueInfo(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) loadLessonTree();
  }, [open, loadLessonTree]);

  const currentProgram = getCurrentProgram();
  const currentStudy = getCurrentStudy();
  const currentLesson = getCurrentLesson();

  // If venueId is provided, show simplified view
  if (venueId) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{Locale.label("plans.lessonSelector.addFromLesson") || "Add from Associated Lesson"}</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Typography variant="body1">
              {Locale.label("plans.lessonSelector.usingAssociatedLesson") || "Using associated lesson:"}
            </Typography>
            <Typography variant="h6" sx={{ mt: 1, color: "primary.main" }}>
              {venueInfo?.name || "Loading..."}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>{Locale.label("common.cancel")}</Button>
          <Button onClick={handleSelect} disabled={!venueInfo} variant="contained">
            {Locale.label("plans.lessonSelector.addLesson") || "Add Lesson"}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{Locale.label("plans.lessonSelector.associateLesson")}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>{Locale.label("plans.lessonSelector.program")}</InputLabel>
            <Select
              value={selectedProgram}
              onChange={(e) => handleProgramChange(e.target.value)}
              label={Locale.label("plans.lessonSelector.program")}
            >
              {lessonTree?.programs?.map((program: any) => (
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


        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{Locale.label("common.cancel")}</Button>
        <Button onClick={handleSelect} disabled={!selectedVenue} variant="contained">
          {Locale.label("plans.lessonSelector.associateLesson")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};