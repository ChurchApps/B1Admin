import React, { memo, useCallback, useMemo } from "react";
import { type GroupInterface, type GroupServiceTimeInterface, type ServiceInterface, type ServiceTimeInterface } from "@churchapps/helpers";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import {
  Table, TableBody, TableRow, TableCell, FormControl, InputLabel, Select, MenuItem, type SelectChangeEvent,
  Icon
} from "@mui/material";
import { PersonRemove as PersonRemoveIcon, Add as AddIcon } from "@mui/icons-material";
import { useCampuses } from "../../hooks/useCampuses";
import { AppIconButton } from "../../components/ui/AppIconButton";

interface Props {
  group: GroupInterface;
  updatedFunction?: (group: GroupInterface) => void;
}

export const ServiceTimesEdit = memo((props: Props) => {
  // Campuses are mastered in the membership module; build the "Campus - Service -
  // Service Time" label client-side rather than relying on the (frozen)
  // attendance longName join.
  const campuses = useCampuses();
  const [groupServiceTimes, setGroupServiceTimes] = React.useState<GroupServiceTimeInterface[]>([]);
  const [serviceTimes, setServiceTimes] = React.useState<ServiceTimeInterface[]>([]);
  const [services, setServices] = React.useState<ServiceInterface[]>([]);
  const [addServiceTimeId, setAddServiceTimeId] = React.useState("");

  const loadData = useCallback(() => {
    ApiHelper.get("/groupservicetimes?groupId=" + props.group.id, "AttendanceApi").then((data) => setGroupServiceTimes(data));
    ApiHelper.get("/services", "AttendanceApi").then((data) => setServices(data));
    ApiHelper.get("/servicetimes", "AttendanceApi").then((data) => {
      setServiceTimes(data);
      const st = data[0] as ServiceTimeInterface;
      if (data.length > 0) setAddServiceTimeId(st.id);
    });
  }, [props.group.id]);

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const anchor = e.currentTarget as HTMLAnchorElement;
      const id = anchor.getAttribute("data-id");
      ApiHelper.delete("/groupservicetimes/" + id.toString(), "AttendanceApi").then(loadData);
    },
    [loadData]
  );

  const rows = useMemo(() => {
    return groupServiceTimes.map((gst) => (
      <TableRow key={gst.id}>
        <TableCell>
          <Icon>schedule</Icon> {gst.serviceTime.name}
        </TableCell>
        <TableCell>
          <AppIconButton intent="remove" label={Locale.label("common.remove")} icon={<PersonRemoveIcon />} data-id={gst.id} onClick={handleRemove} />
        </TableCell>
      </TableRow>
    ));
  }, [groupServiceTimes, handleRemove]);

  const options = useMemo(() => {
    return serviceTimes.map((serviceTime, index) => {
      const service = services.find((s) => s.id === serviceTime.serviceId);
      const campusName = campuses.find((c) => c.id === service?.campusId)?.name || "";
      const longName = [campusName, service?.name, serviceTime.name].filter(Boolean).join(" - ");
      return (
        <MenuItem key={index} value={serviceTime.id}>
          {longName || serviceTime.longName}
        </MenuItem>
      );
    });
  }, [serviceTimes, services, campuses]);

  const handleAdd = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const gst = { groupId: props.group.id, serviceTimeId: addServiceTimeId } as GroupServiceTimeInterface;
      ApiHelper.post("/groupservicetimes", [gst], "AttendanceApi").then(loadData);
    },
    [props.group.id, addServiceTimeId, loadData]
  );

  const handleChange = useCallback((e: SelectChangeEvent) => {
    setAddServiceTimeId(e.target.value as string);
  }, []);

  React.useEffect(() => {
    if (props.group.id !== undefined) loadData();
  }, [props.group.id, loadData]);

  return (
    <div>
      <label>{Locale.label("groups.serviceTimesEdit.srvTimeOp")}</label>
      <Table>
        <TableBody>{rows}</TableBody>
      </Table>
      <FormControl fullWidth>
        <InputLabel>{Locale.label("groups.serviceTimesEdit.srvTimeAdd")}</InputLabel>
        <Select
          fullWidth
          label={Locale.label("groups.serviceTimesEdit.srvTimeAdd")}
          aria-label="serviceTime"
          data-cy="choose-service-time"
          value={addServiceTimeId}
          onChange={handleChange}
          endAdornment={
            <>
              <Icon>arrow_drop_down</Icon>
              <AppIconButton intent="add" label={Locale.label("common.add")} icon={<AddIcon />} tone="card" size="medium" data-cy="add-service-time" onClick={handleAdd} />
            </>
          }>
          {options}
        </Select>
      </FormControl>
    </div>
  );
});
