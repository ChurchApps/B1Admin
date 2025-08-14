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
} from "@mui/material";
import { ApiHelper } from "@churchapps/apphelper";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (venueId: string) => void;
}

export const LessonSelector: React.FC<Props> = ({ open, onClose, onSelect }) => {
  const [lessonTree, setLessonTree] = useState<any>({});
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [selectedStudy, setSelectedStudy] = useState<string>("");
  const [selectedLesson, setSelectedLesson] = useState<string>("");
  const [selectedVenue, setSelectedVenue] = useState<string>("");

  const loadLessonTree = useCallback(async () => {
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
  }, []);

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
    if (selectedVenue) {
      onSelect(selectedVenue);
      onClose();
    }
  }, [selectedVenue, onSelect, onClose]);

  const handleClose = useCallback(() => {
    setSelectedProgram("");
    setSelectedStudy("");
    setSelectedLesson("");
    setSelectedVenue("");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) loadLessonTree();
  }, [open, loadLessonTree]);

  const currentProgram = getCurrentProgram();
  const currentStudy = getCurrentStudy();
  const currentLesson = getCurrentLesson();

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Associate Lesson</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>Program</InputLabel>
            <Select
              value={selectedProgram}
              onChange={(e) => handleProgramChange(e.target.value)}
              label="Program"
            >
              {lessonTree?.programs?.map((program: any) => (
                <MenuItem key={program.id} value={program.id}>
                  {program.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth disabled={!selectedProgram}>
            <InputLabel>Study</InputLabel>
            <Select
              value={selectedStudy}
              onChange={(e) => handleStudyChange(e.target.value)}
              label="Study"
            >
              {currentProgram?.studies?.map((study: any) => (
                <MenuItem key={study.id} value={study.id}>
                  {study.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth disabled={!selectedStudy}>
            <InputLabel>Lesson</InputLabel>
            <Select
              value={selectedLesson}
              onChange={(e) => handleLessonChange(e.target.value)}
              label="Lesson"
            >
              {currentStudy?.lessons?.map((lesson: any) => (
                <MenuItem key={lesson.id} value={lesson.id}>
                  {lesson.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth disabled={!selectedLesson}>
            <InputLabel>Venue</InputLabel>
            <Select
              value={selectedVenue}
              onChange={(e) => handleVenueChange(e.target.value)}
              label="Venue"
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
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSelect} disabled={!selectedVenue} variant="contained">
          Associate Lesson
        </Button>
      </DialogActions>
    </Dialog>
  );
};