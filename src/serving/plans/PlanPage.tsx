import React from "react";
import { useParams } from "react-router-dom";
import { ApiHelper, Locale, PageHeader } from "@churchapps/apphelper";
import { Assignment as AssignmentIcon } from "@mui/icons-material";
import { type PlanInterface, type PlanTypeInterface } from "../../helpers";
import { type GroupInterface } from "@churchapps/helpers";
import { Assignment } from "../components/Assignment";
import { PlanNavigation } from "../components/PlanNavigation";
import { Box, Container, Typography } from "@mui/material";
import { ServiceOrder } from "../components/ServiceOrder";
import { Breadcrumbs, type BreadcrumbItem } from "../../components/ui";

export const PlanPage = () => {
  const params = useParams();
  const [plan, setPlan] = React.useState<PlanInterface | null>(null);
  const [, setMinistry] = React.useState<GroupInterface | null>(null);
  const [planType, setPlanType] = React.useState<PlanTypeInterface | null>(null);
  const [selectedTab, setSelectedTab] = React.useState("assignments");

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

  const getCurrentTab = () => {
    if (selectedTab === "assignments") return <Assignment plan={plan!} />;
    if (selectedTab === "order") return <ServiceOrder plan={plan!} onPlanUpdate={loadData} />;
    return null;
  };

  if (!plan) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <Typography variant="body1" color="text.secondary">
            {Locale.label("plans.planPage.loadingPlan")}
          </Typography>
        </Box>
      </Container>
    );
  }

  const breadcrumbItems: BreadcrumbItem[] = [{ label: Locale.label("components.wrapper.plans") || "Plans", path: "/serving" }];

  if (planType) {
    breadcrumbItems.push({ label: planType.name || "", path: `/serving/planTypes/${planType.id}` });
  }

  breadcrumbItems.push({ label: plan.name || Locale.label("plans.planPage.servicePlan") });

  return (
    <>
      <PageHeader
        icon={<AssignmentIcon />}
        title={plan.name || Locale.label("plans.planPage.servicePlan")}
        subtitle={Locale.label("plans.planPage.subtitle")}
        breadcrumbs={<Breadcrumbs items={breadcrumbItems} showHome={true} />}
        tabs={<PlanNavigation selectedTab={selectedTab} onTabChange={setSelectedTab} plan={plan} onHeader />}
      />

      <Box sx={{ p: 3 }}>{getCurrentTab()}</Box>
    </>
  );
};
