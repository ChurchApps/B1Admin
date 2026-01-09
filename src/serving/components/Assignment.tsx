import React, { useCallback } from "react";
import {
  Grid, TextField, Card, CardContent, Typography, Stack, Button, Snackbar, Alert, Menu, MenuItem
} from "@mui/material";
import { PublishedWithChanges as AutoAssignIcon, Add as AddIcon, StickyNote2 as NotesIcon, Save as SaveIcon, ContentCopy as CopyIcon, ArrowDropDown as ArrowDropDownIcon } from "@mui/icons-material";
import {
  type AssignmentInterface,
  type BlockoutDateInterface,
  type GroupInterface,
  type PersonInterface,
  type PlanInterface,
  type PositionInterface,
  type TimeInterface,
} from "@churchapps/helpers";
import {
  ApiHelper,
  ArrayHelper,
  Locale,
  UserHelper,
  Permissions,
} from "@churchapps/apphelper";
import { PositionEdit } from "./PositionEdit";
import { PositionList } from "./PositionList";
import { AssignmentEdit } from "./AssignmentEdit";
import { TimeList } from "./TimeList";
import { PlanValidation } from "./PlanValidation";

interface Props {
  plan: PlanInterface;
}

export const Assignment = (props: Props) => {
  const [plan, setPlan] = React.useState<PlanInterface>(null);
  const canEdit = UserHelper.checkAccess(Permissions.membershipApi.plans.edit);
  const [positions, setPositions] = React.useState<PositionInterface[]>([]);
  const [assignments, setAssignments] = React.useState<AssignmentInterface[]>([]);
  const [people, setPeople] = React.useState<PersonInterface[]>([]);
  const [groups, setGroups] = React.useState<GroupInterface[]>([]);
  const [position, setPosition] = React.useState<PositionInterface>(null);
  const [assignment, setAssignment] = React.useState<AssignmentInterface>(null);
  const [times, setTimes] = React.useState<TimeInterface[]>([]);
  const [blockoutDates, setBlockoutDates] = React.useState<BlockoutDateInterface[]>([]);
  const [showSuccessMessage, setShowSuccessMessage] = React.useState(false);
  const [allPlans, setAllPlans] = React.useState<PlanInterface[]>([]);
  const [copyMenuAnchor, setCopyMenuAnchor] = React.useState<null | HTMLElement>(null);

  // Get the most recent plan that is before the current plan's date
  const previousPlan = React.useMemo(() => {
    if (allPlans.length === 0 || !props.plan?.serviceDate) return null;
    const currentDate = new Date(props.plan.serviceDate).getTime();
    const sorted = [...allPlans]
      .filter(p => {
        if (p.id === props.plan?.id) return false;
        const planDate = p.serviceDate ? new Date(p.serviceDate).getTime() : 0;
        return planDate < currentDate;  // Only include plans before current plan
      })
      .sort((a, b) => {
        const dateA = a.serviceDate ? new Date(a.serviceDate).getTime() : 0;
        const dateB = b.serviceDate ? new Date(b.serviceDate).getTime() : 0;
        return dateB - dateA;  // Sort descending to get most recent previous plan first
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

  const getAddPositionActions = () => {
    if (!canEdit) return null;

    // When no positions exist, show copy from previous dropdown instead of Auto Assign
    if (positions.length === 0 && previousPlan) {
      return (
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="outlined"
            startIcon={<CopyIcon />}
            endIcon={<ArrowDropDownIcon />}
            onClick={(e) => setCopyMenuAnchor(e.currentTarget)}
            size="small"
            sx={{
              textTransform: "none",
              borderRadius: 2,
              fontWeight: 600,
            }}>
            {Locale.label("plans.planEdit.copyPrevious") || "Copy from Previous"}
          </Button>
          <Menu
            anchorEl={copyMenuAnchor}
            open={Boolean(copyMenuAnchor)}
            onClose={() => setCopyMenuAnchor(null)}
          >
            <MenuItem onClick={() => handleCopyClick("positions")}>
              {Locale.label("plans.planEdit.copyPositions") || "Positions Only"}
            </MenuItem>
            <MenuItem onClick={() => handleCopyClick("all")}>
              {Locale.label("plans.planEdit.copyAll") || "Positions and Assignments"}
            </MenuItem>
          </Menu>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setPosition({
                categoryName: "Band",
                name: "",
                planId: props.plan?.id,
                count: 1,
              });
            }}
            data-testid="add-position-button"
            size="small"
            sx={{
              textTransform: "none",
              borderRadius: 2,
              fontWeight: 600,
            }}>
            {Locale.label("plans.assignment.addPosition")}
          </Button>
        </Stack>
      );
    }

    // When positions exist, show Auto Assign and Add Position buttons
    return (
      <Stack direction="row" spacing={1}>
        <Button
          variant="outlined"
          startIcon={<AutoAssignIcon />}
          onClick={handleAutoAssign}
          data-testid="auto-assign-button"
          size="small"
          sx={{
            textTransform: "none",
            borderRadius: 2,
            fontWeight: 600,
          }}>
          {Locale.label("plans.assignment.autoAssign")}
        </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setPosition({
              categoryName: positions?.length > 0 ? positions[0].categoryName : "Band",
              name: "",
              planId: props.plan?.id,
              count: 1,
            });
          }}
          data-testid="add-position-button"
          size="small"
          sx={{
            textTransform: "none",
            borderRadius: 2,
            fontWeight: 600,
          }}>
          {Locale.label("plans.assignment.addPosition")}
        </Button>
      </Stack>
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
    const positionsData = await ApiHelper.get("/positions/plan/" + props.plan?.id, "DoingApi");
    setPositions(positionsData);

    const groupIds = ArrayHelper.getUniqueValues(positionsData, "groupId").filter(id => id);
    if (groupIds.length > 0) {
      ApiHelper.get("/groups/ids?ids=" + groupIds.join(","), "MembershipApi").then((data: GroupInterface[]) => {
        setGroups(data);
      });
    }

    ApiHelper.get("/times/plan/" + props.plan?.id, "DoingApi").then((data) => {
      setTimes(data);
    });
    ApiHelper.get("/blockoutDates/upcoming", "DoingApi").then((data) => {
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
      teams.push({ positionId: p.id, personIds: filteredMembers.map((m) => m.personId) || [] });
    });
    ApiHelper.post("/plans/autofill/" + props.plan.id, { teams }, "DoingApi").then(() => {
      loadData();
    });
  };

  // Load all plans for the plan type to find previous plan for copy functionality
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

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 8 }}>
        {/* Assignments Section */}
        <Card
          sx={{
            mb: 3,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "grey.200",
            transition: "all 0.2s ease-in-out",
            "&:hover": { boxShadow: 2 },
          }}>
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <AutoAssignIcon sx={{ color: "primary.main", fontSize: 28 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
                  {Locale.label("plans.planPage.assign") || "Team Assignments"}
                </Typography>
              </Stack>
              {getAddPositionActions()}
            </Stack>
            <PositionList positions={positions} assignments={assignments} people={people} groups={groups} onSelect={(p) => setPosition(p)} onAssignmentSelect={handleAssignmentSelect} />
          </CardContent>
        </Card>

        {/* Notes Section */}
        <Card
          sx={{
            borderRadius: 2,
            border: "1px solid",
            borderColor: "grey.200",
            transition: "all 0.2s ease-in-out",
            "&:hover": { boxShadow: 2 },
          }}>
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <NotesIcon sx={{ color: "primary.main", fontSize: 28 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
                  {Locale.label("common.notes") || "Plan Notes"}
                </Typography>
              </Stack>
              {canEdit && (
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  size="small"
                  sx={{
                    textTransform: "none",
                    borderRadius: 2,
                    fontWeight: 600,
                  }}>
                  {Locale.label("plans.assignment.saveNotes")}
                </Button>
              )}
            </Stack>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={plan?.notes || ""}
              onChange={canEdit ? (e) => {
                setPlan({ ...plan, notes: e.target.value });
              } : undefined}
              data-testid="plan-notes-input"
              aria-label="Plan notes"
              placeholder={canEdit ? "Add notes for this service plan..." : "Plan notes (read-only)"}
              variant="outlined"
              disabled={!canEdit}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  backgroundColor: canEdit ? "grey.50" : "grey.100",
                  "&:hover": { backgroundColor: canEdit ? "#FFF" : "grey.100" },
                  "&.Mui-focused": { backgroundColor: canEdit ? "#FFF" : "grey.100" },
                },
              }}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <Stack spacing={3}>
          {/* Position/Assignment Edit */}
          {canEdit && position && !assignment && (
            <PositionEdit
              position={position}
              categoryNames={positions?.length > 0 ? ArrayHelper.getUniqueValues(positions, "categoryName") : [Locale.label("plans.planPage.band")]}
              updatedFunction={() => {
                setPosition(null);
                loadData();
              }}
            />
          )}
          {canEdit && assignment && position && (
            <AssignmentEdit
              position={position}
              assignment={assignment}
              peopleNeeded={position.count - ArrayHelper.getAll(assignments, "positionId", position.id).length}
              updatedFunction={handleAssignmentUpdate}
            />
          )}

          {/* Time List */}
          <TimeList times={times} positions={positions} plan={plan} onUpdate={loadData} />

          {/* Plan Validation */}
          <PlanValidation plan={plan} positions={positions} assignments={assignments} people={people} times={times} blockoutDates={blockoutDates} onUpdate={loadData} />
        </Stack>
      </Grid>

      {/* Success Snackbar */}
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
    </Grid>
  );
};
