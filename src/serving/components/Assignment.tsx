import React, { useCallback } from "react";
import { Box, TextField, Typography, Stack, Button, Snackbar, Alert, Menu, MenuItem } from "@mui/material";
import { ArrowDropDown as ArrowDropDownIcon } from "@mui/icons-material";
import {
  type AssignmentInterface,
  type BlockoutDateInterface,
  type GroupInterface,
  type PersonInterface,
  type PositionInterface,
  type TimeInterface
} from "@churchapps/helpers";
import { type PlanInterface, hasPlansEditAccess } from "../../helpers";
import {
  ApiHelper,
  ArrayHelper,
  Locale
} from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { Pill, RecordHeading, TextAction, VerbRow } from "../../components/ui";
import { PositionEdit } from "./PositionEdit";
import { PositionList } from "./PositionList";
import { AssignmentEdit } from "./AssignmentEdit";
import { TimeList } from "./TimeList";
import { PlanValidation } from "./PlanValidation";

interface Props {
  plan: PlanInterface;
  /** "" = positions, "notes" or "times"; held in the plan page's ?view=. */
  view: string;
  onViewChange: (view: string) => void;
}

// Flatten a boxed panel so it reads as a section of the record surface.
const flatCardSx = { "& .MuiPaper-root": { border: 0, boxShadow: "none", bgcolor: "transparent" }, "& .om-head, & .om-body": { px: 0, pt: 0 } };

