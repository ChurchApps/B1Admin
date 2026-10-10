import React from "react";
import { Box, FormControl, Grid, InputLabel, MenuItem, Select, Typography } from "@mui/material";
import { TextField } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { type ServiceTimeInterface, type ServiceInterface } from "@churchapps/helpers";
import { useMountedState, ApiHelper, Locale, ErrorMessages, DateHelper } from "@churchapps/apphelper";
import { FormCard } from "../../components/ui";
import { useConfirmDelete, useErrorSummary } from "../../hooks";

// Schedule fields are newer than the published ServiceTimeInterface.
type ScheduledServiceTime = ServiceTimeInterface & {
  dayOfWeek?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  checkinOpenMinutes?: number | null;
  checkinCloseMinutes?: number | null;
};

interface Props {
  serviceTime: ScheduledServiceTime | null;
  updatedFunction: () => void;
}

type AnyRecord = Record<string, any>;

// 2026-01-04 was a Sunday, so day i of that week is weekday i (0 = Sunday).
const weekdayName = (day: number) => new Date(2026, 0, 4 + day).toLocaleDateString(DateHelper.locale, { weekday: "long" });
const toNumberOrNull = (value: any) => (value === "" || value === null || value === undefined || isNaN(Number(value)) ? null : Number(value));

