import { type SearchCondition } from "@churchapps/helpers";
import { type ActiveFilter } from "./AdvancedPeopleSearch";

// Mirrors the MembershipApi rules-tree model: provider-scoped conditions a saved List
// stores instead of resolved person-id snapshots, so cross-product filters
// (donations, attendance, groups, custom fields) stay live when the list re-runs.
export interface ListRuleCondition {
  provider: "person" | "group" | "form" | "giving" | "attendance" | "serving" | "list";
  field?: string;
  operator?: string;
  value?: string;
  entityId?: string;
  entityType?: string;
  daysAgo?: number;
  from?: string;
  to?: string;
}

export interface ListRuleGroup {
  match: "all" | "any" | "none";
  conditions?: ListRuleCondition[];
  groups?: ListRuleGroup[];
}

const attendanceTypeByOperator: Record<string, string> = {
  attendedCampus: "campus",
  attendedService: "service",
  attendedServiceTime: "serviceTime",
  attendedGroup: "group"
};

const parseComplexValue = (value: string): [{ value?: string }, { from?: string; to?: string }] => {
  try {
    const parsed = JSON.parse(value);
    return [parsed?.[0] ?? {}, parsed?.[1] ?? {}];
  } catch {
    return [{}, {}];
  }
};

const convertFilter = (filter: ActiveFilter): ListRuleCondition | null => {
  if (!filter.value || filter.value.trim() === "") return null;
  switch (filter.field) {
    case "groupMember":
      return { provider: "group", field: "memberOf", operator: filter.operator === "notIn" ? "notIn" : "in", entityId: filter.value };
    case "memberDonations": {
      const [entity, range] = parseComplexValue(filter.value);
      const condition: ListRuleCondition = { provider: "giving", field: "donated", from: range.from, to: range.to };
      if (filter.operator === "donatedTo" && entity.value && entity.value !== "any") condition.entityId = entity.value;
      return condition;
    }
    case "memberAttendance": {
      const [entity, range] = parseComplexValue(filter.value);
      const condition: ListRuleCondition = { provider: "attendance", field: "attended", from: range.from, to: range.to };
      const entityType = attendanceTypeByOperator[filter.operator];
      if (entityType && entity.value && entity.value !== "any") {
        condition.entityType = entityType;
        condition.entityId = entity.value;
      }
      return condition;
    }
    default:
      if (filter.field.startsWith("customField_")) {
        return { provider: "form", field: "answer", entityId: filter.field.replace("customField_", ""), operator: filter.operator, value: filter.value };
      }
      return { provider: "person", field: filter.field, operator: filter.operator, value: filter.value };
  }
};

// Converts the UI's saved criteria (advanced filter map or flat condition array)
// into the server-evaluable rules tree.
export const buildRulesFromCriteria = (criteria: Record<string, ActiveFilter> | SearchCondition[], match: "all" | "any" | "none" = "all"): ListRuleGroup => {
  const conditions: ListRuleCondition[] = [];
  if (Array.isArray(criteria)) {
    criteria.forEach((c) => conditions.push({ provider: "person", field: c.field, operator: c.operator, value: c.value }));
  } else {
    Object.values(criteria).forEach((filter) => {
      const condition = convertFilter(filter);
      if (condition) conditions.push(condition);
    });
  }
  return { match, conditions };
};