export const Assignment = (props: Props) => {
  const [plan, setPlan] = React.useState<PlanInterface | null>(null);
  const hasPlansEdit = hasPlansEditAccess();

  const myMinistriesQuery = useQuery<GroupInterface[]>({
    queryKey: ["/groups/my/ministry", "MembershipApi"],
    enabled: !hasPlansEdit && !!props.plan?.ministryId,
    placeholderData: []
  });

  const isMinistryMember = !hasPlansEdit && !!props.plan?.ministryId && (myMinistriesQuery.data || []).some((g) => g.id === props.plan.ministryId);
  const canEdit = hasPlansEdit || isMinistryMember;
  const [positions, setPositions] = React.useState<PositionInterface[]>([]);
  const [assignments, setAssignments] = React.useState<AssignmentInterface[]>([]);
  const [people, setPeople] = React.useState<PersonInterface[]>([]);
  const [groups, setGroups] = React.useState<GroupInterface[]>([]);
  const [position, setPosition] = React.useState<PositionInterface | null>(null);
  const [assignment, setAssignment] = React.useState<AssignmentInterface | null>(null);
  const [times, setTimes] = React.useState<TimeInterface[]>([]);
  const [blockoutDates, setBlockoutDates] = React.useState<BlockoutDateInterface[]>([]);
  const [showSuccessMessage, setShowSuccessMessage] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const notesDirty = React.useRef(false);
  const [allPlans, setAllPlans] = React.useState<PlanInterface[]>([]);
  const [copyMenuAnchor, setCopyMenuAnchor] = React.useState<null | HTMLElement>(null);
  // Hoisted: the compiler emits non-optional guard reads (position.count/position.id) for
  // the AssignmentEdit JSX deps, which crash while position is still null.
  const peopleNeededForPosition = position ? (position.count || 0) - ArrayHelper.getAll(assignments, "positionId", position.id).length : 0;

  const previousPlan = React.useMemo(() => {
    if (allPlans.length === 0 || !props.plan?.serviceDate) return null;
    const currentDate = new Date(props.plan.serviceDate).getTime();
    const sorted = [...allPlans]
      .filter(p => {
        if (p.id === props.plan?.id) return false;
        const planDate = p.serviceDate ? new Date(p.serviceDate).getTime() : 0;
        return planDate < currentDate;
      })
      .sort((a, b) => {
        const dateA = a.serviceDate ? new Date(a.serviceDate).getTime() : 0;
        const dateB = b.serviceDate ? new Date(b.serviceDate).getTime() : 0;
        return dateB - dateA;
      });
    return sorted[0] || null;
  }, [allPlans, props.plan?.id, props.plan?.serviceDate]);

  const handleCopyClick = async (mode: string) => {
    setCopyMenuAnchor(null);
    if (!previousPlan || !mode) return;
    await ApiHelper.post("/plans/copy/" + previousPlan.id, {
      ...props.plan,
      copyMode: mode
    }, "DoingApi");
    loadData();
  };

  const addPosition = () => {
    setAssignment(null);
    setPosition({
      categoryName: positions?.length > 0 ? positions[0].categoryName : "Band",
      name: "",
      planId: props.plan?.id,
      count: 1
    });
    if (props.view) props.onViewChange("");
  };

  const toggleView = (next: string) => props.onViewChange(props.view === next ? "" : next);

  const handleAssignmentSelect = (p: PositionInterface, a: AssignmentInterface) => {
    setAssignment(a);
    setPosition(p);
  };

  const handleAssignmentUpdate = (done: boolean) => {
    if (done) {
      setAssignment(null);
      setPosition(null);
    }
    loadData();
  };

  const loadData = useCallback(async () => {
    const keepNotes = (next: PlanInterface) => (prev: PlanInterface | null) => (notesDirty.current && prev ? { ...next, notes: prev.notes } : next);
    setPlan(keepNotes(props.plan));
    // Refresh the plan row itself — autofill/undo/publish mutate prepared and lastAutofillRunId.
    ApiHelper.get("/plans/" + props.plan?.id, "DoingApi").then((data: PlanInterface) => {
      if (data?.id) setPlan(keepNotes(data));
    });
    const positionsData = await ApiHelper.get("/positions/plan/" + props.plan?.id, "DoingApi");
    setPositions(positionsData);

    const groupIds = ArrayHelper.getUniqueValues(positionsData, "groupId").filter(id => id);
    if (groupIds.length > 0) {
      ApiHelper.get("/groups/ids?ids=" + groupIds.join(","), "MembershipApi").then((data: GroupInterface[]) => {
        setGroups(data);
      });
    }

    ApiHelper.get("/times/plan/" + props.plan?.id, "DoingApi").then((data: any) => {
      setTimes(data);
    });
    ApiHelper.get("/blockoutDates/upcoming", "DoingApi").then((data: any) => {
      setBlockoutDates(data);
    });
    const d = await ApiHelper.get("/assignments/plan/" + props.plan?.id, "DoingApi");
    setAssignments(d);
    const peopleIds = ArrayHelper.getUniqueValues(d, "personId");
    if (peopleIds.length > 0) {
      ApiHelper.get("/people/ids?ids=" + peopleIds.join(","), "MembershipApi").then((data: PersonInterface[]) => {
        setPeople(data);
      });
    }
  }, [props.plan]);

  const handleSave = () => {
    ApiHelper.post("/plans", [plan], "DoingApi").then(() => {
      notesDirty.current = false;
      setShowSuccessMessage(true);
    });
  };

  const handleAutoAssign = async () => {
    try {
      const withGroup = positions.filter((p) => p.groupId);
      const groupIds = ArrayHelper.getUniqueValues(withGroup, "groupId");
      const groupMembers = groupIds.length > 0 ? await ApiHelper.get("/groupMembers/?groupIds=" + groupIds.join(","), "MembershipApi") : [];
      const teams: { positionId: string; personIds: string[] }[] = [];
      withGroup.forEach((p) => {
        const filteredMembers = ArrayHelper.getAll(groupMembers, "groupId", p.groupId);
        teams.push({ positionId: p.id || "", personIds: filteredMembers.map((m) => m.personId) || [] });
      });
      await ApiHelper.post("/plans/autofill/" + props.plan.id, { teams }, "DoingApi");
      loadData();
    } catch {
      setErrorMessage(Locale.label("common.saveError"));
    }
  };

  const handleUndoAutoAssign = async () => {
    ApiHelper.post("/plans/autofill/" + props.plan.id + "/undo", {}, "DoingApi").then(() => {
      loadData();
    });
  };

  const loadPlans = useCallback(async () => {
    if (props.plan?.planTypeId) {
      const plans = await ApiHelper.get("/plans/types/" + props.plan.planTypeId, "DoingApi");
      setAllPlans(plans || []);
    } else if (props.plan?.ministryId) {
      const plans = await ApiHelper.get("/plans", "DoingApi");
      const filtered = ArrayHelper.getAll(plans || [], "ministryId", props.plan.ministryId);
      setAllPlans(filtered);
    }
  }, [props.plan?.planTypeId, props.plan?.ministryId]);


  React.useEffect(() => {
    loadData();
    loadPlans();
  }, [props.plan?.id, loadData, loadPlans]);

  const categoryNames = React.useMemo(() => positions?.length > 0 ? ArrayHelper.getUniqueValues(positions, "categoryName") : [Locale.label("plans.planPage.band")], [positions]);

  const verbs = [
    canEdit && positions.length === 0 && previousPlan && (
      <Box key="copy" component="span" onClick={(e: React.MouseEvent<HTMLElement>) => setCopyMenuAnchor(e.currentTarget)}>
        <TextAction data-testid="copy-previous-button">
          <Box component="span" sx={{ display: "inline-flex", alignItems: "center" }}>
            {Locale.label("plans.planEdit.copyPrevious") || "Copy from Previous"}
            <ArrowDropDownIcon sx={{ fontSize: 18 }} />
          </Box>
        </TextAction>
      </Box>
    ),
    canEdit && positions.length > 0 && plan?.lastAutofillRunId && (
      <TextAction key="undo" onClick={handleUndoAutoAssign} data-testid="undo-auto-assign-button">{Locale.label("plans.assignment.undoAutoAssign") || "Undo Auto Assign"}</TextAction>
    ),
    canEdit && positions.length > 0 && (
      <TextAction key="auto" onClick={handleAutoAssign} data-testid="auto-assign-button">{Locale.label("plans.assignment.autoAssign")}</TextAction>
    ),
    canEdit && <TextAction key="add" onClick={addPosition} data-testid="add-position-button">{Locale.label("plans.assignment.addPosition")}</TextAction>,
    <TextAction key="notes" onClick={() => toggleView("notes")} data-testid="plan-notes-toggle">
      {props.view === "notes" ? Locale.label("serving.planPage.hideNotes", "Hide notes") : Locale.label("common.notes")}
    </TextAction>,
    <TextAction key="times" onClick={() => toggleView("times")} data-testid="plan-times-toggle">
      {props.view === "times" ? Locale.label("serving.planPage.hideTimes", "Hide times") : Locale.label("plans.timeList.times")}
    </TextAction>
  ];

  const totalNeeded = positions.reduce((s, p) => s + (p.count || 0), 0);
  const totalFilled = positions.reduce((s, p) => s + Math.min(assignments.filter((a) => a.positionId === p.id).length, p.count || 0), 0);
  const remaining = Math.max(0, totalNeeded - totalFilled);

  return (
    <Box component="section" aria-labelledby="plan-serving-heading" data-testid="plan-serving">
      <RecordHeading id="plan-serving-heading" label={Locale.label("plans.planPage.assign") || "Serving Team Assignments"}>
        {plan?.prepared && <Pill tone="warning" data-testid="penciled-in-chip">{Locale.label("plans.assignment.penciledIn") || "Penciled In"}</Pill>}
      </RecordHeading>
      {positions.length > 0 && (
        <Typography variant="body2" color="text.secondary" data-testid="plan-staffing">
          {Locale.label("plans.assignment.positionsFilled").replace("{filled}", totalFilled.toString()).replace("{total}", totalNeeded.toString())}
          {" · "}
          <Box component="span" sx={{ color: remaining > 0 ? "var(--b1-warning)" : "success.main", fontWeight: 600 }}>
            {remaining > 0 ? remaining + " " + Locale.label("plans.assignment.needed") : Locale.label("plans.assignment.fullyStaffed")}
          </Box>
        </Typography>
      )}
      <VerbRow sx={{ mt: 1.5, mb: 2 }}>{verbs}</VerbRow>
      <Menu anchorEl={copyMenuAnchor} open={Boolean(copyMenuAnchor)} onClose={() => setCopyMenuAnchor(null)}>
        <MenuItem onClick={() => handleCopyClick("positions")}>
          {Locale.label("plans.planEdit.copyPositions") || "Positions Only"}
        </MenuItem>
        <MenuItem onClick={() => handleCopyClick("all")}>
          {Locale.label("plans.planEdit.copyAll") || "Positions and Assignments"}
        </MenuItem>
      </Menu>

      {props.view === "notes" && (
        <Stack spacing={1.5} alignItems="flex-start">
          <TextField
            fullWidth
            multiline
            rows={5}
            value={plan?.notes || ""}
            onChange={canEdit ? (e) => {
              notesDirty.current = true;
              setPlan({ ...(plan || {}), notes: e.target.value });
            } : undefined}
            data-testid="plan-notes-input"
            aria-label={Locale.label("plans.assignment.planNotesAria")}
            placeholder={canEdit ? Locale.label("plans.assignment.notesPlaceholder") : Locale.label("plans.assignment.notesPlaceholderReadOnly")}
            variant="outlined"
            disabled={!canEdit}
          />
          {canEdit && (
            <Button variant="contained" onClick={handleSave} data-testid="save-plan-notes-button">
              {Locale.label("plans.assignment.saveNotes")}
            </Button>
          )}
        </Stack>
      )}

      {props.view === "times" && (
        <TimeList times={times} positions={positions} plan={plan as PlanInterface} canEdit={canEdit} onUpdate={loadData} />
      )}

      {!props.view && (
        <Stack spacing={3}>
          {canEdit && position && !assignment && (
            <PositionEdit
              key={position?.id || position?.name || "new-position"}
              position={position}
              categoryNames={categoryNames}
              updatedFunction={() => {
                setPosition(null);
                loadData();
              }}
            />
          )}
          {canEdit && assignment && position && (
            <AssignmentEdit
              key={assignment?.id || position?.id || "new-assignment"}
              position={position}
              assignment={assignment}
              peopleNeeded={peopleNeededForPosition}
              updatedFunction={handleAssignmentUpdate}
              assignedPersonIds={assignments.filter(a => a.positionId === position.id).map(a => a.personId)}
            />
          )}
          <Box sx={{ overflowX: "auto" }}>
            <PositionList positions={positions} assignments={assignments} people={people} groups={groups} canEdit={canEdit} onSelect={(p) => { setAssignment(null); setPosition(p); }} onAssignmentSelect={handleAssignmentSelect} />
          </Box>
          <Box sx={flatCardSx}>
            <PlanValidation plan={plan as PlanInterface} positions={positions} assignments={assignments} people={people} times={times} blockoutDates={blockoutDates} canEdit={canEdit} onUpdate={loadData} />
          </Box>
        </Stack>
      )}

      <Snackbar
        open={showSuccessMessage}
        autoHideDuration={3000}
        onClose={() => setShowSuccessMessage(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert
          onClose={() => setShowSuccessMessage(false)}
          severity="success"
          variant="filled"
          sx={{ width: "100%" }}>
          {Locale.label("plans.planPage.noteSave") || "Notes saved successfully"}
        </Alert>
      </Snackbar>
      <Snackbar open={!!errorMessage} autoHideDuration={6000} onClose={() => setErrorMessage(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert onClose={() => setErrorMessage(null)} severity="error" variant="filled" sx={{ width: "100%" }}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};
