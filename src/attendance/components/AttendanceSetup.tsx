import React, { memo, useCallback, useMemo } from "react";

import { CampusEdit, ServiceEdit, ServiceTimeEdit } from "./";
import { Link } from "react-router-dom";
import {
  Icon, Table, TableBody, TableCell, TableRow, TableHead, IconButton, Menu, MenuItem, Paper, Box, Typography, Button, Stack
} from "@mui/material";
import {
  type AttendanceInterface,
  type CampusInterface,
  type ServiceInterface,
  type ServiceTimeInterface,
  type GroupServiceTimeInterface,
  type GroupInterface,
} from "@churchapps/helpers";
import {
  ArrayHelper,
  Loading,
  Locale,
} from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";

export const AttendanceSetup = memo(() => {
  const [selectedCampus, setSelectedCampus] = React.useState<CampusInterface>(null);
  const [selectedService, setSelectedService] = React.useState<ServiceInterface>(null);
  const [selectedServiceTime, setSelectedServiceTime] = React.useState<ServiceTimeInterface>(null);

  const attendance = useQuery<AttendanceInterface[]>({
    queryKey: ["/attendancerecords/tree", "AttendanceApi"],
    placeholderData: [],
  });

  const groupServiceTimes = useQuery<GroupServiceTimeInterface[]>({
    queryKey: ["/groupservicetimes", "AttendanceApi"],
    placeholderData: [],
  });

  const groups = useQuery<GroupInterface[]>({
    queryKey: ["/groups", "MembershipApi"],
    placeholderData: [],
  });


  const removeEditors = useCallback(() => {
    setSelectedCampus(null);
    setSelectedService(null);
    setSelectedServiceTime(null);
  }, []);

  const refetch = useCallback(() => {
    attendance.refetch();
    groupServiceTimes.refetch();
    groups.refetch();
  }, [attendance, groupServiceTimes, groups]);

  const handleUpdated = useCallback(() => {
    removeEditors();
    refetch();
  }, [removeEditors, refetch]);

  const selectCampus = useCallback(
    (campus: CampusInterface) => {
      removeEditors();
      if (campus.name !== "Undefined") setSelectedCampus(campus);
    },
    [removeEditors]
  );

  const selectService = useCallback(
    (service: ServiceInterface) => {
      removeEditors();
      setSelectedService(service);
    },
    [removeEditors]
  );

  const selectServiceTime = useCallback(
    (service: ServiceTimeInterface) => {
      removeEditors();
      setSelectedServiceTime(service);
    },
    [removeEditors]
  );

  const compare = useCallback((a: GroupInterface, b: GroupInterface) => a.categoryName.localeCompare(b.categoryName) || a.name.localeCompare(b.name), []);

  const unassignedGroups = useMemo(() => {
    const result: GroupInterface[] = [];
    groups.data.forEach((g) => {
      if (g.trackAttendance) {
        const gsts: GroupServiceTimeInterface[] = ArrayHelper.getAll(groupServiceTimes.data, "groupId", g.id);
        if (gsts.length === 0) result.push(g);
      }
    });
    return result;
  }, [groups.data, groupServiceTimes.data]);

  const getGroups = useCallback(
    (serviceTimeId: string) => {
      const result: GroupInterface[] = [];
      const gsts: GroupServiceTimeInterface[] = ArrayHelper.getAll(groupServiceTimes.data, "serviceTimeId", serviceTimeId);
      gsts.forEach((gst) => {
        const group: GroupInterface = ArrayHelper.getOne(groups.data, "id", gst.groupId);
        if (group !== null && group.trackAttendance) result.push(group);
      });
      return result;
    },
    [groups.data, groupServiceTimes.data]
  );

  const handleAddCampus = useCallback(() => {
    selectCampus({ id: "", name: Locale.label("attendance.attendanceSetup.newCampus") });
  }, [selectCampus]);

  const handleAddService = useCallback(() => {
    selectService({ id: "", campusId: "", name: Locale.label("attendance.attendanceSetup.newService") });
  }, [selectService]);

  const handleAddServiceTime = useCallback(() => {
    selectServiceTime({ id: "", serviceId: "", name: Locale.label("attendance.attendanceSetup.newServiceTime") });
  }, [selectServiceTime]);

  const editLinks = useMemo(
    () => (
      <IconButton
        aria-label="Add campus"
        data-cy="add-campus-button"
        onClick={handleAddCampus}
        data-testid="add-campus-button">
        <Icon color="primary">add</Icon>
      </IconButton>
    ),
    [handleAddCampus]
  );

  const tableHeader = useMemo(() => {
    if (attendance.data.length === 0) return [];
    return [
      <TableRow key="header">
        <TableCell sx={{ fontWeight: 600, color: "#666" }}>{Locale.label("attendance.attendancePage.campus")}</TableCell>
        <TableCell sx={{ fontWeight: 600, color: "#666" }}>{Locale.label("attendance.attendancePage.service")}</TableCell>
        <TableCell sx={{ fontWeight: 600, color: "#666" }}>{Locale.label("attendance.attendancePage.time")}</TableCell>
        <TableCell sx={{ fontWeight: 600, color: "#666" }}>{Locale.label("attendance.attendancePage.category")}</TableCell>
        <TableCell sx={{ fontWeight: 600, color: "#666" }}>{Locale.label("attendance.attendancePage.group")}</TableCell>
      </TableRow>,
    ];
  }, [attendance.data.length]);

  const getRows = useCallback(() => {
    const rows: JSX.Element[] = [];
    let lastCampus = "";
    let lastService = "";
    let lastServiceTime = "";
    let lastCategory = "";

    if (attendance.data.length === 0) {
      rows.push(
        <TableRow key="0">
          <TableCell colSpan={5} sx={{ textAlign: "center", py: 4 }}>
            <Stack spacing={2} alignItems="center">
              <Icon sx={{ fontSize: 48, color: "#ccc" }}>group</Icon>
              <Typography variant="h6" color="text.secondary">
                {Locale.label("attendance.attendancePage.groupAttMsg")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Locale.label("attendance.attendanceSetup.setupMessage")}
              </Typography>
            </Stack>
          </TableCell>
        </TableRow>
      );
      return rows;
    }

    const getRow = (campus: CampusInterface, service: ServiceInterface, serviceTime: ServiceTimeInterface, group: GroupInterface, key: string, isLast?: { campus?: boolean; service?: boolean }) => {
      const campusChanged = campus?.name !== lastCampus;
      const serviceChanged = service?.name !== lastService;

      const campusHtml =
        campus === undefined || !campusChanged ? (
          <></>
        ) : (
          <Stack direction="row" spacing={1} alignItems="center">
            <Icon sx={{ color: "#666", fontSize: 20 }}>church</Icon>
            <Button
              variant="text"
              size="small"
              onClick={() => selectCampus(campus)}
              sx={{
                color: "#1565C0",
                textTransform: "none",
                fontWeight: 600,
                minWidth: "auto",
                p: 0,
                fontSize: "0.95rem",
              }}>
              {campus.name}
            </Button>
          </Stack>
        );

      const serviceHtml =
        service === undefined || (service?.name === lastService && !campusChanged) ? (
          <></>
        ) : (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ pl: 2 }}>
            <Icon sx={{ color: "#999", fontSize: 18 }}>calendar_month</Icon>
            <Button
              variant="text"
              size="small"
              onClick={() => selectService(service)}
              sx={{
                color: "#1565C0",
                textTransform: "none",
                fontWeight: 500,
                minWidth: "auto",
                p: 0,
              }}>
              {service.name}
            </Button>
          </Stack>
        );

      const serviceTimeHtml =
        serviceTime === undefined || (serviceTime?.name === lastServiceTime && !campusChanged && !serviceChanged) ? (
          <></>
        ) : (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ pl: 4 }}>
            <Icon sx={{ color: "#bbb", fontSize: 16 }}>schedule</Icon>
            <Button
              variant="text"
              size="small"
              onClick={() => selectServiceTime(serviceTime)}
              sx={{
                color: "#1565C0",
                textTransform: "none",
                fontWeight: 400,
                minWidth: "auto",
                p: 0,
                fontSize: "0.9rem",
              }}>
              {serviceTime.name}
            </Button>
          </Stack>
        );

      const categoryHtml =
        group === undefined || group?.categoryName === lastCategory ? (
          <></>
        ) : (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ pl: 6 }}>
            <Icon sx={{ color: "#ccc", fontSize: 14 }}>folder</Icon>
            <Typography variant="body2" sx={{ color: "#666", fontSize: "0.85rem" }}>
              {group.categoryName}
            </Typography>
          </Stack>
        );

      const groupHtml =
        group === undefined ? (
          <></>
        ) : (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ pl: 8 }}>
            <Icon sx={{ color: "#ddd", fontSize: 12 }}>circle</Icon>
            <Link
              to={"/groups/" + group.id}
              style={{
                textDecoration: "none",
                color: "#1565C0",
                fontWeight: 400,
                fontSize: "0.85rem",
              }}>
              {group.name}
            </Link>
          </Stack>
        );

      const result = (
        <TableRow
          key={key}
          sx={{
            "&:hover": { backgroundColor: "rgba(0,0,0,0.04)" },
          }}>
          <TableCell sx={{ py: 0.5, border: 0 }}>{campusHtml}</TableCell>
          <TableCell sx={{ py: 0.5, border: 0 }}>{serviceHtml}</TableCell>
          <TableCell sx={{ py: 0.5, border: 0 }}>{serviceTimeHtml}</TableCell>
          <TableCell sx={{ py: 0.5, border: 0 }}>{categoryHtml}</TableCell>
          <TableCell sx={{ py: 0.5, border: 0 }}>{groupHtml}</TableCell>
        </TableRow>
      );

      lastCampus = campus?.name;
      lastService = service?.name;
      lastServiceTime = serviceTime?.name;
      lastCategory = group?.categoryName;
      return result;
    };

    const getAddServiceRow = (campus: CampusInterface, key: string) => (
      <TableRow key={key}>
        <TableCell sx={{ py: 0.5, border: 0 }}></TableCell>
        <TableCell sx={{ py: 0.5, border: 0 }}>
          <Button
            size="small"
            startIcon={<Icon sx={{ fontSize: 16 }}>add</Icon>}
            onClick={() => selectService({ id: "", campusId: campus.id, name: "" })}
            sx={{
              color: "#666",
              textTransform: "none",
              fontSize: "0.85rem",
              pl: 2,
              "&:hover": { color: "#1565C0", backgroundColor: "rgba(21, 101, 192, 0.04)" },
            }}>
            {Locale.label("attendance.attendanceSetup.addService")}
          </Button>
        </TableCell>
        <TableCell sx={{ py: 0.5, border: 0 }}></TableCell>
        <TableCell sx={{ py: 0.5, border: 0 }}></TableCell>
        <TableCell sx={{ py: 0.5, border: 0 }}></TableCell>
      </TableRow>
    );

    const getAddServiceTimeRow = (service: ServiceInterface, key: string) => (
      <TableRow key={key}>
        <TableCell sx={{ py: 0.5, border: 0 }}></TableCell>
        <TableCell sx={{ py: 0.5, border: 0 }}></TableCell>
        <TableCell sx={{ py: 0.5, border: 0 }}>
          <Button
            size="small"
            startIcon={<Icon sx={{ fontSize: 14 }}>add</Icon>}
            onClick={() => selectServiceTime({ id: "", serviceId: service.id, name: "" })}
            sx={{
              color: "#666",
              textTransform: "none",
              fontSize: "0.8rem",
              pl: 4,
              "&:hover": { color: "#1565C0", backgroundColor: "rgba(21, 101, 192, 0.04)" },
            }}>
            {Locale.label("attendance.attendanceSetup.addServiceTime")}
          </Button>
        </TableCell>
        <TableCell sx={{ py: 0.5, border: 0 }}></TableCell>
        <TableCell sx={{ py: 0.5, border: 0 }}></TableCell>
      </TableRow>
    );

    // Group data by campus and service
    const campusGroups: { [key: string]: any } = {};
    attendance.data.forEach((a) => {
      const campusName = a.campus?.name || "Unknown";
      if (!campusGroups[campusName]) campusGroups[campusName] = { campus: a.campus, services: {} };

      const serviceName = a.service?.name || "Unknown";
      if (!campusGroups[campusName].services[serviceName]) {
        campusGroups[campusName].services[serviceName] = { service: a.service, serviceTimes: [] };
      }

      campusGroups[campusName].services[serviceName].serviceTimes.push(a);
    });

    // Render grouped structure
    Object.values(campusGroups).forEach((campusGroup: any, campusIdx) => {
      const servicesList = Object.values(campusGroup.services);

      servicesList.forEach((serviceGroup: any, serviceIdx) => {
        serviceGroup.serviceTimes.forEach((a: any, stIdx: number) => {
          const filteredGroups = a.serviceTime === undefined ? [] : getGroups(a.serviceTime.id);
          const sortedGroups = filteredGroups.sort(compare);
          if (sortedGroups.length > 0) {
            sortedGroups.forEach((g) => {
              rows.push(getRow(a.campus, a.service, a.serviceTime, g, g.id?.toString() || ""));
            });
          } else {
            rows.push(getRow(a.campus, a.service, a.serviceTime, undefined, `st-${campusIdx}-${serviceIdx}-${stIdx}`));
          }
        });

        // Add "Add Service Time" button after each service
        rows.push(getAddServiceTimeRow(serviceGroup.service, `add-st-${campusIdx}-${serviceIdx}`));
      });

      // Add "Add Service" button after each campus
      rows.push(getAddServiceRow(campusGroup.campus, `add-svc-${campusIdx}`));
    });

    unassignedGroups.forEach((g) => {
      rows.push(getRow({ name: Locale.label("attendance.attendanceSetup.unassigned") }, undefined, undefined, g, g.id?.toString() || ""));
    });
    return rows;
  }, [
    attendance.data, getGroups, compare, unassignedGroups, selectCampus, selectService, selectServiceTime, handleAddService, handleAddServiceTime
  ]);

  const table = useMemo(() => {
    if (attendance.isLoading) return <Loading />;
    return (
      <Paper
        sx={{
          width: "100%",
          overflowX: "auto",
          borderRadius: 0,
          boxShadow: "none",
          border: "1px solid #e0e0e0",
        }}>
        <Table size="medium">
          <TableHead sx={{ backgroundColor: "#f5f5f5" }}>{tableHeader}</TableHead>
          <TableBody sx={{ whiteSpace: "nowrap" }}>{getRows()}</TableBody>
        </Table>
      </Paper>
    );
  }, [attendance.isLoading, tableHeader, getRows]);

  return (
    <>
      <CampusEdit campus={selectedCampus} updatedFunction={handleUpdated} />
      <ServiceEdit service={selectedService} updatedFunction={handleUpdated} />
      <ServiceTimeEdit serviceTime={selectedServiceTime} updatedFunction={handleUpdated} />

      {/* Modern Header Section */}
      <Box sx={{ p: 3, borderBottom: "1px solid #e0e0e0" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Icon sx={{ color: "#1565C0", fontSize: 28 }}>group</Icon>
            <Typography variant="h5" sx={{ fontWeight: 600, color: "#1565C0" }}>
              {Locale.label("attendance.attendancePage.groups")}
            </Typography>
          </Stack>
          {editLinks}
        </Stack>
      </Box>

      {/* Table Section */}
      <Box sx={{ p: 0 }}>{table}</Box>
    </>
  );
});
