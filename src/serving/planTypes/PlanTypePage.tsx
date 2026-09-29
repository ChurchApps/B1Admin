import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { Loading, Locale } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { type GroupInterface } from "@churchapps/helpers";
import { type PlanTypeInterface } from "../../helpers";
import { PlanList } from "../components/PlanList";
import { PlanTypeGroups } from "../components/PlanTypeGroups";
import { SignageFeedDialog } from "../components/SignageFeedDialog";
import { PageContainer, PageHeader, TextAction, VerbRow } from "../../components/ui";

export const PlanTypePage = () => {
  const params = useParams();
  const [showSignageFeed, setShowSignageFeed] = useState(false);

  const planType = useQuery<PlanTypeInterface>({
    queryKey: [`/planTypes/${params.id}`, "DoingApi"],
    enabled: !!params.id
  });

  const ministry = useQuery<GroupInterface>({
    queryKey: [`/groups/${planType.data?.ministryId}`, "MembershipApi"],
    enabled: !!planType.data?.ministryId
  });

  if (planType.isLoading || ministry.isLoading) return <Loading />;

  if (!planType.data || !ministry.data) {
    return (
      <PageContainer>
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <Typography variant="body1" color="text.secondary">
            {Locale.label("plans.planTypePage.notFound")}
          </Typography>
        </Box>
      </PageContainer>
    );
  }

  const scrollToGroups = () => document.getElementById("plan-type-groups")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      <PageHeader title={planType.data.name || Locale.label("plans.planTypePage.planType")} subtitle={ministry.data.name} />
      {showSignageFeed && <SignageFeedDialog planTypeId={planType.data.id!} onClose={() => setShowSignageFeed(false)} />}

      <PageContainer>
        <VerbRow sx={{ mb: 3, typography: "body1" }}>
          <TextAction component={Link} to="/serving/plans" data-testid="plan-type-plans-link">{"← " + Locale.label("components.wrapper.plans", "Plans")}</TextAction>
          <TextAction component={Link} to={`/serving/overview?planTypeId=${planType.data.id}&ministryId=${planType.data.ministryId}`} data-testid="plan-type-overview-link">
            {Locale.label("plans.planTypePage.overview")}
          </TextAction>
          <TextAction onClick={() => setShowSignageFeed(true)} data-testid="signage-feed-button">
            {Locale.label("plans.signageFeed.button", "Digital Signage")}
          </TextAction>
          <TextAction onClick={scrollToGroups} data-testid="plan-type-groups-link">{Locale.label("plans.planTypeGroups.heading")}</TextAction>
        </VerbRow>
        <PlanList key="plans" ministry={ministry.data} planTypeId={planType.data.id} />
        <Box id="plan-type-groups" sx={{ mt: 4, scrollMarginTop: 80 }}>
          <PlanTypeGroups planTypeId={planType.data.id!} ministryId={planType.data.ministryId} />
        </Box>
      </PageContainer>
    </>
  );
};
