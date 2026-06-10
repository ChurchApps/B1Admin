import React from "react";
import { useForm, Controller, useFormState } from "react-hook-form";
import { type GroupInterface, type GroupServiceTimeInterface, type SessionInterface } from "@churchapps/helpers";
import { ApiHelper, ErrorMessages, DateHelper, UniqueIdHelper, Locale } from "@churchapps/apphelper";
import { TextField, FormControl, Grid, Select, InputLabel, MenuItem, Box } from "@mui/material";
import { FormCard } from "../../components/ui";

type AnyRecord = Record<string, any>;

interface Props {
  group: GroupInterface;
  updatedFunction: (session: SessionInterface) => void;
}

const validateDate = (val: string) => {
  if (!val) return Locale.label("groups.sessionAdd.invDate");
  const d = new Date(val);
  if (isNaN(d.getTime()) || d < new Date(2000, 1, 1)) return Locale.label("groups.sessionAdd.invDate");
  return true;
};

export const SessionAdd: React.FC<Props> = (props) => {
  const [groupServiceTimes, setGroupServiceTimes] = React.useState<GroupServiceTimeInterface[]>([]);

  const { control, register, handleSubmit, setValue } = useForm<AnyRecord>({ defaultValues: { sessionDate: DateHelper.formatHtml5Date(new Date()), serviceTimeId: "" } });

  const { errors } = useFormState({ control });
  const e = errors as any;

  const summaryErrors: string[] = React.useMemo(() => {
    const errs: string[] = [];
    if (e.sessionDate?.message) errs.push(e.sessionDate.message);
    return errs;
  }, [errors]);

  const handleCancel = () => {
    props.updatedFunction(null);
  };

  const loadData = React.useCallback(() => {
    ApiHelper.get("/groupservicetimes?groupId=" + props.group.id, "AttendanceApi").then((data: any) => {
      setGroupServiceTimes(data);
      if (data.length > 0) setValue("serviceTimeId", data[0].serviceTimeId);
    });
  }, [props.group, setValue]);

  const onValid = (values: AnyRecord) => {
    if (!props.group?.id) return;
    const sessionDate = new Date(values.sessionDate);
    const s = { groupId: props.group.id, sessionDate } as SessionInterface;
    if (!UniqueIdHelper.isMissing(values.serviceTimeId)) s.serviceTimeId = values.serviceTimeId;
    ApiHelper.post("/sessions", [s], "AttendanceApi").then(() => {
      props.updatedFunction(s);
      setValue("sessionDate", DateHelper.formatHtml5Date(new Date()));
    });
  };

  React.useEffect(() => {
    if (props.group.id !== undefined) loadData();
  }, [props.group, loadData]);

  const getServiceTimes = () => {
    if (groupServiceTimes.length === 0) return <></>;
    return (
      <Controller name="serviceTimeId" control={control} render={({ field }) => (
        <FormControl fullWidth>
          <InputLabel id="service-time">{Locale.label("groups.sessionAdd.srvTime")}</InputLabel>
          <Select {...field} value={field.value ?? ""} label={Locale.label("groups.sessionAdd.srvTime")} labelId="service-time">
            {groupServiceTimes.map((gst, i) => (
              <MenuItem key={i} value={gst.serviceTimeId}>{gst.serviceTime.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      )} />
    );
  };

  return (
    <Box data-cy="add-session-box">
      <FormCard
        icon="calendar_month"
        title={Locale.label("groups.sessionAdd.sesAdd")}
        onSave={handleSubmit(onValid)}
        onCancel={handleCancel}
        help="docs/b1-admin/attendance/">
        <ErrorMessages errors={summaryErrors} />
        <Grid container spacing={2}>
          {groupServiceTimes.length > 0 && <Grid size={{ xs: 12, sm: 6 }}>{getServiceTimes()}</Grid>}
          <Grid size={{ xs: 12, sm: groupServiceTimes.length > 0 ? 6 : 12 }}>
            <TextField fullWidth type="date" label={Locale.label("groups.sessionAdd.sesDate")} data-testid="session-date-input" aria-label={Locale.label("groups.sessionAdd.sessionDateAria")} error={!!e.sessionDate} helperText={e.sessionDate?.message} {...register("sessionDate", { validate: validateDate })} />
          </Grid>
        </Grid>
      </FormCard>
    </Box>
  );
};
