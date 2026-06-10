import React from "react";
import { useForm, Controller, useFormState } from "react-hook-form";
import { Checkbox, Grid, MenuItem, TextField, Typography } from "@mui/material";
import { type TimeInterface } from "@churchapps/helpers";
import { ApiHelper, DateHelper, ErrorMessages, Locale } from "@churchapps/apphelper";
import { FormCard } from "../../components/ui";

interface Props {
  time: TimeInterface;
  categories: string[];
  onUpdate: () => void;
}

type AnyRecord = Record<string, any>;

export const TimeEdit = (props: Props) => {
  const [teams, setTeams] = React.useState<string>(props.time?.teams ?? "");

  const { control, register, handleSubmit, reset } = useForm<AnyRecord>({
    defaultValues: {
      serviceTimeType: props.time?.serviceTimeType ?? "service",
      displayName: props.time?.displayName ?? "",
      startTime: DateHelper.formatHtml5DateTime(props.time?.startTime) ?? "",
      endTime: DateHelper.formatHtml5DateTime(props.time?.endTime) ?? ""
    }
  });

  const { errors } = useFormState({ control });
  const e = errors as any;

  const summaryErrors: string[] = React.useMemo(() => {
    const errs: string[] = [];
    if (e.displayName?.message) errs.push(e.displayName.message);
    if (e.startTime?.message) errs.push(e.startTime.message);
    if (e.endTime?.message) errs.push(e.endTime.message);
    return errs;
  }, [errors]);

  React.useEffect(() => {
    reset({
      serviceTimeType: props.time?.serviceTimeType ?? "service",
      displayName: props.time?.displayName ?? "",
      startTime: DateHelper.formatHtml5DateTime(props.time?.startTime) ?? "",
      endTime: DateHelper.formatHtml5DateTime(props.time?.endTime) ?? ""
    });
    setTeams(props.time?.teams ?? "");
  }, [props.time, reset]);

  const onValid = (values: AnyRecord) => {
    const t: TimeInterface = {
      ...props.time,
      serviceTimeType: values.serviceTimeType,
      displayName: values.displayName,
      startTime: values.startTime ? new Date(values.startTime) : undefined,
      endTime: values.endTime ? new Date(values.endTime) : undefined,
      teams
    };
    ApiHelper.post("/times", [t], "DoingApi").then(props.onUpdate);
  };

  const handleDelete = () => {
    ApiHelper.delete("/times/" + props.time.id, "DoingApi").then(props.onUpdate);
  };

  const handleTeamCheck = (e: React.ChangeEvent<HTMLInputElement>) => {
    const teamList = teams.split(",").filter(Boolean);
    if (e.target.checked) teamList.push(e.target.value);
    else teamList.splice(teamList.indexOf(e.target.value), 1);
    setTeams(teamList.join(","));
  };

  const getTeams = () => {
    const result: JSX.Element[] = [];
    const teamList = teams.split(",").filter(Boolean);
    props.categories.forEach((c) => {
      const checked = teamList.includes(c);
      result.push(
        <div key={c}>
          <Checkbox name="team" checked={checked} onChange={handleTeamCheck} value={c} data-testid={`team-checkbox-${c.toLowerCase().replace(/\s+/g, "-")}`} aria-label={`${Locale.label("plans.timeEdit.teamPrefix")} ${c}`} />
          <label>{c}</label>
        </div>
      );
    });

    if (result.length === 0) {
      return (
        <Typography sx={{ fontSize: "13px", fontStyle: "italic" }}>
          {Locale.label("plans.timeEdit.tip")}{" "}
          <a href="https://support.churchapps.org/docs/b1-admin/serving/plans" target="_blank" rel="noopener noreferrer">
            {Locale.label("plans.timeEdit.followGuide")}
          </a>
        </Typography>
      );
    }
    return result;
  };

  return (
    <>
      <ErrorMessages errors={summaryErrors} />
      <FormCard
        title={props.time?.id ? Locale.label("plans.timeEdit.timeEdit") : Locale.label("plans.timeEdit.timeAdd")}
        icon="assignment"
        onSave={handleSubmit(onValid)}
        onCancel={props.onUpdate}
        onDelete={props.time?.id ? handleDelete : undefined}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller name="serviceTimeType" control={control} render={({ field }) => (
              <TextField fullWidth select label={Locale.label("plans.timeEdit.type")} id="serviceTimeType" value={field.value ?? "service"} onChange={field.onChange} data-testid="time-type-input" aria-label={Locale.label("plans.timeEdit.typeAria")}>
                <MenuItem value="service">{Locale.label("plans.timeEdit.typeService")}</MenuItem>
                <MenuItem value="rehearsal">{Locale.label("plans.timeEdit.typeRehearsal")}</MenuItem>
                <MenuItem value="other">{Locale.label("plans.timeEdit.typeOther")}</MenuItem>
              </TextField>
            )} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label={Locale.label("plans.timeEdit.disName")} id="displayName" type="text" placeholder={Locale.label("placeholders.time.displayName")} data-testid="time-display-name-input" aria-label={Locale.label("plans.timeEdit.timeDisplayNameAria")} error={!!e.displayName} helperText={e.displayName?.message} {...register("displayName", { required: Locale.label("plans.timeEdit.disNameReq") })} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label={Locale.label("plans.timeEdit.timeStart")} id="startTime" type="datetime-local" data-testid="time-start-input" aria-label={Locale.label("plans.timeEdit.startTimeAria")} error={!!e.startTime} helperText={e.startTime?.message} {...register("startTime", { required: Locale.label("plans.timeEdit.startReq") })} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label={Locale.label("plans.timeEdit.timeEnd")} id="endTime" type="datetime-local" data-testid="time-end-input" aria-label={Locale.label("plans.timeEdit.endTimeAria")} error={!!e.endTime} helperText={e.endTime?.message} {...register("endTime", { required: Locale.label("plans.timeEdit.endReq") })} />
          </Grid>
        </Grid>
        <div style={{ marginTop: 10 }}>
          <b>{Locale.label("plans.timeEdit.teamNeed")}</b>
        </div>
        {getTeams()}
      </FormCard>
    </>
  );
};
