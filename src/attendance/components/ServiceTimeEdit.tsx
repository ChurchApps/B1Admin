import React from "react";
import { Alert, FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { TextField } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { type ServiceTimeInterface, type ServiceInterface } from "@churchapps/helpers";
import { useMountedState, InputBox, ApiHelper, Locale } from "@churchapps/apphelper";

interface Props {
  serviceTime: ServiceTimeInterface;
  updatedFunction: () => void;
}

type AnyRecord = Record<string, any>;

export const ServiceTimeEdit: React.FC<Props> = (props) => {
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
    <InputBox
      id="serviceTimeBox"
      data-cy="service-time-box"
      cancelFunction={props.updatedFunction}
      saveFunction={handleSubmit(onValid)}
      deleteFunction={props.serviceTime?.id ? handleDelete : null}
      headerText={props.serviceTime.name}
      isSubmitting={isSubmitting}
      headerIcon="schedule"
      help="docs/b1-admin/attendance/">
      {summaryErrors.length > 0 && <Alert severity="error" sx={{ mb: 2 }}>{summaryErrors.map((msg) => <div key={msg}>{msg}</div>)}</Alert>}
      <FormControl fullWidth>
        <InputLabel id="service">{Locale.label("attendance.serviceTimeEdit.service")}</InputLabel>
        <Controller name="serviceId" control={control} rules={{ required: Locale.label("attendance.serviceTimeEdit.validate.service") }} render={({ field }) => (
          <Select {...field} labelId="service" label={Locale.label("attendance.serviceTimeEdit.service")} data-testid="service-select" aria-label={Locale.label("attendance.serviceTimeEdit.serviceAria")} error={!!e.serviceId}>
            {services.map((s, i) => <MenuItem key={i} value={s.id}>{s.name}</MenuItem>)}
          </Select>
        )} />
      </FormControl>
      <TextField fullWidth label={Locale.label("attendance.serviceTimeEdit.name")} id="name" type="text" placeholder={Locale.label("attendance.serviceTimeEdit.namePlaceholder")} data-testid="service-time-name-input" aria-label={Locale.label("attendance.serviceTimeEdit.nameAria")} error={!!e.name} helperText={e.name?.message} {...register("name", { required: Locale.label("attendance.serviceTimeEdit.validate.name") })} />
    </InputBox>
  );
};
