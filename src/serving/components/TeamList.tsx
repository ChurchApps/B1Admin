import React, { useState, useCallback, memo } from "react";
import { ApiHelper, UserHelper, Loading, ArrayHelper, Locale } from "@churchapps/apphelper";
import { Link } from "react-router-dom";
import { Box, Typography, Stack, Button, Paper, Table, TableBody, TableCell, TableRow, TableHead } from "@mui/material";
import { Add as AddIcon, People as PeopleIcon } from "@mui/icons-material";
import { type GroupInterface } from "@churchapps/helpers";
import { useMountedState, Permissions } from "@churchapps/apphelper";
import { GroupAdd } from "../../groups/components";
import { EmptyState } from "../../components/ui";

interface Props {
  ministry: GroupInterface;
}

export const TeamList = memo((props: Props) => {
  const [groups, setGroups] = useState<GroupInterface[]>(null);
  const [showAdd, setShowAdd] = useState(false);
  const isMounted = useMountedState();

  const handleAddClick = useCallback(() => {
    setShowAdd(true);
  }, []);

  const loadData = useCallback(() => {
    ApiHelper.get("/groups/tag/team", "MembershipApi").then((data) => {
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
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <PeopleIcon sx={{ color: "primary.main" }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {Locale.label("plans.teamList.teams")}
          </Typography>
        </Stack>
        {UserHelper.checkAccess(Permissions.membershipApi.groups.edit) && groups.length > 0 && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddClick}
            size="small"
            data-testid="add-team-button">
            {Locale.label("plans.teamList.newTeam")}
          </Button>
        )}
      </Stack>

      {groups.length === 0 ? (
        <EmptyState
          icon={<PeopleIcon />}
          title={Locale.label("plans.teamList.noTeam")}
          description={Locale.label("plans.teamList.createTeams")}
          action={
            UserHelper.checkAccess(Permissions.membershipApi.groups.edit) && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddClick}
                data-testid="add-team-button">
                {Locale.label("plans.teamList.createTeam")}
              </Button>
            )
          }
        />
      ) : (
        <Paper sx={{ width: "100%", overflow: "hidden" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "var(--bg-sub)" }}>
                <TableCell sx={{ fontWeight: 600, color: "var(--text-main)" }}>{Locale.label("common.name")}</TableCell>
                <TableCell sx={{ fontWeight: 600, color: "var(--text-main)" }}>{Locale.label("plans.teamList.members")}</TableCell>
                <TableCell align="right" sx={{ width: 80 }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map((g) => {
                const memberCount = g.memberCount || 0;

                return (
                  <TableRow
                    key={g.id}
                    hover
                    sx={{ "&:last-child td": { border: 0 } }}
                  >
                    <TableCell>
                      <Typography
                        component={Link}
                        to={`/groups/${g.id}?tag=team`}
                        sx={{
                          fontWeight: 500,
                          color: "primary.main",
                          textDecoration: "none",
                          "&:hover": { textDecoration: "underline" }
                        }}>
                        {g.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {memberCount}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        component={Link}
                        to={`/groups/${g.id}?tag=team`}
                        variant="text"
                        sx={{ color: "primary.main" }}>
                        {Locale.label("plans.teamList.manage")}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
});
