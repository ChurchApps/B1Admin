import React from "react";
import { PlanTypeList } from "./components/PlanTypeList";
import { TeamList } from "./components/TeamList";
import { ContentProviderAuthManager } from "./components/ContentProviderAuthManager";
import { GroupAdd } from "../groups/components";
import { ApiHelper, Locale, Loading, ArrayHelper, UserHelper, Permissions } from "@churchapps/apphelper";
import { Button } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { type GroupInterface, type GroupMemberInterface } from "@churchapps/helpers";
import UserContext from "../UserContext";
import { AddBlock, DirectoryPage, FindField, ListPills, Pill, Verb, Verbs } from "./plated";

export const ServingPage = () => {
  const [showAdd, setShowAdd] = React.useState(false);
  const [selectedMinistryId, setSelectedMinistryId] = React.useState<string | null>(null);
  const [showAllMinistries, setShowAllMinistries] = React.useState(false);
  const [slice, setSlice] = React.useState<"types" | "teams" | "providers">("types");
  const [find, setFind] = React.useState("");
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

  const visibleGroups = React.useMemo(() => {
    const q = find.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => (g.name || "").toLowerCase().includes(q));
  }, [groups, find]);

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
  const canEditGroups = UserHelper.checkAccess(Permissions.membershipApi.groups.edit);

  if (rawMinistryCount === 0 && !showAdd) {
    return (
      <DirectoryPage title={Locale.label("components.wrapper.serving")} lede={Locale.label("plans.plansPage.subtitle")}>
        <p style={{ color: "var(--text-muted)" }}>{Locale.label("plans.ministryList.noMinMsg")}</p>
        {canEditGroups && (
          <AddBlock title={Locale.label("plans.plansPage.addMinistry")}>
            <Button variant="text" onClick={handleShowAdd} sx={{ color: "var(--link)", fontWeight: 600, textTransform: "none" }}>
              {Locale.label("plans.plansPage.addMinistry")}
            </Button>
          </AddBlock>
        )}
      </DirectoryPage>
    );
  }

  return (
    <DirectoryPage title={selectedMinistry?.name || Locale.label("components.wrapper.serving")} lede={Locale.label("plans.ministryPage.subtitle")}>
      {groups.length > 0 && (
        <ListPills tablist>
          {visibleGroups.map((g) => (
            <Pill key={g.id} tab on={g.id === selectedMinistryId} onClick={() => { setSelectedMinistryId(g.id || null); setSlice("types"); }}>
              {g.name}
            </Pill>
          ))}
        </ListPills>
      )}

      {(rawMinistryCount > 6 || find) && (
        <FindField value={find} onChange={setFind} placeholder={Locale.label("common.search") || "Find a ministry"} />
      )}

      {isAdmin && (
        <ListPills>
          <Pill on={!showAllMinistries} onClick={() => setShowAllMinistries(false)}>{Locale.label("plans.servingPage.mine") || "Mine"}</Pill>
          <Pill on={showAllMinistries} onClick={() => setShowAllMinistries(true)}>{Locale.label("plans.servingPage.showAll")}</Pill>
        </ListPills>
      )}

      <Verbs>
        {selectedMinistry && (
          <Verb onClick={() => setSlice("types")}>{Locale.label("plans.planTypeList.planTypes")}</Verb>
        )}
        {selectedMinistry && (
          <Verb onClick={() => setSlice("teams")}>{Locale.label("plans.teamList.teams")}</Verb>
        )}
        {selectedMinistry && (
          <Verb onClick={() => setSlice("providers")}>{Locale.label("plans.contentProviderAuth.title") || "Content providers"}</Verb>
        )}
        {selectedMinistry && canEditGroups && (
          <Verb to={`/groups/${selectedMinistry.id}?tag=ministry`}>{Locale.label("plans.plansPage.editMinistry")}</Verb>
        )}
      </Verbs>

      {showAdd && canEditGroups && (
        <AddBlock title={Locale.label("plans.plansPage.addMinistry")}>
          <GroupAdd updatedFunction={handleAddUpdated} tags="ministry" categoryName="Ministry" />
        </AddBlock>
      )}

      {!selectedMinistry && (
        <p style={{ color: "var(--text-muted)" }}>{Locale.label("plans.servingPage.showAllHint")}</p>
      )}

      {selectedMinistry && slice === "types" && <PlanTypeList ministry={selectedMinistry} />}
      {selectedMinistry && slice === "teams" && <TeamList ministry={selectedMinistry} />}
      {selectedMinistry && slice === "providers" && <ContentProviderAuthManager key={selectedMinistry.id} ministryId={selectedMinistry.id || ""} />}

      {!showAdd && canEditGroups && (
        <AddBlock title={Locale.label("plans.plansPage.addMinistry")}>
          <Button onClick={handleShowAdd} sx={{ color: "var(--link)", fontWeight: 600, textTransform: "none" }}>
            {Locale.label("plans.plansPage.addMinistry")}
          </Button>
        </AddBlock>
      )}
    </DirectoryPage>
  );
};
