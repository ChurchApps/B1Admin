import React from "react";
import { FormControl, InputLabel, Select, TextField, MenuItem, type SelectChangeEvent } from "@mui/material";
import { type ServiceTimeInterface, type ServiceInterface } from "@churchapps/helpers";
import { useMountedState, InputBox, ApiHelper, ErrorMessages, Locale } from "@churchapps/apphelper";

interface Props {
  serviceTime: ServiceTimeInterface;
  updatedFunction: () => void;
}

export const ServiceTimeEdit: React.FC<Props> = (props) => {
  const [serviceTime, setServiceTime] = React.useState({} as ServiceTimeInterface);
  const [services, setServices] = React.useState([] as ServiceInterface[]);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const isMounted = useMountedState();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    setErrors([]);
    const st = { ...serviceTime } as ServiceTimeInterface;
    const value = e.target.value;
    switch (e.target.name) {
      case "name": st.name = value; break;
      case "service": st.serviceId = value; break;
    }
    setServiceTime(st);
  };

  const validate = () => {
    const result = [];
    if (!serviceTime.name) result.push(Locale.label("attendance.serviceTimeEdit.validate.name"));
    if (!serviceTime.serviceId) result.push(Locale.label("attendance.serviceTimeEdit.validate.service"));
    setErrors(result);
    return result.length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      setIsSubmitting(true);
      ApiHelper.post("/servicetimes", [serviceTime], "AttendanceApi")
        .then(props.updatedFunction)
        .finally(() => {
          setIsSubmitting(false);
        });
    }
  };
  const handleDelete = () => {
    if (window.confirm(Locale.label("attendance.serviceTimeEdit.confirmDelete"))) ApiHelper.delete("/servicetimes/" + serviceTime.id, "AttendanceApi").then(props.updatedFunction);
  };

  const loadData = React.useCallback(() => {
    ApiHelper.get("/services", "AttendanceApi").then((data) => {
      if (isMounted()) {
        setServices(data);
      }
      if (data.length > 0) {
        const st = { ...props.serviceTime };
        st.serviceId = data[0].id;
        if (isMounted()) {
          setServiceTime(st);
        }
      }
    });
  }, [props.serviceTime, isMounted]);

  const getServiceOptions = () => {
    const options = [];
    for (let i = 0; i < services.length; i++) {
      options.push(<MenuItem key={i} value={services[i].id}>{services[i].name}</MenuItem>);
    }
    return options;
  };

  React.useEffect(() => {
    setServiceTime(props.serviceTime);
    loadData();
  }, [props.serviceTime, loadData, isMounted]);

  if (serviceTime === null || serviceTime.id === undefined) return null;
  return (
    <InputBox
      id="serviceTimeBox"
      data-cy="service-time-box"
      cancelFunction={props.updatedFunction}
      saveFunction={handleSave}
      deleteFunction={props.serviceTime?.id ? handleDelete : null}
      headerText={serviceTime.name}
      isSubmitting={isSubmitting}
      headerIcon="schedule"
      help="docs/b1-admin/attendance/">
      <ErrorMessages errors={errors} />
      <FormControl fullWidth>
        <InputLabel id="service">{Locale.label("attendance.serviceTimeEdit.service")}</InputLabel>
        <Select
          name="service"
          labelId="service"
          label={Locale.label("attendance.serviceTimeEdit.service")}
          value={serviceTime.serviceId}
          onChange={handleChange}
          data-testid="service-select"
          aria-label="Select service">
          {getServiceOptions()}
        </Select>
      </FormControl>
      <TextField
        fullWidth
        label={Locale.label("attendance.serviceTimeEdit.name")}
        id="name"
        name="name"
        type="text"
        value={serviceTime.name}
        onChange={handleChange}
        placeholder="8:00 AM"
        data-testid="service-time-name-input"
        aria-label="Service time name"
      />
    </InputBox>
  );
};
