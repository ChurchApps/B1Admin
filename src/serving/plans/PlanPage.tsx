import React from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { ApiHelper, DateHelper, Locale } from "@churchapps/apphelper";
import { type PlanInterface, type PlanTypeInterface, hasPlansEditAccess } from "../../helpers";
import { type GroupInterface } from "@churchapps/helpers";
import { Box, Button, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { Assignment } from "../components/Assignment";
import { ServiceOrder } from "../components/ServiceOrder";
import { PlanEdit } from "../components/PlanEdit";
import { BackVerb, PageContainer, RecordLayout, TextAction, eyebrowSx, useRecordView, RecordActions } from "../../components/ui";

const SERVING_VIEWS = ["notes", "times"];

export const PlanPage = () => {
  const params = useParams();
  const navigate = useNavigate();
  const { view: requestedView, setView } = useRecordView("view", { scrollToTop: false });
  const [plan, setPlan] = React.useState<PlanInterface | null>(null);
  const [ministry, setMinistry] = React.useState<GroupInterface | null>(null);
  const [planType, setPlanType] = React.useState<PlanTypeInterface | null>(null);
  const [allPlans, setAllPlans] = React.useState<PlanInterface[]>([]);
  const hasPlansEdit = hasPlansEditAccess();

  const myMinistriesQuery = useQuery<GroupInterface[]>({
    queryKey: ["/groups/my/ministry", "MembershipApi"],
    enabled: !hasPlansEdit && !!plan?.ministryId,
    placeholderData: []
  });
  const canEdit = hasPlansEdit || (!!plan?.ministryId && (myMinistriesQuery.data || []).some((g) => g.id === plan.ministryId));

  const loadData = React.useCallback(async () => {
    const planData = await ApiHelper.get("/plans/" + params.id, "DoingApi");
    setPlan(planData);

    if (planData.ministryId) {
      const ministryData = await ApiHelper.get("/groups/" + planData.ministryId, "MembershipApi");
      setMinistry(ministryData);
    }

    if (planData.planTypeId) {
      const planTypeData = await ApiHelper.get("/planTypes/" + planData.planTypeId, "DoingApi");
      setPlanType(planTypeData);
    }
  }, [params.id]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const view = requestedView === "edit" ? (canEdit ? "edit" : "") : SERVING_VIEWS.includes(requestedView) ? requestedView : "";
  const editing = view === "edit";

  React.useEffect(() => {
    if (!editing || !plan?.planTypeId) return;
    ApiHelper.get("/plans/types/" + plan.planTypeId, "DoingApi").then((data: PlanInterface[]) => setAllPlans(data || []));
  }, [editing, plan?.planTypeId]);

  if (!plan) {
    return (
      <PageContainer>
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <Typography variant="body1" color="text.secondary">
            {Locale.label("plans.planPage.loadingPlan")}
          </Typography>
        </Box>
      </PageContainer>
    );
  }

  const planName = plan.name || Locale.label("plans.planPage.servicePlan");
  const eyebrow = [ministry?.name, planType?.name].filter(Boolean).join(" · ");
  const dateLabel = plan.serviceDate ? DateHelper.prettyDate(DateHelper.toDate(plan.serviceDate)) : "";
  const upPath = planType?.id ? `/serving/planTypes/${planType.id}` : "/serving/plans";

  const handleEdited = async () => {
    try {
      const p: PlanInterface = await ApiHelper.get("/plans/" + params.id, "DoingApi");
      if (!p?.id) { navigate(upPath); return; }
      setView("");
      loadData();
    } catch {
      navigate(upPath);
    }
  };

  const identity = (
    <Box component="aside" data-testid="plan-identity" sx={{ minWidth: 0 }}>
      {eyebrow && <Typography component="p" sx={{ ...eyebrowSx, mb: 1 }}>{eyebrow}</Typography>}
      <Typography id="page-header-title" variant="h1" component="h1" sx={{ overflowWrap: "anywhere" }}>{planName}</Typography>
      {dateLabel && <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>{dateLabel}</Typography>}
      <RecordActions
        sx={{ mt: 2 }}
        buttons={<>
          {canEdit && (
            <Button variant="contained" onClick={() => setView(editing ? "" : "edit")} data-testid="edit-plan-button">
              {editing ? Locale.label("common.done") : Locale.label("common.edit")}
            </Button>
          )}
          <Button variant="outlined" href={`/serving/plans/print/${plan.id}`} target="_blank" rel="noopener" data-testid="print-plan-link">{Locale.label("common.print")}</Button>
        </>}>
        {planType?.id && <TextAction small to={`/serving/planTypes/${planType.id}`} component={RouterLink}>{planType.name}</TextAction>}
        <TextAction small to="/serving/plans" component={RouterLink} data-testid="plan-plans-link">{Locale.label("plans.planList.plans")}</TextAction>
      </RecordActions>
    </Box>
  );

  return (
    <PageContainer>
      <RecordLayout identity={identity} spacing={editing ? 3 : 5} data-testid="plan-record">
        {editing
          ? (
            <>
              <Box><BackVerb name={planName} onClick={() => setView("")} data-testid="plan-edit-back" /></Box>
              <PlanEdit plan={plan} plans={allPlans} updatedFunction={handleEdited} />
            </>
          )
          : (
            <>
              {plan.serviceOrder && <ServiceOrder plan={plan} onPlanUpdate={loadData} />}
              <Assignment plan={plan} view={view} onViewChange={setView} />
            </>
          )}
      </RecordLayout>
    </PageContainer>
  );
};
