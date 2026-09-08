import React, { useCallback } from "react";
import { TextField, Snackbar, Alert, Menu, MenuItem } from "@mui/material";
import { Save as SaveIcon, ArrowDropDown as ArrowDropDownIcon } from "@mui/icons-material";
import { SectionLabel, Verb, Verbs, platedColor } from "../plated";
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
import { PositionEdit } from "./PositionEdit";
import { PositionList } from "./PositionList";
import { AssignmentEdit } from "./AssignmentEdit";
import { TimeList } from "./TimeList";
import { PlanValidation } from "./PlanValidation";

interface Props {
  plan: PlanInterface;
  plated?: boolean;
}

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
  const [allPlans, setAllPlans] = React.useState<PlanInterface[]>([]);
  const [copyMenuAnchor, setCopyMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [plateSlice, setPlateSlice] = React.useState<"serving" | "notes" | "times">("serving");
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
    setPlateSlice("serving");
  };

  const getAddPositionActions = () => {
    if (!canEdit) return null;

    if (positions.length === 0 && previousPlan) {
      return (
        <>
          <Verb onClick={(e) => setCopyMenuAnchor(e.currentTarget)}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              {Locale.label("plans.planEdit.copyPrevious") || "Copy from Previous"}
              <ArrowDropDownIcon sx={{ fontSize: 16 }} />
            </span>
          </Verb>
          <Menu anchorEl={copyMenuAnchor} open={Boolean(copyMenuAnchor)} onClose={() => setCopyMenuAnchor(null)}>
            <MenuItem onClick={() => handleCopyClick("positions")}>{Locale.label("plans.planEdit.copyPositions") || "Positions Only"}</MenuItem>
            <MenuItem onClick={() => handleCopyClick("all")}>{Locale.label("plans.planEdit.copyAll") || "Positions and Assignments"}</MenuItem>
          </Menu>
          <Verb onClick={addPosition} testId="add-position-button">{Locale.label("plans.assignment.addPosition")}</Verb>
        </>
      );
    }

    return (
      <>
        {plan?.lastAutofillRunId && (
          <Verb onClick={handleUndoAutoAssign} testId="undo-auto-assign-button">{Locale.label("plans.assignment.undoAutoAssign") || "Undo Auto Assign"}</Verb>
        )}
        <Verb onClick={handleAutoAssign} testId="auto-assign-button">{Locale.label("plans.assignment.autoAssign")}</Verb>
        <Verb onClick={addPosition} testId="add-position-button">{Locale.label("plans.assignment.addPosition")}</Verb>
      </>
    );
  };

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
    setPlan(props.plan);
    // Refresh the plan row itself — autofill/undo/publish mutate prepared and lastAutofillRunId.
    ApiHelper.get("/plans/" + props.plan?.id, "DoingApi").then((data: PlanInterface) => {
      if (data?.id) setPlan(data);
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
      setShowSuccessMessage(true);
    });
  };

  const handleAutoAssign = async () => {
    const groupIds = ArrayHelper.getUniqueValues(positions, "groupId");
    const groupMembers = await ApiHelper.get("/groupMembers/?groupIds=" + groupIds.join(","), "MembershipApi");
    const teams: { positionId: string; personIds: string[] }[] = [];
    positions.forEach((p) => {
      const filteredMembers = ArrayHelper.getAll(groupMembers, "groupId", p.groupId);
      teams.push({ positionId: p.id || "", personIds: filteredMembers.map((m) => m.personId) || [] });
    });
    ApiHelper.post("/plans/autofill/" + props.plan.id, { teams }, "DoingApi").then(() => {
      loadData();
    });
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

  const totalNeeded = positions.reduce((s, p) => s + (p.count || 0), 0);
  const totalFilled = positions.reduce((s, p) => s + Math.min(assignments.filter((a) => a.positionId === p.id).length, p.count || 0), 0);
  const remaining = Math.max(0, totalNeeded - totalFilled);

  const filledLabel = remaining > 0
    ? remaining + " " + Locale.label("plans.assignment.needed")
    : Locale.label("plans.assignment.fullyStaffed");

  return (
    <>
      <SectionLabel sx={{ mt: 0 }}>
        {Locale.label("plans.planPage.assign") || "Serving this hour"}
        {plan?.prepared && (
          <span data-testid="penciled-in-chip" style={{ marginLeft: 8, color: platedColor.first, fontWeight: 600, letterSpacing: 0, textTransform: "none" }}>
            {Locale.label("plans.assignment.penciledIn") || "Penciled In"}
          </span>
        )}
      </SectionLabel>
      {positions.length > 0 && (
        <div style={{ color: platedColor.mute, fontSize: "0.92rem" }}>
          {Locale.label("plans.assignment.positionsFilled").replace("{filled}", totalFilled.toString()).replace("{total}", totalNeeded.toString())}
          {" · "}
          <span style={{ color: remaining > 0 ? platedColor.first : platedColor.here }}>{filledLabel}</span>
        </div>
      )}
      <Verbs>
        {getAddPositionActions()}
        <Verb onClick={() => setPlateSlice(plateSlice === "notes" ? "serving" : "notes")}>{Locale.label("common.notes") || "Notes"}</Verb>
        <Verb onClick={() => setPlateSlice(plateSlice === "times" ? "serving" : "times")}>{Locale.label("plans.timeList.times") || "Times"}</Verb>
      </Verbs>

      {plateSlice === "notes" && (
        <>
          <TextField
            fullWidth
            multiline
            rows={6}
            value={plan?.notes || ""}
            onChange={canEdit ? (e) => { setPlan({ ...(plan || {}), notes: e.target.value }); } : undefined}
            data-testid="plan-notes-input"
            aria-label={Locale.label("plans.assignment.planNotesAria")}
            placeholder={canEdit ? Locale.label("plans.assignment.notesPlaceholder") : Locale.label("plans.assignment.notesPlaceholderReadOnly")}
            variant="standard"
            disabled={!canEdit}
          />
          {canEdit && (
            <Verbs>
              <Verb onClick={handleSave}><SaveIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: "text-bottom" }} />{Locale.label("plans.assignment.saveNotes")}</Verb>
            </Verbs>
          )}
        </>
      )}

      {plateSlice === "times" && (
        <TimeList times={times} positions={positions} plan={plan as PlanInterface} canEdit={canEdit} onUpdate={loadData} />
      )}

      {plateSlice === "serving" && (
        <>
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
            />
          )}
          <PositionList positions={positions} assignments={assignments} people={people} groups={groups} canEdit={canEdit} onSelect={(p) => { setAssignment(null); setPosition(p); }} onAssignmentSelect={handleAssignmentSelect} />
          <PlanValidation plan={plan as PlanInterface} positions={positions} assignments={assignments} people={people} times={times} blockoutDates={blockoutDates} canEdit={canEdit} onUpdate={loadData} />
        </>
      )}

      <Snackbar
        open={showSuccessMessage}
        autoHideDuration={3000}
        onClose={() => setShowSuccessMessage(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert onClose={() => setShowSuccessMessage(false)} severity="success" variant="filled" sx={{ width: "100%" }}>
          {Locale.label("plans.planPage.noteSave") || "Notes saved successfully"}
        </Alert>
      </Snackbar>
    </>
  );
};
