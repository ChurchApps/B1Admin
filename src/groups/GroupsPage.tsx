import React, { useRef, useState } from "react";
import { GroupAdd } from "./components";
import { ApiHelper, UserHelper, Loading, Locale, ExportLink } from "@churchapps/apphelper";
import { Link as RouterLink } from "react-router-dom";
import { Table, TableBody, TableCell, TableRow, Box, Button, Stack, Typography, Link, Menu, MenuItem } from "@mui/material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import { type GroupInterface, type GroupJoinRequestInterface } from "@churchapps/helpers";
import { Permissions } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { AddBar, FilterChip, PageContainer, PageHeader, SearchField, SortableTableHead, Surface, TextAction, VerbRow, filterChipSx, numericCellSx, tableScrollSx } from "../components/ui";
import { useConfirmDelete, useSortableData } from "../hooks";

const EXPORT_LABEL_KEYS = [
  "id", "churchId", "campusId", "categoryName", "joinPolicy", "labelCount", "memberCount", "meetingLocation", "meetingTime", "name", "labels", "tags"
];

const VISIBLE_CATEGORIES = 5;

const formatHeader = (key: string): string => {
  if (EXPORT_LABEL_KEYS.indexOf(key) > -1) return Locale.label("groups.export." + key);

  const result = key
    .replace(/([A-Z])/g, " $1")
    .replace(/([0-9]+)/g, " $1")
    .trim();
  return result.charAt(0).toUpperCase() + result.slice(1);
};

// ExportLink renders a Button inside an <a download>; flatten it to a text-link verb.
const exportVerbSx = {
  display: "inline-flex",
  "& a": { textDecoration: "none" },
  "& .MuiButton-root": { p: 0, minWidth: 0, minHeight: 0, typography: "body1", fontWeight: 600, textTransform: "none", color: "primary.main", bgcolor: "transparent", border: 0, "&:hover": { bgcolor: "transparent", textDecoration: "underline" } },
  "& .MuiIcon-root, & .MuiButton-startIcon": { display: "none" }
} as const;

