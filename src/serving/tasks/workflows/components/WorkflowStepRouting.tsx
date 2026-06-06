import { Box, Typography, Stack, TextField, Select, MenuItem, Chip, Divider, FormControl, InputLabel, ListSubheader } from "@mui/material";
import React from "react";
import { ApiHelper, Locale, type ConditionInterface } from "@churchapps/apphelper";
import { Add as AddIcon, Delete as DeleteIcon, CallSplit as RouteIcon } from "@mui/icons-material";
import { AppIconButton } from "../../../../components/ui/AppIconButton";
import { ConditionEdit } from "../../automations/components/ConditionEdit";
import { type WorkflowStepInterface, type WorkflowStepRouteInterface, type WorkflowInterface } from "@churchapps/helpers";

const WF_PREFIX = "wf:";

interface Props {
  step: WorkflowStepInterface;
  steps: WorkflowStepInterface[];
  workflows?: WorkflowInterface[];
}

// Routing editor shown inside WorkflowStepEdit. Manages a step's conditional exits:
// "outcome" routes (buttons shown when completing) and "personMatch" routes
// (auto-advance on entry when the card's person matches a condition tree).
export const WorkflowStepRouting = (props: Props) => {
  const { step, steps, workflows = [] } = props;
  const [routes, setRoutes] = React.useState<WorkflowStepRouteInterface[]>([]);
  const [editCondition, setEditCondition] = React.useState<ConditionInterface | null>(null);
  const [conditions, setConditions] = React.useState<{ [routeId: string]: ConditionInterface[] }>({});

  const otherSteps = steps.filter((s) => s.id && s.id !== step.id);

  const load = React.useCallback(async () => {
    if (!step.id) return;
    const data: WorkflowStepRouteInterface[] = await ApiHelper.get("/workflowStepRoutes/step/" + step.id, "DoingApi");
    setRoutes(data);
    // Load conditions for each personMatch route so we can show/edit them.
    const map: { [routeId: string]: ConditionInterface[] } = {};
    await Promise.all(
      data.filter((r) => r.kind === "personMatch" && r.id).map(async (r) => {
        map[r.id] = await ApiHelper.get("/conditions/stepRoute/" + r.id, "DoingApi");
      })
    );
    setConditions(map);
  }, [step.id]);

  React.useEffect(() => { load(); }, [load]);

  const saveRoute = async (route: WorkflowStepRouteInterface) => {
    await ApiHelper.post("/workflowStepRoutes", [route], "DoingApi");
    load();
  };

  const removeRoute = async (route: WorkflowStepRouteInterface) => {
    await ApiHelper.delete("/workflowStepRoutes/" + route.id, "DoingApi");
    load();
  };

  const addOutcome = () => saveRoute({ workflowId: step.workflowId, stepId: step.id, trigger: "onComplete", kind: "outcome", sort: routes.length + 1, label: Locale.label("tasks.workflowRouting.addOutcome") });
  const addAuto = () => saveRoute({ workflowId: step.workflowId, stepId: step.id, trigger: "onEnter", kind: "personMatch", sort: routes.length + 1, targetStepId: otherSteps[0]?.id });

  // "" sentinel in the target select means "complete/close the card" (null target).
  const targetValue = (route: WorkflowStepRouteInterface) => route.targetStepId || "";
  const setTarget = (route: WorkflowStepRouteInterface, value: string) => saveRoute({ ...route, targetStepId: value || undefined });

  // Outcome target can be a step or a "wf:<id>" hand-off; the two fields are mutually exclusive.
  const outcomeTargetValue = (route: WorkflowStepRouteInterface) => (route.targetWorkflowId ? WF_PREFIX + route.targetWorkflowId : route.targetStepId || "");
  const setOutcomeTarget = (route: WorkflowStepRouteInterface, value: string) => {
    if (value.startsWith(WF_PREFIX)) saveRoute({ ...route, targetWorkflowId: value.slice(WF_PREFIX.length), targetStepId: undefined });
    else saveRoute({ ...route, targetStepId: value || undefined, targetWorkflowId: undefined });
  };

  const addCondition = async (route: WorkflowStepRouteInterface) => {
    // The route's root conjunction is created server-side; fetch it to attach the condition.
    const conj: { id?: string }[] = await ApiHelper.get("/conjunctions/stepRoute/" + route.id, "DoingApi");
    if (conj[0]?.id) setEditCondition({ conjunctionId: conj[0].id, field: "" });
  };

  const deleteCondition = async (c: ConditionInterface) => {
    await ApiHelper.delete("/conditions/" + c.id, "DoingApi");
    load();
  };

  if (!step.id) {
    return <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>{Locale.label("tasks.workflowRouting.saveStepFirst")}</Typography>;
  }

  if (editCondition) {
    return (
      <ConditionEdit
        condition={editCondition}
        onCancel={() => setEditCondition(null)}
        onSave={() => { setEditCondition(null); load(); }}
      />
    );
  }

  const outcomes = routes.filter((r) => r.trigger === "onComplete");
  const autos = routes.filter((r) => r.trigger === "onEnter");

  const targetSelect = (route: WorkflowStepRouteInterface, allowComplete: boolean) => (
    <FormControl fullWidth size="small">
      <InputLabel>{Locale.label("tasks.workflowRouting.targetStep")}</InputLabel>
      <Select label={Locale.label("tasks.workflowRouting.targetStep")} value={targetValue(route)} data-testid={"route-target-" + route.id} onChange={(e) => setTarget(route, e.target.value)}>
        {allowComplete && <MenuItem value="">{Locale.label("tasks.workflowRouting.completeCard")}</MenuItem>}
        {otherSteps.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
      </Select>
    </FormControl>
  );

  const outcomeTargetSelect = (route: WorkflowStepRouteInterface) => (
    <FormControl fullWidth size="small">
      <InputLabel>{Locale.label("tasks.workflowRouting.targetStep")}</InputLabel>
      <Select label={Locale.label("tasks.workflowRouting.targetStep")} value={outcomeTargetValue(route)} data-testid={"route-target-" + route.id} onChange={(e) => setOutcomeTarget(route, e.target.value)}>
        <MenuItem value="">{Locale.label("tasks.workflowRouting.completeCard")}</MenuItem>
        {otherSteps.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
        {workflows.length > 0 && <ListSubheader>{Locale.label("tasks.workflowRouting.sendToWorkflow")}</ListSubheader>}
        {workflows.map((w) => <MenuItem key={w.id} value={WF_PREFIX + w.id}>{w.name}</MenuItem>)}
      </Select>
    </FormControl>
  );

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <RouteIcon fontSize="small" sx={{ color: "primary.main" }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{Locale.label("tasks.workflowRouting.title")}</Typography>
      </Stack>

      {/* Outcomes (onComplete) */}
      <Typography variant="caption" color="text.secondary">{Locale.label("tasks.workflowRouting.outcomesHelp")}</Typography>
      <Stack spacing={1} sx={{ mt: 1 }}>
        {outcomes.map((route) => (
          <Box key={route.id} data-testid={"outcome-route-" + route.id} sx={{ p: 1, border: "1px solid", borderColor: "grey.200", borderRadius: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <TextField fullWidth size="small" label={Locale.label("tasks.workflowRouting.outcomeLabel")} defaultValue={route.label || ""} data-testid={"outcome-label-" + route.id} onBlur={(e) => { if (e.target.value !== route.label) saveRoute({ ...route, label: e.target.value }); }} />
              <AppIconButton label={Locale.label("common.remove")} icon={<DeleteIcon />} intent="remove" data-testid={"remove-route-" + route.id} onClick={() => removeRoute(route)} />
            </Stack>
            <Box sx={{ mt: 1 }}>{outcomeTargetSelect(route)}</Box>
          </Box>
        ))}
      </Stack>
      <AppIconButton label={Locale.label("common.add")} icon={<AddIcon />} intent="add" data-testid="add-outcome-button" onClick={addOutcome} sx={{ mt: 1 }} />

      <Divider sx={{ my: 2 }} />

      {/* Automatic routing (onEnter / personMatch) */}
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{Locale.label("tasks.workflowRouting.automatic")}</Typography>
      <Typography variant="caption" color="text.secondary">{Locale.label("tasks.workflowRouting.automaticHelp")}</Typography>
      <Stack spacing={1} sx={{ mt: 1 }}>
        {autos.map((route) => (
          <Box key={route.id} data-testid={"auto-route-" + route.id} sx={{ p: 1, border: "1px solid", borderColor: "grey.200", borderRadius: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box sx={{ flexGrow: 1 }}>{targetSelect(route, false)}</Box>
              <AppIconButton label={Locale.label("common.remove")} icon={<DeleteIcon />} intent="remove" data-testid={"remove-route-" + route.id} onClick={() => removeRoute(route)} />
            </Stack>
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">{Locale.label("tasks.workflowRouting.conditions")}</Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                {(conditions[route.id] || []).map((c) => (
                  <Chip key={c.id} size="small" label={c.label || c.field} onDelete={() => deleteCondition(c)} />
                ))}
                {(conditions[route.id] || []).length === 0 && <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>{Locale.label("tasks.workflowRouting.noConditions")}</Typography>}
              </Stack>
              <AppIconButton label={Locale.label("common.add")} icon={<AddIcon />} intent="add" data-testid={"add-condition-" + route.id} onClick={() => addCondition(route)} sx={{ mt: 0.5 }} />
            </Box>
          </Box>
        ))}
      </Stack>
      <AppIconButton label={Locale.label("common.add")} icon={<AddIcon />} intent="add" data-testid="add-auto-route-button" onClick={addAuto} disabled={otherSteps.length === 0} sx={{ mt: 1 }} />
    </Box>
  );
};
