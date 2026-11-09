import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ApiHelper, DateHelper, Locale } from "@churchapps/apphelper";
import { type PlanInterface, type PlanTypeInterface, hasPlansEditAccess } from "../../helpers";
import { type GroupInterface } from "@churchapps/helpers";
import { Alert, Box, Button, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { Assignment } from "../components/Assignment";
import { ServiceOrder } from "../components/ServiceOrder";
import { PlanEdit } from "../components/PlanEdit";
import { BackVerb, PageContainer, Surface, useRecordView } from "../../components/ui";
import { InRecordContext } from "../../components/ui/RecordLayout";
import { PlanHeader } from "./components/PlanHeader";
import { PlanOverview } from "./components/PlanOverview";

type Section = "" | "order" | "team";

// /serving/plans/:id is an overview; /order and /team are full-width subpages. ?view=edit swaps the overview for the details form.
export const PlanPage = () => {
  const params = useParams();
  const navigate = useNavigate();
  const requestedSection = params.section === "order" || params.section === "team" ? params.section : "";
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

  React.useEffect(() => { window.scrollTo({ top: 0 }); }, [requestedSection]);

  const editing = requestedSection !== "team" && (requestedSection === "" || !plan?.serviceOrder) && requestedView === "edit" && canEdit;

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

  // Plans with the order of service turned off have no /order page; fall back to the overview.
  const section: Section = requestedSection === "order" && !plan.serviceOrder ? "" : requestedSection;
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

  const dismissLessonTrimWarning = async () => {
    await ApiHelper.post("/plans", [{ ...plan, lessonTrimWarning: null }], "DoingApi");
    setPlan({ ...plan, lessonTrimWarning: null });
  };

  const subpageTitle = section === "order"
    ? Locale.label("plans.serviceOrder.orderOfService")
    : section === "team" ? Locale.label("plans.planPage.servingTeam", "Serving team") : undefined;

  let body: React.ReactNode;
  if (section === "order") {
    body = <Surface data-testid="plan-order-page"><ServiceOrder plan={plan} onPlanUpdate={loadData} /></Surface>;
  } else if (section === "team") {
    body = <Surface data-testid="plan-team-page"><Assignment plan={plan} /></Surface>;
  } else if (editing) {
    body = (
      <Surface data-testid="plan-record">
        <Box sx={{ mb: 3 }}><BackVerb name={planName} onClick={() => setView("")} data-testid="plan-edit-back" /></Box>
        <PlanEdit plan={plan} plans={allPlans} updatedFunction={handleEdited} />
      </Surface>
    );
  } else {
    body = <Box data-testid="plan-record"><PlanOverview plan={plan} canEdit={canEdit} onPlanChanged={loadData} /></Box>;
  }

  return (
    <PageContainer>
      <PlanHeader
        plan={plan}
        planName={planName}
        dateLabel={dateLabel}
        eyebrow={eyebrow}
        planType={planType}
        canEdit={canEdit}
        subpageTitle={subpageTitle}
        editing={editing}
        onEdit={section === "" ? () => setView(editing ? "" : "edit") : undefined}
      />
      {plan.lessonTrimWarning && canEdit && !editing && (
        <Alert severity="warning" sx={{ mb: { xs: 2, md: 2.5 } }} data-testid="lesson-trim-warning" action={<Button color="inherit" size="small" onClick={dismissLessonTrimWarning}>{Locale.label("plans.lessonTrim.dismiss")}</Button>}>
          {Locale.label("plans.lessonTrim.warningBanner").replace("{}", plan.lessonTrimWarning)}
        </Alert>
      )}
      <InRecordContext.Provider value={true}>{body}</InRecordContext.Provider>
    </PageContainer>
  );
};