export const ServiceTimeEdit: React.FC<Props> = (props) => {
  "use no memo"; // compiler caches register() results, breaking RHF field re-registration after reset()
  const [services, setServices] = React.useState([] as ServiceInterface[]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [loaded, setLoaded] = React.useState<ScheduledServiceTime | null>(null);
  const isMounted = useMountedState();

  const { control, register, handleSubmit, reset, formState } = useForm<AnyRecord>({ defaultValues: { name: "", serviceId: "", dayOfWeek: "", startTime: "", endTime: "", checkinOpenMinutes: "", checkinCloseMinutes: "" } });
  const e = formState.errors as any;
  const summaryErrors = useErrorSummary(formState.errors, ["name", "serviceId"]);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const onValid = (values: AnyRecord) => {
    setIsSubmitting(true);
    const dayOfWeek = toNumberOrNull(values.dayOfWeek);
    const scheduled = dayOfWeek !== null && !!values.startTime;
    const serviceTime = {
      ...props.serviceTime,
      ...loaded,
      ...values,
      dayOfWeek: scheduled ? dayOfWeek : null,
      startTime: scheduled ? values.startTime : null,
      endTime: scheduled && values.endTime ? values.endTime : null,
      checkinOpenMinutes: scheduled ? toNumberOrNull(values.checkinOpenMinutes) : null,
      checkinCloseMinutes: scheduled ? toNumberOrNull(values.checkinCloseMinutes) : null
    };
    ApiHelper.post("/servicetimes", [serviceTime], "AttendanceApi")
      .then(props.updatedFunction)
      .finally(() => { setIsSubmitting(false); });
  };

  const handleDelete = async () => {
    if (await confirm(Locale.label("attendance.serviceTimeEdit.confirmDelete"))) ApiHelper.delete("/servicetimes/" + props.serviceTime?.id, "AttendanceApi").then(props.updatedFunction);
  };

  const loadData = React.useCallback(() => {
    // The setup tree only carries id/name, so load the full record for its schedule.
    const id = props.serviceTime?.id;
    const timePromise: Promise<ScheduledServiceTime | null> = id ? ApiHelper.get("/servicetimes/" + id, "AttendanceApi") : Promise.resolve(null);
    Promise.all([ApiHelper.get("/services", "AttendanceApi"), timePromise]).then(([data, full]: [ServiceInterface[], ScheduledServiceTime | null]) => {
      if (!isMounted()) return;
      setServices(data);
      setLoaded(full);
      const st = { ...props.serviceTime, ...full };
      const defaultServiceId = st.serviceId || (data.length > 0 ? data[0].id : "");
      reset({
        name: st.name || "",
        serviceId: defaultServiceId,
        dayOfWeek: st.dayOfWeek ?? "",
        startTime: st.startTime || "",
        endTime: st.endTime || "",
        checkinOpenMinutes: st.checkinOpenMinutes ?? "",
        checkinCloseMinutes: st.checkinCloseMinutes ?? ""
      });
    });
  }, [props.serviceTime, isMounted, reset]);

  React.useEffect(() => { loadData(); }, [loadData]);

  if (props.serviceTime === null || props.serviceTime.id === undefined) return null;
  return (
    <Box data-cy="service-time-box">
      {ConfirmDialogElement}
      <FormCard
        id="serviceTimeBox"
        onCancel={props.updatedFunction}
        onSave={handleSubmit(onValid)}
        onDelete={props.serviceTime?.id ? handleDelete : undefined}
        title={props.serviceTime.name || ""}
        isSubmitting={isSubmitting}
        icon="schedule"
        help="docs/b1-admin/attendance/">
        <ErrorMessages errors={summaryErrors} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel id="service">{Locale.label("attendance.serviceTimeEdit.service")}</InputLabel>
              <Controller name="serviceId" control={control} rules={{ required: Locale.label("attendance.serviceTimeEdit.validate.service") }} render={({ field }) => (
                <Select {...field} labelId="service" label={Locale.label("attendance.serviceTimeEdit.service")} data-testid="service-select" aria-label={Locale.label("attendance.serviceTimeEdit.serviceAria")} error={!!e.serviceId}>
                  {services.map((s, i) => <MenuItem key={i} value={s.id}>{s.name}</MenuItem>)}
                </Select>
              )} />
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label={Locale.label("attendance.serviceTimeEdit.name")} id="name" type="text" placeholder={Locale.label("attendance.serviceTimeEdit.namePlaceholder")} data-testid="service-time-name-input" aria-label={Locale.label("attendance.serviceTimeEdit.nameAria")} error={!!e.name} helperText={e.name?.message} {...register("name", { required: Locale.label("attendance.serviceTimeEdit.validate.name") })} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle2">{Locale.label("attendance.serviceTimeEdit.checkinSchedule")}</Typography>
            <Typography variant="body2" color="text.secondary">{Locale.label("attendance.serviceTimeEdit.checkinScheduleHelp")}</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth>
              <InputLabel id="dayOfWeek">{Locale.label("attendance.serviceTimeEdit.day")}</InputLabel>
              <Controller name="dayOfWeek" control={control} render={({ field }) => (
                <Select {...field} labelId="dayOfWeek" label={Locale.label("attendance.serviceTimeEdit.day")} data-testid="service-time-day-select">
                  <MenuItem value="">{Locale.label("attendance.serviceTimeEdit.noSchedule")}</MenuItem>
                  {[0, 1, 2, 3, 4, 5, 6].map((d) => <MenuItem key={d} value={d}>{weekdayName(d)}</MenuItem>)}
                </Select>
              )} />
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <TextField fullWidth type="time" label={Locale.label("attendance.serviceTimeEdit.startTime")} data-testid="service-time-start-input" slotProps={{ inputLabel: { shrink: true } }} {...register("startTime")} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <TextField fullWidth type="time" label={Locale.label("attendance.serviceTimeEdit.endTime")} data-testid="service-time-end-input" slotProps={{ inputLabel: { shrink: true } }} {...register("endTime")} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth type="number" label={Locale.label("attendance.serviceTimeEdit.openMinutes")} data-testid="service-time-open-minutes-input" slotProps={{ htmlInput: { min: 0 } }} {...register("checkinOpenMinutes")} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth type="number" label={Locale.label("attendance.serviceTimeEdit.closeMinutes")} data-testid="service-time-close-minutes-input" slotProps={{ htmlInput: { min: 0 } }} {...register("checkinCloseMinutes")} />
          </Grid>
        </Grid>
      </FormCard>
    </Box>
  );
};
