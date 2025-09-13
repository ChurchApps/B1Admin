import React, { memo, useCallback, useMemo } from "react";
import { type GroupInterface, type GroupServiceTimeInterface, type ServiceTimeInterface } from "@churchapps/helpers";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import {
  Table, TableBody, TableRow, TableCell, FormControl, InputLabel, Select, Button, MenuItem, type SelectChangeEvent,
  Icon
} from "@mui/material";

interface Props {
  group: GroupInterface;
  updatedFunction?: (group: GroupInterface) => void;
}

export const ServiceTimesEdit = memo((props: Props) => {
  const [groupServiceTimes, setGroupServiceTimes] = React.useState<GroupServiceTimeInterface[]>([]);
  const [serviceTimes, setServiceTimes] = React.useState<ServiceTimeInterface[]>([]);
  const [addServiceTimeId, setAddServiceTimeId] = React.useState("");

  const loadData = useCallback(() => {
    ApiHelper.get("/groupservicetimes?groupId=" + props.group.id, "AttendanceApi").then((data) => setGroupServiceTimes(data));
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
          <button
            type="button"
            style={{ color: "#dc3545", background: "none", border: 0, padding: 0, cursor: "pointer" }}
            data-id={gst.id}
            onClick={handleRemove}>
            <Icon>person_remove</Icon> {Locale.label("common.remove")}
          </button>
        </TableCell>
      </TableRow>
    ));
  }, [groupServiceTimes, handleRemove]);

  const options = useMemo(() => {
    return serviceTimes.map((serviceTime, index) => (
      <MenuItem key={index} value={serviceTime.id}>
        {serviceTime.longName}
      </MenuItem>
    ));
  }, [serviceTimes]);

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
              <Button variant="contained" data-cy="add-service-time" onClick={handleAdd}>
                <Icon>add</Icon> {Locale.label("common.add")}
              </Button>
            </>
          }>
          {options}
        </Select>
      </FormControl>
    </div>
  );
});
