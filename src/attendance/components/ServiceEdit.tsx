import React from "react";
import { Alert, FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { type ServiceInterface } from "@churchapps/helpers";
import { InputBox, ApiHelper, UniqueIdHelper, Locale } from "@churchapps/apphelper";
import { useCampuses } from "../../hooks/useCampuses";

interface Props {
  service: ServiceInterface;
  updatedFunction: () => void;
}

type AnyRecord = Record<string, any>;

export const ServiceEdit: React.FC<Props> = (props) => {
  // Campuses are mastered in the membership module; read the shared cached list.
  const campuses = useCampuses();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { control, register, handleSubmit, reset, formState } = useForm<AnyRecord>({ defaultValues: { name: "", campusId: "" } });
  const e = formState.errors as any;
  const summaryErrors: string[] = [];
  if (e.name?.message) summaryErrors.push(e.name.message);
  if (e.campusId?.message) summaryErrors.push(e.campusId.message);

  const onValid = (values: AnyRecord) => {
    setIsSubmitting(true);
    const service = { ...props.service, ...values };
    ApiHelper.post("/services", [service], "AttendanceApi")
      .then(props.updatedFunction)
      .finally(() => { setIsSubmitting(false); });
  };

  const handleDelete = () => {
    if (window.confirm(Locale.label("attendance.serviceEdit.confirmDelete"))) ApiHelper.delete("/services/" + props.service.id, "AttendanceApi").then(props.updatedFunction);
  };

  const loadData = React.useCallback(() => {
    const defaultCampusId = UniqueIdHelper.isMissing(props.service?.campusId) && campuses.length > 0 ? campuses[0].id : (props.service?.campusId || "");
    reset({ name: props.service?.name || "", campusId: defaultCampusId });
  }, [props.service, campuses, reset]);

  React.useEffect(() => { loadData(); }, [loadData]);

  if (props.service === null || props.service.id === undefined) return null;

  return (
    <InputBox
      id="serviceBox"
      data-cy="service-box"
      cancelFunction={props.updatedFunction}
      saveFunction={handleSubmit(onValid)}
      deleteFunction={props.service?.id ? handleDelete : null}
      headerText={props.service.name}
      headerIcon="calendar_month"
      isSubmitting={isSubmitting}
      help="docs/b1-admin/attendance/">
      {summaryErrors.length > 0 && <Alert severity="error" sx={{ mb: 2 }}>{summaryErrors.map((msg) => <div key={msg}>{msg}</div>)}</Alert>}
      <FormControl fullWidth>
        <InputLabel id="campus">{Locale.label("attendance.serviceEdit.campus")}</InputLabel>
        <Controller name="campusId" control={control} rules={{ required: Locale.label("attendance.serviceEdit.validate.campus") }} render={({ field }) => (
          <Select {...field} labelId="campus" label={Locale.label("attendance.serviceEdit.campus")} data-testid="campus-select" aria-label={Locale.label("attendance.serviceEdit.campusAria")} error={!!e.campusId}>
            {campuses.map((c, i) => <MenuItem key={i} value={c.id}>{c.name}</MenuItem>)}
          </Select>
        )} />
      </FormControl>
      <TextField fullWidth label={Locale.label("attendance.serviceEdit.name")} id="name" type="text" placeholder={Locale.label("placeholders.service.name")} data-testid="service-name-input" aria-label={Locale.label("attendance.serviceEdit.nameAria")} error={!!e.name} helperText={e.name?.message} {...register("name", { required: Locale.label("attendance.serviceEdit.validate.name") })} />
    </InputBox>
  );
};
