import React from "react";
import { Box, Button, Typography, Stack, IconButton, Paper, Table, TableBody, TableCell, TableRow, TableHead } from "@mui/material";
import { Add as AddIcon, Assignment as AssignmentIcon, Edit as EditIcon } from "@mui/icons-material";
import { Locale, Loading, UserHelper, Permissions } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { type GroupInterface } from "@churchapps/helpers";
import { type PlanTypeInterface } from "../../helpers";
import { PlanTypeEdit } from "./PlanTypeEdit";
import { EmptyState } from "../../components/ui";
import { Link } from "react-router-dom";

interface Props {
  ministry: GroupInterface;
}

export const PlanTypeList = React.memo(({ ministry }: Props) => {
  const [showAdd, setShowAdd] = React.useState(false);
  const [editItem, setEditItem] = React.useState<PlanTypeInterface | null>(null);
  const canEdit = UserHelper.checkAccess(Permissions.membershipApi.plans.edit);

  const planTypes = useQuery<PlanTypeInterface[]>({
    queryKey: [`/planTypes/ministryId/${ministry.id}`, "DoingApi"],
    enabled: !!ministry.id,
    placeholderData: []
  });

  const handleAdd = React.useCallback(() => {
    setEditItem({ ministryId: ministry.id });
    setShowAdd(true);
  }, [ministry.id]);

  const handleEdit = React.useCallback((planType: PlanTypeInterface) => {
    setEditItem(planType);
    setShowAdd(true);
  }, []);

  const handleClose = React.useCallback(() => {
    setShowAdd(false);
    setEditItem(null);
    planTypes.refetch();
  }, [planTypes]);

  if (showAdd && canEdit) return <PlanTypeEdit planType={editItem} onClose={handleClose} />;
  if (planTypes.isLoading) return <Loading />;

  const types = planTypes.data || [];

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <AssignmentIcon sx={{ color: "primary.main" }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {Locale.label("plans.planTypeList.planTypes")}
          </Typography>
        </Stack>
        {canEdit && types.length > 0 && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            size="small">
            {Locale.label("plans.planTypeList.addPlanType")}
          </Button>
        )}
      </Stack>

      {types.length === 0 ? (
        <EmptyState
          icon={<AssignmentIcon />}
          title={Locale.label("plans.planTypeList.noPlanTypes")}
          description={Locale.label("plans.planTypeList.createPlanTypes")}
          action={
            canEdit && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAdd}>
                {Locale.label("plans.planTypeList.createPlanType")}
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
                {canEdit && <TableCell align="right" sx={{ width: 50 }}></TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {types.map((planType) => (
                <TableRow
                  key={planType.id}
                  hover
                  sx={{ "&:last-child td": { border: 0 } }}
                >
                  <TableCell>
                    <Typography
                      component={Link}
                      to={`/serving/planTypes/${planType.id}`}
                      sx={{
                        textDecoration: "none",
                        color: "primary.main",
                        fontWeight: 500,
                        "&:hover": { textDecoration: "underline" }
                      }}>
                      {planType.name}
                    </Typography>
                  </TableCell>
                  {canEdit && (
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.preventDefault();
                          handleEdit(planType);
                        }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
});
