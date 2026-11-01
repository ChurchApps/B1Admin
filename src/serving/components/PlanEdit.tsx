import React from "react";
import { useForm, Controller, useFormState } from "react-hook-form";
import { Checkbox, FormControl, FormControlLabel, Grid, InputLabel, MenuItem, Select, TextField, FormHelperText } from "@mui/material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { ApiHelper, DateHelper, ErrorMessages, Locale } from "@churchapps/apphelper";
import { FormCard } from "../../components/ui";
import { type PlanInterface } from "../../helpers";
import { CampusSelect } from "../../components/CampusSelect";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "../../queryClient";
import { useConfirmDelete, useFirstDayOfWeek, applyWeekStart } from "../../hooks";
import { getPlanRepeatDates, type PlanRepeatFrequency, type PlanRepeatMonthMode } from "./planRepeatDates";

interface Props {
  plan: PlanInterface;
  plans: PlanInterface[];
  updatedFunction: () => void;
}

type AnyRecord = Record<string, any>;

const MAX_REPEAT_INTERVAL = 52;
const MAX_REPEAT_COUNT = 12;

const clampRepeat = (value: string, max: number) => Math.min(max, Math.max(1, parseInt(value) || 1));

export const PlanEdit = (props: Props) => {
  const [copyMode, setCopyMode] = React.useState<string>("all");
  const [copyServiceOrder, setCopyServiceOrder] = React.useState<boolean>(false);
  const [templateId, setTemplateId] = React.useState<string>("");
  const [repeatInterval, setRepeatInterval] = React.useState<string>("1");
  const [repeatFrequency, setRepeatFrequency] = React.useState<PlanRepeatFrequency>("week");
  const [repeatMonthMode, setRepeatMonthMode] = React.useState<PlanRepeatMonthMode>("monthDay");
  const [repeatCount, setRepeatCount] = React.useState<string>("1");
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const firstDayOfWeek = useFirstDayOfWeek();
  applyWeekStart(firstDayOfWeek);

  const templatesQuery = useQuery<any[]>({
    queryKey: [`/plantemplates/ministry/${props.plan?.ministryId}`, "DoingApi"],
    enabled: !props.plan?.id && !!props.plan?.ministryId,
    placeholderData: []
  });
  const templates = templatesQuery.data || [];
  const confirmationWorkflows = useQuery<{ id: string; name: string }[]>({
    queryKey: [`/plans/confirmationWorkflows?ministryId=${props.plan?.ministryId || ""}`, "DoingApi"],
    enabled: !!props.plan?.ministryId,
    placeholderData: []
  });

  const { control, register, handleSubmit, watch, setValue, getFieldState } = useForm<AnyRecord>({
    defaultValues: {
      name: props.plan?.name ?? "",
      serviceDate: DateHelper.formatHtml5Date(props.plan?.serviceDate) ?? "",
      campusId: props.plan?.campusId ?? "",
      signupDeadlineHours: props.plan?.signupDeadlineHours ?? "",
      showVolunteerNames: props.plan?.showVolunteerNames !== false,
      prepared: props.plan?.prepared === true,
      autoReplaceOnDecline: props.plan?.autoReplaceOnDecline === true,
      confirmationWorkflowId: props.plan?.confirmationWorkflowId || ""
    }
  });

  const { errors } = useFormState({ control });
  const e = errors as any;

  const summaryErrors: string[] = React.useMemo(() => {
    const errs: string[] = [];
    if (e.name?.message) errs.push(e.name.message);
    if (e.serviceDate?.message) errs.push(e.serviceDate.message);
    return errs;
  }, [errors]);

  const watchedDate = watch("serviceDate");

  const previousPlan = React.useMemo(() => {
    if (props.plans.length === 0 || !watchedDate) return null;
    const currentDate = new Date(watchedDate).getTime();
    const sorted = [...props.plans]
      .filter(p => {
        const planDate = p.serviceDate ? new Date(p.serviceDate).getTime() : 0;
        return planDate < currentDate;
      })
      .sort((a, b) => {
        const dateA = a.serviceDate ? new Date(a.serviceDate).getTime() : 0;
        const dateB = b.serviceDate ? new Date(b.serviceDate).getTime() : 0;
        return dateB - dateA;
      });
    return sorted[0] || null;
  }, [props.plans, watchedDate]);

  // A new plan starts with the previous plan's signup deadline unless the user has typed one.
  React.useEffect(() => {
    if (props.plan?.id || getFieldState("signupDeadlineHours").isDirty) return;
    setValue("signupDeadlineHours", previousPlan?.signupDeadlineHours ?? "");
  }, [previousPlan, props.plan?.id]);

  const isCopying = !templateId && !!previousPlan && (copyMode !== "none" || copyServiceOrder);

  const getRepeatDates = (first: Date) => getPlanRepeatDates(first, {
    interval: clampRepeat(repeatInterval, MAX_REPEAT_INTERVAL),
    frequency: repeatFrequency,
    monthMode: repeatMonthMode,
    count: clampRepeat(repeatCount, MAX_REPEAT_COUNT)
  });

  // Each extra plan is copied from the plan created before it, like BulkLessonSchedule.
  const copyForwardPlans = async (plan: PlanInterface, firstId: string) => {
    const firstDate = new Date(plan.serviceDate!);
    const autoName = plan.name === DateHelper.prettyDate(firstDate);
    const dates = getRepeatDates(firstDate);
    let sourceId = firstId;
    for (let i = 1; i < dates.length && sourceId; i++) {
      const serviceDate = dates[i];
      const name = autoName ? DateHelper.prettyDate(serviceDate) : plan.name;
      try {
        const copied = await ApiHelper.post("/plans/copy/" + sourceId, { ...plan, name, serviceDate, copyMode, copyServiceOrder }, "DoingApi");
        sourceId = copied?.id;
      } catch (err) {
        console.error("Stopped repeating plan copies", err);
        break;
      }
    }
  };

  // Parsed with toDate because new Date() reads a date-only string as UTC, landing on the day before in US time zones.
  const repeatFirstDate = watchedDate ? DateHelper.toDate(watchedDate) : null;

  const monthModeLabels = React.useMemo(() => {
    if (!repeatFirstDate) return null;
    const day = repeatFirstDate.getDate();
    const ordinals = ["first", "second", "third", "fourth", "last"];
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    return {
      monthDay: Locale.label("eventCalendar.recurring.monthlyOnDay").replace("{}", day.toString()),
      nthWeekday: Locale.label("eventCalendar.recurring.monthlyOnNth")
        .replace("{ordinal}", Locale.label("eventCalendar.recurring.ordinal." + ordinals[Math.floor((day - 1) / 7)]))
        .replace("{day}", Locale.label("eventCalendar.recurring.day." + days[repeatFirstDate.getDay()]))
    };
  }, [watchedDate]);

  const repeatHelper = (() => {
    const helper = Locale.label("plans.planEdit.repeatHelper");
    if (!repeatFirstDate || !isCopying || clampRepeat(repeatCount, MAX_REPEAT_COUNT) === 1) return helper;
    const dates = getRepeatDates(repeatFirstDate).map(d => dayjs(d).format("MMM D")).join(", ");
    return `${dates}. ${helper}.`;
  })();

  const savePlanMutation = useMutation({
    mutationFn: async (plan: PlanInterface) => {
      // Template: create plan, then apply snapshot.
      if (!plan.id && templateId) {
        const saved = await ApiHelper.post("/plans", [plan], "DoingApi");
        const newPlan = Array.isArray(saved) ? saved[0] : saved;
        await ApiHelper.post("/plantemplates/apply/" + templateId, { planIds: [newPlan.id], serviceOrder: true, positions: true }, "DoingApi");
        return saved;
      }
      // Copy-from-previous only for new plans; existing plan avoids duplicate positions.
      if (plan.id || !isCopying) {
        return ApiHelper.post("/plans", [plan], "DoingApi");
      } else {
        const first = await ApiHelper.post("/plans/copy/" + previousPlan!.id, { ...plan, copyMode, copyServiceOrder }, "DoingApi");
        if (first?.id) await copyForwardPlans(plan, first.id);
        return first;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/plans", "DoingApi"] });
      props.updatedFunction();
    }
  });

  const deletePlanMutation = useMutation({
    mutationFn: async () => {
      return ApiHelper.delete("/plans/" + props.plan.id, "DoingApi");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/plans", "DoingApi"] });
      props.updatedFunction();
    }
  });

  const onValid = (values: AnyRecord) => {
    const plan: PlanInterface = {
      ...props.plan,
      name: values.name,
      serviceDate: DateHelper.toDate(values.serviceDate),
      serviceOrder: true,
      signupDeadlineHours: values.signupDeadlineHours ? parseInt(values.signupDeadlineHours) : undefined,
      showVolunteerNames: values.showVolunteerNames,
      prepared: values.prepared,
      autoReplaceOnDecline: values.autoReplaceOnDecline,
      confirmationWorkflowId: values.confirmationWorkflowId || null
    };
    plan.campusId = values.campusId || null;
    // undefined is dropped from the JSON body, so the API would keep the old deadline; null clears it
    if (!values.signupDeadlineHours) plan.signupDeadlineHours = null as any;
    if (savePlanMutation.isPending) return;
    savePlanMutation.mutate(plan);
  };

  const handleDelete = async () => {
    if (!(await confirm(Locale.label("plans.planEdit.confirmDelete")))) return;
    deletePlanMutation.mutate();
  };

  return (
    <>
      {ConfirmDialogElement}
      <ErrorMessages errors={summaryErrors} />
      <FormCard
        title={props.plan?.id ? Locale.label("plans.planEdit.planEdit") : Locale.label("plans.planEdit.planAdd")}
        icon="assignment"
        onSave={handleSubmit(onValid)}
        onCancel={props.updatedFunction}
        isSubmitting={savePlanMutation.isPending}
        disabled={savePlanMutation.isPending || deletePlanMutation.isPending}
        onDelete={props.plan?.id ? handleDelete : undefined}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label={Locale.label("common.name")} id="name" type="text" placeholder={Locale.label("placeholders.plan.name")} data-testid="plan-name-input" aria-label={Locale.label("plans.planEdit.planNameAria")} error={!!e.name} helperText={e.name?.message} {...register("name", { required: Locale.label("plans.planEdit.planReq") })} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller name="serviceDate" control={control} rules={{ required: Locale.label("plans.planEdit.servReq") }} render={({ field }) => (
              <LocalizationProvider dateAdapter={AdapterDayjs} key={firstDayOfWeek}>
                {/* MUI picker instead of native input: Chromium can render the native date popup off-screen on multi-monitor setups */}
                <DatePicker
                  label={Locale.label("plans.planEdit.servDate")}
                  value={field.value ? dayjs(field.value) : null}
                  onChange={(v) => field.onChange(v && v.isValid() ? v.format("YYYY-MM-DD") : "")}
                  slotProps={{ textField: { fullWidth: true, id: "serviceDate", error: !!e.serviceDate, helperText: e.serviceDate?.message, inputProps: { "data-testid": "service-date-input", "aria-label": Locale.label("plans.planEdit.serviceDateAria") } } }}
                />
              </LocalizationProvider>
            )} />
          </Grid>
        </Grid>
        <CampusSelect control={control} testId="plan-campus-select" />
        {!props.plan?.id && templates.length > 0 && (
          <FormControl fullWidth>
            <InputLabel id="templateId">{Locale.label("plans.templates.startFrom") || "Start from template"}</InputLabel>
            <Select labelId="templateId" label={Locale.label("plans.templates.startFrom") || "Start from template"} value={templateId} onChange={(e) => setTemplateId(e.target.value)} data-testid="template-select">
              <MenuItem value="">{Locale.label("plans.templates.startBlank") || "None"}</MenuItem>
              {templates.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
            </Select>
          </FormControl>
        )}
        {!props.plan?.id && !templateId && previousPlan && (
          <>
            <FormControl fullWidth>
              <InputLabel id="copyMode">{Locale.label("plans.planEdit.copyPrevious") || "Copy from previous plan"}:</InputLabel>
              <Select name="copyMode" labelId="copyMode" label={Locale.label("plans.planEdit.copyPrevious") || "Copy from previous plan"} value={copyMode} onChange={(e) => setCopyMode(e.target.value)} data-testid="copy-mode-select">
                <MenuItem value="none">{Locale.label("plans.planEdit.copyNothing") || "Nothing"}</MenuItem>
                <MenuItem value="positions">{Locale.label("plans.planEdit.copyPositions") || "Positions Only"}</MenuItem>
                <MenuItem value="all">{Locale.label("plans.planEdit.copyAll") || "Positions and Assignments"}</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel control={<Checkbox checked={copyServiceOrder} onChange={(e) => setCopyServiceOrder(e.target.checked)} />} label={Locale.label("plans.planEdit.copyServiceOrder") || "Copy Order of Service"} />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: repeatFrequency === "month" ? 3 : 6 }}>
                <TextField fullWidth label={Locale.label("plans.planEdit.repeatEvery")} type="number" value={repeatInterval} disabled={!isCopying} onChange={(e) => setRepeatInterval(e.target.value)} onBlur={() => setRepeatInterval(String(clampRepeat(repeatInterval, MAX_REPEAT_INTERVAL)))} slotProps={{ htmlInput: { min: 1, max: MAX_REPEAT_INTERVAL } }} data-testid="repeat-interval-input" />
              </Grid>
              <Grid size={{ xs: 12, sm: repeatFrequency === "month" ? 3 : 6 }}>
                <FormControl fullWidth disabled={!isCopying}>
                  <InputLabel id="repeatFrequency">{Locale.label("plans.planEdit.repeatFrequency")}</InputLabel>
                  <Select labelId="repeatFrequency" label={Locale.label("plans.planEdit.repeatFrequency")} value={repeatFrequency} onChange={(e) => setRepeatFrequency(e.target.value as PlanRepeatFrequency)} data-testid="repeat-frequency-select">
                    <MenuItem value="day">{Locale.label("plans.planEdit.repeatDay")}</MenuItem>
                    <MenuItem value="week">{Locale.label("plans.planEdit.repeatWeek")}</MenuItem>
                    <MenuItem value="month">{Locale.label("plans.planEdit.repeatMonth")}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {repeatFrequency === "month" && monthModeLabels && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth disabled={!isCopying}>
                    <InputLabel id="repeatMonthMode">{Locale.label("plans.planEdit.repeatOn")}</InputLabel>
                    <Select labelId="repeatMonthMode" label={Locale.label("plans.planEdit.repeatOn")} value={repeatMonthMode} onChange={(e) => setRepeatMonthMode(e.target.value as PlanRepeatMonthMode)} data-testid="repeat-month-mode-select">
                      <MenuItem value="monthDay">{monthModeLabels.monthDay}</MenuItem>
                      <MenuItem value="nthWeekday">{monthModeLabels.nthWeekday}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
            </Grid>
            <TextField fullWidth label={Locale.label("plans.planEdit.repeatCount")} type="number" value={repeatCount} disabled={!isCopying} onChange={(e) => setRepeatCount(e.target.value)} onBlur={() => setRepeatCount(String(clampRepeat(repeatCount, MAX_REPEAT_COUNT)))} helperText={repeatHelper} slotProps={{ htmlInput: { min: 1, max: MAX_REPEAT_COUNT } }} data-testid="repeat-count-input" />
          </>
        )}
        <TextField fullWidth label={Locale.label("plans.planEdit.signupDeadline")} id="signupDeadlineHours" type="number" helperText={Locale.label("plans.planEdit.signupDeadlineHelper")} slotProps={{ inputLabel: { shrink: true } }} {...register("signupDeadlineHours")} />
        {props.plan?.id && (
          <>
            <Controller name="showVolunteerNames" control={control} render={({ field }) => (
              <FormControlLabel control={<Checkbox checked={field.value ?? true} onChange={(ev) => field.onChange(ev.target.checked)} />} label={Locale.label("plans.planEdit.showVolunteerNames")} />
            )} />
            <Controller name="confirmationWorkflowId" control={control} render={({ field }) => (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>{Locale.label("plans.confirmation.workflow", "Confirmation workflow")}</InputLabel>
                <Select {...field} label={Locale.label("plans.confirmation.workflow", "Confirmation workflow")} data-testid="plan-confirmation-workflow">
                  <MenuItem value="">{Locale.label("plans.confirmation.none", "Use existing assignment notifications")}</MenuItem>
                  {(confirmationWorkflows.data || []).map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
                  {props.plan?.confirmationWorkflowId && !(confirmationWorkflows.data || []).some((w) => w.id === props.plan.confirmationWorkflowId) && <MenuItem value={props.plan.confirmationWorkflowId}>{Locale.label("plans.confirmation.unavailable", "Selected workflow is unavailable")}</MenuItem>}
                </Select>
                <FormHelperText>{Locale.label("plans.confirmation.help", "Create a Serving Assignment Confirmation workflow under Serving → Workflows, then select it here. Publishing and notifying starts one card per new request. Accepted requests receive service reminders; unanswered requests use this workflow.")}</FormHelperText>
              </FormControl>
            )} />
            <Controller name="prepared" control={control} render={({ field }) => (
              <FormControlLabel control={<Checkbox checked={field.value ?? false} onChange={(ev) => field.onChange(ev.target.checked)} data-testid="prepared-checkbox" />} label={Locale.label("plans.planEdit.prepared") || "Penciled in (hide assignments from volunteers until published)"} />
            )} />
            <Controller name="autoReplaceOnDecline" control={control} render={({ field }) => (
              <FormControlLabel control={<Checkbox checked={field.value ?? false} onChange={(ev) => field.onChange(ev.target.checked)} data-testid="auto-replace-checkbox" />} label={Locale.label("plans.planEdit.autoReplaceOnDecline") || "Automatically schedule a replacement when a volunteer declines"} />
            )} />
          </>
        )}
      </FormCard>
    </>
  );
};
