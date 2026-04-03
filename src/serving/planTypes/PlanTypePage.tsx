import React from "react";
import { useParams, Link } from "react-router-dom";
import { Box, Button, Container, Typography } from "@mui/material";
import { GridOn as GridOnIcon } from "@mui/icons-material";
import { Loading, PageHeader, Locale } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { type GroupInterface } from "@churchapps/helpers";
import { type PlanTypeInterface } from "../../helpers";
import { PlanList } from "../components/PlanList";
import { Breadcrumbs } from "../../components/ui";

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

  const breadcrumbItems = [
    { label: Locale.label("components.wrapper.plans") || "Plans", path: "/serving" },
    { label: planType.data.name }
  ];

  return (
    <>
      <Box sx={{ position: "relative", "& #page-header > div": { paddingTop: "5.5rem !important" } }}>
        <PageHeader
          title={planType.data.name || Locale.label("plans.planTypePage.planType")}
          subtitle={Locale.label("plans.planTypePage.subtitle")}
        >
          <Button
            component={Link}
            to={`/serving/overview?planTypeId=${planType.data.id}&ministryId=${planType.data.ministryId}`}
            variant="outlined"
            startIcon={<GridOnIcon />}
            sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.5)", "&:hover": { borderColor: "#FFF", backgroundColor: "rgba(255,255,255,0.1)" } }}
          >
            Overview
          </Button>
        </PageHeader>
        <Box sx={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100vw",
          zIndex: 2,
          paddingTop: 1.5,
        }}>
          <Container maxWidth="xl">
            <Breadcrumbs items={breadcrumbItems} showHome={true} />
          </Container>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ p: 3 }}>
        <PlanList key="plans" ministry={ministry.data} planTypeId={planType.data.id} />
      </Box>
    </>
  );
};
