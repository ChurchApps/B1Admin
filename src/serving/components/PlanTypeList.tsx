import React from "react";
import { Box, Link as MuiLink, Table, TableBody, TableCell, TableRow, TableHead, Typography } from "@mui/material";
import { Assignment as AssignmentIcon } from "@mui/icons-material";
import { Locale, Loading } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { type GroupInterface } from "@churchapps/helpers";
import { type PlanTypeInterface, hasPlansEditAccess } from "../../helpers";
import { PlanTypeEdit } from "./PlanTypeEdit";
import { AddBar, CardWithHeader, TextAction, VerbRow, srOnlySx, tableScrollSx } from "../../components/ui";
import { Link } from "react-router-dom";

interface Props {
  ministry: GroupInterface;
}

export const PlanTypeList = React.memo(({ ministry }: Props) => {
  const [showAdd, setShowAdd] = React.useState(false);
  const [editItem, setEditItem] = React.useState<PlanTypeInterface | null>(null);
  const hasPlansEdit = hasPlansEditAccess();

  const myMinistriesQuery = useQuery<GroupInterface[]>({
    queryKey: ["/groups/my/ministry", "MembershipApi"],
    enabled: !hasPlansEdit,
    placeholderData: []
  });

  const isMinistryMember = !hasPlansEdit && (myMinistriesQuery.data || []).some((g) => g.id === ministry.id);
  const canEdit = hasPlansEdit || isMinistryMember;

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
    <CardWithHeader title={Locale.label("plans.planTypeList.planTypes")} icon={<AssignmentIcon />} count={types.length}>
      {types.length === 0 ? (
        <Typography color="text.secondary">{Locale.label("plans.planTypeList.noPlanTypes")}</Typography>
      ) : (
        <Box sx={tableScrollSx} role="region" aria-label={Locale.label("plans.planTypeList.planTypes")} tabIndex={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{Locale.label("common.name")}</TableCell>
                <TableCell align="right"><Box component="span" sx={srOnlySx}>{Locale.label("plans.servingPage.actions", "Actions")}</Box></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {types.map((planType) => (
                <TableRow key={planType.id}>
                  <TableCell>
                    <MuiLink component={Link} to={`/serving/planTypes/${planType.id}`} underline="hover" sx={{ fontWeight: 600 }}>
                      {planType.name}
                    </MuiLink>
                  </TableCell>
                  <TableCell align="right">
                    <VerbRow sx={{ justifyContent: "flex-end" }}>
                      <TextAction small component={Link} to={`/serving/overview?planTypeId=${planType.id}&ministryId=${ministry.id}`}>
                        {Locale.label("plans.planTypePage.overview")}
                      </TextAction>
                      {canEdit && (
                        <TextAction small onClick={() => handleEdit(planType)} aria-label={Locale.label("common.edit")}>
                          {Locale.label("common.edit")}
                        </TextAction>
                      )}
                    </VerbRow>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
      {canEdit && (
        <AddBar sx={{ mt: 2, pt: 2 }}>
          <TextAction onClick={handleAdd} data-testid="add-plan-type-button">
            {Locale.label(types.length === 0 ? "plans.planTypeList.createPlanType" : "plans.planTypeList.addPlanType")}
          </TextAction>
        </AddBar>
      )}
    </CardWithHeader>
  );
});
