import React from "react";
import { PlanTypeList } from "./components/PlanTypeList";
import { TeamList } from "./components/TeamList";
import { ContentProviderAuthManager } from "./components/ContentProviderAuthManager";
import { GroupAdd } from "../groups/components";
import { ApiHelper, Locale, Loading, ArrayHelper, UserHelper, Permissions } from "@churchapps/apphelper";
import { Box, Grid, Stack, Typography } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { type GroupInterface, type GroupMemberInterface } from "@churchapps/helpers";
import { HeaderPrimaryButton, HeaderTextButton, PageContainer, PageHeader, PillTabs, SearchField } from "../components/ui";
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

  const openAdd = () => {
    setShowAdd(true);
    setTimeout(() => document.getElementById("add-ministry-bar")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

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

  // Hidden while its form is open, like the inline add it replaced.
  const addButton = canEditGroups && !showAdd && (
    <HeaderPrimaryButton startIcon={<AddIcon />} onClick={openAdd} data-testid="add-ministry-button">
      {Locale.label("plans.plansPage.addMinistry")}
    </HeaderPrimaryButton>
  );

  const addForm = canEditGroups && showAdd && (
    <Box id="add-ministry-bar" data-testid="add-ministry-bar" sx={{ mt: selectedMinistry ? 0 : 3 }}>
      <GroupAdd updatedFunction={handleAddUpdated} tags="ministry" categoryName="Ministry" />
    </Box>
  );

  if (rawMinistryCount === 0) {
    return (
      <>
        <PageHeader title={Locale.label("components.wrapper.serving")} subtitle={Locale.label("plans.plansPage.subtitle")}>{addButton}</PageHeader>
        <PageContainer>
          <Typography color="text.secondary">{Locale.label("plans.ministryList.noMinMsg")}</Typography>
          {addForm}
        </PageContainer>
      </>
    );
  }

  const ministryPicker = (
    <Stack spacing={2}>
      {(rawMinistryCount > FIND_THRESHOLD || find) && (
        <Box sx={{ maxWidth: 560 }}>
          <SearchField
            value={find}
            onChange={setFind}
            label={Locale.label("plans.servingPage.findMinistry", "Find a ministry")}
            data-testid="find-ministry-input"
          />
        </Box>
      )}
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between">
        {visibleGroups.length > 0 && (
          <PillTabs
            tabs
            aria-label={Locale.label("plans.servingPage.ministries", "Ministries")}
            value={selectedMinistryId || ""}
            onChange={(id) => { setSelectedMinistryId(id); setShowAdd(false); }}
            options={visibleGroups.map((g) => ({ value: g.id || "", label: g.name || "" }))}
          />
        )}
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
    </Stack>
  );

  return (
    <>
      <PageHeader
        title={selectedMinistry?.name || Locale.label("components.wrapper.serving")}
        subtitle={Locale.label("plans.ministryPage.subtitle")}
        tabs={ministryPicker}>
        {selectedMinistry && canEditGroups && (
          <HeaderTextButton component={Link} to={`/groups/${selectedMinistry.id}?tag=ministry`} data-testid="edit-ministry-link">
            {Locale.label("plans.plansPage.editMinistry")}
          </HeaderTextButton>
        )}
        {addButton}
      </PageHeader>

      <PageContainer>
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
        {addForm}
      </PageContainer>
    </>
  );
};
