import React from "react";
import { Alert, Box, FormControl, Grid, InputLabel, MenuItem, Select } from "@mui/material";
import { TextField } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { type ServiceTimeInterface, type ServiceInterface } from "@churchapps/helpers";
import { useMountedState, ApiHelper, Locale } from "@churchapps/apphelper";
import { FormCard } from "../../components/ui";

interface Props {
  serviceTime: ServiceTimeInterface;
  updatedFunction: () => void;
}

type AnyRecord = Record<string, any>;

export const ServiceTimeEdit: React.FC<Props> = (props) => {
  "use no memo"; // compiler caches register() results, breaking RHF field re-registration after reset()
  const [services, setServices] = React.useState([] as ServiceInterface[]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const isMounted = useMountedState();

  const { control, register, handleSubmit, reset, formState } = useForm<AnyRecord>({ defaultValues: { name: "", serviceId: "" } });
  const e = formState.errors as any;
  const summaryErrors: string[] = [];
  if (e.name?.message) summaryErrors.push(e.name.message);
  if (e.serviceId?.message) summaryErrors.push(e.serviceId.message);

  const onValid = (values: AnyRecord) => {
    setIsSubmitting(true);
    const serviceTime = { ...props.serviceTime, ...values };
    ApiHelper.post("/servicetimes", [serviceTime], "AttendanceApi")
      .then(props.updatedFunction)
      .finally(() => { setIsSubmitting(false); });
  };

  const handleDelete = () => {
    if (window.confirm(Locale.label("attendance.serviceTimeEdit.confirmDelete"))) ApiHelper.delete("/servicetimes/" + props.serviceTime.id, "AttendanceApi").then(props.updatedFunction);
  };

  const loadData = React.useCallback(() => {
    ApiHelper.get("/services", "AttendanceApi").then((data: ServiceInterface[]) => {
      if (isMounted()) setServices(data);
      const defaultServiceId = props.serviceTime?.serviceId || (data.length > 0 ? data[0].id : "");
      if (isMounted()) reset({ name: props.serviceTime?.name || "", serviceId: defaultServiceId });
    });
  }, [props.serviceTime, isMounted, reset]);

  React.useEffect(() => { loadData(); }, [loadData]);

  if (props.serviceTime === null || props.serviceTime.id === undefined) return null;
  return (
    <Box data-cy="service-time-box">
      <FormCard
        id="serviceTimeBox"
        onCancel={props.updatedFunction}
        onSave={handleSubmit(onValid)}
        onDelete={props.serviceTime?.id ? handleDelete : undefined}
        title={props.serviceTime.name}
        isSubmitting={isSubmitting}
        icon="schedule"
        help="docs/b1-admin/attendance/">
        {summaryErrors.length > 0 && <Alert severity="error" sx={{ mb: 2 }}>{summaryErrors.map((msg) => <div key={msg}>{msg}</div>)}</Alert>}
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
        </Grid>
      </FormCard>
    </Box>
  );
};
