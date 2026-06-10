import React from "react";
import { useForm, Controller, useFormState } from "react-hook-form";
import { type GroupInterface, type GroupServiceTimeInterface, type SessionInterface } from "@churchapps/helpers";
import { ApiHelper, ErrorMessages, DateHelper, UniqueIdHelper, Locale, Loading } from "@churchapps/apphelper";
import { TextField, FormControl, Select, InputLabel, MenuItem, Box } from "@mui/material";
import { FormCard } from "../../components/ui";

type AnyRecord = Record<string, any>;

interface Props {
  group: GroupInterface;
  session: SessionInterface;
  updatedFunction: (session: SessionInterface) => void;
}

const validateDate = (val: string) => {
  if (!val) return Locale.label("groups.sessionAdd.invDate");
  const d = new Date(val);
  if (isNaN(d.getTime()) || d < new Date(2000, 1, 1)) return Locale.label("groups.sessionAdd.invDate");
  return true;
};

export const SessionEdit: React.FC<Props> = (props) => {
  const [groupServiceTimes, setGroupServiceTimes] = React.useState<GroupServiceTimeInterface[]>([]);
  const [loading, setLoading] = React.useState(true);

  const { control, register, handleSubmit, reset } = useForm<AnyRecord>({ defaultValues: { sessionDate: DateHelper.formatHtml5Date(new Date()), serviceTimeId: "" } });

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

  const handleDelete = () => {
    if (window.confirm(Locale.label("groups.sessionEdit.deleteConfirm"))) {
      ApiHelper.delete("/sessions/" + props.session.id, "AttendanceApi").then(() => {
        props.updatedFunction(props.session);
      });
    }
  };

  const loadData = React.useCallback(() => {
    ApiHelper.get("/groupservicetimes?groupId=" + props.group.id, "AttendanceApi").then((data: any) => {
      setGroupServiceTimes(data);
    });
  }, [props.group]);

  const onValid = (values: AnyRecord) => {
    const sessionDate = new Date(values.sessionDate);
    const s = { ...props.session, groupId: props.group.id, sessionDate } as SessionInterface;
    if (!UniqueIdHelper.isMissing(values.serviceTimeId)) s.serviceTimeId = values.serviceTimeId;
    else s.serviceTimeId = null;
    ApiHelper.post("/sessions", [s], "AttendanceApi").then(() => {
      props.updatedFunction(s);
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
        <FormControl>
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
    <Box data-cy="edit-session-box">
      <FormCard
        icon="edit"
        title={Locale.label("groups.sessionEdit.sesEdit")}
        onSave={handleSubmit(onValid)}
        onCancel={handleCancel}
        onDelete={handleDelete}
        help="docs/b1-admin/attendance/">
        <ErrorMessages errors={summaryErrors} />
        {getServiceTimes()}
        <TextField fullWidth type="date" InputLabelProps={{ shrink: true }} label={Locale.label("groups.sessionAdd.sesDate")} data-testid="session-date-input" aria-label={Locale.label("groups.sessionAdd.sessionDateAria")} error={!!e.sessionDate} helperText={e.sessionDate?.message} {...register("sessionDate", { validate: validateDate })} />
      </FormCard>
    </Box>
  );
};
