import React from "react";
import { useForm, Controller, useFormState } from "react-hook-form";
import { Checkbox, FormControl, FormControlLabel, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import { DateHelper, ErrorMessages, InputBox, Locale } from "@churchapps/apphelper";
import { type PlanInterface } from "../../helpers";
import { useMutation } from "@tanstack/react-query";
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

  const { control, register, handleSubmit, watch } = useForm<AnyRecord>({
    defaultValues: {
      name: props.plan?.name ?? "",
      serviceDate: DateHelper.formatHtml5Date(props.plan?.serviceDate) ?? "",
      signupDeadlineHours: props.plan?.signupDeadlineHours ?? "",
      showVolunteerNames: props.plan?.showVolunteerNames !== false
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
      if ((copyMode === "none" && !copyServiceOrder) || !previousPlan) {
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
      showVolunteerNames: values.showVolunteerNames
    };
    savePlanMutation.mutate(plan);
  };

  const handleDelete = () => {
    deletePlanMutation.mutate();
  };

  return (
    <>
      <ErrorMessages errors={summaryErrors} />
      <InputBox
        headerText={props.plan?.id ? Locale.label("plans.planEdit.planEdit") : Locale.label("plans.planEdit.planAdd")}
        headerIcon="assignment"
        saveFunction={handleSubmit(onValid)}
        cancelFunction={props.updatedFunction}
        deleteFunction={props.plan?.id ? handleDelete : null}>
        <TextField fullWidth label={Locale.label("common.name")} id="name" type="text" placeholder={Locale.label("placeholders.plan.name")} data-testid="plan-name-input" aria-label={Locale.label("plans.planEdit.planNameAria")} error={!!e.name} helperText={e.name?.message} {...register("name", { required: Locale.label("plans.planEdit.planReq") })} />
        <TextField fullWidth label={Locale.label("plans.planEdit.servDate")} id="serviceDate" type="date" data-testid="service-date-input" aria-label={Locale.label("plans.planEdit.serviceDateAria")} error={!!e.serviceDate} helperText={e.serviceDate?.message} {...register("serviceDate", { required: Locale.label("plans.planEdit.servReq") })} />
        {!props.plan?.id && previousPlan && (
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
          </>
        )}
      </InputBox>
    </>
  );
};
