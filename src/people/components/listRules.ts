import { type GroupInterface, type SearchCondition } from "@churchapps/helpers";
import { type ActiveFilter } from "./AdvancedPeopleSearch";

// Mirrors the MembershipApi rules-tree model: provider-scoped conditions a saved List
// stores instead of resolved person-id snapshots, so cross-product filters
// (donations, attendance, groups, custom fields) stay live when the list re-runs.
interface ListRuleCondition {
  provider: "person" | "group" | "form" | "field" | "giving" | "attendance" | "serving" | "list";
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

// Only standard groups carry a human category; a team's categoryName holds its ministry's group id.
const isStandardGroup = (g: GroupInterface) => (g.tags || "").split(",").includes("standard");

export const getGroupCategories = (groups: GroupInterface[]): string[] =>
  Array.from(new Set(groups.filter((g) => isStandardGroup(g) && g.categoryName).map((g) => g.categoryName as string))).sort((a, b) => a.localeCompare(b));

export const getGroupIdsForCategory = (groups: GroupInterface[], categoryName: string): string[] =>
  groups.filter((g) => isStandardGroup(g) && g.categoryName === categoryName).map((g) => g.id || "").filter(Boolean);

// Donation operators: "has donated" and "has not donated", each to any fund or to one fund.
export const isNotDonatedOperator = (operator: string) => operator === "notDonatedToAny" || operator === "notDonatedTo";
export const isAnyFundOperator = (operator: string) => operator === "donatedToAny" || operator === "notDonatedToAny";

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

// A category expands to its groups at save time: "is in" any of them, or "is not in" all of them.
const convertGroupCategory = (filter: ActiveFilter, groups: GroupInterface[]): ListRuleGroup | null => {
  const notIn = filter.operator === "notIn";
  const conditions = getGroupIdsForCategory(groups, filter.value).map((id): ListRuleCondition => ({ provider: "group", field: "memberOf", operator: notIn ? "notIn" : "in", entityId: id }));
  // An empty "all" group matches nobody, so excluding an empty category must add no rule at all.
  if (notIn && conditions.length === 0) return null;
  return { match: notIn ? "all" : "any", conditions };
};

const convertFilter = (filter: ActiveFilter): ListRuleCondition | null => {
  if (!filter.value || filter.value.trim() === "") return null;
  switch (filter.field) {
    case "groupMember":
      return { provider: "group", field: "memberOf", operator: filter.operator === "notIn" ? "notIn" : "in", entityId: filter.value };
    case "memberDonations": {
      const [entity, range] = parseComplexValue(filter.value);
      const condition: ListRuleCondition = { provider: "giving", field: "donated", from: range.from, to: range.to };
      if (!isAnyFundOperator(filter.operator) && entity.value && entity.value !== "any") condition.entityId = entity.value;
      if (isNotDonatedOperator(filter.operator)) condition.operator = "notIn";
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
      if (filter.field.startsWith("personField_")) {
        return { provider: "field", entityId: filter.field.replace("personField_", ""), operator: filter.operator, value: filter.value };
      }
      if (filter.field.startsWith("customField_")) {
        return { provider: "form", field: "answer", entityId: filter.field.replace("customField_", ""), operator: filter.operator, value: filter.value };
      }
      return { provider: "person", field: filter.field, operator: filter.operator, value: filter.value };
  }
};

export const buildRulesFromCriteria = (criteria: Record<string, ActiveFilter> | SearchCondition[], match: "all" | "any" | "none" = "all", groups: GroupInterface[] = []): ListRuleGroup => {
  const conditions: ListRuleCondition[] = [];
  const subGroups: ListRuleGroup[] = [];
  if (Array.isArray(criteria)) {
    criteria.forEach((c) => conditions.push({ provider: "person", field: c.field, operator: c.operator, value: c.value }));
  } else {
    Object.values(criteria).forEach((filter) => {
      if (filter.field === "groupCategory") {
        const subGroup = filter.value && filter.value.trim() !== "" ? convertGroupCategory(filter, groups) : null;
        if (subGroup) subGroups.push(subGroup);
        return;
      }
      const condition = convertFilter(filter);
      if (condition) conditions.push(condition);
    });
  }
  return subGroups.length > 0 ? { match, conditions, groups: subGroups } : { match, conditions };
};
