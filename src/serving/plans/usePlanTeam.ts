import React from "react";
import { ApiHelper, ArrayHelper } from "@churchapps/apphelper";
import {
  type AssignmentInterface,
  type BlockoutDateInterface,
  type PersonInterface,
  type PositionInterface,
  type TimeInterface
} from "@churchapps/helpers";

export interface PlanTeamData {
  positions: PositionInterface[];
  assignments: AssignmentInterface[];
  people: PersonInterface[];
  times: TimeInterface[];
  blockoutDates: BlockoutDateInterface[];
  loaded: boolean;
  reload: () => Promise<void>;
}

// Positions, assignments, people, times and blockouts for one plan: what the overview's team summary, times and validation read.
export function usePlanTeam(planId?: string): PlanTeamData {
  const [positions, setPositions] = React.useState<PositionInterface[]>([]);
  const [assignments, setAssignments] = React.useState<AssignmentInterface[]>([]);
  const [people, setPeople] = React.useState<PersonInterface[]>([]);
  const [times, setTimes] = React.useState<TimeInterface[]>([]);
  const [blockoutDates, setBlockoutDates] = React.useState<BlockoutDateInterface[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  const reload = React.useCallback(async () => {
    if (!planId) return;
    try {
      const [positionsData, assignmentsData, timesData, blockoutData]: [PositionInterface[], AssignmentInterface[], TimeInterface[], BlockoutDateInterface[]] = await Promise.all([
        ApiHelper.get("/positions/plan/" + planId, "DoingApi"),
        ApiHelper.get("/assignments/plan/" + planId, "DoingApi"),
        ApiHelper.get("/times/plan/" + planId, "DoingApi"),
        ApiHelper.get("/blockoutDates/upcoming", "DoingApi")
      ]);
      setPositions(positionsData || []);
      setAssignments(assignmentsData || []);
      setTimes(timesData || []);
      setBlockoutDates(blockoutData || []);
      const peopleIds = ArrayHelper.getUniqueValues(assignmentsData || [], "personId").filter((id: string) => id);
      setPeople(peopleIds.length > 0 ? (await ApiHelper.get("/people/ids?ids=" + peopleIds.join(","), "MembershipApi")) || [] : []);
    } finally {
      setLoaded(true);
    }
  }, [planId]);

  React.useEffect(() => { reload(); }, [reload]);

  return { positions, assignments, people, times, blockoutDates, loaded, reload };
}
