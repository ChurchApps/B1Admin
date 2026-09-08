import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ApiHelper, DateHelper, Locale, Loading } from "@churchapps/apphelper";
import { type PlanInterface, type PlanTypeInterface } from "../../helpers";
import { type GroupInterface } from "@churchapps/helpers";
import { Assignment } from "../components/Assignment";
import { ServiceOrder } from "../components/ServiceOrder";
import { PlanEdit } from "../components/PlanEdit";
import { Eyebrow, Facts, PlatedRecord, RecordTitle, Verb, Verbs } from "../plated";

export const PlanPage = () => {
  const params = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = React.useState<PlanInterface | null>(null);
  const [ministry, setMinistry] = React.useState<GroupInterface | null>(null);
  const [planType, setPlanType] = React.useState<PlanTypeInterface | null>(null);
  const [allPlans, setAllPlans] = React.useState<PlanInterface[]>([]);
  const [slice, setSlice] = React.useState<"serving" | "edit">("serving");

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
      const plans = await ApiHelper.get("/plans/types/" + planData.planTypeId, "DoingApi");
      setAllPlans(plans || []);
    }
  }, [params.id]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  if (!plan) return <Loading />;

  const dateLabel = plan.serviceDate ? DateHelper.prettyDate(DateHelper.toDate(plan.serviceDate)) : "";
  const eyebrow = [ministry?.name, planType?.name].filter(Boolean).join(" · ");

  const handlePlanUpdated = () => {
    setSlice("serving");
    loadData();
  };

  return (
    <PlatedRecord
      who={(
        <>
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <RecordTitle>{plan.name || Locale.label("plans.planPage.servicePlan")}</RecordTitle>
          {dateLabel && <Facts>{dateLabel}</Facts>}
          <Verbs>
            <Verb onClick={() => setSlice(slice === "edit" ? "serving" : "edit")}>
              {slice === "edit" ? Locale.label("common.done") || "Done" : Locale.label("common.edit")}
            </Verb>
            <Verb onClick={() => window.open(`/serving/plans/print/${plan.id}`, "_blank")}>{Locale.label("common.print")}</Verb>
            {planType?.id && <Verb to={`/serving/planTypes/${planType.id}`}>{planType.name}</Verb>}
            {ministry && <Verb to="/serving/plans">{ministry.name}</Verb>}
          </Verbs>
          {plan.serviceOrder && <ServiceOrder plan={plan} onPlanUpdate={loadData} plated />}
        </>
      )}
      rest={
        slice === "edit"
          ? (
            <PlanEdit
              plan={plan}
              plans={allPlans}
              updatedFunction={async () => {
                try {
                  const p = await ApiHelper.get("/plans/" + params.id, "DoingApi");
                  if (!p?.id) {
                    navigate(planType?.id ? `/serving/planTypes/${planType.id}` : "/serving/plans");
                    return;
                  }
                  handlePlanUpdated();
                } catch {
                  navigate(planType?.id ? `/serving/planTypes/${planType.id}` : "/serving/plans");
                }
              }}
            />
          )
          : <Assignment plan={plan} plated />
      }
    />
  );
};
