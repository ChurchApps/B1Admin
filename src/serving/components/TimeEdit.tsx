import React from "react";
import { Checkbox, TextField, Typography } from "@mui/material";
import { type TimeInterface } from "@churchapps/helpers";
import { ApiHelper, DateHelper, ErrorMessages, InputBox, Locale } from "@churchapps/apphelper";

interface Props {
  time: TimeInterface;
  categories: string[];
  onUpdate: () => void;
}

export const TimeEdit = (props: Props) => {
  const [time, setTime] = React.useState<TimeInterface>(props.time);
  const [errors, setErrors] = React.useState<string[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setErrors([]);
    const t = { ...time } as TimeInterface;
    const value = e.target.value;
    switch (e.target.name) {
      case "displayName":
        t.displayName = value;
        break;
      case "startTime":
        t.startTime = new Date(value);
        break;
      case "endTime":
        t.endTime = new Date(value);
        break;
    }
    setTime(t);
  };

  const handleSave = () => {
    const errors: string[] = [];
    if (!time.displayName) errors.push(Locale.label("plans.timeEdit.disNameReq"));
    if (!time.startTime) errors.push(Locale.label("plans.timeEdit.startReq"));
    if (!time.endTime) errors.push(Locale.label("plans.timeEdit.endReq"));
    if (!time.teams || time.teams === "") errors.push(Locale.label("plans.timeEdit.teamReq"));
    setErrors(errors);
    if (errors.length === 0) ApiHelper.post("/times", [time], "DoingApi").then(props.onUpdate);
  };

  const handleDelete = () => {
    ApiHelper.delete("/times/" + time.id, "DoingApi").then(props.onUpdate);
  };

  const handleTeamCheck = (e: React.ChangeEvent<HTMLInputElement>) => {
    const teamList = time.teams?.split(",") || [];
    if (teamList.length === 1 && teamList[0] === "") teamList.pop();
    if (e.target.checked) teamList.push(e.target.value);
    else teamList.splice(teamList.indexOf(e.target.value), 1);
    const t = { ...time } as TimeInterface;
    t.teams = teamList.join(",");
    setTime(t);
  };

  const getTeams = () => {
    const result: JSX.Element[] = [];
    const teamList = time.teams?.split(",") || [];
    props.categories.forEach((c) => {
      const checked = teamList.includes(c);
      result.push(
        <div>
          <Checkbox key={c} name="team" checked={checked} onChange={handleTeamCheck} value={c} data-testid={`team-checkbox-${c.toLowerCase().replace(/\s+/g, "-")}`} aria-label={`Team ${c}`} />
          <label>{c}</label>
        </div>
      );
    });

    if (result.length === 0) {
      return (
        <Typography sx={{ fontSize: "13px", fontStyle: "italic" }}>
          {Locale.label("plans.timeEdit.tip")}{" "}
          <a href="https://support.churchapps.org/b1Admin/plans.html" target="_blank" rel="noopener noreferrer">
            {Locale.label("plans.timeEdit.followGuide")}
          </a>
        </Typography>
      );
    }
    return result;
  };

  return (
    <>
      <ErrorMessages errors={errors} />
      <InputBox
        headerText={props.time?.id ? Locale.label("plans.timeEdit.timeEdit") : Locale.label("plans.timeEdit.timeAdd")}
        headerIcon="assignment"
        saveFunction={handleSave}
        cancelFunction={props.onUpdate}
        deleteFunction={time.id ? handleDelete : null}
        isSubmitting={props.categories.length === 0}>
        <TextField
          fullWidth
          label={Locale.label("plans.timeEdit.disName")}
          id="displayName"
          name="displayName"
          type="text"
          value={time.displayName}
          onChange={handleChange}
          placeholder={Locale.label("placeholders.time.displayName")}
          data-testid="time-display-name-input"
          aria-label="Time display name"
        />
        <TextField
          fullWidth
          label={Locale.label("plans.timeEdit.timeStart")}
          id="startTime"
          name="startTime"
          type="datetime-local"
          value={DateHelper.formatHtml5DateTime(time.startTime)}
          onChange={handleChange}
          data-testid="time-start-input"
          aria-label="Start time"
        />
        <TextField
          fullWidth
          label={Locale.label("plans.timeEdit.timeEnd")}
          id="endTime"
          name="endTime"
          type="datetime-local"
          value={DateHelper.formatHtml5DateTime(time.endTime)}
          onChange={handleChange}
          data-testid="time-end-input"
          aria-label="End time"
        />
        <div style={{ marginTop: 10 }}>
          <b>{Locale.label("plans.timeEdit.teamNeed")}</b>
        </div>
        {getTeams()}
      </InputBox>
    </>
  );
};
