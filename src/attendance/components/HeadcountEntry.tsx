import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, FormControl, Grid, InputLabel, MenuItem, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, Icon } from "@mui/material";
import { type GroupInterface, type ServiceInterface, type ServiceTimeInterface } from "@churchapps/helpers";
import { ApiHelper, DateHelper, DisplayBox, ErrorMessages, Loading, Locale, useMountedState } from "@churchapps/apphelper";
import { AppDatePicker } from "../../components";
import { FormCard, hoverRowSx } from "../../components/ui";
import { useConfirmDelete } from "../../hooks";

export interface HeadcountInterface {
  id?: string;
  campusId?: string;
  serviceId?: string;
  serviceTimeId?: string;
  groupId?: string;
  headcountDate?: string;
  value?: number;
  serviceName?: string;
  serviceTimeName?: string;
}

const blank = (): HeadcountInterface => ({ serviceId: "", serviceTimeId: "", groupId: "", headcountDate: DateHelper.formatHtml5Date(new Date()), value: undefined });

// Manual per-service headcount entry: one total per service time (or group) per date, no individual check-ins.
export const HeadcountEntry: React.FC = () => {
  const isMounted = useMountedState();
  const [services, setServices] = useState<ServiceInterface[]>([]);
  const [serviceTimes, setServiceTimes] = useState<ServiceTimeInterface[]>([]);
  const [groups, setGroups] = useState<GroupInterface[]>([]);
  const [headcounts, setHeadcounts] = useState<HeadcountInterface[] | null>(null);
  const [current, setCurrent] = useState<HeadcountInterface>(blank());
  const [valueText, setValueText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const loadHeadcounts = useCallback(() => {
    ApiHelper.get("/headcounts", "AttendanceApi").then((data: HeadcountInterface[]) => { if (isMounted()) setHeadcounts(data || []); });
  }, [isMounted]);

  useEffect(() => {
    Promise.all([
      ApiHelper.get("/services", "AttendanceApi"),
      ApiHelper.get("/servicetimes", "AttendanceApi"),
      ApiHelper.get("/groups", "MembershipApi")
    ]).then(([s, st, g]: [ServiceInterface[], ServiceTimeInterface[], GroupInterface[]]) => {
      if (!isMounted()) return;
      setServices(s || []);
      setServiceTimes(st || []);
      setGroups((g || []).filter((x) => x.trackAttendance));
      if (s?.length > 0) setCurrent((c) => (c.serviceId ? c : { ...c, serviceId: s[0].id }));
    });
    loadHeadcounts();
  }, [isMounted, loadHeadcounts]);

  const timesForService = useMemo(() => serviceTimes.filter((st) => st.serviceId === current.serviceId), [serviceTimes, current.serviceId]);

  useEffect(() => {
    if (current.serviceTimeId && !timesForService.some((st) => st.id === current.serviceTimeId)) setCurrent((c) => ({ ...c, serviceTimeId: "" }));
  }, [timesForService, current.serviceTimeId]);

  const groupName = useCallback((id?: string) => groups.find((g) => g.id === id)?.name || "", [groups]);

  const select = (h: HeadcountInterface) => {
    setErrors([]);
    setCurrent({ ...h, serviceId: h.serviceId || "", serviceTimeId: h.serviceTimeId || "", groupId: h.groupId || "", headcountDate: DateHelper.formatHtml5Date(new Date(h.headcountDate || "")) });
    setValueText(h.value === undefined || h.value === null ? "" : String(h.value));
  };

  const reset = () => {
    setErrors([]);
    setCurrent({ ...blank(), serviceId: current.serviceId, serviceTimeId: current.serviceTimeId, headcountDate: current.headcountDate });
    setValueText("");
  };

  const validate = () => {
    const result: string[] = [];
    if (!current.serviceId) result.push(Locale.label("attendance.headcountEntry.validate.service"));
    if (!current.headcountDate) result.push(Locale.label("attendance.headcountEntry.validate.date"));
    const n = Number(valueText);
    if (valueText.trim() === "" || !Number.isInteger(n) || n < 0) result.push(Locale.label("attendance.headcountEntry.validate.count"));
    setErrors(result);
    return result.length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    setIsSubmitting(true);
    const service = services.find((s) => s.id === current.serviceId);
    const payload: HeadcountInterface = {
      id: current.id,
      campusId: service?.campusId,
      serviceId: current.serviceId,
      serviceTimeId: current.serviceTimeId || undefined,
      groupId: current.groupId || undefined,
      headcountDate: current.headcountDate,
      value: Number(valueText)
    };
    ApiHelper.post("/headcounts", [payload], "AttendanceApi")
      .then(() => { reset(); loadHeadcounts(); })
      .finally(() => { if (isMounted()) setIsSubmitting(false); });
  };

  const handleDelete = async () => {
    if (!current.id) return;
    if (await confirm(Locale.label("attendance.headcountEntry.confirmDelete"))) {
      ApiHelper.delete("/headcounts/" + current.id, "AttendanceApi").then(() => { reset(); loadHeadcounts(); });
    }
  };

  const rows = (headcounts || []).map((h) => (
    <TableRow key={h.id} data-testid={"headcount-row-" + h.id} sx={{ ...hoverRowSx, cursor: "pointer" }} onClick={() => select(h)}>
      <TableCell>{DateHelper.prettyDate(new Date(h.headcountDate || ""))}</TableCell>
      <TableCell>{h.serviceName || ""}</TableCell>
      <TableCell>{h.serviceTimeName || ""}</TableCell>
      <TableCell>{groupName(h.groupId)}</TableCell>
      <TableCell align="right" data-testid="headcount-value-cell">{h.value}</TableCell>
    </TableRow>
  ));

  return (
    <>
      {ConfirmDialogElement}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <FormCard
            id="headcountBox"
            title={current.id ? Locale.label("attendance.headcountEntry.editTitle") : Locale.label("attendance.headcountEntry.title")}
            icon="groups"
            onSave={handleSave}
            onCancel={current.id ? reset : undefined}
            onDelete={current.id ? handleDelete : undefined}
            isSubmitting={isSubmitting}
            saveTestId="headcount-save-button"
            help="docs/b1-admin/attendance/">
            <ErrorMessages errors={errors} />
            <FormControl fullWidth>
              <InputLabel id="headcount-service">{Locale.label("attendance.headcountEntry.service")}</InputLabel>
              <Select labelId="headcount-service" label={Locale.label("attendance.headcountEntry.service")} value={current.serviceId || ""} data-testid="headcount-service-select" onChange={(e) => setCurrent({ ...current, serviceId: e.target.value as string })}>
                {services.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="headcount-service-time" shrink>{Locale.label("attendance.headcountEntry.serviceTime")}</InputLabel>
              <Select labelId="headcount-service-time" label={Locale.label("attendance.headcountEntry.serviceTime")} displayEmpty value={current.serviceTimeId || ""} data-testid="headcount-service-time-select" onChange={(e) => setCurrent({ ...current, serviceTimeId: e.target.value as string })}>
                <MenuItem value="">{Locale.label("attendance.headcountEntry.wholeService")}</MenuItem>
                {timesForService.map((st) => <MenuItem key={st.id} value={st.id}>{st.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="headcount-group" shrink>{Locale.label("attendance.headcountEntry.group")}</InputLabel>
              <Select labelId="headcount-group" label={Locale.label("attendance.headcountEntry.group")} displayEmpty value={current.groupId || ""} data-testid="headcount-group-select" onChange={(e) => setCurrent({ ...current, groupId: e.target.value as string })}>
                <MenuItem value="">{Locale.label("attendance.headcountEntry.noGroup")}</MenuItem>
                {groups.map((g) => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
              </Select>
            </FormControl>
            <AppDatePicker fullWidth label={Locale.label("attendance.headcountEntry.date")} name="headcountDate" value={current.headcountDate || ""} data-testid="headcount-date-input" onChange={(e: any) => setCurrent({ ...current, headcountDate: e.target.value })} />
            <TextField fullWidth type="number" label={Locale.label("attendance.headcountEntry.count")} value={valueText} data-testid="headcount-value-input" slotProps={{ htmlInput: { min: 0, step: 1, inputMode: "numeric" } }} onChange={(e) => setValueText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }} />
          </FormCard>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <DisplayBox id="headcountList" headerIcon="groups" headerText={Locale.label("attendance.headcountEntry.recent")}>
            {headcounts === null ? <Loading /> : rows.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Stack spacing={1} alignItems="center">
                  <Icon sx={{ fontSize: 48, color: "var(--text-muted)" }}>groups</Icon>
                  <Typography variant="body1" color="text.secondary">{Locale.label("attendance.headcountEntry.none")}</Typography>
                </Stack>
              </Box>
            ) : (
              <Table size="small" data-testid="headcount-table">
                <TableHead>
                  <TableRow>
                    <TableCell>{Locale.label("attendance.headcountEntry.date")}</TableCell>
                    <TableCell>{Locale.label("attendance.headcountEntry.service")}</TableCell>
                    <TableCell>{Locale.label("attendance.headcountEntry.serviceTime")}</TableCell>
                    <TableCell>{Locale.label("attendance.headcountEntry.group")}</TableCell>
                    <TableCell align="right">{Locale.label("attendance.headcountEntry.count")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>{rows}</TableBody>
              </Table>
            )}
          </DisplayBox>
        </Grid>
      </Grid>
    </>
  );
};
