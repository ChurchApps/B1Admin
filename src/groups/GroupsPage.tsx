import React, { useState } from "react";
import { GroupAdd } from "./components";
import { ApiHelper, UserHelper, ExportLink, Loading, Locale, PageHeader } from "@churchapps/apphelper";
import { Link } from "react-router-dom";
import { Table, TableBody, TableCell, TableRow, TableHead, Paper, Box, Chip, Button, Toolbar, Stack, Typography } from "@mui/material";
import { Add as AddIcon, FileDownload as ExportIcon, Folder as FolderIcon, Group as GroupIcon, Inbox as InboxIcon, People as PeopleIcon } from "@mui/icons-material";
import { type GroupInterface, type GroupJoinRequestInterface } from "@churchapps/helpers";
import { useMountedState, Permissions } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";

const GroupsPage = () => {
  const [groups, setGroups] = useState<GroupInterface[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const isMounted = useMountedState();

  const handleAddUpdated = () => {
    setShowAdd(false);
    loadData();
  };

  const loadData = () => {
    setIsLoading(true);
    ApiHelper.get("/groups/tag/standard", "MembershipApi")
      .then((data: any) => {
        if (isMounted()) {
          setGroups(data);
        }
      })
      .finally(() => {
        if (isMounted()) {
          setIsLoading(false);
        }
      });
  };

  React.useEffect(loadData, [isMounted]);

  const canApproveRequests = UserHelper.checkAccess(Permissions.membershipApi.groupMembers.edit);
  const { data: pendingRequests = [] } = useQuery<GroupJoinRequestInterface[]>({
    queryKey: ["/groupjoinrequests/pending", "MembershipApi"],
    placeholderData: [],
    enabled: canApproveRequests
  });
  const pendingCount = pendingRequests?.length || 0;

  const canEditPlans = UserHelper.checkAccess(Permissions.membershipApi.plans.edit);
  const { data: myMinistries = [] } = useQuery<GroupInterface[]>({
    queryKey: ["/groups/my/ministry", "MembershipApi"],
    placeholderData: [],
    enabled: !canEditPlans
  });
  const showServingTeams = canEditPlans || (myMinistries?.length || 0) > 0;

  const exportData = groups.map((g) => {
    const { labelArray, ...rest } = g;

    return {
      ...rest,

      labels: Array.isArray(labelArray)
        ? labelArray.join(", ")
        : "",

      labelCount: Array.isArray(labelArray)
        ? labelArray.length
        : 0,

      memberCount: Number(g.memberCount || 0)
    };
  });

  const getRows = () => {
    const rows: JSX.Element[] = [];

    if (groups.length === 0) {
      rows.push(
        <TableRow key="0">
          <TableCell>{Locale.label("groups.groupsPage.noGroupMsg")}</TableCell>
        </TableRow>
      );
      return rows;
    }

    let lastCat = "";
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      const cat =
        g.categoryName !== lastCat ? (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <FolderIcon sx={{ marginRight: "5px" }} /> {g.categoryName}
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
              <GroupIcon sx={{ marginRight: "5px" }} /> <Link to={"/groups/" + g.id.toString()}>{g.name}</Link>
            </Box>
          </TableCell>
          <TableCell>
            {g.labelArray.map((label, index) => (
              <Chip key={`${g.id}-${label}-${index}`} label={label} variant="outlined" size="small" style={{ marginRight: 5 }} />
            ))}
          </TableCell>
          <TableCell>{memberCount}</TableCell>
        </TableRow>
      );
      lastCat = g.categoryName;
    }
    return rows;
  };

  const getTableHeader = () => {
    const rows: JSX.Element[] = [];
    if (groups.length === 0) return rows;
    rows.push(
      <TableRow sx={{ textAlign: "left" }} key="header">
        <TableCell sx={{ fontWeight: 600, color: "text.secondary" }}>{Locale.label("groups.groupsPage.cat")}</TableCell>
        <TableCell sx={{ fontWeight: 600, color: "text.secondary" }}>{Locale.label("common.name")}</TableCell>
        <TableCell sx={{ fontWeight: 600, color: "text.secondary" }}>{Locale.label("groups.groupsPage.labels")}</TableCell>
        <TableCell sx={{ fontWeight: 600, color: "text.secondary" }}>{Locale.label("groups.groupsPage.ppl")}</TableCell>
      </TableRow>
    );
    return rows;
  };

  const addBox = showAdd ? <GroupAdd updatedFunction={handleAddUpdated} tags="standard" /> : <></>;

  const getTable = () => {
    if (isLoading) return <Loading />;
    else {
      return (
        <Paper sx={{ width: "100%", overflowX: "auto" }}>
          {groups.length > 0 && UserHelper.checkAccess(Permissions.membershipApi.groups.edit) && (
            <Toolbar sx={{ pl: { sm: 2 }, pr: { xs: 1, sm: 1 }, justifyContent: "flex-end" }}>
              <Button variant="outlined" size="small" startIcon={<ExportIcon />} component={ExportLink} data={exportData} filename="groups.csv">
                {Locale.label("groups.groupsPage.export")}
              </Button>
            </Toolbar>
          )}
          <Table>
            <TableHead sx={{ backgroundColor: "background.subtle" }}>{getTableHeader()}</TableHead>
            <TableBody>{getRows()}</TableBody>
          </Table>
        </Paper>
      );
    }
  };

  return (
    <>
      <PageHeader
        title={Locale.label("groups.groupsPage.groups")}
        subtitle={groups.length > 0 ? Locale.label("groups.groupsPage.subtitle.manage").replace("{count}", groups.length.toString()) : Locale.label("groups.groupsPage.subtitle.create")}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "flex-start", md: "center" }}
          sx={{ width: "100%" }}
        >
          {groups.length > 0 && (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={{ xs: 2, sm: 4, md: 5 }}
              sx={{
                position: { xs: "static", md: "absolute" },
                left: { md: "50%" },
                top: { md: "50%" },
                transform: { md: "translateY(-50%)" },
                flexWrap: "wrap"
              }}
            >
              <Stack spacing={0.5} alignItems="center" sx={{ minWidth: 80 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <GroupIcon sx={{ color: "#FFF", fontSize: 24 }} />
                  <Typography variant="h5" sx={{ color: "#FFF", fontWeight: 700 }}>{groups.length}</Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5 }}>{Locale.label("groups.groupsPage.totalGroups")}</Typography>
              </Stack>
            </Stack>
          )}
          <Stack
            direction="row"
            spacing={1.5}
            sx={{
              position: { md: "relative" },
              ml: { md: "auto" },
              zIndex: 1,
              flexWrap: "wrap"
            }}>
            {canApproveRequests && pendingCount > 0 && (
              <Button
                variant="outlined"
                component={Link}
                to="/groups/pending"
                startIcon={<InboxIcon />}
                data-testid="pending-requests-link"
                sx={{
                  color: "#FFF",
                  borderColor: "rgba(255,255,255,0.5)",
                  "&:hover": {
                    borderColor: "#FFF",
                    backgroundColor: "rgba(255,255,255,0.1)"
                  }
                }}>
                {pendingCount} pending request{pendingCount === 1 ? "" : "s"}
              </Button>
            )}
            {showServingTeams && (
              <Button
                variant="outlined"
                component={Link}
                to="/serving"
                startIcon={<PeopleIcon />}
                data-testid="serving-teams-button"
                sx={{
                  color: "#FFF",
                  borderColor: "rgba(255,255,255,0.5)",
                  "&:hover": {
                    borderColor: "#FFF",
                    backgroundColor: "rgba(255,255,255,0.1)"
                  }
                }}>
                {Locale.label("components.wrapper.teams")}
              </Button>
            )}
            {UserHelper.checkAccess(Permissions.membershipApi.groups.edit) && (
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setShowAdd(true)}
                sx={{
                  color: "#FFF",
                  borderColor: "rgba(255,255,255,0.5)",
                  "&:hover": {
                    borderColor: "#FFF",
                    backgroundColor: "rgba(255,255,255,0.1)"
                  }
                }}
                data-testid="add-group-button">
                {Locale.label("groups.groupsPage.addGroup")}
              </Button>
            )}
          </Stack>
        </Stack>
      </PageHeader>

      {/* Main Content */}
      <Box sx={{ p: 3 }}>
        {addBox}
        {getTable()}
      </Box>
    </>
  );
};

export default GroupsPage;
