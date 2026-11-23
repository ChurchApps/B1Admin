import { useState, useEffect, useCallback, type ReactNode } from "react";
import { ApiHelper, Loading, Locale, DateHelper } from "@churchapps/apphelper";
import { Permissions, type GroupInterface } from "@churchapps/helpers";
import { Box, Button, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { Add as AddIcon, MeetingRoom as RoomIcon } from "@mui/icons-material";
import { useRequirePermission } from "../hooks";
import { EmptyState, FilterChip, HeaderPrimaryButton, PillTabs, ResultsBar, SearchField, StatusBadge, Surface, TextAction, tableScrollSx } from "../components/ui";
import { CalendarChrome } from "./components/CalendarChrome";
import { RoomEdit } from "./components/RoomEdit";
import { ResourceEdit } from "./components/ResourceEdit";
import { BlockoutEdit } from "./components/BlockoutEdit";
import { TemplateEdit } from "./components/TemplateEdit";
import { categoryNames } from "./components/categoryGroups";
import { type CalendarBlockoutInterface, type EventTemplateInterface, type ResourceInterface, type RoomInterface } from "./interfaces";

type TabKey = "rooms" | "resources" | "blockouts" | "templates";
type Editing =
  | { type: "rooms"; item: RoomInterface }
  | { type: "resources"; item: ResourceInterface }
  | { type: "blockouts"; item: CalendarBlockoutInterface }
  | { type: "templates"; item: EventTemplateInterface }
  | null;

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
  const [category, setCategory] = useState("");
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

  const groupName = (id?: string | null) => groups.find((g) => g.id === id)?.name || Locale.label("calendars.rooms.noApprovalNeeded");
  const targetName = (b: CalendarBlockoutInterface) => {
    if (b.roomId) return rooms.find((r) => r.id === b.roomId)?.name || "";
    if (b.resourceId) return resources.find((r) => r.id === b.resourceId)?.name || "";
    return Locale.label("calendars.rooms.allRoomsResources");
  };

  const q = find.trim().toLowerCase();
  const match = (text?: string) => !q || (text || "").toLowerCase().includes(q);
  const inCategory = (r: RoomInterface | ResourceInterface) => !category || (r.categoryName || "").trim() === category;
  const shownRooms = rooms.filter((r) => (match(r.name) || match(r.categoryName || "")) && inCategory(r));
  const shownResources = resources.filter((r) => (match(r.name) || match(r.categoryName || "")) && inCategory(r));
  const categories = categoryNames([...rooms, ...resources]);

  // Filter chips for the categories on the current tab, most used first (#1650).
  const tabCategories = (list: (RoomInterface | ResourceInterface)[]) => {
    const counts = new Map<string, number>();
    list.forEach((r) => { const c = (r.categoryName || "").trim(); if (c) counts.set(c, (counts.get(c) || 0) + 1); });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  };
  const chipCategories = tab === "rooms" ? tabCategories(rooms) : tab === "resources" ? tabCategories(resources) : [];
  const shownBlockouts = blockouts.filter((b) => match(targetName(b)) || match(b.reason));
  const shownTemplates = templates.filter((t) => match(t.name) || match(t.title));

  const nameCell = (r: RoomInterface | ResourceInterface) => (
    <TableCell>
      <Stack direction="row" spacing={1} alignItems="center">
        <span>{r.name}</span>
        {r.active === false && <StatusBadge tone="neutral" variant="dot">{Locale.label("calendars.rooms.inactive")}</StatusBadge>}
      </Stack>
    </TableCell>
  );

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
          <TableHead><TableRow><TableCell>{Locale.label("calendars.rooms.roomName")}</TableCell><TableCell>{Locale.label("calendars.rooms.category")}</TableCell><TableCell align="right">{Locale.label("calendars.rooms.capacity")}</TableCell><TableCell>{Locale.label("calendars.rooms.approvalGroup")}</TableCell><TableCell align="right" /></TableRow></TableHead>
          <TableBody>
            {shownRooms.map((r) => (
              <TableRow key={r.id} hover>
                {nameCell(r)}
                <TableCell>{r.categoryName || ""}</TableCell>
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
          <TableHead><TableRow><TableCell>{Locale.label("calendars.rooms.resourceName")}</TableCell><TableCell>{Locale.label("calendars.rooms.category")}</TableCell><TableCell align="right">{Locale.label("calendars.rooms.quantity")}</TableCell><TableCell>{Locale.label("calendars.rooms.approvalGroup")}</TableCell><TableCell align="right" /></TableRow></TableHead>
          <TableBody>
            {shownResources.map((r) => (
              <TableRow key={r.id} hover>
                {nameCell(r)}
                <TableCell>{r.categoryName || ""}</TableCell>
                <TableCell align="right">{r.quantity ?? ""}</TableCell>
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
      case "rooms": return <RoomEdit room={editing.item} groups={groups} categories={categories} updatedCallback={handleUpdated} />;
      case "resources": return <ResourceEdit resource={editing.item} groups={groups} categories={categories} updatedCallback={handleUpdated} />;
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
  const totals: Record<TabKey, [number, number]> = {
    rooms: [shownRooms.length, rooms.length],
    resources: [shownResources.length, resources.length],
    blockouts: [shownBlockouts.length, blockouts.length],
    templates: [shownTemplates.length, templates.length]
  };
  const [shown, total] = totals[tab];

  const openAdd = () => {
    setEditing({ type: tab, item: {} });
    setTimeout(() => document.getElementById("add-room-resource-bar")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  return (
    <CalendarChrome
      selected="rooms"
      subtitle={Locale.label("calendars.rooms.subtitle")}
      actions={(
        <HeaderPrimaryButton startIcon={<AddIcon />} onClick={openAdd} disabled={loading} data-testid="add-room-resource">{addLabels[tab]}</HeaderPrimaryButton>
      )}>
      {editing?.item?.id && <Box sx={{ mb: 3 }}>{getEditCard()}</Box>}
      <Surface>
        <Stack spacing={3}>
          <SearchField value={find} onChange={setFind} label={Locale.label("calendars.rooms.find", "Find")} data-testid="rooms-find" />
          <PillTabs options={tabs} value={tab} onChange={(v) => { setTab(v as TabKey); setEditing(null); setCategory(""); }} aria-label={Locale.label("calendars.rooms.title")} />
          {chipCategories.length > 0 && (
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" data-testid="category-chips">
              {chipCategories.map(([c, count]) => (
                <FilterChip key={c} selected={category === c} onClick={() => setCategory(category === c ? "" : c)} data-testid={tab === "rooms" ? "room-category-chip" : "resource-category-chip"}>{c} ({count})</FilterChip>
              ))}
            </Stack>
          )}
          {loading ? <Loading /> : (
            <>
              {total > 0 && (
                <ResultsBar>
                  <Typography variant="body2" color="text.secondary">
                    {Locale.label("calendars.rooms.resultCount", "{shown} of {total} {items}").replace("{shown}", shown.toString()).replace("{total}", total.toString()).replace("{items}", (tabs.find((t) => t.value === tab)?.label || "").toLowerCase())}
                  </Typography>
                  {(q || category) && <Button size="small" onClick={() => { setFind(""); setCategory(""); }}>{Locale.label("common.clear", "Clear")}</Button>}
                </ResultsBar>
              )}
              <Box>{getTable()}</Box>
            </>
          )}
        </Stack>
        {adding && (
          <Box id="add-room-resource-bar" data-testid="add-room-resource-bar" sx={{ borderTop: 1, borderColor: "divider", pt: 3, mt: 3 }}>
            {getEditCard()}
          </Box>
        )}
      </Surface>
    </CalendarChrome>
  );
};

export default RoomsResourcesPage;
