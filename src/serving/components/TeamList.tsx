import React, { useState, useCallback, memo } from "react";
import { ApiHelper, UserHelper, Loading, ArrayHelper, Locale, Permissions, useMountedState } from "@churchapps/apphelper";
import { Link } from "react-router-dom";
import { Box, Button } from "@mui/material";
import { type GroupInterface } from "@churchapps/helpers";
import { GroupAdd } from "../../groups/components";
import { AddBlock, SectionLabel, platedColor } from "../plated";

interface Props {
  ministry: GroupInterface;
}

export const TeamList = memo((props: Props) => {
  const [groups, setGroups] = useState<GroupInterface[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const isMounted = useMountedState();

  const handleAddClick = useCallback(() => {
    setShowAdd(true);
  }, []);

  const loadData = useCallback(() => {
    ApiHelper.get("/groups/tag/team", "MembershipApi").then((data: any) => {
      if (isMounted()) setGroups(ArrayHelper.getAll(data, "categoryName", props.ministry.id));
    });
  }, [props.ministry.id, isMounted]);

  const handleAddUpdated = useCallback(() => {
    setShowAdd(false);
    loadData();
  }, [loadData]);

  React.useEffect(loadData, [loadData]);

  if (showAdd) {
    return <GroupAdd updatedFunction={handleAddUpdated} tags="team" categoryName={props.ministry.id} />;
  }

  if (!groups) {
    return <Loading />;
  }

  return (
    <Box>
      <SectionLabel sx={{ mt: 0 }}>{Locale.label("plans.teamList.teams")}</SectionLabel>
      {groups.length === 0 && (
        <p style={{ color: platedColor.mute }}>{Locale.label("plans.teamList.noTeam")}</p>
      )}
      {groups.map((g) => (
        <Box
          key={g.id}
          sx={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "12px", padding: "11px 0", borderTop: `1px solid ${platedColor.line}` }}>
          <Link to={`/groups/${g.id}?tag=team`} style={{ color: platedColor.ink, fontWeight: 650, fontSize: "1.12rem", textDecoration: "none" }}>
            {g.name}
          </Link>
          <span style={{ color: platedColor.mute, fontSize: "0.88rem" }}>{g.memberCount || 0}</span>
        </Box>
      ))}
      {UserHelper.checkAccess(Permissions.membershipApi.groups.edit) && (
        <AddBlock title={Locale.label("plans.teamList.newTeam")}>
          <Button onClick={handleAddClick} data-testid="add-team-button" sx={{ color: platedColor.accent, fontWeight: 600, textTransform: "none" }}>
            {Locale.label("plans.teamList.newTeam")}
          </Button>
        </AddBlock>
      )}
    </Box>
  );
});
