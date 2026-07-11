import React, { memo, useCallback, useMemo } from "react";

import { ServiceEdit, ServiceTimeEdit } from "./";
import { Link } from "react-router-dom";
import { Icon, Table, TableBody, TableCell, TableRow, TableHead, Paper, Box, Typography, Button, Stack } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { hoverRowSx } from "../../components/ui";
import {
  type AttendanceInterface,
  type CampusInterface,
  type ServiceInterface,
  type ServiceTimeInterface,
  type GroupServiceTimeInterface,
  type GroupInterface
} from "@churchapps/helpers";
import {
  ArrayHelper,
  Loading,
  Locale
} from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { useCampuses } from "../../hooks/useCampuses";

export const AttendanceSetup = memo(() => {
  // Campuses are mastered in the membership module; the attendance copy is
  // frozen/deprecated. Drive the campus rows from the membership list so newly
  // created campuses appear here (ready to have services added).
  const campuses = useCampuses();
  const [selectedService, setSelectedService] = React.useState<ServiceInterface | null>(null);
  const [selectedServiceTime, setSelectedServiceTime] = React.useState<ServiceTimeInterface | null>(null);

  const attendance = useQuery<AttendanceInterface[]>({
    queryKey: ["/attendancerecords/tree", "AttendanceApi"],
    placeholderData: []
  });

  const groupServiceTimes = useQuery<GroupServiceTimeInterface[]>({
    queryKey: ["/groupservicetimes", "AttendanceApi"],
    placeholderData: []
  });

  const groups = useQuery<GroupInterface[]>({
    queryKey: ["/groups", "MembershipApi"],
    placeholderData: []
  });


  const removeEditors = useCallback(() => {
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

  const compare = useCallback((a: GroupInterface, b: GroupInterface) => (a.categoryName || "").localeCompare(b.categoryName || "") || (a.name || "").localeCompare(b.name || ""), []);

  const unassignedGroups = useMemo(() => {
    const result: GroupInterface[] = [];
    (groups.data || []).forEach((g) => {
      if (g.trackAttendance) {
        const gsts: GroupServiceTimeInterface[] = ArrayHelper.getAll(groupServiceTimes.data || [], "groupId", g.id);
        if (gsts.length === 0) result.push(g);
      }
    });
    return result;
  }, [groups.data, groupServiceTimes.data]);

  const getGroups = useCallback(
    (serviceTimeId: string) => {
      const result: GroupInterface[] = [];
      const gsts: GroupServiceTimeInterface[] = ArrayHelper.getAll(groupServiceTimes.data || [], "serviceTimeId", serviceTimeId);
      gsts.forEach((gst) => {
        const group: GroupInterface = ArrayHelper.getOne(groups.data || [], "id", gst.groupId);
        if (group !== null && group.trackAttendance) result.push(group);
      });
      return result;
    },
    [groups.data, groupServiceTimes.data]
  );

  const tableHeader = useMemo(() => {
    if ((attendance.data?.length ?? 0) === 0 && campuses.length === 0) return [];
    return [
      <TableRow key="header">
        <TableCell>{Locale.label("attendance.attendancePage.campus")}</TableCell>
        <TableCell>{Locale.label("attendance.attendancePage.service")}</TableCell>
        <TableCell>{Locale.label("attendance.attendancePage.time")}</TableCell>
        <TableCell>{Locale.label("attendance.attendancePage.category")}</TableCell>
        <TableCell>{Locale.label("attendance.attendancePage.group")}</TableCell>
      </TableRow>
    ];
  }, [attendance.data?.length, campuses.length]);

  const getRows = useCallback(() => {
    const rows: JSX.Element[] = [];
    let lastCampus = "";
    let lastService = "";
    let lastServiceTime = "";
    let lastCategory = "";

    if ((attendance.data?.length ?? 0) === 0 && campuses.length === 0) {
      rows.push(
        <TableRow key="0">
          <TableCell colSpan={5} sx={{ textAlign: "center", py: 4 }}>
            <Stack spacing={2} alignItems="center">
              <Icon sx={{ fontSize: 48, color: "var(--text-muted)" }}>group</Icon>
              <Typography variant="h6" color="text.secondary">
                {Locale.label("attendance.attendancePage.groupAttMsg")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Locale.label("attendance.attendanceSetup.setupMessage")}
              </Typography>
              <Button variant="contained" color="primary" component={Link} to="/settings/campuses" startIcon={<AddIcon />}>
                {Locale.label("attendance.attendanceSetup.manageCampuses")}
              </Button>
            </Stack>
          </TableCell>
        </TableRow>
      );
      return rows;
    }

    const getRow = (campus: CampusInterface, service: ServiceInterface | undefined, serviceTime: ServiceTimeInterface | undefined, group: GroupInterface | undefined, key: string, _isLast?: { campus?: boolean; service?: boolean }) => {
      const campusChanged = campus?.name !== lastCampus;
      const serviceChanged = service?.name !== lastService;

      const campusHtml =
        campus === undefined || !campusChanged ? (
          <></>
        ) : (
          <Stack direction="row" spacing={1} alignItems="center">
            <Icon sx={{ color: "primary.main", fontSize: 20 }}>church</Icon>
            <Typography sx={{ fontWeight: 600, fontSize: "0.95rem", color: "text.primary" }}>
              {campus.name}
            </Typography>
          </Stack>
        );

      const serviceHtml =
        service === undefined || (service?.name === lastService && !campusChanged) ? (
          <></>
        ) : (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ pl: 2 }}>
            <Icon sx={{ color: "var(--text-muted)", fontSize: 18 }}>calendar_month</Icon>
            <Button
              variant="text"
              size="small"
              onClick={() => selectService(service)}
              sx={{
                color: "primary.main",
                textTransform: "none",
                fontWeight: 500,
                minWidth: "auto",
                p: 0
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
            <Icon sx={{ color: "var(--text-muted)", fontSize: 16 }}>schedule</Icon>
            <Button
              variant="text"
              size="small"
              onClick={() => selectServiceTime(serviceTime)}
              sx={{
                color: "primary.main",
                textTransform: "none",
                fontWeight: 400,
                minWidth: "auto",
                p: 0,
                fontSize: "0.9rem"
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
            <Icon sx={{ color: "text.secondary", fontSize: 14 }}>folder</Icon>
            <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.85rem" }}>
              {group.categoryName}
            </Typography>
          </Stack>
        );

      const groupHtml =
        group === undefined ? (
          <></>
        ) : (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ pl: 8 }}>
            <Icon sx={{ color: "var(--border-main)", fontSize: 12 }}>circle</Icon>
            <Typography component={Link} to={"/groups/" + group.id} variant="body2" sx={{ textDecoration: "none", color: "var(--link)", fontWeight: 500, fontSize: "0.85rem" }}>
              {group.name}
            </Typography>
          </Stack>
        );

      const result = (
        <TableRow
          key={key}
          sx={hoverRowSx}>
          <TableCell sx={{ py: 0.5, border: 0 }}>{campusHtml}</TableCell>
          <TableCell sx={{ py: 0.5, border: 0 }}>{serviceHtml}</TableCell>
          <TableCell sx={{ py: 0.5, border: 0 }}>{serviceTimeHtml}</TableCell>
          <TableCell sx={{ py: 0.5, border: 0 }}>{categoryHtml}</TableCell>
          <TableCell sx={{ py: 0.5, border: 0 }}>{groupHtml}</TableCell>
        </TableRow>
      );

      lastCampus = campus?.name || "";
      lastService = service?.name || "";
      lastServiceTime = serviceTime?.name || "";
      lastCategory = group?.categoryName || "";
      return result;
    };

    const getAddServiceRow = (campus: CampusInterface, key: string) => (
      <TableRow key={key}>
        <TableCell sx={{ py: 0.5, border: 0 }}></TableCell>
        <TableCell sx={{ py: 0.5, border: 0 }}>
          <AppIconButton
            label={Locale.label("common.add")}
            icon={<AddIcon />}
            data-testid={"add-service-button-" + campus.id}
            onClick={() => selectService({ id: "", campusId: campus.id, name: "" })}
            sx={{ ml: 2 }}
          />
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
          <AppIconButton
            label={Locale.label("common.add")}
            icon={<AddIcon />}
            data-testid={"add-service-time-button-" + service.id}
            onClick={() => selectServiceTime({ id: "", serviceId: service.id, name: "" })}
            sx={{ ml: 4 }}
          />
        </TableCell>
        <TableCell sx={{ py: 0.5, border: 0 }}></TableCell>
        <TableCell sx={{ py: 0.5, border: 0 }}></TableCell>
      </TableRow>
    );

    const servicesByCampus: { [campusId: string]: { [serviceName: string]: { service: any; serviceTimes: any[] } } } = {};
    (attendance.data || []).forEach((a) => {
      if (!a.service) return; // campus-only tree row; the campus comes from the membership list below
      const cid = a.campus?.id || "";
      if (!servicesByCampus[cid]) servicesByCampus[cid] = {};
      const serviceName = a.service?.name || "Unknown";
      if (!servicesByCampus[cid][serviceName]) servicesByCampus[cid][serviceName] = { service: a.service, serviceTimes: [] };
      servicesByCampus[cid][serviceName].serviceTimes.push(a);
    });

    // Canonical campus list = membership campuses, plus any campus id that still
    // has attendance services but is missing from membership (legacy safety).
    const campusList: CampusInterface[] = campuses.map((c) => ({ id: c.id, name: c.name }));
    Object.keys(servicesByCampus).forEach((cid) => {
      if (cid && !campusList.some((c) => c.id === cid)) {
        const treeCampus = (attendance.data || []).find((a) => a.campus?.id === cid)?.campus;
        if (treeCampus) campusList.push({ id: treeCampus.id, name: treeCampus.name });
      }
    });

    // Render grouped structure
    campusList.forEach((campus, campusIdx) => {
      const services = servicesByCampus[campus.id || ""] || {};
      const servicesList = Object.values(services);

      if (servicesList.length === 0) {
        // Campus with no services yet — show its header so a service can be added.
        rows.push(getRow(campus, undefined, undefined, undefined, `campus-${campusIdx}`));
      } else {
        servicesList.forEach((serviceGroup: any, serviceIdx) => {
          serviceGroup.serviceTimes.forEach((a: any, stIdx: number) => {
            const filteredGroups = a.serviceTime === undefined ? [] : getGroups(a.serviceTime.id);
            const sortedGroups = filteredGroups.sort(compare);
            if (sortedGroups.length > 0) {
              sortedGroups.forEach((g) => {
                rows.push(getRow(campus, a.service, a.serviceTime, g, `${a.serviceTime?.id || stIdx}-${g.id}`));
              });
            } else {
              rows.push(getRow(campus, a.service, a.serviceTime, undefined, `st-${campusIdx}-${serviceIdx}-${stIdx}`));
            }
          });

          rows.push(getAddServiceTimeRow(serviceGroup.service, `add-st-${campusIdx}-${serviceIdx}`));
        });
      }

      rows.push(getAddServiceRow(campus, `add-svc-${campusIdx}`));
    });

    unassignedGroups.forEach((g) => {
      rows.push(getRow({ name: Locale.label("attendance.attendanceSetup.unassigned") }, undefined, undefined, g, `unassigned-${g.id}`));
    });
    return rows;
  }, [attendance.data, campuses, getGroups, compare, unassignedGroups, selectService, selectServiceTime]);

  const table = useMemo(() => {
    if (attendance.isLoading) return <Loading />;
    return (
      <Paper
        sx={{
          width: "100%",
          overflowX: "auto",
          borderRadius: 0,
          boxShadow: "none",
          border: "1px solid",
          borderColor: "divider"
        }}>
        <Table size="medium">
          <TableHead>{tableHeader}</TableHead>
          <TableBody sx={{ whiteSpace: "nowrap" }}>{getRows()}</TableBody>
        </Table>
      </Paper>
    );
  }, [attendance.isLoading, tableHeader, getRows]);

  return (
    <>
      <ServiceEdit service={selectedService} updatedFunction={handleUpdated} />
      <ServiceTimeEdit serviceTime={selectedServiceTime} updatedFunction={handleUpdated} />

      <Box sx={{ p: 2, borderBottom: 1, borderColor: "var(--border-light)" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <Icon sx={{ color: "primary.main", fontSize: 20 }}>group</Icon>
            <Typography variant="h6">
              {Locale.label("attendance.attendancePage.groups")}
            </Typography>
          </Stack>
          <Button variant="outlined" size="small" component={Link} to="/settings/campuses" startIcon={<Icon>church</Icon>}>
            {Locale.label("attendance.attendanceSetup.manageCampuses")}
          </Button>
        </Stack>
      </Box>

      <Box sx={{ p: 0 }}>{table}</Box>
    </>
  );
});
