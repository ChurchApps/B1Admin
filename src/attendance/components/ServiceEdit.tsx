import React from "react";
import { FormControl, InputLabel, Select, TextField, MenuItem, type SelectChangeEvent } from "@mui/material";
import { type ServiceInterface, type CampusInterface } from "@churchapps/helpers";
import { useMountedState, InputBox, ApiHelper, UniqueIdHelper, ErrorMessages } from "@churchapps/apphelper";
import { Locale } from "@churchapps/apphelper";

interface Props {
  service: ServiceInterface;
  updatedFunction: () => void;
}

export const ServiceEdit: React.FC<Props> = (props) => {
  const [service, setService] = React.useState({} as ServiceInterface);
  const [campuses, setCampuses] = React.useState([] as CampusInterface[]);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const isMounted = useMountedState();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    setErrors([]);
    const s = { ...service } as ServiceInterface;
    const value = e.target.value;
    switch (e.target.name) {
      case "name": s.name = value; break;
      case "campus": s.campusId = value; break;
    }
    setService(s);
  };

  const validate = () => {
    const result = [];
    if (!service.name) result.push(Locale.label("attendance.serviceEdit.validate.name"));
    if (!service.campusId) result.push(Locale.label("attendance.serviceEdit.validate.campus"));
    setErrors(result);
    return result.length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      setIsSubmitting(true);
      ApiHelper.post("/services", [service], "AttendanceApi")
        .then(props.updatedFunction)
        .finally(() => {
          setIsSubmitting(false);
        });
    }
  };
  const handleDelete = () => {
    if (window.confirm(Locale.label("attendance.serviceEdit.confirmDelete"))) ApiHelper.delete("/services/" + service.id, "AttendanceApi").then(props.updatedFunction);
  };

  const loadData = React.useCallback(() => {
    ApiHelper.get("/campuses", "AttendanceApi").then((data: any) => {
      if (isMounted()) {
        setCampuses(data);
      }
      if (data.length > 0) {
        if (UniqueIdHelper.isMissing(service?.campusId)) {
          const s = { ...props.service };
          s.campusId = data[0].id;
          if (isMounted()) {
            setService(s);
          }
        }
      }
    });
  }, [props.service, isMounted]);

  const getCampusOptions = () => {
    const options = [];
    for (let i = 0; i < campuses.length; i++) {
      options.push(<MenuItem key={i} value={campuses[i].id}>{campuses[i].name}</MenuItem>);
    }
    return options;
  };

  React.useEffect(() => {
    setService(props.service);
    loadData();
  }, [props.service, loadData, isMounted]);

  if (service === null || service.id === undefined) return null;

  return (
    <InputBox
      id="serviceBox"
      data-cy="service-box"
      cancelFunction={props.updatedFunction}
      saveFunction={handleSave}
      deleteFunction={props.service?.id ? handleDelete : null}
      headerText={service.name}
      headerIcon="calendar_month"
      isSubmitting={isSubmitting}
      help="b1Admin/attendance">
      <ErrorMessages errors={errors} />
      <FormControl fullWidth>
        <InputLabel id="campus">{Locale.label("attendance.serviceEdit.campus")}</InputLabel>
        <Select
          name="campus"
          labelId="campus"
          label={Locale.label("attendance.serviceEdit.campus")}
          value={service.campusId}
          onChange={handleChange}
          data-testid="campus-select"
          aria-label="Select campus">
          {getCampusOptions()}
        </Select>
      </FormControl>
      <TextField
        fullWidth
        label={Locale.label("attendance.serviceEdit.name")}
        id="name"
        name="name"
        type="text"
        value={service.name}
        onChange={handleChange}
        placeholder={Locale.label("placeholders.service.name")}
        data-testid="service-name-input"
        aria-label="Service name"
      />
    </InputBox>
  );
};
