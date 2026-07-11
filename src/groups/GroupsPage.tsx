import { useState } from "react";
import { GroupAdd } from "./components";
import { ApiHelper, UserHelper, Loading, Locale, PageHeader } from "@churchapps/apphelper";
import { Link } from "react-router-dom";
import { Table, TableBody, TableCell, TableRow, Box, Card, Chip, Button, Stack, Typography, Switch, FormControlLabel, TextField, InputAdornment } from "@mui/material";
import { Add as AddIcon, Folder as FolderIcon, Group as GroupIcon, Inbox as InboxIcon, MonitorHeart as HealthIcon, Search as SearchIcon } from "@mui/icons-material";
import { type GroupInterface, type GroupJoinRequestInterface } from "@churchapps/helpers";
import { Permissions } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { CountChip, ExportButton, SortableTableHead, HeaderPrimaryButton, HeaderSecondaryButton } from "../components/ui";

const formatHeader = (key: string): string => {
  const customMap: Record<string, string> = {
    id: "ID",
    churchId: "Church ID",
    campusId: "Campus ID",
    categoryName: "Category Name",
    joinPolicy: "Join Policy",
    labelCount: "Label Count",
    memberCount: "Member Count",
    meetingLocation: "Meeting Location",
    meetingTime: "Meeting Time",
    name: "Name",
    labels: "Labels",
    tags: "Tags"
  };

  if (customMap[key]) {
    return customMap[key];
  }

  const result = key
    .replace(/([A-Z])/g, " $1")
    .replace(/([0-9]+)/g, " $1")
    .trim();
  return result.charAt(0).toUpperCase() + result.slice(1);
};

