import React from "react";
import { PlanTypeList } from "./components/PlanTypeList";
import { TeamList } from "./components/TeamList";
import { ContentProviderAuthManager } from "./components/ContentProviderAuthManager";
import { GroupAdd } from "../groups/components";
import { ApiHelper, Locale, Loading, ArrayHelper, UserHelper, Permissions } from "@churchapps/apphelper";
import { Box, Grid, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { type GroupInterface, type GroupMemberInterface } from "@churchapps/helpers";
import { AddBar, PageContainer, PageHeader, PillTabs, SearchField, TextAction, VerbRow } from "../components/ui";
import UserContext from "../UserContext";
import { Link } from "react-router-dom";

const FIND_THRESHOLD = 6;

export const ServingPage = () => {
  const [showAdd, setShowAdd] = React.useState(false);
  const [selectedMinistryId, setSelectedMinistryId] = React.useState<string | null>(null);
  const [showAllMinistries, setShowAllMinistries] = React.useState(false);
  const [find, setFind] = React.useState("");
  const context = React.useContext(UserContext);
  const isAdmin = UserHelper.checkAccess(Permissions.membershipApi.roles.edit);
  const canEditGroups = UserHelper.checkAccess(Permissions.membershipApi.groups.edit);

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
      return ApiHelper.get(`/groupMembers?groupIds=${groupIds}`, "MembershipApi");
    }
  });

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

  const visibleGroups = React.useMemo(() => {
    const q = find.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => (g.name || "").toLowerCase().includes(q) || g.id === selectedMinistryId);
  }, [groups, find, selectedMinistryId]);

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

  const rawMinistryCount = (ministries.data || []).length;

  const addBar = canEditGroups && (
    <AddBar title={showAdd ? undefined : Locale.label("plans.plansPage.addMinistry")} data-testid="add-ministry-bar">
      {showAdd
        ? <GroupAdd updatedFunction={handleAddUpdated} tags="ministry" categoryName="Ministry" />
        : (
          <TextAction onClick={() => setShowAdd(true)} data-testid="add-ministry-button">
            {Locale.label("plans.plansPage.addMinistry")}
          </TextAction>
        )}
    </AddBar>
  );

  if (rawMinistryCount === 0) {
    return (
      <>
        <PageHeader title={Locale.label("components.wrapper.serving")} subtitle={Locale.label("plans.plansPage.subtitle")} />
        <PageContainer>
          <Typography color="text.secondary">{Locale.label("plans.ministryList.noMinMsg")}</Typography>
          {addBar}
        </PageContainer>
      </>
    );
  }

  const ministryPills = (
    <Stack spacing={2}>
      {(rawMinistryCount > FIND_THRESHOLD || find) && (
        <Box sx={{ maxWidth: 360 }}>
          <SearchField
            value={find}
            onChange={setFind}
            size="small"
            label={Locale.label("plans.servingPage.findMinistry", "Find a ministry")}
            data-testid="find-ministry-input"
          />
        </Box>
      )}
      {visibleGroups.length > 0 && (
        <PillTabs
          tabs
          aria-label={Locale.label("plans.servingPage.ministries", "Ministries")}
          value={selectedMinistryId || ""}
          onChange={(id) => { setSelectedMinistryId(id); setShowAdd(false); }}
          options={visibleGroups.map((g) => ({ value: g.id || "", label: g.name || "" }))}
        />
      )}
    </Stack>
  );

  return (
    <>
      <PageHeader
        title={selectedMinistry?.name || Locale.label("components.wrapper.serving")}
        subtitle={Locale.label("plans.ministryPage.subtitle")}
        tabs={ministryPills}
      />

      <PageContainer>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" sx={{ mb: 3 }}>
          <VerbRow>
            {selectedMinistry && canEditGroups && (
              <TextAction component={Link} to={`/groups/${selectedMinistry.id}?tag=ministry`} data-testid="edit-ministry-link">
                {Locale.label("plans.plansPage.editMinistry")}
              </TextAction>
            )}
          </VerbRow>
          {isAdmin && (
            <PillTabs
              aria-label={Locale.label("plans.servingPage.whichMinistries", "Which ministries")}
              value={showAllMinistries ? "all" : "mine"}
              onChange={(v) => setShowAllMinistries(v === "all")}
              options={[
                { value: "mine", label: Locale.label("plans.servingPage.mine", "Mine"), "data-testid": "ministries-mine-pill" },
                { value: "all", label: Locale.label("plans.servingPage.all", "All"), "data-testid": "ministries-all-pill" }
              ]}
            />
          )}
        </Stack>

        {!selectedMinistry && (
          <Typography color="text.secondary">
            {Locale.label("plans.servingPage.allHint", "Your ministries are hidden because you're not a member. Choose \"All\" above to see them.")}
          </Typography>
        )}
        {/* While adding a ministry the form stands alone under the pills, one task at a time. */}
        {selectedMinistry && !showAdd && (
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
        {addBar}
      </PageContainer>
    </>
  );
};
