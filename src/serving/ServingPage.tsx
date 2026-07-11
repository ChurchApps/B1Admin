import React from "react";
import { PlanTypeList } from "./components/PlanTypeList";
import { TeamList } from "./components/TeamList";
import { ContentProviderAuthManager } from "./components/ContentProviderAuthManager";
import { GroupAdd } from "../groups/components";
import { Locale, PageHeader, Loading, ArrayHelper, UserHelper, Permissions } from "@churchapps/apphelper";
import { Box, Button, Grid, FormControlLabel, Switch } from "@mui/material";
import { Assignment as AssignmentIcon, Add as AddIcon, Edit as EditIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { type GroupInterface, type GroupMemberInterface } from "@churchapps/helpers";
import { EmptyState, HeaderPrimaryButton, HeaderSecondaryButton } from "../components/ui";
import { NavigationTabs } from "../components/ui/NavigationTabs";
import UserContext from "../UserContext";
import { Link } from "react-router-dom";

export const ServingPage = () => {
  const [showAdd, setShowAdd] = React.useState(false);
  const [selectedMinistryId, setSelectedMinistryId] = React.useState<string | null>(null);
  const [showAllMinistries, setShowAllMinistries] = React.useState(false);
  const context = React.useContext(UserContext);
  const isAdmin = UserHelper.checkAccess(Permissions.membershipApi.roles.edit);

  const ministries = useQuery<GroupInterface[]>({
    queryKey: isAdmin ? ["/groups/tag/ministry", "MembershipApi"] : ["/groups/my/ministry", "MembershipApi"],
    placeholderData: []
  });

  const groupIds = React.useMemo(() => {
    return ministries.data && ministries.data.length > 0 ? ArrayHelper.getIds(ministries.data, "id") : [];
  }, [ministries.data]);

  const groupMembers = useQuery<GroupMemberInterface[]>({
    queryKey: ["/groupMembers", "MembershipApi", groupIds],
    enabled: isAdmin && groupIds.length > 0,
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

  const groups = isAdmin
    ? (ministries.data || []).filter((g) => {
      if (showAllMinistries) return true;
      const members = ArrayHelper.getAll(groupMembers.data || [], "groupId", g.id);
      const isMember = ArrayHelper.getOne(members, "personId", context?.person?.id) !== null;
      return isMember || members.length === 0;
    })
    : (ministries.data || []);

  const selectedMinistry = groups.find((g) => g.id === selectedMinistryId);

  React.useEffect(() => {
    if (groups.length > 0) {
      const isCurrentSelectionValid = groups.some(g => g.id === selectedMinistryId);
      if (!selectedMinistryId || !isCurrentSelectionValid) {
        setSelectedMinistryId(groups[0].id || null);
      }
    }
  }, [groups, selectedMinistryId]);

  if (ministries.isLoading) return <Loading />;

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

  const rawMinistryCount = (ministries.data || []).length;

  if (rawMinistryCount === 0) {
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

  return (
    <>
      <PageHeader
        icon={<AssignmentIcon />}
        title={selectedMinistry?.name || Locale.label("components.wrapper.serving")}
        subtitle={Locale.label("plans.ministryPage.subtitle")}
        tabs={groups.length > 1 && (
          <NavigationTabs
            selectedTab={selectedMinistryId || ""}
            onTabChange={setSelectedMinistryId}
            tabs={groups.map((g) => ({ value: g.id || "", label: g.name || "" }))}
            onHeader
          />
        )}
      >
        {isAdmin && (
          <FormControlLabel
            control={
              <Switch
                checked={showAllMinistries}
                onChange={(e) => setShowAllMinistries(e.target.checked)}
                sx={{ color: "#FFF", "&.Mui-checked": { color: "#FFF" }, "& .MuiSwitch-track": { backgroundColor: "rgba(255,255,255,0.3)" } }}
              />
            }
            label={Locale.label("plans.servingPage.showAll")}
            sx={{ color: "#FFF", mr: 2 }}
          />
        )}
        {UserHelper.checkAccess(Permissions.membershipApi.groups.edit) && (
          <>
            {selectedMinistry && (
              <HeaderSecondaryButton component={Link} startIcon={<EditIcon />} {...({ to: `/groups/${selectedMinistry.id}?tag=ministry` } as any)}>
                {Locale.label("plans.plansPage.editMinistry")}
              </HeaderSecondaryButton>
            )}
            <HeaderPrimaryButton startIcon={<AddIcon />} onClick={handleShowAdd}>
              {Locale.label("plans.plansPage.addMinistry")}
            </HeaderPrimaryButton>
          </>
        )}
      </PageHeader>

      <Box sx={{ p: 3 }}>
        {!selectedMinistry && (
          <EmptyState
            icon={<AssignmentIcon />}
            title={Locale.label("plans.ministryList.noMinMsg")}
            description={Locale.label("plans.servingPage.showAllHint")}
          />
        )}
        {selectedMinistry && (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, lg: 6 }}>
              <PlanTypeList ministry={selectedMinistry} />
            </Grid>
            <Grid size={{ xs: 12, lg: 6 }}>
              <TeamList ministry={selectedMinistry} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <ContentProviderAuthManager key={selectedMinistry.id} ministryId={selectedMinistry.id || ""} />
            </Grid>
          </Grid>
        )}
      </Box>
    </>
  );
};
