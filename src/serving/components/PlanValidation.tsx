import React, { useEffect } from "react";
import { ApiHelper, ArrayHelper, CommonEnvironmentHelper, DateHelper, DisplayBox, Locale, type PersonInterface, UserHelper } from "@churchapps/apphelper";
import { type AssignmentInterface, type BlockoutDateInterface, type PlanInterface, type PositionInterface, type TimeInterface } from "@churchapps/helpers";
import { type SchedulingPreferenceInterface } from "../../helpers";

interface Props {
  plan: PlanInterface;
  positions: PositionInterface[];
  assignments: AssignmentInterface[];
  people: PersonInterface[];
  times: TimeInterface[];
  blockoutDates: BlockoutDateInterface[];
  canEdit: boolean;
  onUpdate: () => void;
}

export const PlanValidation = (props: Props) => {
  const [errors, setErrors] = React.useState<JSX.Element[]>([]);
  const { canEdit } = props;
  const [plans, setPlans] = React.useState<PlanInterface[]>([]);
  const [planTimeConflicts, setPlanTimeConflicts] = React.useState<{ time: TimeInterface; overlapingTimes: TimeInterface[] }[]>([]);
  const [externalPositions, setExternalPositions] = React.useState<PositionInterface[]>();
  const [externalAssignments, setExternalAssignments] = React.useState<AssignmentInterface[]>();
  const [preferences, setPreferences] = React.useState<SchedulingPreferenceInterface[]>([]);
  const [monthCounts, setMonthCounts] = React.useState<{ personId: string; count: number }[]>([]);

  const validateBlockout = (issues: JSX.Element[]) => {
    const conflicts: { person: PersonInterface; blockout: BlockoutDateInterface }[] = [];
    props.people.forEach((person) => {
      const assignments: AssignmentInterface[] = ArrayHelper.getAll(props.assignments, "personId", person.id);
      const positionIds = ArrayHelper.getIds(assignments, "positionId");
      const positions: PositionInterface[] = ArrayHelper.getAllArray(props.positions, "id", positionIds);

      const times: TimeInterface[] = [];
      positions.forEach((p) => {
        const posTimes = props.times.filter((t) => t?.teams?.indexOf(p.categoryName) > -1);
        times.push(...posTimes);
      });

      const blockouts: BlockoutDateInterface[] = ArrayHelper.getAll(props.blockoutDates, "personId", person.id);
      blockouts.forEach((b) => {
        b.endDate = new Date(b.endDate);
        b.endDate.setHours(23, 59, 59, 999);
        let conflict = false;
        times.forEach((t) => {
          if (new Date(b.startDate) < new Date(t.endTime) && new Date(b.endDate) > new Date(t.startTime)) conflict = true;
        });
        if (conflict) conflicts.push({ person, blockout: b });
      });
    });

    conflicts.forEach((c) => {
      issues.push(
        <>
          <b>{c.person?.name?.display || Locale.label("person.unknown")}:</b> {Locale.label("plans.planValidation.blockCon")} {DateHelper.prettyDate(new Date(c.blockout.startDate))} {Locale.label("plans.planValidation.to")}{" "}
          {DateHelper.prettyDate(new Date(c.blockout.endDate))}.
        </>
      );
    });
  };

  const validatePoisitionsFilled = (issues: JSX.Element[]) => {
    props.positions.forEach((p) => {
      const assignments = props.assignments.filter((a) => a.positionId === p.id);
      if (assignments.length < p.count) {
        const needed = p.count - assignments.length;
        issues.push(
          <>
            <b>{p.name}:</b> {needed} {Locale.label("plans.planValidation.more")} {needed === 1 ? Locale.label("plans.planValidation.person") : Locale.label("plans.planValidation.ppl")}{" "}
            {Locale.label("plans.planValidation.needed")}
          </>
        );
      }
    });
  };

  const checkPersonTimeConflicts = (person: PersonInterface, issues: JSX.Element[]) => {
    const assignments = props.assignments.filter((a) => a.personId === person.id);
    const duties: { position: PositionInterface; times: TimeInterface[] }[] = [];
    assignments.forEach((a) => {
      const position = props.positions.find((p) => p.id === a.positionId);
      if (position) {
        const posTimes = props.times.filter((t) => t?.teams?.indexOf(position.categoryName) > -1);
        duties.push({ position, times: posTimes });
      }
    });

    for (let i = 0; i < duties.length; i++) {
      for (let j = i + 1; j < duties.length; j++) {
        const a = duties[i];
        const b = duties[j];
        a.times.forEach((at) => {
          b.times.forEach((bt) => {
            if (at.startTime < bt.endTime && at.endTime > bt.startTime) {
              issues.push(
                <>
                  <b>{person?.name?.display || Locale.label("person.unknown")}:</b> {Locale.label("plans.planValidation.timeCon")} {a.position.name} {Locale.label("plans.planValidation.and")} {b.position.name}{" "}
                  {Locale.label("plans.planValidation.during")} {at.displayName}.
                </>
              );
            }
          });
        });
      }
    }
  };

  const checkPlanTimeConflicts = (person: PersonInterface, issues: JSX.Element[]) => {
    if (props.assignments.length > 0) {
      const assignments = externalAssignments?.filter((ea) => ea.personId === person.id);
      const duties: { position: PositionInterface }[] = [];
      assignments?.forEach((a) => {
        const position = externalPositions.find((p) => p.id === a.positionId);
        if (position) duties.push({ position });
      });

      for (let i = 0; i < duties.length; i++) {
        const a = duties[i];
        const plan = plans.find((p) => p.id === a.position.planId);
        planTimeConflicts.forEach((tc) => {
          const filtered = tc.overlapingTimes.filter((ot) => a.position.planId === ot.planId && ot.teams?.indexOf(a.position.categoryName) > -1);
          if (filtered.length > 0) {
            issues.push(
              <>
                <hr />
                <b
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontStyle: "italic"
                  }}>
                  {plan.name} {Locale.label("plans.planValidation.cons")}
                </b>
              </>
            );
            filtered.forEach((f) => {
              issues.push(
                <>
                  <b>{person?.name?.display || Locale.label("person.unknown")}:</b> {Locale.label("plans.planValidation.timeCon2")} {a.position.name} {Locale.label("plans.planValidation.between")} {tc.time.displayName}{" "}
                  {Locale.label("plans.planValidation.and")} {f.displayName}
                </>
              );
            });
          }
        });
      }
    }
  };

  const validateTimeConflicts = (issues: JSX.Element[]) => {
    props.people.forEach((person) => {
      checkPersonTimeConflicts(person, issues);
      checkPlanTimeConflicts(person, issues);
    });
  };

  const matchesPreferredTime = (preferredTimes: string) => {
    const tokens = (preferredTimes || "").split(",").map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0);
    if (tokens.length === 0 || props.times.length === 0) return null;
    const candidates: string[] = [];
    props.times.forEach((t) => {
      if (t.displayName) candidates.push(t.displayName.toLowerCase());
      if (t.startTime) {
        const d = new Date(t.startTime);
        const h24 = d.getHours();
        const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
        const mm = d.getMinutes().toString().padStart(2, "0");
        const ampm = h24 < 12 ? "am" : "pm";
        candidates.push(`${h12}:${mm}`, `${h12}:${mm} ${ampm}`, `${h12}:${mm}${ampm}`, `${h24.toString().padStart(2, "0")}:${mm}`);
      }
    });
    return tokens.some((token) => candidates.some((c) => c.includes(token)));
  };

  const validatePreferences = (issues: JSX.Element[]) => {
    const assignedPeople = props.people.filter((person) => props.assignments.some((a) => a.personId === person.id && a.status !== "Declined"));
    assignedPeople.forEach((person) => {
      const pref = preferences.find((p) => p.personId === person.id);
      if (!pref) return;
      const name = person?.name?.display || Locale.label("person.unknown");
      const count = monthCounts.find((c) => c.personId === person.id)?.count || 0;
      if (pref.maxPerMonth && count > pref.maxPerMonth) {
        issues.push(
          <>
            <b>{name}:</b> {Locale.label("plans.planValidation.overMaxPerMonth") || "is scheduled"} {count} {Locale.label("plans.planValidation.timesThisMonth") || "times this month, over their preferred max of"} {pref.maxPerMonth}.
          </>
        );
      }
      if (matchesPreferredTime(pref.preferredTimes) === false) {
        issues.push(
          <>
            <b>{name}:</b> {Locale.label("plans.planValidation.prefTimeMismatch") || "prefers serving at"} {pref.preferredTimes}.
          </>
        );
      }
      if (pref.householdScheduling === "apart") {
        const partners = assignedPeople.filter((other) => other.id !== person.id && other.householdId && other.householdId === person.householdId);
        partners.forEach((other) => {
          issues.push(
            <>
              <b>{name}:</b> {Locale.label("plans.planValidation.householdApart") || "prefers not to serve the same day as"} {other?.name?.display || Locale.label("person.unknown")}.
            </>
          );
        });
      }
    });
  };

  const validate = () => {
    const result: JSX.Element[] = [];
    validatePoisitionsFilled(result);
    validateTimeConflicts(result);
    validateBlockout(result);
    validatePreferences(result);
    setErrors(result);
    return result.length === 0;
  };

  const loadPreferenceData = () => {
    const personIds = ArrayHelper.getUniqueValues(props.assignments, "personId").filter((id) => id);
    if (personIds.length === 0) {
      setPreferences([]);
      setMonthCounts([]);
      return;
    }
    ApiHelper.get("/schedulingPreferences/people?ids=" + personIds.join(","), "DoingApi").then((data: SchedulingPreferenceInterface[]) => setPreferences(data || []));
    if (props.plan?.serviceDate) {
      ApiHelper.get("/assignments/monthCounts?date=" + new Date(props.plan.serviceDate).toISOString().split("T")[0], "DoingApi").then((data: any[]) => setMonthCounts(data || []));
    }
  };

  const getAll = async () => {
    if (props.assignments.length > 0) {
      const data = await ApiHelper.get(`/times/all`, "DoingApi");
      if (data.length > 0) {
        let filteredTimes: any[] = [];
        let timeConflicts: any[] = [];
        for (const t of props.times) {
          const overlapingTimes = data.filter((d: TimeInterface) => d.startTime < t.endTime && d.endTime > t.startTime);
          const removedcurrentPlan = overlapingTimes.filter((ot: TimeInterface) => ot.planId !== props.plan.id);
          // ponytail: dedupe across loop iterations before accumulating
          filteredTimes = [...filteredTimes, ...removedcurrentPlan.filter((c) => !filteredTimes.includes(c))];
          timeConflicts = [...timeConflicts, { time: t, overlapingTimes: [...removedcurrentPlan] }];
        }
        setPlanTimeConflicts(timeConflicts);
        if (filteredTimes.length > 0) {
          const allPlans: PlanInterface[] = await ApiHelper.get("/plans", "DoingApi");
          setPlans(allPlans);
          const planIds = ArrayHelper.getIds(filteredTimes, "planId");
          const allPositions: PositionInterface[] = await ApiHelper.get("/positions/plan/ids?planIds=" + planIds, "DoingApi");
          setExternalPositions(allPositions);
          const allAssignments: AssignmentInterface[] = await ApiHelper.get("/assignments/plan/ids?planIds=" + planIds, "DoingApi");
          setExternalAssignments(allAssignments);
        }
      }
    } else {
      setPlans([]);
      setPlanTimeConflicts([]);
      setExternalAssignments([]);
      setExternalPositions([]);
    }
  };

  useEffect(() => {
    if (externalPositions?.length > 0 && externalAssignments?.length > 0) {
      validate();
    }
  }, [externalPositions, externalAssignments]);

  useEffect(() => {
    getAll();
    loadPreferenceData();
    validate();
  }, [props.assignments, props.positions, props.people]);

  useEffect(() => {
    validate();
  }, [preferences, monthCounts]);

  const getErrorList = () => {
    if (errors.length === 0) return <p>{Locale.label("plans.planValidation.valPlan")}</p>;
    else {
      const lines = errors.map((e, i) => <li key={i}>{e}</li>);
      return <ul>{lines}</ul>;
    }
  };

  const getPendingNotifications = () => {
    const pending: AssignmentInterface[] = [];
    props.assignments.forEach((a) => {
      if (!a.notified) pending.push(a);
    });
    return pending;
  };

  const notify = () => {
    const pending = getPendingNotifications();
    const promises: Promise<any>[] = [];
    pending.forEach((a) => {
      const position: PositionInterface = ArrayHelper.getOne(props.positions, "id", a.positionId);
      a.notified = new Date();
      const data: any = {
        peopleIds: [a.personId],
        contentType: "assignment",
        contentId: props.plan.id,
        message: Locale.label("plans.planValidation.volReq") + props.plan.name + " - " + position.name + "." + Locale.label("plans.planValidation.pleaseConfirm"),
        link: CommonEnvironmentHelper.B1Root.replace("{key}", UserHelper.currentUserChurch.church.subDomain) + "/mobile/plans/" + props.plan.id
      };
      promises.push(ApiHelper.post("/notifications/create", data, "MessagingApi"));
    });
    promises.push(ApiHelper.post("/assignments", pending, "DoingApi"));
    Promise.all(promises).then(props.onUpdate);
  };

  const publish = () => {
    const plan: PlanInterface = { ...props.plan, prepared: false };
    ApiHelper.post("/plans", [plan], "DoingApi").then(() => {
      const pending = getPendingNotifications();
      if (pending.length > 0) notify();
      else props.onUpdate();
    });
  };

  const getNotificationLink = () => {
    if (!canEdit) return null;

    const pending = getPendingNotifications();

    if (props.plan?.prepared) {
      return (
        <p>
          {Locale.label("plans.planValidation.penciledIn") || "Penciled in — volunteers can't see these assignments yet."}{" "}
          <button type="button" onClick={publish} data-testid="publish-plan-button" style={{ background: "none", border: 0, padding: 0, color: "var(--link)", cursor: "pointer" }}>
            {pending.length > 0
              ? (Locale.label("plans.planValidation.publishNotify") || "Publish & Notify") + " " + pending.length + " " + Locale.label("plans.planValidation.vol")
              : Locale.label("plans.planValidation.publish") || "Publish Plan"}
          </button>
        </p>
      );
    }

    if (pending.length === 0) return <p>{Locale.label("plans.planValidation.volNotif")}</p>;
    else {
      return (
        <p>
          <button type="button" onClick={notify} style={{ background: "none", border: 0, padding: 0, color: "var(--link)", cursor: "pointer" }}>
            {Locale.label("plans.planValidation.notify")} {pending.length} {Locale.label("plans.planValidation.vol")}
          </button>
        </p>
      );
    }
  };

  return (
    <>
      <DisplayBox headerText={Locale.label("plans.planValidation.val")} headerIcon="assignment">
        {getErrorList()}
        {getNotificationLink()}
      </DisplayBox>
    </>
  );
};
