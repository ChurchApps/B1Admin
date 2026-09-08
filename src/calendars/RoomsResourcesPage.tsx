import { useState, useEffect, useCallback } from "react";
import { ApiHelper, Loading, Locale } from "@churchapps/apphelper";
import { Permissions, type GroupInterface } from "@churchapps/helpers";
import { Box, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import { MeetingRoom as RoomIcon } from "@mui/icons-material";
import { useRequirePermission } from "../hooks";
import { EmptyState } from "../components/ui/EmptyState";
import { RoomEdit } from "./components/RoomEdit";
import { ResourceEdit } from "./components/ResourceEdit";
import { BlockoutEdit } from "./components/BlockoutEdit";
import { TemplateEdit } from "./components/TemplateEdit";
import { type CalendarBlockoutInterface, type EventTemplateInterface, type ResourceInterface, type RoomInterface } from "./interfaces";
import { CalendarChrome } from "./components/CalendarChrome";
import { AddBlock, FindField, Pills, Verb, plainTableSx } from "./components/plate";

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

  const q = find.toLowerCase();
  const match = (s?: string) => !q || (s || "").toLowerCase().includes(q);

  const getRoomsTable = () => {
    const rows = rooms.filter((r) => match(r.name));
    return rows.length === 0
      ? <EmptyState icon={<RoomIcon />} title={Locale.label("calendars.rooms.noRooms")} description={Locale.label("calendars.rooms.noRoomsDesc")} />
      : (
        <Table data-testid="rooms-table" sx={plainTableSx}>
          <TableHead><TableRow><TableCell>{Locale.label("calendars.rooms.roomName")}</TableCell><TableCell align="right">{Locale.label("calendars.rooms.capacity")}</TableCell><TableCell>{Locale.label("calendars.rooms.approvalGroup")}</TableCell><TableCell align="right" /></TableRow></TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.name}</TableCell>
                <TableCell align="right">{r.capacity ?? ""}</TableCell>
                <TableCell>{groupName(r.approvalGroupId)}</TableCell>
                <TableCell align="right" className="rowActions"><Verb onClick={() => setEditing({ type: "rooms", item: r })} testId={`edit-room-${r.id}`}>{Locale.label("common.edit")}</Verb></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
  };

  const getResourcesTable = () => {
    const rows = resources.filter((r) => match(r.name));
    return rows.length === 0
      ? <EmptyState icon={<RoomIcon />} title={Locale.label("calendars.rooms.noResources")} description={Locale.label("calendars.rooms.noResourcesDesc")} />
      : (
        <Table data-testid="resources-table" sx={plainTableSx}>
          <TableHead><TableRow><TableCell>{Locale.label("calendars.rooms.resourceName")}</TableCell><TableCell align="right">{Locale.label("calendars.rooms.quantity")}</TableCell><TableCell>{Locale.label("calendars.rooms.approvalGroup")}</TableCell><TableCell align="right" /></TableRow></TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.name}</TableCell>
                <TableCell align="right">{r.quantity ?? 1}</TableCell>
                <TableCell>{groupName(r.approvalGroupId)}</TableCell>
                <TableCell align="right" className="rowActions"><Verb onClick={() => setEditing({ type: "resources", item: r })} testId={`edit-resource-${r.id}`}>{Locale.label("common.edit")}</Verb></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
  };

  const getBlockoutsTable = () => {
    const rows = blockouts.filter((b) => match(targetName(b)) || match(b.reason));
    return rows.length === 0
      ? <EmptyState icon={<RoomIcon />} title={Locale.label("calendars.rooms.noBlockouts")} description={Locale.label("calendars.rooms.noBlockoutsDesc")} />
      : (
        <Table data-testid="blockouts-table" sx={plainTableSx}>
          <TableHead><TableRow><TableCell>{Locale.label("calendars.rooms.blockoutTarget")}</TableCell><TableCell>{Locale.label("calendars.rooms.startTime")}</TableCell><TableCell>{Locale.label("calendars.rooms.endTime")}</TableCell><TableCell>{Locale.label("calendars.rooms.reason")}</TableCell><TableCell align="right" /></TableRow></TableHead>
          <TableBody>
            {rows.map((b) => (
              <TableRow key={b.id}>
                <TableCell>{targetName(b)}</TableCell>
                <TableCell>{b.startTime ? new Date(b.startTime).toLocaleString() : ""}</TableCell>
                <TableCell>{b.endTime ? new Date(b.endTime).toLocaleString() : ""}</TableCell>
                <TableCell>{b.reason}</TableCell>
                <TableCell align="right" className="rowActions"><Verb onClick={() => setEditing({ type: "blockouts", item: b })} testId={`edit-blockout-${b.id}`}>{Locale.label("common.edit")}</Verb></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
  };

  const getTemplatesTable = () => {
    const rows = templates.filter((t) => match(t.name) || match(t.title));
    return rows.length === 0
      ? <EmptyState icon={<RoomIcon />} title={Locale.label("calendars.rooms.noTemplates")} description={Locale.label("calendars.rooms.noTemplatesDesc")} />
      : (
        <Table data-testid="templates-table" sx={plainTableSx}>
          <TableHead><TableRow><TableCell>{Locale.label("calendars.rooms.templateName")}</TableCell><TableCell>{Locale.label("calendars.rooms.eventTitle")}</TableCell><TableCell align="right">{Locale.label("calendars.rooms.durationMinutes")}</TableCell><TableCell align="right" /></TableRow></TableHead>
          <TableBody>
            {rows.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.name}</TableCell>
                <TableCell>{t.title}</TableCell>
                <TableCell align="right">{t.durationMinutes ?? ""}</TableCell>
                <TableCell align="right" className="rowActions"><Verb onClick={() => setEditing({ type: "templates", item: t })} testId={`edit-template-${t.id}`}>{Locale.label("common.edit")}</Verb></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
  };

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

  const startAdd = () => setEditing({ type: tab, item: {} });

  return (
    <CalendarChrome
      selected="rooms"
      extraVerbs={<Verb onClick={startAdd} testId="add-room-resource">{Locale.label("common.add")}</Verb>}
      find={<FindField value={find} onChange={setFind} placeholder={Locale.label("common.search")} />}>
      <Pills
        items={[
          { label: Locale.label("calendars.rooms.rooms"), selected: tab === "rooms", onClick: () => { setTab("rooms"); setEditing(null); }, testId: "tab-rooms" },
          { label: Locale.label("calendars.rooms.resources"), selected: tab === "resources", onClick: () => { setTab("resources"); setEditing(null); }, testId: "tab-resources" },
          { label: Locale.label("calendars.rooms.blockouts"), selected: tab === "blockouts", onClick: () => { setTab("blockouts"); setEditing(null); }, testId: "tab-blockouts" },
          { label: Locale.label("calendars.rooms.templates"), selected: tab === "templates", onClick: () => { setTab("templates"); setEditing(null); }, testId: "tab-templates" }
        ]}
      />
      {loading ? <Loading /> : (
        <>
          {editing?.item?.id && <Box sx={{ mb: 3 }}>{getEditCard()}</Box>}
          {getTable()}
          {editing && !editing.item?.id ? (
            <AddBlock>{getEditCard()}</AddBlock>
          ) : (
            <AddBlock>
              <Verb onClick={startAdd}>{Locale.label("common.add")}</Verb>
            </AddBlock>
          )}
        </>
      )}
    </CalendarChrome>
  );
};

export default RoomsResourcesPage;