const GroupsPage = () => {
  const [showAdd, setShowAdd] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [searchText, setSearchText] = useState("");

  const canEditGroups = UserHelper.checkAccess(Permissions.membershipApi.groups.edit);

  const groupsQuery = useQuery<GroupInterface[]>({
    queryKey: [showArchived ? "/groups?archived=1" : "/groups/tag/standard", "MembershipApi"],
    placeholderData: []
  });
  const groups = groupsQuery.data || [];

  const query = searchText.trim().toLowerCase();
  const filteredGroups = query
    ? groups.filter((g) => (g.name || "").toLowerCase().includes(query) || (g.categoryName || "").toLowerCase().includes(query))
    : groups;

  const handleAddUpdated = () => {
    setShowAdd(false);
    groupsQuery.refetch();
  };

  const handleRestore = (g: GroupInterface) => {
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

      labels: Array.isArray(labelArray)
        ? labelArray.join(", ")
        : "",

      labelCount: Array.isArray(labelArray)
        ? labelArray.length
        : 0,

      memberCount: Number(g.memberCount || 0)
    };

    const formattedExport: any = {};
    Object.keys(rawExport).forEach((key) => {
      formattedExport[formatHeader(key)] = rawExport[key];
    });

    return formattedExport;
  });

  const getRows = () => {
    const rows: JSX.Element[] = [];

    if (filteredGroups.length === 0) {
      rows.push(
        <TableRow key="0">
          <TableCell>{query ? Locale.label("groups.groupsPage.noMatchMsg") : Locale.label("groups.groupsPage.noGroupMsg")}</TableCell>
        </TableRow>
      );
      return rows;
    }

    let lastCat = "";
    for (let i = 0; i < filteredGroups.length; i++) {
      const g = filteredGroups[i];
      const cat =
        g.categoryName !== lastCat ? (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <FolderIcon sx={{ color: "text.secondary", fontSize: 18, marginRight: "5px" }} /> {g.categoryName}
          </Box>
        ) : (
          <></>
        );
      const memberCount = g.memberCount === 1 ? Locale.label("groups.groupsPage.pers") : (g.memberCount || 0).toString() + Locale.label("groups.groupsPage.spPpl");
      rows.push(
        <TableRow sx={{ whiteSpace: "nowrap" }} key={g.id}>
          <TableCell>{cat}</TableCell>
          <TableCell>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <GroupIcon sx={{ color: "primary.main", fontSize: 20, marginRight: "5px" }} />{" "}
              <Link to={"/groups/" + (g.id || "")} style={{ color: "var(--link)", fontWeight: 500, textDecoration: "none" }}>{g.name}</Link>
            </Box>
          </TableCell>
          <TableCell>
            {(g.labelArray || []).map((label, index) => (
              <Chip key={`${g.id}-${label}-${index}`} label={label} variant="outlined" size="small" style={{ marginRight: 5 }} />
            ))}
          </TableCell>
          <TableCell align="right">{memberCount}</TableCell>
          {showArchived && (
            <TableCell align="right" className="rowActions">
              {canEditGroups && (
                <Button size="small" onClick={() => handleRestore(g)} data-testid={`restore-group-${g.id}`}>
                  {Locale.label("groups.groupsPage.restore")}
                </Button>
              )}
            </TableCell>
          )}
        </TableRow>
      );
      lastCat = g.categoryName || "";
    }
    return rows;
  };

  const addBox = showAdd ? <GroupAdd updatedFunction={handleAddUpdated} tags="standard" /> : <></>;

  const getTable = () => {
    if (groupsQuery.isLoading) return <Loading />;
    else {
      return (
        <Card>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "var(--border-light)" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1} alignItems="center">
                <GroupIcon sx={{ color: "primary.main", fontSize: 20 }} />
                <Typography variant="h6">{Locale.label("groups.groupsPage.groups")}</Typography>
                {groups.length > 0 && <CountChip count={groups.length} />}
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center">
                {canEditGroups && (
                  <FormControlLabel
                    control={<Switch checked={showArchived} onChange={(ev) => setShowArchived(ev.target.checked)} size="small" data-testid="show-archived-toggle" />}
                    label={Locale.label("groups.groupsPage.showArchived")}
                  />
                )}
                {groups.length > 0 && canEditGroups && (
                  <ExportButton data={exportData} filename="groups.csv" text={Locale.label("groups.groupsPage.export")} />
                )}
              </Stack>
            </Stack>
            {groups.length > 0 && (
              <TextField
                fullWidth
                size="small"
                variant="outlined"
                placeholder={Locale.label("groups.groupsPage.searchPlaceholder")}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                data-testid="groups-search"
                InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>) }}
                sx={{ mt: 2 }}
              />
            )}
          </Box>
          <Box sx={{ overflowX: "auto" }}>
            <Table>
              {groups.length > 0 && (
                <SortableTableHead
                  columns={[
                    { key: "categoryName", label: Locale.label("groups.groupsPage.cat") },
                    { key: "name", label: Locale.label("common.name") },
                    { key: "labels", label: Locale.label("groups.groupsPage.labels") },
                    { key: "memberCount", label: Locale.label("groups.groupsPage.ppl"), align: "right" as const },
                    ...(showArchived ? [{ key: "actions", label: "", align: "right" as const }] : [])
                  ]}
                />
              )}
              <TableBody>{getRows()}</TableBody>
            </Table>
          </Box>
        </Card>
      );
    }
  };

  return (
    <>
      <PageHeader
        icon={<GroupIcon />}
        title={Locale.label("groups.groupsPage.groups")}
        subtitle={groups.length > 0 ? Locale.label("groups.groupsPage.subtitle.manage").replace("{count}", groups.length.toString()) : Locale.label("groups.groupsPage.subtitle.create")}
      >
        {canApproveRequests && pendingCount > 0 && (
          <HeaderSecondaryButton {...({ component: Link, to: "/groups/pending" } as any)} startIcon={<InboxIcon />} data-testid="pending-requests-link">
            {pendingCount === 1
              ? Locale.label("groups.groupsPage.pendingRequestSingular").replace("{count}", pendingCount.toString())
              : Locale.label("groups.groupsPage.pendingRequests").replace("{count}", pendingCount.toString())}
          </HeaderSecondaryButton>
        )}
        {UserHelper.checkAccess(Permissions.membershipApi.groupMembers.view) && (
          <HeaderSecondaryButton {...({ component: Link, to: "/groups/health" } as any)} startIcon={<HealthIcon />} data-testid="group-health-link">
            {Locale.label("groups.groupHealth.title")}
          </HeaderSecondaryButton>
        )}
        {UserHelper.checkAccess(Permissions.membershipApi.groups.edit) && (
          <HeaderPrimaryButton startIcon={<AddIcon />} onClick={() => setShowAdd(true)} data-testid="add-group-button">
            {Locale.label("groups.groupsPage.addGroup")}
          </HeaderPrimaryButton>
        )}
      </PageHeader>

      <Box sx={{ p: 3 }}>
        {addBox}
        {getTable()}
      </Box>
    </>
  );
};

export default GroupsPage;
