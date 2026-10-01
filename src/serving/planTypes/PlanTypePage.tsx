import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Add as AddIcon, ArrowBack as BackIcon, ConnectedTv as SignageIcon } from "@mui/icons-material";
import { Box, Typography } from "@mui/material";
import { Loading, Locale } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { type GroupInterface } from "@churchapps/helpers";
import { type PlanTypeInterface, hasPlansEditAccess } from "../../helpers";
import { PlanList } from "../components/PlanList";
import { PlanTypeGroups } from "../components/PlanTypeGroups";
import { SignageFeedDialog } from "../components/SignageFeedDialog";
import { HeaderPrimaryButton, HeaderTextButton, PageContainer, PageHeader } from "../../components/ui";

export const PlanTypePage = () => {
  const params = useParams();
  const [showSignageFeed, setShowSignageFeed] = useState(false);
  const [addRequest, setAddRequest] = useState(0);
  const hasPlansEdit = hasPlansEditAccess();

  const planType = useQuery<PlanTypeInterface>({
    queryKey: [`/planTypes/${params.id}`, "DoingApi"],
    enabled: !!params.id
  });

  const ministry = useQuery<GroupInterface>({
    queryKey: [`/groups/${planType.data?.ministryId}`, "MembershipApi"],
    enabled: !!planType.data?.ministryId
  });

  const myMinistries = useQuery<GroupInterface[]>({
    queryKey: ["/groups/my/ministry", "MembershipApi"],
    enabled: !hasPlansEdit,
    placeholderData: []
  });
  const canEdit = hasPlansEdit || (myMinistries.data || []).some((g) => g.id === ministry.data?.id);

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
      <PageHeader title={planType.data.name || Locale.label("plans.planTypePage.planType")} subtitle={ministry.data.name}>
        <HeaderTextButton component={Link} to="/serving/plans" startIcon={<BackIcon />} data-testid="plan-type-plans-link">{Locale.label("components.wrapper.plans", "Plans")}</HeaderTextButton>
        <HeaderTextButton component={Link} to={`/serving/overview?planTypeId=${planType.data.id}&ministryId=${planType.data.ministryId}`} data-testid="plan-type-overview-link">
          {Locale.label("plans.planTypePage.overview")}
        </HeaderTextButton>
        <HeaderTextButton onClick={scrollToGroups} data-testid="plan-type-groups-link">{Locale.label("plans.planTypeGroups.heading")}</HeaderTextButton>
        <HeaderTextButton startIcon={<SignageIcon />} onClick={() => setShowSignageFeed(true)} data-testid="signage-feed-button">
          {Locale.label("plans.signageFeed.button", "Digital Signage")}
        </HeaderTextButton>
        {canEdit && (
          <HeaderPrimaryButton startIcon={<AddIcon />} onClick={() => setAddRequest((n) => n + 1)} data-testid="add-plan-button">
            {Locale.label("plans.planList.newPlan")}
          </HeaderPrimaryButton>
        )}
      </PageHeader>
      {showSignageFeed && <SignageFeedDialog planTypeId={planType.data.id!} onClose={() => setShowSignageFeed(false)} />}

      <PageContainer>
        <PlanList key="plans" ministry={ministry.data} planTypeId={planType.data.id} addRequest={addRequest} />
        <Box id="plan-type-groups" sx={{ mt: 4, scrollMarginTop: 80 }}>
          <PlanTypeGroups planTypeId={planType.data.id!} ministryId={planType.data.ministryId} />
        </Box>
      </PageContainer>
    </>
  );
};
