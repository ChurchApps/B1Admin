import React from "react";
import { useParams } from "react-router-dom";
import { ApiHelper, Locale, PageHeader } from "@churchapps/apphelper";
import { type PlanInterface, type PlanTypeInterface } from "../helpers";
import { type GroupInterface } from "@churchapps/helpers";
import { Assignment } from "./components/Assignment";
import { PlanNavigation } from "./components/PlanNavigation";
import { Box, Container, Typography } from "@mui/material";
import { Assignment as AssignmentIcon } from "@mui/icons-material";
import { ServiceOrder } from "./components/ServiceOrder";
import { Breadcrumbs } from "../components/ui";



export const PlanPage = () => {
  const params = useParams();
  const [plan, setPlan] = React.useState<PlanInterface>(null);
  const [ministry, setMinistry] = React.useState<GroupInterface>(null);
  const [planType, setPlanType] = React.useState<PlanTypeInterface>(null);
  const [selectedTab, setSelectedTab] = React.useState("assignments");

  const loadData = async () => {
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
  };

  React.useEffect(() => {
    loadData();
  }, [params.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const getCurrentTab = () => {
    if (selectedTab === "assignments") return <Assignment plan={plan} />;
    if (selectedTab === "order") return <ServiceOrder plan={plan} onPlanUpdate={loadData} />;
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

  const breadcrumbItems = [{ label: Locale.label("components.wrapper.plans") || "Plans", path: "/plans" }];

  if (ministry) {
    breadcrumbItems.push({ label: ministry.name, path: `/plans/ministries/${ministry.id}` });
  }

  if (planType) {
    breadcrumbItems.push({ label: planType.name, path: `/plans/types/${planType.id}` });
  }

  breadcrumbItems.push({ label: plan.name || Locale.label("plans.planPage.servicePlan") });

  return (
    <>
      <Box sx={{
        backgroundColor: "var(--c1l2)",
        color: "#FFF",
        position: 'relative',
        left: '50%',
        right: '50%',
        marginLeft: '-50vw',
        marginRight: '-50vw',
        width: '100vw',
        '--c1l2': '#568BDA',
        paddingX: { xs: 2, sm: 3, md: 4 },
        paddingTop: 1.5,
        paddingBottom: 0.5,
        zIndex: 1
      }}>
        <Breadcrumbs items={breadcrumbItems} showHome={true} />
      </Box>
      <Box sx={{ marginTop: '-1.5rem' }}>
        <PageHeader icon={<AssignmentIcon />} title={plan.name || Locale.label("plans.planPage.servicePlan")} subtitle={Locale.label("plans.planPage.subtitle")} />
      </Box>
      <PlanNavigation selectedTab={selectedTab} onTabChange={setSelectedTab} plan={plan} />

      {/* Tab Content */}
      <Box sx={{ p: 3 }}>{getCurrentTab()}</Box>
    </>
  );
};
