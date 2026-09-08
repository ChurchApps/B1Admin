import { useState } from "react";
import { useParams } from "react-router-dom";
import { Box } from "@mui/material";
import { Loading, Locale } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { type GroupInterface } from "@churchapps/helpers";
import { type PlanTypeInterface } from "../../helpers";
import { PlanList } from "../components/PlanList";
import { PlanTypeGroups } from "../components/PlanTypeGroups";
import { SignageFeedDialog } from "../components/SignageFeedDialog";
import { DirectoryPage, Verb, Verbs } from "../plated";

export const PlanTypePage = () => {
  const params = useParams();
  const [showSignageFeed, setShowSignageFeed] = useState(false);
  const [slice, setSlice] = useState<"plans" | "groups">("plans");

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
      <DirectoryPage title={Locale.label("plans.planTypePage.planType")}>
        <p>{Locale.label("plans.planTypePage.notFound")}</p>
      </DirectoryPage>
    );
  }

  return (
    <DirectoryPage title={planType.data.name || Locale.label("plans.planTypePage.planType")} lede={ministry.data.name}>
      <Verbs>
        <Verb to="/serving/plans">{Locale.label("components.wrapper.plans") || "Plans"}</Verb>
        <Verb to={`/serving/overview?planTypeId=${planType.data.id}&ministryId=${planType.data.ministryId}`}>{Locale.label("plans.planTypePage.overview")}</Verb>
        <Verb onClick={() => setShowSignageFeed(true)} testId="signage-feed-button">{Locale.label("plans.signageFeed.button") || "Digital Signage"}</Verb>
        <Verb onClick={() => setSlice(slice === "groups" ? "plans" : "groups")}>{Locale.label("plans.planTypeGroups.heading")}</Verb>
      </Verbs>
      {showSignageFeed && <SignageFeedDialog planTypeId={planType.data.id!} onClose={() => setShowSignageFeed(false)} />}

      {slice === "groups"
        ? <PlanTypeGroups planTypeId={planType.data.id!} ministryId={planType.data.ministryId} />
        : (
          <Box>
            <PlanList key="plans" ministry={ministry.data} planTypeId={planType.data.id} />
          </Box>
        )}
    </DirectoryPage>
  );
};
