import React from "react";
import { useForm, Controller, useFormState } from "react-hook-form";
import { type GroupInterface, type GroupServiceTimeInterface, type SessionInterface } from "@churchapps/helpers";
import { ApiHelper, ErrorMessages, DateHelper, UniqueIdHelper, Locale, Loading } from "@churchapps/apphelper";
import { TextField, FormControl, Grid, Select, InputLabel, MenuItem, Box } from "@mui/material";
import { FormCard } from "../../components/ui";
import { useConfirmDelete, useErrorSummary } from "../../hooks";

type AnyRecord = Record<string, any>;

interface Props {
  group: GroupInterface;
  session?: SessionInterface;
  updatedFunction: (session: SessionInterface) => void;
}

const validateDate = (val: string) => {
  if (!val) return Locale.label("groups.sessionAdd.invDate");
  const d = new Date(val);
  if (isNaN(d.getTime()) || d < new Date(2000, 1, 1)) return Locale.label("groups.sessionAdd.invDate");
  return true;
};

export const SessionEdit: React.FC<Props> = (props) => {
  "use no memo"; // compiler caches register() results, breaking RHF field re-registration after reset()
  const isAdd = !props.session?.id;
  const [groupServiceTimes, setGroupServiceTimes] = React.useState<GroupServiceTimeInterface[]>([]);
  const [loading, setLoading] = React.useState(!isAdd);

  const { control, register, handleSubmit, reset, setValue } = useForm<AnyRecord>({ defaultValues: { sessionDate: DateHelper.formatHtml5Date(new Date()), serviceTimeId: "" } });

  const { errors } = useFormState({ control });
  const e = errors as any;
  const summaryErrors = useErrorSummary(errors, ["sessionDate"]);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const handleCancel = () => {
    props.updatedFunction(null);
  };

  const handleDelete = async () => {
    if (await confirm(Locale.label("groups.sessionEdit.deleteConfirm"))) {
      ApiHelper.delete("/sessions/" + props.session.id, "AttendanceApi").then(() => {
        props.updatedFunction(props.session);
      });
    }
  };

  const loadData = React.useCallback(() => {
    ApiHelper.get("/groupservicetimes?groupId=" + props.group.id, "AttendanceApi").then((data: any) => {
      setGroupServiceTimes(data);
      if (isAdd && data.length > 0) setValue("serviceTimeId", data[0].serviceTimeId);
    });
  }, [props.group, isAdd, setValue]);

  const onValid = (values: AnyRecord) => {
    if (!props.group?.id) return;
    const sessionDate = new Date(values.sessionDate);
    const s = { ...(props.session || {}), groupId: props.group.id, sessionDate } as SessionInterface;
    if (!UniqueIdHelper.isMissing(values.serviceTimeId)) s.serviceTimeId = values.serviceTimeId;
    else s.serviceTimeId = null;
    ApiHelper.post("/sessions", [s], "AttendanceApi").then(() => {
      props.updatedFunction(s);
      if (isAdd) setValue("sessionDate", DateHelper.formatHtml5Date(new Date()));
    });
  };

  React.useEffect(() => {
    if (props.group.id !== undefined) loadData();
  }, [props.group, loadData]);

  React.useEffect(() => {
    if (props.session?.id) {
      setLoading(true);
      ApiHelper.get("/sessions/" + props.session.id, "AttendanceApi")
        .then((data: any) => {
          const sessionDate = data?.sessionDate && !isNaN(new Date(data.sessionDate).getTime())
            ? DateHelper.formatHtml5Date(new Date(data.sessionDate))
            : DateHelper.formatHtml5Date(new Date());
          reset({
            sessionDate,
            serviceTimeId: data?.serviceTimeId || ""
          });
          setLoading(false);
        })
        .catch((error: any) => {
          console.error("Failed to load session:", error);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [props.session?.id, reset]);

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

  if (loading) {
    return (
      <Box data-cy="edit-session-box">
        <FormCard icon="edit" title={Locale.label("groups.sessionEdit.sesEdit")} onCancel={handleCancel} help="docs/b1-admin/attendance/">
          <Loading />
        </FormCard>
      </Box>
    );
  }

  return (
    <Box data-cy={isAdd ? "add-session-box" : "edit-session-box"}>
      {ConfirmDialogElement}
      <FormCard
        icon={isAdd ? "calendar_month" : "edit"}
        title={isAdd ? Locale.label("groups.sessionAdd.sesAdd") : Locale.label("groups.sessionEdit.sesEdit")}
        onSave={handleSubmit(onValid)}
        onCancel={handleCancel}
        onDelete={isAdd ? undefined : handleDelete}
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
