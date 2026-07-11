import { useParams, Link } from "react-router-dom";
import { Box, Container, Typography } from "@mui/material";
import { GridOn as GridOnIcon, Assignment as AssignmentIcon } from "@mui/icons-material";
import { Loading, PageHeader, Locale } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { type GroupInterface } from "@churchapps/helpers";
import { type PlanTypeInterface } from "../../helpers";
import { PlanList } from "../components/PlanList";
import { PlanTypeGroups } from "../components/PlanTypeGroups";
import { Breadcrumbs, type BreadcrumbItem, HeaderSecondaryButton } from "../../components/ui";

export const PlanTypePage = () => {
  const params = useParams();

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
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <Typography variant="body1" color="text.secondary">
            {Locale.label("plans.planTypePage.notFound")}
          </Typography>
        </Box>
      </Container>
    );
  }

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: Locale.label("components.wrapper.plans") || "Plans", path: "/serving" },
    { label: planType.data.name || "" }
  ];

  return (
    <>
      <PageHeader
        icon={<AssignmentIcon />}
        title={planType.data.name || Locale.label("plans.planTypePage.planType")}
        subtitle={Locale.label("plans.planTypePage.subtitle")}
        breadcrumbs={<Breadcrumbs items={breadcrumbItems} showHome={true} />}
      >
        <HeaderSecondaryButton
          {...({
            component: Link,
            to: `/serving/overview?planTypeId=${planType.data.id}&ministryId=${planType.data.ministryId}`,
            startIcon: <GridOnIcon />
          } as any)}
        >
          {Locale.label("plans.planTypePage.overview")}
        </HeaderSecondaryButton>
      </PageHeader>

      <Box sx={{ p: 3 }}>
        <PlanList key="plans" ministry={ministry.data} planTypeId={planType.data.id} />
        <Box sx={{ mt: 4 }}>
          <PlanTypeGroups planTypeId={planType.data.id!} ministryId={planType.data.ministryId} />
        </Box>
      </Box>
    </>
  );
};
