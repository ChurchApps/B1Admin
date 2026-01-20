import React, { useState, useCallback, useEffect, useMemo } from "react";
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
import { LessonsChurchProvider, type ContentFolder, type Instructions, type InstructionItem } from "@churchapps/content-provider-helper";
import { type LessonActionTreeInterface } from "./PlanUtils";
import { type ExternalVenueRefInterface } from "../../helpers";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (actionId: string, actionName: string, seconds?: number) => void;
  venueId?: string;
  externalRef?: ExternalVenueRefInterface;
}

// Helper to create a venue folder for the provider
function createVenueFolder(venueId: string): ContentFolder {
  return {
    type: "folder",
    id: venueId,
    title: "",
    providerData: { level: "playlist", venueId }
  };
}

export const ActionSelector: React.FC<Props> = ({ open, onClose, onSelect, venueId, externalRef }) => {
  const provider = useMemo(() => new LessonsChurchProvider(), []);

  const [actionTree, setActionTree] = useState<LessonActionTreeInterface>({});
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [selectedStudy, setSelectedStudy] = useState<string>("");
  const [selectedLesson, setSelectedLesson] = useState<string>("");
  const [selectedVenue, setSelectedVenue] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedAction, setSelectedAction] = useState<string>("");

  // For venue-specific mode using ContentProviderHelper
  const [instructions, setInstructions] = useState<Instructions | null>(null);
  const [sections, setSections] = useState<InstructionItem[]>([]);

  const loadVenueActions = useCallback(async () => {
    if (!venueId) return;

    try {
      if (externalRef) {
        // For external providers, still use the API endpoint
        const data = await ApiHelper.getAnonymous(
          `/externalProviders/${externalRef.externalProviderId}/venue/${externalRef.venueId}/actions`,
          "LessonsApi"
        );
        // Convert to Instructions format
        const instructionItems: InstructionItem[] = (data?.sections || []).map((s: any) => ({
          id: s.id,
          label: s.name,
          itemType: "lessonSection",
          relatedId: s.id,
          children: s.actions?.map((a: any) => ({
            id: a.id,
            label: a.name,
            description: a.actionType,
            seconds: a.seconds,
            itemType: "lessonAction",
            relatedId: a.id
          }))
        }));
        setInstructions({ venueName: data?.venueName, items: instructionItems });
        setSections(instructionItems);

        // Auto-select first section and action
        if (instructionItems.length > 0) {
          setSelectedSection(instructionItems[0].id || "");
          if (instructionItems[0].children?.length) {
            setSelectedAction(instructionItems[0].children[0].id || "");
          }
        }
      } else {
        // Use ContentProviderHelper for internal venues
        const venueFolder = createVenueFolder(venueId);
        const result = await provider.getExpandedInstructions(venueFolder);

        if (result) {
          setInstructions(result);
          // Extract sections that have children (actions)
          const sectionItems = result.items.flatMap(item =>
            item.children?.filter(child => child.children && child.children.length > 0) || []
          );
          setSections(sectionItems);

          // Auto-select first section and action
          if (sectionItems.length > 0) {
            setSelectedSection(sectionItems[0].relatedId || sectionItems[0].id || "");
            if (sectionItems[0].children?.length) {
              setSelectedAction(sectionItems[0].children[0].relatedId || sectionItems[0].children[0].id || "");
            }
          }
        }
      }
    } catch (error) {
      console.error("Error loading venue actions:", error);
      setInstructions(null);
      setSections([]);
    }
  }, [venueId, externalRef, provider]);

  const loadActionTree = useCallback(async () => {
    // If venueId is provided, load actions for that venue only
    if (venueId) {
      loadVenueActions();
      return;
    }

    // For full tree browsing, keep using the API (out of scope for this refactor)
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
  }, [venueId, loadVenueActions]);

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
    return sections.find(s => (s.relatedId || s.id) === selectedSection);
  }, [sections, selectedSection]);

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

  const handleVenueChange = useCallback((newVenueId: string) => {
    setSelectedVenue(newVenueId);
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
      let actionName = "Action";
      let actionSeconds: number | undefined;

      if (venueId) {
        // Find action from sections (Instructions format)
        const section = getCurrentVenueSection();
        const action = section?.children?.find(a => (a.relatedId || a.id) === selectedAction);
        actionName = action?.label || "Action";
        actionSeconds = action?.seconds;
      } else {
        // Find action from tree
        const section = getCurrentSection();
        const action = section?.actions?.find((a: any) => a.id === selectedAction);
        actionName = action?.name || "Action";
        actionSeconds = action?.seconds;
      }

      onSelect(selectedAction, actionName, actionSeconds);
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
    setInstructions(null);
    setSections([]);
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
                {instructions?.venueName || "Loading..."}
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
                {sections.map((section) => (
                  <MenuItem key={section.relatedId || section.id} value={section.relatedId || section.id}>
                    {section.label}
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
                {currentVenueSection?.children?.map((action) => (
                  <MenuItem key={action.relatedId || action.id} value={action.relatedId || action.id}>
                    {action.label} ({action.description})
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
