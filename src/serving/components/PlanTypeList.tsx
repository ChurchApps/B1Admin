import React from "react";
import { Box, Button } from "@mui/material";
import { Locale, Loading } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { type GroupInterface } from "@churchapps/helpers";
import { type PlanTypeInterface, hasPlansEditAccess } from "../../helpers";
import { PlanTypeEdit } from "./PlanTypeEdit";
import { Link } from "react-router-dom";
import { AddBlock, SectionLabel, Verb, platedColor } from "../plated";

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
    <Box>
      <SectionLabel sx={{ mt: 0 }}>{Locale.label("plans.planTypeList.planTypes")}</SectionLabel>
      {types.length === 0 && (
        <p style={{ color: platedColor.mute }}>{Locale.label("plans.planTypeList.noPlanTypes")}</p>
      )}
      {types.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {types.map((planType) => (
              <tr key={planType.id} style={{ borderTop: `1px solid ${platedColor.line}` }}>
                <td style={{ padding: "11px 0" }}>
                  <Link to={`/serving/planTypes/${planType.id}`} style={{ color: platedColor.ink, fontWeight: 650, fontSize: "1.12rem", textDecoration: "none" }}>
                    {planType.name}
                  </Link>
                </td>
                <td style={{ padding: "11px 0", textAlign: "right" }}>
                  <span style={{ display: "inline-flex", gap: 14 }}>
                    <Verb to={`/serving/overview?planTypeId=${planType.id}&ministryId=${ministry.id}`}>{Locale.label("plans.planTypePage.overview")}</Verb>
                    {canEdit && <Verb onClick={() => handleEdit(planType)}>{Locale.label("common.edit")}</Verb>}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {canEdit && (
        <AddBlock title={Locale.label("plans.planTypeList.addPlanType")}>
          <Button onClick={handleAdd} sx={{ color: platedColor.accent, fontWeight: 600, textTransform: "none" }}>
            {Locale.label("plans.planTypeList.addPlanType")}
          </Button>
        </AddBlock>
      )}
    </Box>
  );
});
