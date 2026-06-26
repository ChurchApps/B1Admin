import React from "react";
import { useForm, Controller, useFormState } from "react-hook-form";
import { Checkbox, FormControl, FormControlLabel, Grid, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import { DateHelper, ErrorMessages, Locale } from "@churchapps/apphelper";
import { FormCard } from "../../components/ui";
import { type PlanInterface } from "../../helpers";
import { CampusSelect } from "../../components/CampusSelect";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "../../queryClient";

interface Props {
  plan: PlanInterface;
  plans: PlanInterface[];
  updatedFunction: () => void;
}

type AnyRecord = Record<string, any>;

export const PlanEdit = (props: Props) => {
  const [copyMode, setCopyMode] = React.useState<string>("all");
  const [copyServiceOrder, setCopyServiceOrder] = React.useState<boolean>(false);
  const [templateId, setTemplateId] = React.useState<string>("");

  const templatesQuery = useQuery<any[]>({
    queryKey: [`/plantemplates/ministry/${props.plan?.ministryId}`, "DoingApi"],
    enabled: !props.plan?.id && !!props.plan?.ministryId,
    placeholderData: []
  });
  const templates = templatesQuery.data || [];

  const { control, register, handleSubmit, watch } = useForm<AnyRecord>({
    defaultValues: {
      name: props.plan?.name ?? "",
      serviceDate: DateHelper.formatHtml5Date(props.plan?.serviceDate) ?? "",
      campusId: props.plan?.campusId ?? "",
      signupDeadlineHours: props.plan?.signupDeadlineHours ?? "",
      showVolunteerNames: props.plan?.showVolunteerNames !== false,
      prepared: props.plan?.prepared === true,
      autoReplaceOnDecline: props.plan?.autoReplaceOnDecline === true
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

  const savePlanMutation = useMutation({
    mutationFn: async (plan: PlanInterface) => {
      const { ApiHelper } = await import("@churchapps/apphelper");
      // Starting from a template: create the (empty) plan, then apply the snapshot.
      if (!plan.id && templateId) {
        const saved = await ApiHelper.post("/plans", [plan], "DoingApi");
        const newPlan = Array.isArray(saved) ? saved[0] : saved;
        await ApiHelper.post("/plantemplates/apply/" + templateId, { planIds: [newPlan.id], serviceOrder: true, positions: true }, "DoingApi");
        return saved;
      }
      // The copy-from-previous options only render for new plans; an existing
      // plan must save plainly or the copy endpoint duplicates its positions
      // (and 401s when the loaded plan row lacks ministryId).
      if (plan.id || (copyMode === "none" && !copyServiceOrder) || !previousPlan) {
        return ApiHelper.post("/plans", [plan], "DoingApi");
      } else {
        return ApiHelper.post("/plans/copy/" + previousPlan.id, { ...plan, copyMode, copyServiceOrder }, "DoingApi");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/plans", "DoingApi"] });
      props.updatedFunction();
    }
  });

  const deletePlanMutation = useMutation({
    mutationFn: async () => {
      const { ApiHelper } = await import("@churchapps/apphelper");
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
      autoReplaceOnDecline: values.autoReplaceOnDecline
    };
    plan.campusId = values.campusId || null;
    savePlanMutation.mutate(plan);
  };

  const handleDelete = () => {
    deletePlanMutation.mutate();
  };

  return (
    <>
      <ErrorMessages errors={summaryErrors} />
      <FormCard
        title={props.plan?.id ? Locale.label("plans.planEdit.planEdit") : Locale.label("plans.planEdit.planAdd")}
        icon="assignment"
        onSave={handleSubmit(onValid)}
        onCancel={props.updatedFunction}
        onDelete={props.plan?.id ? handleDelete : undefined}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label={Locale.label("common.name")} id="name" type="text" placeholder={Locale.label("placeholders.plan.name")} data-testid="plan-name-input" aria-label={Locale.label("plans.planEdit.planNameAria")} error={!!e.name} helperText={e.name?.message} {...register("name", { required: Locale.label("plans.planEdit.planReq") })} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label={Locale.label("plans.planEdit.servDate")} id="serviceDate" type="date" data-testid="service-date-input" aria-label={Locale.label("plans.planEdit.serviceDateAria")} error={!!e.serviceDate} helperText={e.serviceDate?.message} {...register("serviceDate", { required: Locale.label("plans.planEdit.servReq") })} />
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
          </>
        )}
        {props.plan?.id && (
          <>
            <TextField fullWidth label={Locale.label("plans.planEdit.signupDeadline")} id="signupDeadlineHours" type="number" helperText={Locale.label("plans.planEdit.signupDeadlineHelper")} {...register("signupDeadlineHours")} />
            <Controller name="showVolunteerNames" control={control} render={({ field }) => (
              <FormControlLabel control={<Checkbox checked={field.value ?? true} onChange={(ev) => field.onChange(ev.target.checked)} />} label={Locale.label("plans.planEdit.showVolunteerNames")} />
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
