import { useState, useEffect, useCallback, type ReactNode } from "react";
import { ApiHelper, Loading, Locale, DateHelper } from "@churchapps/apphelper";
import { Permissions, type GroupInterface } from "@churchapps/helpers";
import { Box, Stack, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import { MeetingRoom as RoomIcon } from "@mui/icons-material";
import { useRequirePermission } from "../hooks";
import { AddBar, EmptyState, PillTabs, SearchField, Surface, TextAction, tableScrollSx } from "../components/ui";
import { CalendarChrome } from "./components/CalendarChrome";
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
  const [find, setFind] = useState("");
  const denied = useRequirePermission(Permissions.contentApi.content.edit);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      ApiHelper.get("/rooms", "ContentApi"),
      ApiHelper.get("/resources", "ContentApi"),
      ApiHelper.get("/calendarBlockouts", "ContentApi"),
      ApiHelper.get("/eventTemplates", "ContentApi"),
      ApiHelper.get("/groups/tag/standard", "MembershipApi")
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

  const q = find.trim().toLowerCase();
  const match = (text?: string) => !q || (text || "").toLowerCase().includes(q);
  const shownRooms = rooms.filter((r) => match(r.name));
  const shownResources = resources.filter((r) => match(r.name));
  const shownBlockouts = blockouts.filter((b) => match(targetName(b)) || match(b.reason));
  const shownTemplates = templates.filter((t) => match(t.name) || match(t.title));

  const editVerb = (onClick: () => void, testId: string) => (
    <TextAction small onClick={onClick} data-testid={testId}>{Locale.label("common.edit")}</TextAction>
  );

  const tableRegion = (label: string, table: ReactNode) => (
    <Box sx={tableScrollSx} role="region" aria-label={label} tabIndex={0}>{table}</Box>
  );

  const getRoomsTable = () => (shownRooms.length === 0
    ? <EmptyState icon={<RoomIcon />} title={Locale.label("calendars.rooms.noRooms")} description={Locale.label("calendars.rooms.noRoomsDesc")} variant="plain" />
    : (
      tableRegion(Locale.label("calendars.rooms.title"), (
        <Table data-testid="rooms-table">
          <TableHead><TableRow><TableCell>{Locale.label("calendars.rooms.roomName")}</TableCell><TableCell align="right">{Locale.label("calendars.rooms.capacity")}</TableCell><TableCell>{Locale.label("calendars.rooms.approvalGroup")}</TableCell><TableCell align="right" /></TableRow></TableHead>
          <TableBody>
            {shownRooms.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.name}</TableCell>
                <TableCell align="right">{r.capacity ?? ""}</TableCell>
                <TableCell>{groupName(r.approvalGroupId)}</TableCell>
                <TableCell align="right" className="rowActions">{editVerb(() => setEditing({ type: "rooms", item: r }), `edit-room-${r.id}`)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ))
    ));

  const getResourcesTable = () => (shownResources.length === 0
    ? <EmptyState icon={<RoomIcon />} title={Locale.label("calendars.rooms.noResources")} description={Locale.label("calendars.rooms.noResourcesDesc")} variant="plain" />
    : (
      tableRegion(Locale.label("calendars.rooms.title"), (
        <Table data-testid="resources-table">
          <TableHead><TableRow><TableCell>{Locale.label("calendars.rooms.resourceName")}</TableCell><TableCell align="right">{Locale.label("calendars.rooms.quantity")}</TableCell><TableCell>{Locale.label("calendars.rooms.approvalGroup")}</TableCell><TableCell align="right" /></TableRow></TableHead>
          <TableBody>
            {shownResources.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.name}</TableCell>
                <TableCell align="right">{r.quantity ?? 1}</TableCell>
                <TableCell>{groupName(r.approvalGroupId)}</TableCell>
                <TableCell align="right" className="rowActions">{editVerb(() => setEditing({ type: "resources", item: r }), `edit-resource-${r.id}`)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ))
    ));

  const getBlockoutsTable = () => (shownBlockouts.length === 0
    ? <EmptyState icon={<RoomIcon />} title={Locale.label("calendars.rooms.noBlockouts")} description={Locale.label("calendars.rooms.noBlockoutsDesc")} variant="plain" />
    : (
      tableRegion(Locale.label("calendars.rooms.title"), (
        <Table data-testid="blockouts-table">
          <TableHead><TableRow><TableCell>{Locale.label("calendars.rooms.blockoutTarget")}</TableCell><TableCell>{Locale.label("calendars.rooms.startTime")}</TableCell><TableCell>{Locale.label("calendars.rooms.endTime")}</TableCell><TableCell>{Locale.label("calendars.rooms.reason")}</TableCell><TableCell align="right" /></TableRow></TableHead>
          <TableBody>
            {shownBlockouts.map((b) => (
              <TableRow key={b.id} hover>
                <TableCell>{targetName(b)}</TableCell>
                <TableCell>{b.startTime ? new Date(b.startTime).toLocaleString(DateHelper.locale) : ""}</TableCell>
                <TableCell>{b.endTime ? new Date(b.endTime).toLocaleString(DateHelper.locale) : ""}</TableCell>
                <TableCell>{b.reason}</TableCell>
                <TableCell align="right" className="rowActions">{editVerb(() => setEditing({ type: "blockouts", item: b }), `edit-blockout-${b.id}`)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ))
    ));

  const getTemplatesTable = () => (shownTemplates.length === 0
    ? <EmptyState icon={<RoomIcon />} title={Locale.label("calendars.rooms.noTemplates")} description={Locale.label("calendars.rooms.noTemplatesDesc")} variant="plain" />
    : (
      tableRegion(Locale.label("calendars.rooms.title"), (
        <Table data-testid="templates-table">
          <TableHead><TableRow><TableCell>{Locale.label("calendars.rooms.templateName")}</TableCell><TableCell>{Locale.label("calendars.rooms.eventTitle")}</TableCell><TableCell align="right">{Locale.label("calendars.rooms.durationMinutes")}</TableCell><TableCell align="right" /></TableRow></TableHead>
          <TableBody>
            {shownTemplates.map((t) => (
              <TableRow key={t.id} hover>
                <TableCell>{t.name}</TableCell>
                <TableCell>{t.title}</TableCell>
                <TableCell align="right">{t.durationMinutes ?? ""}</TableCell>
                <TableCell align="right" className="rowActions">{editVerb(() => setEditing({ type: "templates", item: t }), `edit-template-${t.id}`)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ))
    ));

  if (denied) return denied;

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

  const tabs = [
    { value: "rooms", label: Locale.label("calendars.rooms.rooms"), "data-testid": "tab-rooms" },
    { value: "resources", label: Locale.label("calendars.rooms.resources"), "data-testid": "tab-resources" },
    { value: "blockouts", label: Locale.label("calendars.rooms.blockouts"), "data-testid": "tab-blockouts" },
    { value: "templates", label: Locale.label("calendars.rooms.templates"), "data-testid": "tab-templates" }
  ];
  const addLabels: Record<TabKey, string> = {
    rooms: Locale.label("calendars.rooms.addRoom"),
    resources: Locale.label("calendars.rooms.addResource"),
    blockouts: Locale.label("calendars.rooms.addBlockout"),
    templates: Locale.label("calendars.rooms.addTemplate")
  };
  const adding = !!editing && !editing.item?.id;

  return (
    <CalendarChrome selected="rooms" subtitle={Locale.label("calendars.rooms.subtitle")}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between" sx={{ mb: 3 }}>
        <PillTabs options={tabs} value={tab} onChange={(v) => { setTab(v as TabKey); setEditing(null); }} aria-label={Locale.label("calendars.rooms.title")} />
        <SearchField value={find} onChange={setFind} label={Locale.label("calendars.rooms.find", "Find")} data-testid="rooms-find" sx={{ maxWidth: { md: 320 } }} />
      </Stack>
      {loading ? <Loading /> : (
        <>
          {editing?.item?.id && <Box sx={{ mb: 3 }}>{getEditCard()}</Box>}
          <Surface disablePadding>{getTable()}</Surface>
          <AddBar>
            {adding
              ? getEditCard()
              : <TextAction onClick={() => setEditing({ type: tab, item: {} })} data-testid="add-room-resource">{addLabels[tab]}</TextAction>}
          </AddBar>
        </>
      )}
    </CalendarChrome>
  );
};

export default RoomsResourcesPage;
