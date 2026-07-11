import React from "react";
import { type GroupInterface, type GroupServiceTimeInterface } from "@churchapps/helpers";
import { Locale } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableRow, TableCell } from "@mui/material";
interface Props {
  group: GroupInterface;
}

export const ServiceTimes: React.FC<Props> = (props) => {
  const serviceTimesQuery = useQuery<GroupServiceTimeInterface[]>({
    queryKey: ["/groupservicetimes?groupId=" + props.group.id, "AttendanceApi"],
    placeholderData: [],
    enabled: props.group.id !== undefined
  });
  const groupServiceTimes = serviceTimesQuery.data || [];

  const getRows = () => {
    const result: JSX.Element[] = [];
    for (let i = 0; i < groupServiceTimes.length; i++) {
      const gst = groupServiceTimes[i];
      result.push(<div key={gst.id}> {gst.serviceTime?.name}</div>);
    }
    return result;
  };

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
