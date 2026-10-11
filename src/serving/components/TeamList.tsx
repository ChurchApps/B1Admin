import React, { useState, useCallback, memo } from "react";
import { ApiHelper, UserHelper, Loading, ArrayHelper, Locale } from "@churchapps/apphelper";
import { Link } from "react-router-dom";
import { Box, Button, Link as MuiLink, Table, TableBody, TableCell, TableRow, TableHead, Typography } from "@mui/material";
import { Add as AddIcon, People as PeopleIcon } from "@mui/icons-material";
import { type GroupInterface } from "@churchapps/helpers";
import { useMountedState, Permissions } from "@churchapps/apphelper";
import { GroupAdd } from "../../groups/components";
import { CardWithHeader, numericCellSx, tableScrollSx } from "../../components/ui";

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

  const canAdd = UserHelper.checkAccess(Permissions.membershipApi.groups.edit);

  return (
    <CardWithHeader
      title={Locale.label("plans.teamList.teams")}
      icon={<PeopleIcon />}
      count={groups.length}
      actions={canAdd && (
        <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddClick} data-testid="add-team-button" sx={{ flexShrink: 0 }}>
          {Locale.label(groups.length === 0 ? "plans.teamList.createTeam" : "plans.teamList.newTeam")}
        </Button>
      )}>
      {groups.length === 0 ? (
        <Typography color="text.secondary">{Locale.label("plans.teamList.noTeam")}</Typography>
      ) : (
        <Box sx={tableScrollSx} role="region" aria-label={Locale.label("plans.teamList.teams")} tabIndex={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{Locale.label("common.name")}</TableCell>
                <TableCell sx={numericCellSx}>{Locale.label("plans.teamList.members")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map((g) => (
                <TableRow key={g.id}>
                  <TableCell>
                    <MuiLink component={Link} to={`/groups/${g.id}?tag=team`} underline="hover" sx={{ fontWeight: 600 }}>
                      {g.name}
                    </MuiLink>
                  </TableCell>
                  <TableCell sx={numericCellSx}>{g.memberCount || 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </CardWithHeader>
  );
});
