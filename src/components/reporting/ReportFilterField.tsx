"use client";

import React from "react";
import type { ReportInterface, ParameterInterface } from "@churchapps/helpers";
import { ApiHelper, ArrayHelper, DateHelper, Locale } from "../../helpers";
import { FormControl, InputLabel, Select, type SelectChangeEvent, TextField, MenuItem } from "@mui/material";
import { useMountedState } from "@churchapps/apphelper";

interface Props {
  parameter: ParameterInterface;
  report: ReportInterface;
  onChange: (parameter: ParameterInterface, permittedChildIds: string[]) => void;
}

export const ReportFilterField = (props: Props) => {
  const [rawData, setRawData] = React.useState<any[]>(null);
  const [secondaryData, setSecondaryData] = React.useState<any[]>(null);
  const isMounted = useMountedState();

  const init = async () => {
    switch (props.parameter.sourceKey) {
      case "provided": setRawData(props.parameter.options); break;
      case "month": setRawData(getMonths()); break;
      case "campus":
        ApiHelper.get("/campuses", "AttendanceApi").then((data) => {
          data.unshift({ id: "", name: Locale.label("common.reportFilterField.any") });
          if (isMounted()) {
            setRawData(data);
          }
        });
        break;
      case "service":
        ApiHelper.get("/services", "AttendanceApi").then((data) => {
          data.unshift({ id: "", name: Locale.label("common.reportFilterField.any") });
          if (isMounted()) {
            setRawData(data);
          }
        });
        break;
      case "serviceTime":
        ApiHelper.get("/serviceTimes", "AttendanceApi").then((data) => {
          data.unshift({ id: "", name: Locale.label("common.reportFilterField.any") });
          if (isMounted()) {
            setRawData(data);
          }
        });
        break;
      case "group":
        ApiHelper.get("/groups", "MembershipApi").then((data) => {
          data.unshift({ id: "", name: Locale.label("common.reportFilterField.any") });
          if (isMounted()) {
            setRawData(data);
          }
        });
        ApiHelper.get("/groupServiceTimes", "AttendanceApi").then((data) => {
          if (isMounted()) {
            setSecondaryData(data);
          }
        });
        break;
    }
    setDefaultValue();
  };

  const setDefaultValue = () => {
    switch (props.parameter.source) {
      case "date":
        if (props.parameter.defaultValue) {
          let dt = new Date();
          if (props.parameter.defaultValue === "yesterday") dt.setDate(dt.getDate() - 1);
          if (props.parameter.defaultValue === "lastYear") dt.setFullYear(dt.getFullYear() - 1);
          if (props.parameter.defaultValue === "lastSunday") dt = DateHelper.getLastSunday();
          const p = { ...props.parameter };
          p.value = DateHelper.formatHtml5Date(dt);
          props.onChange(p, []);
        }
        break;
    }
  };

  const getMonths = () => {
    const list = [
      Locale.label("month.january"),
      Locale.label("month.february"),
      Locale.label("month.march"),
      Locale.label("month.april"),
      Locale.label("month.may"),
      Locale.label("month.june"),
      Locale.label("month.july"),
      Locale.label("month.august"),
      Locale.label("month.september"),
      Locale.label("month.october"),
      Locale.label("month.november"),
      Locale.label("month.december")
    ];

    const result = [];
    for (let i = 0; i < list.length; i++) result.push({ value: (i + 1).toString(), text: list[i] });
    return result;
  };

  const getIdName = () => {
    const result: { value: string; text: string }[] = [];
    filterOptions().forEach((d) => {
      result.push({ value: d.id, text: d.name });
    });
    return result;
  };

  const filterOptions = () => {
    let result = rawData;
    if (props.parameter.requiredParentIds?.length > 0) {
      switch (props.parameter.sourceKey) {
        case "service":
          result = ArrayHelper.getAllArray(rawData, "campusId", props.parameter.requiredParentIds);
          result.unshift({ id: "", name: Locale.label("common.reportFilterField.any") });
          break;
        case "serviceTime":
          result = ArrayHelper.getAllArray(rawData, "serviceId", props.parameter.requiredParentIds);
          result.unshift({ id: "", name: Locale.label("common.reportFilterField.any") });
          break;
        case "group":
          const times = ArrayHelper.getAllArray(secondaryData, "serviceTimeId", props.parameter.requiredParentIds);
          result = ArrayHelper.getAllArray(rawData, "id", ArrayHelper.getUniqueValues(times, "groupId"));
          result.unshift({ id: "", name: Locale.label("common.reportFilterField.any") });
          break;
      }
    }
    return result;
  };

  const getOptions = () => {
    let options: { value: string; text: string }[] = [];
    if (rawData) {
      switch (props.parameter.sourceKey) {
        case "campus":
        case "service":
        case "serviceTime":
        case "group": options = getIdName(); break;
        case "month":
        case "provided": options = rawData; break;
      }
    }

    return options;
  };

  const options = getOptions();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    const p = { ...props.parameter };
    p.value = e.target.value;
    const parentIds = [];
    if (p.value) parentIds.push(p.value);
    props.onChange(p, parentIds);
  };

  React.useEffect(() => {
    init();
  }, [props.parameter.keyName, isMounted]);

  let result = <></>;
  switch (props.parameter.source) {
    case "dropdown":
      result = (
        <FormControl fullWidth>
          <InputLabel>{props.parameter.displayName}</InputLabel>
          <Select value={options.find((v) => v.value === props.parameter.value)?.value || ""} label={props.parameter.displayName} onChange={handleChange} name={props.parameter.keyName}>
            {options.map((o, i) => (
              <MenuItem key={i} value={o.value}>
                {o.text}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
      break;
    case "date":
      result = (
        <TextField
          type="date"
          fullWidth
          InputLabelProps={{ shrink: true }}
          label={props.parameter.displayName}
          value={props.parameter.value || ""}
          onChange={handleChange}
          name={props.parameter.keyName}
        />
      );
      break;
  }
  return result;
};
