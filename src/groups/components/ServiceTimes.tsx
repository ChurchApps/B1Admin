import React from "react";
import { type GroupInterface, type GroupServiceTimeInterface } from "@churchapps/helpers";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { Table, TableBody, TableRow, TableCell } from "@mui/material";
interface Props {
  group: GroupInterface;
}

export const ServiceTimes: React.FC<Props> = (props) => {
  const [groupServiceTimes, setGroupServiceTimes] = React.useState<GroupServiceTimeInterface[]>([]);

  const loadData = React.useCallback(() => ApiHelper.get("/groupservicetimes?groupId=" + props.group.id, "AttendanceApi").then((data: any) => setGroupServiceTimes(data)), [props.group.id]);

  const getRows = () => {
    const result: JSX.Element[] = [];
    for (let i = 0; i < groupServiceTimes.length; i++) {
      const gst = groupServiceTimes[i];
      result.push(<div key={gst.id}> {gst.serviceTime.name}</div>);
    }
    return result;
  };

  React.useEffect(() => {
    if (props.group.id !== undefined) loadData();
  }, [props.group, loadData]);

  return (
    <Table>
      <TableBody>
        <TableRow>
          <TableCell>
            <label>{Locale.label("groups.serviceTimes.services")}</label>
          </TableCell>
          <TableCell>{getRows()}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
};
