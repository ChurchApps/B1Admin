import React from "react";
import { type GroupInterface, type GroupServiceTimeInterface, type SessionInterface } from "@churchapps/helpers";
import { ApiHelper, InputBox, ErrorMessages, DateHelper, UniqueIdHelper, Locale, Loading } from "@churchapps/apphelper";
import { TextField, FormControl, Select, InputLabel, MenuItem, type SelectChangeEvent } from "@mui/material";

interface Props {
  group: GroupInterface;
  session: SessionInterface;
  updatedFunction: (session: SessionInterface) => void;
}

export const SessionEdit: React.FC<Props> = (props) => {
  const [errors, setErrors] = React.useState<string[]>([]);
  const [sessionDate, setSessionDate] = React.useState<Date>(new Date());
  const [groupServiceTimes, setGroupServiceTimes] = React.useState<GroupServiceTimeInterface[]>([]);
  const [serviceTimeId, setServiceTimeId] = React.useState("");
  const [loading, setLoading] = React.useState(true);

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

  const handleKeyDown = (e: React.KeyboardEvent<any>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };

  const loadData = React.useCallback(() => {
    ApiHelper.get("/groupservicetimes?groupId=" + props.group.id, "AttendanceApi").then((data) => {
      setGroupServiceTimes(data);
    });
  }, [props.group]);

  const handleSave = () => {
    if (validate()) {
      const s = { ...props.session, groupId: props.group.id, sessionDate: sessionDate } as SessionInterface;
      if (!UniqueIdHelper.isMissing(serviceTimeId)) s.serviceTimeId = serviceTimeId;
      else s.serviceTimeId = null;

      ApiHelper.post("/sessions", [s], "AttendanceApi").then(() => {
        props.updatedFunction(s);
      });
    }
  };

  const validate = () => {
    const errors: string[] = [];
    if (sessionDate === null || sessionDate < new Date(2000, 1, 1)) errors.push(Locale.label("groups.sessionAdd.invDate"));
    setErrors(errors);
    return errors.length === 0;
  };

  const getServiceTimes = () => {
    if (groupServiceTimes.length === 0) return <></>;
    else {
      const options = [];
      for (let i = 0; i < groupServiceTimes.length; i++) {
        const gst = groupServiceTimes[i];
        options.push(
          <MenuItem key={i} value={gst.serviceTimeId}>
            {gst.serviceTime.name}
          </MenuItem>
        );
      }

      return (
        <FormControl>
          <InputLabel id="service-time">{Locale.label("groups.sessionAdd.srvTime")}</InputLabel>
          <Select
            label={Locale.label("groups.sessionAdd.srvTime")}
            labelId="service-time"
            value={serviceTimeId}
            onChange={(e: SelectChangeEvent) => {
              setServiceTimeId(e.target.value as string);
            }}
            onKeyDown={handleKeyDown}>
            {options}
          </Select>
        </FormControl>
      );
    }
  };

  React.useEffect(() => {
    if (props.group.id !== undefined) loadData();
  }, [props.group, loadData]);

  React.useEffect(() => {
    // Load session by ID to get full data
    if (props.session?.id) {
      setLoading(true);
      ApiHelper.get("/sessions/" + props.session.id, "AttendanceApi")
        .then((data) => {
          if (data?.sessionDate) {
            const date = new Date(data.sessionDate);
            if (!isNaN(date.getTime())) {
              setSessionDate(date);
            }
          }
          if (data?.serviceTimeId) {
            setServiceTimeId(data.serviceTimeId);
          }
          setLoading(false);
        })
        .catch((error) => {
          console.error("Failed to load session:", error);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [props.session?.id]);

  if (loading) {
    return (
      <InputBox data-cy="edit-session-box" headerIcon="edit" headerText={Locale.label("groups.sessionEdit.sesEdit")} cancelFunction={handleCancel} help="docs/b1-admin/attendance/">
        <Loading />
      </InputBox>
    );
  }

  return (
    <InputBox
      data-cy="edit-session-box"
      headerIcon="edit"
      headerText={Locale.label("groups.sessionEdit.sesEdit")}
      saveFunction={handleSave}
      cancelFunction={handleCancel}
      deleteFunction={handleDelete}
      help="docs/b1-admin/attendance/">
      <ErrorMessages errors={errors} />
      {getServiceTimes()}

      <TextField
        fullWidth
        type="date"
        InputLabelProps={{ shrink: true }}
        label={Locale.label("groups.sessionAdd.sesDate")}
        value={sessionDate && !isNaN(sessionDate.getTime()) ? DateHelper.formatHtml5Date(sessionDate) : ""}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSessionDate(new Date(e.currentTarget.value))}
        onKeyDown={handleKeyDown}
        data-testid="session-date-input"
        aria-label="Session date"
      />
    </InputBox>
  );
};