const GroupsPage = () => {
  const [showAdd, setShowAdd] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [category, setCategory] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLSpanElement>(null);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const canEditGroups = UserHelper.checkAccess(Permissions.membershipApi.groups.edit);
  const canViewHealth = UserHelper.checkAccess(Permissions.membershipApi.groupMembers.view);

  const groupsQuery = useQuery<GroupInterface[]>({
    queryKey: [showArchived ? "/groups?archived=1" : "/groups/tag/standard", "MembershipApi"],
    placeholderData: []
  });
  const groups = groupsQuery.data || [];

  const query = searchText.trim().toLowerCase();
  const searchedGroups = query
    ? groups.filter((g) => (g.name || "").toLowerCase().includes(query) || (g.categoryName || "").toLowerCase().includes(query))
    : groups;

  const categoryCounts = new Map<string, number>();
  groups.forEach((g) => {
    const c = g.categoryName || "";
    if (c) categoryCounts.set(c, (categoryCounts.get(c) || 0) + 1);
  });
  const categoryNames = Array.from(categoryCounts.keys()).sort((a, b) => (categoryCounts.get(b) || 0) - (categoryCounts.get(a) || 0) || a.localeCompare(b));
  const shownCategories = categoryNames.slice(0, VISIBLE_CATEGORIES);
  const overflowCategories = categoryNames.slice(VISIBLE_CATEGORIES).sort((a, b) => a.localeCompare(b));
  const activeCategory = category && categoryCounts.has(category) ? category : "";
  const visibleGroups = activeCategory ? searchedGroups.filter((g) => g.categoryName === activeCategory) : searchedGroups;
  const { sorted: sortedGroups, sortBy, sortDirection, handleSort } = useSortableData(visibleGroups);
  const filtersActive = !!query || !!activeCategory;
  const clearFilters = () => {
    setSearchText("");
    setCategory("");
  };

  // Categories and Archived are one list choice: picking a category leaves the archive.
  const selectList = (next: string) => {
    setCategory(next);
    setShowArchived(false);
  };

  const handleAddUpdated = () => {
    setShowAdd(false);
    groupsQuery.refetch();
  };

  const handleRestore = async (g: GroupInterface) => {
    if (!(await confirm(Locale.label("groups.groupsPage.confirmRestore").replace("{name}", g.name || ""), { confirmLabel: Locale.label("groups.groupsPage.restore"), destructive: false }))) return;
    const group: GroupInterface = { ...g, archived: false };
    ApiHelper.post("/groups", [group], "MembershipApi").then(() => groupsQuery.refetch());
  };

  const canApproveRequests = UserHelper.checkAccess(Permissions.membershipApi.groupMembers.edit);
  const { data: pendingRequests = [] } = useQuery<GroupJoinRequestInterface[]>({
    queryKey: ["/groupjoinrequests/pending", "MembershipApi"],
    placeholderData: [],
    enabled: canApproveRequests
  });
  const pendingCount = pendingRequests?.length || 0;

  const exportData = groups.map((g) => {
    const { labelArray, ...rest } = g;

    const rawExport: any = {
      ...rest,
      labels: Array.isArray(labelArray) ? labelArray.join(", ") : "",
      labelCount: Array.isArray(labelArray) ? labelArray.length : 0,
      memberCount: Number(g.memberCount || 0)
    };

    const formattedExport: any = {};
    Object.keys(rawExport).forEach((key) => {
      formattedExport[formatHeader(key)] = rawExport[key];
    });

    return formattedExport;
  });

  const getRows = () => {
    if (sortedGroups.length === 0) {
      return (
        <TableRow key="0">
          <TableCell colSpan={showArchived ? 3 : 2}>{filtersActive ? Locale.label("groups.groupsPage.noMatchMsg") : Locale.label("groups.groupsPage.noGroupMsg")}</TableCell>
        </TableRow>
      );
    }

    return sortedGroups.map((g) => {
      const memberCount = g.memberCount === 1 ? Locale.label("groups.groupsPage.pers") : (g.memberCount || 0).toString() + Locale.label("groups.groupsPage.spPpl");
      const labels = (g.labelArray || []).filter((l) => l && l.trim());
      const subLine = [g.categoryName, ...labels].filter(Boolean).join(" · ");
      return (
        <TableRow key={g.id}>
          <TableCell sx={{ py: 1.5 }}>
            <Link component={RouterLink} to={"/groups/" + (g.id || "")} underline="hover" sx={{ typography: "body1", fontWeight: 500, color: "text.primary" }}>{g.name}</Link>
            {subLine && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{subLine}</Typography>}
          </TableCell>
          <TableCell sx={{ ...numericCellSx, color: "text.secondary", whiteSpace: "nowrap" }}>{memberCount}</TableCell>
          {showArchived && (
            <TableCell align="right" className="rowActions">
              {canEditGroups && (
                <TextAction small onClick={() => handleRestore(g)} data-testid={`restore-group-${g.id}`}>
                  {Locale.label("groups.groupsPage.restore")}
                </TextAction>
              )}
            </TableCell>
          )}
        </TableRow>
      );
    });
  };

  const archivedPill = canEditGroups && (
    <Box
      component="label"
      data-testid="show-archived-toggle"
      sx={{ ...filterChipSx(showArchived), position: "relative", display: "inline-flex", alignItems: "center", cursor: "pointer", "&:focus-within": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 } }}>
      <Box component="input" type="checkbox" checked={showArchived} onChange={(ev: React.ChangeEvent<HTMLInputElement>) => { setShowArchived(ev.target.checked); setCategory(""); }} sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", m: 0, opacity: 0, cursor: "pointer" }} />
      {Locale.label("groups.groupsPage.showArchived")}
    </Box>
  );

  const getTable = () => {
    if (groupsQuery.isLoading) return <Loading />;
    return (
      <Stack spacing={2}>
        {(groups.length > 0 || showArchived) && (
          <Box data-testid="groups-search">
            <SearchField value={searchText} onChange={setSearchText} placeholder={Locale.label("groups.groupsPage.searchPlaceholder")} />
          </Box>
        )}
        {(categoryNames.length > 1 || canEditGroups) && (
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center" role="group" aria-label={Locale.label("groups.groupsPage.cat")}>
            {categoryNames.length > 1 && (
              <>
                <FilterChip selected={!activeCategory && !showArchived} onClick={() => selectList("")}>{Locale.label("groups.groupsPage.allCategories", "All")}</FilterChip>
                {shownCategories.map((c) => (
                  <FilterChip key={c} selected={activeCategory === c} onClick={() => selectList(c)}>{c}</FilterChip>
                ))}
                {overflowCategories.length > 0 && (
                  <>
                    <Box component="span" ref={moreRef} sx={{ display: "inline-flex" }}>
                      <FilterChip selected={overflowCategories.includes(activeCategory)} onClick={() => setMoreOpen(true)} data-testid="groups-more-categories">
                        {overflowCategories.includes(activeCategory) ? activeCategory : Locale.label("groups.groupsPage.moreCategories", "More categories")}
                        <ExpandMoreIcon fontSize="small" sx={{ ml: 0.5 }} />
                      </FilterChip>
                    </Box>
                    <Menu anchorEl={moreRef.current} open={moreOpen} onClose={() => setMoreOpen(false)}>
                      {overflowCategories.map((c) => (
                        <MenuItem key={c} selected={activeCategory === c} onClick={() => { selectList(c); setMoreOpen(false); }}>{c}</MenuItem>
                      ))}
                    </Menu>
                  </>
                )}
              </>
            )}
            {archivedPill}
          </Stack>
        )}
        {groups.length > 0 && (
          <Stack direction="row" spacing={2} alignItems="center" aria-live="polite">
            <Typography variant="body2" color="text.secondary">
              {Locale.label("groups.groupsPage.resultCount", "{shown} of {total} groups").replace("{shown}", visibleGroups.length.toString()).replace("{total}", groups.length.toString())}
            </Typography>
            {filtersActive && <Button size="small" onClick={clearFilters}>{Locale.label("groups.groupsPage.clearFilters", "Clear filters")}</Button>}
          </Stack>
        )}
        <Surface disablePadding>
          <Box sx={tableScrollSx} role="region" aria-label={Locale.label("groups.groupsPage.groups")} tabIndex={0}>
            <Table>
              {groups.length > 0 && (
                <SortableTableHead
                  columns={[
                    { key: "name", label: Locale.label("common.name"), sortable: true },
                    { key: "memberCount", label: Locale.label("groups.groupsPage.ppl"), align: "right" as const, sortable: true },
                    ...(showArchived ? [{ key: "actions", label: "", align: "right" as const }] : [])
                  ]}
                  sortBy={sortBy}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              )}
              <TableBody>{getRows()}</TableBody>
            </Table>
          </Box>
        </Surface>
      </Stack>
    );
  };

  return (
    <>
      {ConfirmDialogElement}
      <PageHeader
        title={Locale.label("groups.groupsPage.groups")}
        subtitle={groups.length > 0 ? Locale.label("groups.groupsPage.subtitle.manage").replace("{count}", groups.length.toString()) : Locale.label("groups.groupsPage.subtitle.create")}
      />

      <PageContainer>
        <VerbRow sx={{ mb: 3 }}>
          {canViewHealth && (
            <TextAction to="/groups/health" component={RouterLink} data-testid="group-health-link">{Locale.label("groups.groupHealth.title")}</TextAction>
          )}
          {canApproveRequests && pendingCount > 0 && (
            <TextAction to="/groups/pending" component={RouterLink} data-testid="pending-requests-link">
              {pendingCount === 1
                ? Locale.label("groups.groupsPage.pendingRequestSingular").replace("{count}", pendingCount.toString())
                : Locale.label("groups.groupsPage.pendingRequests").replace("{count}", pendingCount.toString())}
            </TextAction>
          )}
          {groups.length > 0 && canEditGroups && (
            <Box sx={exportVerbSx}>
              <ExportLink data={exportData} filename="groups.csv" text={Locale.label("groups.groupsPage.export")} />
            </Box>
          )}
        </VerbRow>
        {getTable()}
        {canEditGroups && (
          <AddBar data-testid="add-group-bar">
            {showAdd
              ? <GroupAdd updatedFunction={handleAddUpdated} tags="standard" />
              : <TextAction onClick={() => setShowAdd(true)} data-testid="add-group-button">{"+ " + Locale.label("groups.groupsPage.addGroup")}</TextAction>}
          </AddBar>
        )}
      </PageContainer>
    </>
  );
};

export default GroupsPage;
