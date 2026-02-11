import React from "react";
import { PlanTypeList } from "./components/PlanTypeList";
import { TeamList } from "./components/TeamList";
import { ContentProviderAuthManager } from "./components/ContentProviderAuthManager";
import { GroupAdd } from "../groups/components";
import { Locale, PageHeader, Loading, ArrayHelper, UserHelper, Permissions } from "@churchapps/apphelper";
import { Box, Button, Grid, Tabs, Tab, FormControlLabel, Switch } from "@mui/material";
import { Assignment as AssignmentIcon, Add as AddIcon, Edit as EditIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { type GroupInterface, type GroupMemberInterface } from "@churchapps/helpers";
import { EmptyState } from "../components/ui";
import UserContext from "../UserContext";
import { Link } from "react-router-dom";

export const ServingPage = () => {
  const [showAdd, setShowAdd] = React.useState(false);
  const [selectedMinistryId, setSelectedMinistryId] = React.useState<string | null>(null);
  const [showAllMinistries, setShowAllMinistries] = React.useState(false);
  const context = React.useContext(UserContext);

  const ministries = useQuery<GroupInterface[]>({
    queryKey: ["/groups/tag/ministry", "MembershipApi"],
    placeholderData: []
  });

  const groupIds = React.useMemo(() => {
    return ministries.data && ministries.data.length > 0 ? ArrayHelper.getIds(ministries.data, "id") : [];
  }, [ministries.data]);

  const groupMembers = useQuery<GroupMemberInterface[]>({
    queryKey: ["/groupMembers", "MembershipApi", groupIds],
    enabled: groupIds.length > 0,
    placeholderData: [],
    queryFn: async () => {
      if (groupIds.length === 0) return [];
      const { ApiHelper } = await import("@churchapps/apphelper");
      return ApiHelper.get(`/groupMembers?groupIds=${groupIds}`, "MembershipApi");
    }
  });

  const handleShowAdd = () => setShowAdd(true);

  const handleAddUpdated = () => {
    setShowAdd(false);
    ministries.refetch();
  };

  if (ministries.isLoading) return <Loading />;

  // Admins: Ministries where they're a member OR ministries with no members (to prevent orphaning)
  // Regular users: Ministries where they're a member
  // Domain Admins: Can toggle to see all ministries
  const isAdmin = UserHelper.checkAccess(Permissions.membershipApi.roles.edit);
  const groups = (ministries.data || []).filter((g) => {
    if (isAdmin && showAllMinistries) return true;
    const members = ArrayHelper.getAll(groupMembers.data || [], "groupId", g.id);
    const isMember = ArrayHelper.getOne(members, "personId", context.person?.id) !== null;
    if (isAdmin) return isMember || members.length === 0;
    return isMember;
  });

  const selectedMinistry = groups.find((g) => g.id === selectedMinistryId);

  // Auto-select first ministry from filtered groups, or reset if current selection is not in filtered list
  React.useEffect(() => {
    if (groups.length > 0) {
      const isCurrentSelectionValid = groups.some(g => g.id === selectedMinistryId);
      if (!selectedMinistryId || !isCurrentSelectionValid) {
        setSelectedMinistryId(groups[0].id);
      }
    }
  }, [groups, selectedMinistryId]);

  // Show add ministry form
  if (showAdd) {
    return (
      <>
        <PageHeader icon={<AssignmentIcon />} title={Locale.label("plans.plansPage.addMinistry")} subtitle={Locale.label("plans.plansPage.subtitle")} />
        <Box sx={{ p: 3 }}>
          <GroupAdd updatedFunction={handleAddUpdated} tags="ministry" categoryName="Ministry" />
        </Box>
      </>
    );
  }

  // No ministries - prompt to create one
  if (groups.length === 0) {
    return (
      <>
        <PageHeader icon={<AssignmentIcon />} title={Locale.label("plans.plansPage.selMin")} subtitle={Locale.label("plans.plansPage.subtitle")} />
        <Box sx={{ p: 3 }}>
          <EmptyState
            icon={<AssignmentIcon />}
            title={Locale.label("plans.ministryList.noMinMsg")}
            description={Locale.label("plans.ministryList.getStarted")}
            action={
              UserHelper.checkAccess(Permissions.membershipApi.groups.edit) && (
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleShowAdd} sx={{ fontSize: "1rem", py: 1.5, px: 3 }}>
                  {Locale.label("plans.plansPage.addMinistry")}
                </Button>
              )
            }
          />
        </Box>
      </>
    );
  }

  // Has ministries - show selector and content
  return (
    <>
      <PageHeader icon={<AssignmentIcon />} title={selectedMinistry?.name || Locale.label("components.wrapper.serving")} subtitle={Locale.label("plans.ministryPage.subtitle")}>
        {isAdmin && (
          <FormControlLabel
            control={
              <Switch
                checked={showAllMinistries}
                onChange={(e) => setShowAllMinistries(e.target.checked)}
                sx={{ color: "#FFF", "&.Mui-checked": { color: "#FFF" }, "& .MuiSwitch-track": { backgroundColor: "rgba(255,255,255,0.3)" } }}
              />
            }
            label="Show All"
            sx={{ color: "#FFF", mr: 2 }}
          />
        )}
        {UserHelper.checkAccess(Permissions.membershipApi.groups.edit) && (
          <>
            {selectedMinistry && (
              <Button
                component={Link}
                to={`/groups/${selectedMinistry.id}?tag=ministry`}
                variant="outlined"
                startIcon={<EditIcon />}
                sx={{
                  color: "#FFF",
                  borderColor: "rgba(255,255,255,0.5)",
                  mr: 1,
                  "&:hover": {
                    borderColor: "#FFF",
                    backgroundColor: "rgba(255,255,255,0.1)"
                  }
                }}>
                {Locale.label("plans.plansPage.editMinistry")}
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleShowAdd}
              sx={{
                color: "#FFF",
                borderColor: "rgba(255,255,255,0.5)",
                "&:hover": {
                  borderColor: "#FFF",
                  backgroundColor: "rgba(255,255,255,0.1)"
                }
              }}>
              {Locale.label("plans.plansPage.addMinistry")}
            </Button>
          </>
        )}
      </PageHeader>

      {/* Ministry Tabs */}
      {groups.length > 1 && (
        <Box sx={{ borderBottom: 1, borderColor: "divider", backgroundColor: "background.paper" }}>
          <Tabs
            value={selectedMinistryId || false}
            onChange={(_e, value) => setSelectedMinistryId(value)}
            variant="fullWidth"
            sx={{
              minHeight: 48,
              "& .MuiTab-root": {
                textTransform: "none",
                fontSize: "0.95rem",
                fontWeight: 700,
                minHeight: 48
              }
            }}
          >
            {groups.map((g) => (
              <Tab key={g.id} value={g.id} label={g.name} />
            ))}
          </Tabs>
        </Box>
      )}

      <Box sx={{ p: 3 }}>
        {selectedMinistry && (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, lg: 6 }}>
              <PlanTypeList ministry={selectedMinistry} />
            </Grid>
            <Grid size={{ xs: 12, lg: 6 }}>
              <TeamList ministry={selectedMinistry} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <ContentProviderAuthManager key={selectedMinistry.id} ministryId={selectedMinistry.id} />
            </Grid>
          </Grid>
        )}
      </Box>
    </>
  );
};
