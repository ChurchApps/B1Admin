import { useState, useEffect, useCallback } from "react";
import { ApiHelper, UserHelper, Loading, PageHeader, Locale } from "@churchapps/apphelper";
import { Permissions, type GroupInterface } from "@churchapps/helpers";
import { Box, Button, Grid, Tab, Tabs, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Paper } from "@mui/material";
import { Add as AddIcon, Edit as EditIcon, MeetingRoom as RoomIcon } from "@mui/icons-material";
import { PermissionDenied } from "../components";
import { EmptyState } from "../components/ui/EmptyState";
import { AppIconButton } from "../components/ui/AppIconButton";
import { RoomEdit } from "./components/RoomEdit";
import { ResourceEdit } from "./components/ResourceEdit";
import { BlockoutEdit } from "./components/BlockoutEdit";
import { TemplateEdit } from "./components/TemplateEdit";
import { type CalendarBlockoutInterface, type EventTemplateInterface, type ResourceInterface, type RoomInterface } from "./interfaces";

type TabKey = "rooms" | "resources" | "blockouts" | "templates";
type Editing = { type: TabKey; item: any } | null;

export const RoomsResourcesPage = () => {
  const [tab, setTab] = useState<TabKey>("rooms");
  const [rooms, setRooms] = useState<RoomInterface[]>([]);
  const [resources, setResources] = useState<ResourceInterface[]>([]);
  const [blockouts, setBlockouts] = useState<CalendarBlockoutInterface[]>([]);
  const [templates, setTemplates] = useState<EventTemplateInterface[]>([]);
  const [groups, setGroups] = useState<GroupInterface[]>([]);
  const [editing, setEditing] = useState<Editing>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      ApiHelper.get("/rooms", "ContentApi"),
      ApiHelper.get("/resources", "ContentApi"),
      ApiHelper.get("/calendarBlockouts", "ContentApi"),
      ApiHelper.get("/eventTemplates", "ContentApi"),
      ApiHelper.get("/groups", "MembershipApi")
    ]).then(([r, res, blk, tpl, grp]) => {
      setRooms(r);
      setResources(res);
      setBlockouts(blk);
      setTemplates(tpl);
      setGroups(grp);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdated = () => {
    setEditing(null);
    loadData();
  };

  const groupName = (id?: string) => groups.find((g) => g.id === id)?.name || Locale.label("calendars.rooms.noApprovalNeeded");
  const targetName = (b: CalendarBlockoutInterface) => {
    if (b.roomId) return rooms.find((r) => r.id === b.roomId)?.name || "";
    if (b.resourceId) return resources.find((r) => r.id === b.resourceId)?.name || "";
    return Locale.label("calendars.rooms.allRoomsResources");
  };

  const tableSx = { borderRadius: 2, border: "1px solid", borderColor: "divider" };
  const headSx = { fontWeight: 600, color: "text.secondary" };

  const getRoomsTable = () => (rooms.length === 0
    ? <EmptyState icon={<RoomIcon />} title={Locale.label("calendars.rooms.noRooms")} description={Locale.label("calendars.rooms.noRoomsDesc")} />
    : (
      <TableContainer component={Paper} sx={tableSx}>
        <Table data-testid="rooms-table">
          <TableHead><TableRow><TableCell sx={headSx}>{Locale.label("calendars.rooms.roomName")}</TableCell><TableCell sx={headSx}>{Locale.label("calendars.rooms.capacity")}</TableCell><TableCell sx={headSx}>{Locale.label("calendars.rooms.approvalGroup")}</TableCell><TableCell align="right" /></TableRow></TableHead>
          <TableBody>
            {rooms.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.capacity ?? ""}</TableCell>
                <TableCell>{groupName(r.approvalGroupId)}</TableCell>
                <TableCell align="right"><AppIconButton tone="card" label={Locale.label("common.edit")} icon={<EditIcon />} onClick={() => setEditing({ type: "rooms", item: r })} data-testid={`edit-room-${r.id}`} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    ));

  const getResourcesTable = () => (resources.length === 0
    ? <EmptyState icon={<RoomIcon />} title={Locale.label("calendars.rooms.noResources")} description={Locale.label("calendars.rooms.noResourcesDesc")} />
    : (
      <TableContainer component={Paper} sx={tableSx}>
        <Table data-testid="resources-table">
          <TableHead><TableRow><TableCell sx={headSx}>{Locale.label("calendars.rooms.resourceName")}</TableCell><TableCell sx={headSx}>{Locale.label("calendars.rooms.quantity")}</TableCell><TableCell sx={headSx}>{Locale.label("calendars.rooms.approvalGroup")}</TableCell><TableCell align="right" /></TableRow></TableHead>
          <TableBody>
            {resources.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.quantity ?? 1}</TableCell>
                <TableCell>{groupName(r.approvalGroupId)}</TableCell>
                <TableCell align="right"><AppIconButton tone="card" label={Locale.label("common.edit")} icon={<EditIcon />} onClick={() => setEditing({ type: "resources", item: r })} data-testid={`edit-resource-${r.id}`} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    ));

  const getBlockoutsTable = () => (blockouts.length === 0
    ? <EmptyState icon={<RoomIcon />} title={Locale.label("calendars.rooms.noBlockouts")} description={Locale.label("calendars.rooms.noBlockoutsDesc")} />
    : (
      <TableContainer component={Paper} sx={tableSx}>
        <Table data-testid="blockouts-table">
          <TableHead><TableRow><TableCell sx={headSx}>{Locale.label("calendars.rooms.blockoutTarget")}</TableCell><TableCell sx={headSx}>{Locale.label("calendars.rooms.startTime")}</TableCell><TableCell sx={headSx}>{Locale.label("calendars.rooms.endTime")}</TableCell><TableCell sx={headSx}>{Locale.label("calendars.rooms.reason")}</TableCell><TableCell align="right" /></TableRow></TableHead>
          <TableBody>
            {blockouts.map((b) => (
              <TableRow key={b.id} hover>
                <TableCell>{targetName(b)}</TableCell>
                <TableCell>{b.startTime ? new Date(b.startTime).toLocaleString() : ""}</TableCell>
                <TableCell>{b.endTime ? new Date(b.endTime).toLocaleString() : ""}</TableCell>
                <TableCell>{b.reason}</TableCell>
                <TableCell align="right"><AppIconButton tone="card" label={Locale.label("common.edit")} icon={<EditIcon />} onClick={() => setEditing({ type: "blockouts", item: b })} data-testid={`edit-blockout-${b.id}`} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    ));

  const getTemplatesTable = () => (templates.length === 0
    ? <EmptyState icon={<RoomIcon />} title={Locale.label("calendars.rooms.noTemplates")} description={Locale.label("calendars.rooms.noTemplatesDesc")} />
    : (
      <TableContainer component={Paper} sx={tableSx}>
        <Table data-testid="templates-table">
          <TableHead><TableRow><TableCell sx={headSx}>{Locale.label("calendars.rooms.templateName")}</TableCell><TableCell sx={headSx}>{Locale.label("calendars.rooms.eventTitle")}</TableCell><TableCell sx={headSx}>{Locale.label("calendars.rooms.durationMinutes")}</TableCell><TableCell align="right" /></TableRow></TableHead>
          <TableBody>
            {templates.map((t) => (
              <TableRow key={t.id} hover>
                <TableCell>{t.name}</TableCell>
                <TableCell>{t.title}</TableCell>
                <TableCell>{t.durationMinutes ?? ""}</TableCell>
                <TableCell align="right"><AppIconButton tone="card" label={Locale.label("common.edit")} icon={<EditIcon />} onClick={() => setEditing({ type: "templates", item: t })} data-testid={`edit-template-${t.id}`} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    ));

  if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) return <PermissionDenied permissions={[Permissions.contentApi.content.edit]} />;

  const getTable = () => {
    switch (tab) {
      case "rooms": return getRoomsTable();
      case "resources": return getResourcesTable();
      case "blockouts": return getBlockoutsTable();
      case "templates": return getTemplatesTable();
    }
  };

  const getEditCard = () => {
    if (!editing) return null;
    switch (editing.type) {
      case "rooms": return <RoomEdit room={editing.item} groups={groups} updatedCallback={handleUpdated} />;
      case "resources": return <ResourceEdit resource={editing.item} groups={groups} updatedCallback={handleUpdated} />;
      case "blockouts": return <BlockoutEdit blockout={editing.item} rooms={rooms} resources={resources} updatedCallback={handleUpdated} />;
      case "templates": return <TemplateEdit template={editing.item} rooms={rooms} resources={resources} updatedCallback={handleUpdated} />;
    }
  };

  return (
    <>
      <PageHeader title={Locale.label("calendars.rooms.title")} subtitle={Locale.label("calendars.rooms.subtitle")}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setEditing({ type: tab, item: {} })}
          sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.5)", "&:hover": { borderColor: "#FFF", backgroundColor: "rgba(255,255,255,0.1)" } }}
          data-testid="add-room-resource"
        >
          {Locale.label("common.add")}
        </Button>
      </PageHeader>
      <Box sx={{ p: 3 }}>
        <Tabs value={tab} onChange={(_e, v) => { setTab(v); setEditing(null); }} sx={{ mb: 2 }}>
          <Tab label={Locale.label("calendars.rooms.rooms")} value="rooms" data-testid="tab-rooms" />
          <Tab label={Locale.label("calendars.rooms.resources")} value="resources" data-testid="tab-resources" />
          <Tab label={Locale.label("calendars.rooms.blockouts")} value="blockouts" data-testid="tab-blockouts" />
          <Tab label={Locale.label("calendars.rooms.templates")} value="templates" data-testid="tab-templates" />
        </Tabs>
        {loading ? <Loading /> : (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: editing ? 8 : 12 }}>{getTable()}</Grid>
            {editing && <Grid size={{ xs: 12, md: 4 }}>{getEditCard()}</Grid>}
          </Grid>
        )}
      </Box>
    </>
  );
};

export default RoomsResourcesPage;
