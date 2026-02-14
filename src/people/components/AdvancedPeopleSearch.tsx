import React, { memo, useCallback, useState, useMemo, useEffect, useRef } from "react";
import { B1AdminPersonHelper } from ".";
import { type GroupMemberInterface, type SearchCondition, type GroupInterface, type CampusInterface, type ServiceInterface, type ServiceTimeInterface, type QuestionInterface, type FormSubmissionInterface } from "@churchapps/helpers";
import { ArrayHelper, InputBox, ApiHelper, Locale, DateHelper, Permissions } from "@churchapps/apphelper";
import { type PersonInterface, type FundDonationInterface, type FundInterface } from "@churchapps/helpers";
import {
  Button,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  alpha
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  Cake as CakeIcon,
  Email as EmailIcon,
  Group as GroupIcon,
  EventAvailable as AttendanceIcon,
  Assignment as CustomFieldIcon
} from "@mui/icons-material";

interface Props {
  updateSearchResults: (people: PersonInterface[]) => void;
  toggleFunction?: () => void;
  updatedFunction?: () => void;
  embedded?: boolean;
}

interface FilterField {
  key: string;
  label: string;
  type: "text" | "select" | "number" | "date" | "complex";
  operators?: string[];
  options?: Array<{ value: string; label: string }>;
  icon?: React.ReactNode;
}

interface ActiveFilter {
  field: string;
  operator: string;
  value: string;
}

interface ComplexFilterConfig {
  type: "donation" | "attendance";
  operator: string;
  entityValue: string;
  entityText: string;
  fromDate: string;
  toDate: string;
}

// Reusable style objects
const styles = {
  inputCommon: {
    "& .MuiInputBase-input": { fontSize: "0.8125rem", py: 0.5, px: 1 },
    "& .MuiSelect-select": { fontSize: "0.8125rem", py: 0.5, px: 1 },
    "& .MuiInputBase-root": { minHeight: 32 }
  },
  operatorSelect: {
    minWidth: 70,
    fontSize: "0.8125rem",
    "& .MuiSelect-select": { py: 0.5, px: 1 },
    "& .MuiInputBase-root": { minHeight: 32 }
  },
  menuItem: { fontSize: "0.875rem" },
  activeFiltersPaper: {
    p: 1.5,
    mb: 2,
    bgcolor: (theme: any) => alpha(theme.palette.primary.main, 0.05),
    borderRadius: 1
  },
  filterChip: {
    height: 24,
    fontSize: "0.75rem"
  },
  categoryChip: {
    height: 20,
    minWidth: 20,
    "& .MuiChip-label": { px: 0.75, fontSize: "0.7rem", fontWeight: 600 }
  },
  accordion: {
    mb: 1,
    "&:before": { display: "none" },
    borderRadius: "4px !important",
    overflow: "hidden",
    border: "1px solid",
    borderColor: "divider"
  },
  accordionSummary: {
    bgcolor: (theme: any) => alpha(theme.palette.primary.main, 0.02),
    minHeight: 42,
    "&.Mui-expanded": {
      minHeight: 42,
      borderBottom: 1,
      borderColor: "divider"
    },
    py: 0
  },
  accordionDetails: {
    p: 1,
    pt: 0.5
  },
  filterRow: {
    py: 0.75,
    px: 0.5,
    borderRadius: 0.5
  },
  filterRowActive: (theme: any) => ({ bgcolor: alpha(theme.palette.primary.main, 0.03) }),
  checkbox: { p: 0.5 },
  filterLabel: {
    fontSize: "0.8125rem",
    flex: 1
  },
  complexButton: {
    textTransform: "none",
    justifyContent: "flex-start",
    fontSize: "0.8125rem",
    py: 0.5
  }
};

export const AdvancedPeopleSearch = memo(function AdvancedPeopleSearch(props: Props) {
  const [activeFilters, setActiveFilters] = useState<Record<string, ActiveFilter>>({});
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["names"]);
  const [complexFilterDialog, setComplexFilterDialog] = useState<{ open: boolean; field: string | null }>({ open: false, field: null });
  const [complexConfig, setComplexConfig] = useState<ComplexFilterConfig | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Lazy-loaded options
  const [groups, setGroups] = useState<GroupInterface[]>([]);
  const [funds, setFunds] = useState<FundInterface[]>([]);
  const [campuses, setCampuses] = useState<CampusInterface[]>([]);
  const [services, setServices] = useState<ServiceInterface[]>([]);
  const [serviceTimes, setServiceTimes] = useState<ServiceTimeInterface[]>([]);
  const [customFieldQuestions, setCustomFieldQuestions] = useState<QuestionInterface[]>([]);
  const [loadedCategories, setLoadedCategories] = useState<string[]>([]);


  const filterCategories = useMemo(() => {
    const categories: Record<string, FilterField[]> = {
      names: [
        { key: "firstName", label: Locale.label("person.firstName"), type: "text", operators: ["contains", "equals", "startsWith", "endsWith"] },
        { key: "lastName", label: Locale.label("person.lastName"), type: "text", operators: ["contains", "equals", "startsWith", "endsWith"] },
        { key: "middleName", label: Locale.label("person.middleName"), type: "text", operators: ["contains", "equals", "startsWith", "endsWith"] },
        { key: "nickName", label: Locale.label("person.nickName"), type: "text", operators: ["contains", "equals", "startsWith", "endsWith"] },
        { key: "prefix", label: Locale.label("person.prefix"), type: "text", operators: ["contains", "equals"] },
        { key: "suffix", label: Locale.label("person.suffix"), type: "text", operators: ["contains", "equals"] }
      ],
      demographics: [
        {
          key: "gender",
          label: Locale.label("person.gender"),
          type: "select",
          operators: ["equals", "notEquals"],
          options: [
            { value: "Unspecified", label: Locale.label("person.unspecified") },
            { value: "Male", label: Locale.label("person.male") },
            { value: "Female", label: Locale.label("person.female") }
          ]
        },
        { key: "age", label: Locale.label("person.age"), type: "number", operators: ["equals", "greaterThan", "greaterThanEqual", "lessThan", "lessThanEqual"] },
        { key: "birthDate", label: Locale.label("person.birthDate"), type: "date", operators: ["equals", "greaterThan", "lessThan"] },
        {
          key: "birthMonth",
          label: Locale.label("people.editCondition.bMonth"),
          type: "select",
          operators: ["equals"],
          options: [
            { value: "1", label: Locale.label("month.jan") },
            { value: "2", label: Locale.label("month.feb") },
            { value: "3", label: Locale.label("month.mar") },
            { value: "4", label: Locale.label("month.apr") },
            { value: "5", label: Locale.label("month.may") },
            { value: "6", label: Locale.label("month.june") },
            { value: "7", label: Locale.label("month.july") },
            { value: "8", label: Locale.label("month.aug") },
            { value: "9", label: Locale.label("month.sep") },
            { value: "10", label: Locale.label("month.oct") },
            { value: "11", label: Locale.label("month.nov") },
            { value: "12", label: Locale.label("month.dec") }
          ]
        },
        {
          key: "maritalStatus",
          label: Locale.label("person.maritalStatus"),
          type: "select",
          operators: ["equals", "notEquals"],
          options: [
            { value: "Unknown", label: Locale.label("person.unknown") },
            { value: "Single", label: Locale.label("person.single") },
            { value: "Married", label: Locale.label("person.married") },
            { value: "Divorced", label: Locale.label("person.divorced") },
            { value: "Widowed", label: Locale.label("person.widowed") }
          ]
        },
        { key: "anniversary", label: Locale.label("person.anniversary"), type: "date", operators: ["equals", "greaterThan", "lessThan"] },
        {
          key: "anniversaryMonth",
          label: Locale.label("people.editCondition.anniMonth"),
          type: "select",
          operators: ["equals"],
          options: [
            { value: "1", label: Locale.label("month.jan") },
            { value: "2", label: Locale.label("month.feb") },
            { value: "3", label: Locale.label("month.mar") },
            { value: "4", label: Locale.label("month.apr") },
            { value: "5", label: Locale.label("month.may") },
            { value: "6", label: Locale.label("month.june") },
            { value: "7", label: Locale.label("month.july") },
            { value: "8", label: Locale.label("month.aug") },
            { value: "9", label: Locale.label("month.sep") },
            { value: "10", label: Locale.label("month.oct") },
            { value: "11", label: Locale.label("month.nov") },
            { value: "12", label: Locale.label("month.dec") }
          ]
        },
        { key: "yearsMarried", label: Locale.label("people.editCondition.marYears"), type: "number", operators: ["equals", "greaterThan", "greaterThanEqual", "lessThan", "lessThanEqual"] }
      ],
      contact: [
        { key: "email", label: Locale.label("person.email"), type: "text", operators: ["contains", "equals", "startsWith", "endsWith"] },
        { key: "phone", label: Locale.label("person.phone"), type: "text", operators: ["contains", "equals", "startsWith", "endsWith"] },
        { key: "address", label: Locale.label("person.address"), type: "text", operators: ["contains", "equals", "startsWith", "endsWith"] },
        { key: "city", label: Locale.label("person.city"), type: "text", operators: ["contains", "equals", "startsWith", "endsWith"] },
        { key: "state", label: Locale.label("person.state"), type: "text", operators: ["contains", "equals"] },
        { key: "zip", label: Locale.label("person.zip"), type: "text", operators: ["contains", "equals", "startsWith"] }
      ],
      membership: [
        {
          key: "membershipStatus",
          label: Locale.label("person.membershipStatus"),
          type: "select",
          operators: ["equals", "notEquals"],
          options: [
            { value: "Visitor", label: Locale.label("person.visitor") },
            { value: "Regular Attendee", label: Locale.label("person.regularAttendee") },
            { value: "Member", label: Locale.label("person.member") },
            { value: "Staff", label: Locale.label("person.staff") },
            { value: "Inactive", label: Locale.label("person.inactive") }
          ]
        }
      ],
      activity: [],
      customFields: customFieldQuestions
        .filter((q) => q.fieldType !== "Heading" && q.fieldType !== "Payment")
        .map((q) => {
          // Map field types to appropriate input types and operators
          let type: "text" | "select" | "number" | "date" = "text";
          let operators: string[] = ["contains", "equals", "startsWith", "endsWith"];
          let options: Array<{ value: string; label: string }> | undefined;

          switch (q.fieldType) {
            case "Whole Number":
            case "Decimal":
              type = "number";
              operators = ["equals", "greaterThan", "greaterThanEqual", "lessThan", "lessThanEqual"];
              break;
            case "Date":
              type = "date";
              operators = ["equals", "greaterThan", "lessThan"];
              break;
            case "Yes/No":
              type = "select";
              operators = ["equals"];
              options = [
                { value: "Yes", label: Locale.label("common.yes") || "Yes" },
                { value: "No", label: Locale.label("common.no") || "No" }
              ];
              break;
            case "Multiple Choice":
            case "Checkbox":
              type = "select";
              operators = ["equals", "contains"];
              options = q.choices?.map((c: any) => ({ value: c.value || c.text, label: c.text })) || [];
              break;
            default:
              // Textbox, Text Area, Email, Phone Number - keep as text
              break;
          }

          return {
            key: `customField_${q.id}`,
            label: q.title,
            type,
            operators,
            options
          };
        })
    };

    // Add group membership if permissions allow
    if (Permissions.membershipApi.groupMembers) {
      categories.membership.push({
        key: "groupMember",
        label: Locale.label("people.editCondition.groupMem"),
        type: "select",
        operators: ["in", "notIn"],
        options: groups.map((g) => ({ value: g.id, label: g.name }))
      });
    }

    // Add donations if permissions allow
    if (Permissions.givingApi.donations) {
      categories.activity.push({
        key: "memberDonations",
        label: Locale.label("people.editCondition.memDon"),
        type: "complex",
        operators: ["donatedToAny", "donatedTo"]
      });
    }

    // Add attendance if permissions allow
    if (Permissions.attendanceApi.attendance) {
      categories.activity.push({
        key: "memberAttendance",
        label: Locale.label("people.editCondition.memAtt"),
        type: "complex",
        operators: ["attendedAny", "attendedCampus", "attendedService", "attendedServiceTime", "attendedGroup"]
      });
    }

    return categories;
  }, [groups, customFieldQuestions]);

  const loadCategoryData = useCallback(async (category: string) => {
    if (loadedCategories.includes(category)) return;

    if (category === "membership" && Permissions.membershipApi.groupMembers) {
      const groupData = await ApiHelper.get("/groups", "MembershipApi");
      setGroups(groupData);
    }

    if (category === "activity") {
      if (Permissions.givingApi.donations) {
        const fundData = await ApiHelper.get("/funds", "GivingApi");
        setFunds(fundData);
      }
      if (Permissions.attendanceApi.attendance) {
        const [campusData, serviceData, serviceTimeData, groupData] = await Promise.all([
          ApiHelper.get("/campuses", "AttendanceApi"),
          ApiHelper.get("/services", "AttendanceApi"),
          ApiHelper.get("/serviceTimes", "AttendanceApi"),
          ApiHelper.get("/groups", "MembershipApi")
        ]);
        setCampuses(campusData);
        setServices(serviceData);
        setServiceTimes(serviceTimeData);
        setGroups((prev) => prev.length ? prev : groupData);
      }
    }

    if (category === "customFields") {
      const forms = await ApiHelper.get("/forms?contentType=person", "MembershipApi");
      const personForms = forms.filter((f: any) => f.contentType === "person");
      const allQuestions: QuestionInterface[] = [];
      for (const form of personForms) {
        const questions = await ApiHelper.get("/questions?formId=" + form.id, "MembershipApi");
        allQuestions.push(...questions);
      }
      setCustomFieldQuestions(allQuestions);
    }

    setLoadedCategories((prev) => [...prev, category]);
  }, [loadedCategories]);

  const handleCategoryExpand = (category: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    if (isExpanded) {
      setExpandedCategories([...expandedCategories, category]);
      loadCategoryData(category);
    } else {
      setExpandedCategories(expandedCategories.filter((c) => c !== category));
    }
  };

  const toggleFilter = (field: string) => {
    const filters = { ...activeFilters };
    if (filters[field]) {
      delete filters[field];
    } else {
      const fieldConfig = Object.values(filterCategories)
        .flat()
        .find((f) => f.key === field);
      if (fieldConfig) {
        if (fieldConfig.type === "complex") {
          const defaultOperator = fieldConfig.operators?.[0] || (field === "memberDonations" ? "donatedToAny" : "attendedAny");
          setComplexConfig({
            type: field === "memberDonations" ? "donation" : "attendance",
            operator: defaultOperator,
            entityValue: "any",
            entityText: "Any",
            fromDate: DateHelper.formatHtml5Date(new Date()),
            toDate: DateHelper.formatHtml5Date(new Date())
          });
          setComplexFilterDialog({ open: true, field });
          return;
        }
        filters[field] = {
          field,
          operator: fieldConfig.operators?.[0] || "equals",
          value: fieldConfig.type === "select" ? fieldConfig.options?.[0]?.value || "" : ""
        };
      }
    }
    setActiveFilters(filters);
  };

  const removeFilter = (field: string) => {
    const filters = { ...activeFilters };
    delete filters[field];
    setActiveFilters(filters);
  };

  const updateFilterOperator = (field: string, operator: string) => {
    const filters = { ...activeFilters };
    if (filters[field]) {
      filters[field].operator = operator;
      setActiveFilters(filters);
    }
  };

  const updateFilterValue = (field: string, value: string) => {
    const filters = { ...activeFilters };
    if (filters[field]) {
      filters[field].value = value;
      setActiveFilters(filters);
    }
  };

  // Auto-search when filters change
  useEffect(() => {
    if (Object.keys(activeFilters).length > 0) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(async () => {
        const postConditions = await convertConditions();
        ApiHelper.post("/people/advancedSearch", postConditions, "MembershipApi").then((data) => {
          props.updateSearchResults(data.map((d: PersonInterface) => B1AdminPersonHelper.getExpandedPersonObject(d)));
        });
      }, 500);
    }
  }, [activeFilters]);

  const handleComplexFilterSave = () => {
    if (!complexFilterDialog.field || !complexConfig) return;

    const filters = { ...activeFilters };
    if (complexConfig.type === "donation") {
      if (complexConfig.operator === "donatedToAny") {
        filters[complexFilterDialog.field] = {
          field: "memberDonations",
          operator: "donatedToAny",
          value: JSON.stringify([{ value: "any", text: "Any" }, { from: complexConfig.fromDate, to: complexConfig.toDate }])
        };
      } else {
        filters[complexFilterDialog.field] = {
          field: "memberDonations",
          operator: "donatedTo",
          value: JSON.stringify([{ value: complexConfig.entityValue, text: complexConfig.entityText }, { from: complexConfig.fromDate, to: complexConfig.toDate }])
        };
      }
    } else if (complexConfig.type === "attendance") {
      filters[complexFilterDialog.field] = {
        field: "memberAttendance",
        operator: complexConfig.operator,
        value: JSON.stringify([{ value: complexConfig.entityValue, text: complexConfig.entityText }, { from: complexConfig.fromDate, to: complexConfig.toDate }])
      };
    }

    setActiveFilters(filters);
    setComplexFilterDialog({ open: false, field: null });
    setComplexConfig(null);
  };

  const convertConditions = useCallback(async () => {
    const result: SearchCondition[] = [];
    for (const filter of Object.values(activeFilters)) {
      // Skip filters with blank values
      if (!filter.value || filter.value.trim() === "") continue;

      switch (filter.field) {
        case "groupMember":
          const members: GroupMemberInterface[] = await ApiHelper.get(`/groupmembers?groupId=${filter.value}`, "MembershipApi");
          const peopleIds = ArrayHelper.getIds(members, "personId");
          result.push({ field: "id", operator: "in", value: peopleIds.join(",") });
          break;
        case "memberDonations":
          const fundVal = JSON.parse(filter.value);
          let memberDonations: FundDonationInterface[];
          if (filter.operator === "donatedToAny") {
            memberDonations = await ApiHelper.get(`/funddonations?startDate=${fundVal[1].from}&endDate=${fundVal[1].to}`, "GivingApi");
          } else {
            memberDonations = await ApiHelper.get(`/funddonations?fundId=${fundVal[0].value}&startDate=${fundVal[1].from}&endDate=${fundVal[1].to}`, "GivingApi");
          }
          const memberIds = ArrayHelper.getUniqueValues(memberDonations, "donation.personId").filter((f) => f !== null);
          result.push({ field: "id", operator: "in", value: memberIds.join(",") });
          break;
        case "memberAttendance":
          const attendanceValue = JSON.parse(filter.value);
          let attendees;
          const dateParams = `startDate=${attendanceValue[1].from}&endDate=${attendanceValue[1].to}`;
          if (filter.operator === "attendedCampus") {
            attendees = await ApiHelper.get(`/attendancerecords/search?campusId=${attendanceValue[0].value}&${dateParams}`, "AttendanceApi");
          } else if (filter.operator === "attendedService") {
            attendees = await ApiHelper.get(`/attendancerecords/search?serviceId=${attendanceValue[0].value}&${dateParams}`, "AttendanceApi");
          } else if (filter.operator === "attendedServiceTime") {
            attendees = await ApiHelper.get(`/attendancerecords/search?serviceTimeId=${attendanceValue[0].value}&${dateParams}`, "AttendanceApi");
          } else if (filter.operator === "attendedGroup") {
            attendees = await ApiHelper.get(`/attendancerecords/search?groupId=${attendanceValue[0].value}&${dateParams}`, "AttendanceApi");
          } else {
            attendees = await ApiHelper.get(`/attendancerecords/search?${dateParams}`, "AttendanceApi");
          }
          const attendeeIds = ArrayHelper.getIds(attendees, "personId");
          result.push({ field: "id", operator: "in", value: attendeeIds.join(",") });
          break;
        default:
          // Handle custom field filters
          if (filter.field.startsWith("customField_")) {
            const questionId = filter.field.replace("customField_", "");
            const question = customFieldQuestions.find(q => q.id === questionId);
            if (question) {
              // Fetch all form submissions for this form
              const formSubmissions: FormSubmissionInterface[] = await ApiHelper.get(
                `/formsubmissions/formId/${question.formId}/?include=questions,answers`,
                "MembershipApi"
              );
              // Filter submissions where the answer matches the search criteria
              const matchingPersonIds: string[] = [];
              const searchValue = filter.value;
              const isNumericField = question.fieldType === "Whole Number" || question.fieldType === "Decimal";
              const isDateField = question.fieldType === "Date";

              for (const submission of formSubmissions) {
                const answer = submission.answers?.find((a: any) => a.questionId === questionId);
                if (answer?.value) {
                  let matches = false;

                  if (isNumericField) {
                    const numAnswer = parseFloat(answer.value);
                    const numSearch = parseFloat(searchValue);
                    if (!isNaN(numAnswer) && !isNaN(numSearch)) {
                      switch (filter.operator) {
                        case "equals": matches = numAnswer === numSearch; break;
                        case "greaterThan": matches = numAnswer > numSearch; break;
                        case "greaterThanEqual": matches = numAnswer >= numSearch; break;
                        case "lessThan": matches = numAnswer < numSearch; break;
                        case "lessThanEqual": matches = numAnswer <= numSearch; break;
                      }
                    }
                  } else if (isDateField) {
                    const dateAnswer = new Date(answer.value);
                    const dateSearch = new Date(searchValue);
                    if (!isNaN(dateAnswer.getTime()) && !isNaN(dateSearch.getTime())) {
                      switch (filter.operator) {
                        case "equals": matches = dateAnswer.toDateString() === dateSearch.toDateString(); break;
                        case "greaterThan": matches = dateAnswer > dateSearch; break;
                        case "lessThan": matches = dateAnswer < dateSearch; break;
                      }
                    }
                  } else {
                    // String comparison (case-insensitive)
                    const answerValue = answer.value.toLowerCase();
                    const searchLower = searchValue.toLowerCase();
                    switch (filter.operator) {
                      case "equals": matches = answerValue === searchLower; break;
                      case "contains": matches = answerValue.includes(searchLower); break;
                      case "startsWith": matches = answerValue.startsWith(searchLower); break;
                      case "endsWith": matches = answerValue.endsWith(searchLower); break;
                      default: matches = answerValue.includes(searchLower);
                    }
                  }

                  if (matches && submission.contentId) {
                    matchingPersonIds.push(submission.contentId);
                  }
                }
              }
              if (matchingPersonIds.length > 0) {
                result.push({ field: "id", operator: "in", value: matchingPersonIds.join(",") });
              } else {
                // No matches - push impossible condition to return empty results
                result.push({ field: "id", operator: "equals", value: "no-match" });
              }
            }
          } else {
            result.push(filter);
          }
          break;
      }
    }
    return result;
  }, [activeFilters, customFieldQuestions]);

  const handleAdvancedSearch = useCallback(async () => {
    const postConditions = await convertConditions();
    ApiHelper.post("/people/advancedSearch", postConditions, "MembershipApi").then((data) => {
      props.updateSearchResults(data.map((d: PersonInterface) => B1AdminPersonHelper.getExpandedPersonObject(d)));
    });
  }, [convertConditions, props.updateSearchResults]);

  const clearAllFilters = () => {
    setActiveFilters({});
  };

  const getActiveFilterCount = (category: string) => {
    const categoryFields = filterCategories[category]?.map((f) => f.key) || [];
    return Object.keys(activeFilters).filter((key) => categoryFields.includes(key)).length;
  };

  const getFilterDisplayValue = (filter: ActiveFilter) => {
    const fieldConfig = Object.values(filterCategories).flat().find((f) => f.key === filter.field);
    if (!fieldConfig) return filter.value;

    if (filter.field === "memberAttendance" || filter.field === "memberDonations") {
      try {
        const parsed = JSON.parse(filter.value);
        return `${parsed[0]?.text || "Any"}`;
      } catch (e) {
        return filter.value;
      }
    }

    if (fieldConfig.type === "select" && fieldConfig.options) {
      const option = fieldConfig.options.find(opt => opt.value === filter.value);
      return option?.label || filter.value;
    }

    return filter.value;
  };

  const renderOperatorSelect = (field: FilterField) => {
    if (!activeFilters[field.key] || !field.operators) return null;

    const operatorLabels: Record<string, string> = {
      equals: "=",
      notEquals: "≠",
      contains: Locale.label("people.editCondition.contains"),
      startsWith: Locale.label("people.editCondition.startW"),
      endsWith: Locale.label("people.editCondition.endW"),
      greaterThan: ">",
      greaterThanEqual: "≥",
      lessThan: "<",
      lessThanEqual: "≤",
      in: Locale.label("people.editCondition.isMem"),
      notIn: Locale.label("people.editCondition.notMem")
    };

    return (
      <Select
        value={activeFilters[field.key].operator}
        onChange={(e) => updateFilterOperator(field.key, e.target.value)}
        variant="outlined"
        size="small"
        sx={styles.operatorSelect}
      >
        {field.operators.map((op) => (
          <MenuItem key={op} value={op} sx={styles.menuItem}>
            {operatorLabels[op] || op}
          </MenuItem>
        ))}
      </Select>
    );
  };

  const renderValueInput = (field: FilterField) => {
    if (!activeFilters[field.key]) return null;

    if (field.type === "select" && field.options) {
      return (
        <Select
          value={activeFilters[field.key].value}
          onChange={(e) => updateFilterValue(field.key, e.target.value)}
          variant="outlined"
          size="small"
          fullWidth
          sx={styles.inputCommon}
        >
          {field.options.map((opt) => (
            <MenuItem key={opt.value} value={opt.value} sx={styles.menuItem}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      );
    }

    if (field.type === "date") {
      return <TextField size="small" type="date" fullWidth value={activeFilters[field.key].value} onChange={(e) => updateFilterValue(field.key, e.target.value)} InputLabelProps={{ shrink: true }} variant="outlined" sx={styles.inputCommon} />;
    }

    if (field.type === "number") {
      return <TextField size="small" type="number" fullWidth value={activeFilters[field.key].value} onChange={(e) => updateFilterValue(field.key, e.target.value)} variant="outlined" placeholder={Locale.label("people.advancedSearch.valuePlaceholder")} sx={styles.inputCommon} />;
    }

    return <TextField size="small" fullWidth value={activeFilters[field.key].value} onChange={(e) => updateFilterValue(field.key, e.target.value)} placeholder={Locale.label("people.advancedSearch.enterValuePlaceholder")} variant="outlined" sx={styles.inputCommon} />;
  };

  const renderComplexFilterButton = (field: FilterField) => {
    if (!activeFilters[field.key]) return null;

    const filter = activeFilters[field.key];
    let displayText = Locale.label("people.peopleSearch.configure");
    if (filter.value) {
      try {
        const parsed = JSON.parse(filter.value);
        displayText = `${parsed[0]?.text || Locale.label("people.editCondition.any")}`;
      } catch (e) {
        // ignore
      }
    }

    return (
      <Button
        size="small"
        variant="outlined"
        startIcon={<SettingsIcon fontSize="small" />}
        onClick={() => {
          setComplexFilterDialog({ open: true, field: field.key });
          if (filter.value) {
            try {
              const parsed = JSON.parse(filter.value);
              setComplexConfig({
                type: field.key === "memberDonations" ? "donation" : "attendance",
                operator: filter.operator,
                entityValue: parsed[0]?.value || "any",
                entityText: parsed[0]?.text || "Any",
                fromDate: parsed[1]?.from || DateHelper.formatHtml5Date(new Date()),
                toDate: parsed[1]?.to || DateHelper.formatHtml5Date(new Date())
              });
            } catch (e) {
              // ignore
            }
          }
        }}
        sx={styles.complexButton}>
        {displayText}
      </Button>
    );
  };

  const getCategoryLabel = (key: string) => {
    const labels: Record<string, string> = {
      names: Locale.label("people.peopleSearch.names"),
      demographics: Locale.label("people.peopleSearch.demographics"),
      contact: Locale.label("people.peopleSearch.contact"),
      membership: Locale.label("people.peopleSearch.membership"),
      activity: Locale.label("people.peopleSearch.activity"),
      customFields: Locale.label("people.peopleSearch.customFields") || "Custom Fields"
    };
    return labels[key] || key;
  };

  const getCategoryIcon = (key: string) => {
    const icons: Record<string, React.ReactNode> = {
      names: <PersonIcon />,
      demographics: <CakeIcon />,
      contact: <EmailIcon />,
      membership: <GroupIcon />,
      activity: <AttendanceIcon />,
      customFields: <CustomFieldIcon />
    };
    return icons[key] || <PersonIcon />;
  };

  useEffect(() => {
    loadCategoryData("names");
    loadCategoryData("demographics");
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const renderContent = () => (
    <>

      {/* Active Filters Summary */}
      {Object.keys(activeFilters).length > 0 && (
        <Paper elevation={0} sx={styles.activeFiltersPaper}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
            <Typography variant="caption" color="primary" sx={{ fontWeight: 600, mr: 0.5 }}>
              {Object.keys(activeFilters).length} {Locale.label("people.peopleSearch.active")}
            </Typography>
            {Object.entries(activeFilters).map(([key, filter]) => {
              const fieldConfig = Object.values(filterCategories).flat().find((f) => f.key === key);
              return (
                <Chip
                  key={key}
                  label={fieldConfig?.label}
                  onDelete={() => removeFilter(key)}
                  deleteIcon={<CloseIcon />}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={styles.filterChip}
                />
              );
            })}
            <Chip
              label={Locale.label("people.peopleSearch.clearAll")}
              onClick={clearAllFilters}
              size="small"
              variant="outlined"
              color="default"
              sx={styles.filterChip}
            />
          </Stack>
        </Paper>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
        {Locale.label("people.peopleSearch.checkBoxes")}
      </Typography>

      <Box>
        {Object.entries(filterCategories).map(([categoryKey, fields]) => {
          // Skip empty categories, except customFields which loads dynamically
          if (fields.length === 0 && categoryKey !== "customFields") return null;
          const activeCount = getActiveFilterCount(categoryKey);

          return (
            <Accordion
              key={categoryKey}
              expanded={expandedCategories.includes(categoryKey)}
              onChange={handleCategoryExpand(categoryKey)}
              sx={styles.accordion}
              disableGutters
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={styles.accordionSummary}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
                  <Box sx={{ color: "primary.main", display: "flex", alignItems: "center", fontSize: 18 }}>
                    {getCategoryIcon(categoryKey)}
                  </Box>
                  <Typography sx={{ flexGrow: 1, fontWeight: 500, fontSize: "0.875rem" }}>{getCategoryLabel(categoryKey)}</Typography>
                  {activeCount > 0 && (
                    <Chip
                      label={activeCount}
                      size="small"
                      color="primary"
                      sx={styles.categoryChip}
                    />
                  )}
                </Stack>
              </AccordionSummary>
              <AccordionDetails sx={styles.accordionDetails}>
                <Stack spacing={0}>
                  {fields.length === 0 && categoryKey === "customFields" && (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 1, px: 0.5 }}>
                      {loadedCategories.includes("customFields")
                        ? "No custom fields defined. Create custom fields in Forms to search by them."
                        : "Loading custom fields..."}
                    </Typography>
                  )}
                  {fields.map((field) => (
                    <Box
                      key={field.key}
                      sx={{
                        ...styles.filterRow,
                        ...(activeFilters[field.key] && styles.filterRowActive)
                      }}
                    >
                      <Stack spacing={0.5}>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <Checkbox
                            checked={!!activeFilters[field.key]}
                            onChange={() => toggleFilter(field.key)}
                            size="small"
                            sx={styles.checkbox}
                          />
                          <Typography
                            sx={{
                              ...styles.filterLabel,
                              color: activeFilters[field.key] ? "text.primary" : "text.secondary",
                              fontWeight: activeFilters[field.key] ? 500 : 400
                            }}>
                            {field.label}
                          </Typography>
                        </Stack>
                        {activeFilters[field.key] && (
                          <Stack direction="row" spacing={0.75} sx={{ pl: 3.5, alignItems: "center" }}>
                            {field.type !== "complex" && field.type !== "select" && (
                              <Box sx={{ flexShrink: 0 }}>
                                {renderOperatorSelect(field)}
                              </Box>
                            )}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              {field.type === "complex" ? renderComplexFilterButton(field) : renderValueInput(field)}
                            </Box>
                          </Stack>
                        )}
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>
    </>
  );

  if (props.embedded) {
    return (
      <>
        {renderContent()}
        {/* Complex Filter Dialog */}
        <Dialog open={complexFilterDialog.open} onClose={() => setComplexFilterDialog({ open: false, field: null })} maxWidth="sm" fullWidth>
          <DialogTitle>
            {complexFilterDialog.field === "memberDonations" ? Locale.label("people.editCondition.memDon") : Locale.label("people.editCondition.memAtt")}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <FormControl fullWidth>
                <InputLabel>{Locale.label("people.peopleSearch.type")}</InputLabel>
                <Select
                  value={complexConfig?.operator || ""}
                  label={Locale.label("people.peopleSearch.type")}
                  onChange={(e) => {
                    const newConfig = complexConfig || {
                      type: complexFilterDialog.field === "memberDonations" ? "donation" : "attendance",
                      operator: e.target.value,
                      entityValue: "any",
                      entityText: "Any",
                      fromDate: DateHelper.formatHtml5Date(new Date()),
                      toDate: DateHelper.formatHtml5Date(new Date())
                    };
                    setComplexConfig({ ...newConfig, operator: e.target.value });
                  }}>
                  {complexFilterDialog.field === "memberDonations" ? [
                    <MenuItem key="donatedToAny" value="donatedToAny">{Locale.label("people.editCondition.hasDon")}</MenuItem>,
                    <MenuItem key="donatedTo" value="donatedTo">{Locale.label("people.editCondition.donTo")}</MenuItem>
                  ] : [
                    <MenuItem key="attendedAny" value="attendedAny">{Locale.label("people.editCondition.attGen")}</MenuItem>,
                    <MenuItem key="attendedCampus" value="attendedCampus">{Locale.label("people.editCondition.attCamp")}</MenuItem>,
                    <MenuItem key="attendedService" value="attendedService">{Locale.label("people.editCondition.attServ")}</MenuItem>,
                    <MenuItem key="attendedServiceTime" value="attendedServiceTime">{Locale.label("people.editCondition.attServTime")}</MenuItem>,
                    <MenuItem key="attendedGroup" value="attendedGroup">{Locale.label("people.editCondition.attGroup")}</MenuItem>
                  ]}
                </Select>
              </FormControl>

              {complexConfig?.operator &&
              complexConfig.operator !== "donatedToAny" &&
              complexConfig.operator !== "attendedAny" && (
                <FormControl fullWidth>
                  <InputLabel>
                    {complexFilterDialog.field === "memberDonations"
                      ? Locale.label("people.peopleSearch.fund")
                      : complexConfig.operator === "attendedCampus"
                        ? Locale.label("people.peopleSearch.campus")
                        : complexConfig.operator === "attendedService"
                          ? Locale.label("people.peopleSearch.service")
                          : complexConfig.operator === "attendedServiceTime"
                            ? Locale.label("people.peopleSearch.serviceTime")
                            : Locale.label("people.peopleSearch.group")}
                  </InputLabel>
                  <Select
                    value={complexConfig?.entityValue || ""}
                    label={
                      complexFilterDialog.field === "memberDonations"
                        ? Locale.label("people.peopleSearch.fund")
                        : complexConfig.operator === "attendedCampus"
                          ? Locale.label("people.peopleSearch.campus")
                          : complexConfig.operator === "attendedService"
                            ? Locale.label("people.peopleSearch.service")
                            : complexConfig.operator === "attendedServiceTime"
                              ? Locale.label("people.peopleSearch.serviceTime")
                              : Locale.label("people.peopleSearch.group")
                    }
                    onChange={(e) => {
                      let text = "";
                      if (complexFilterDialog.field === "memberDonations") {
                        text = funds.find((f) => f.id === e.target.value)?.name || "";
                      } else if (complexConfig.operator === "attendedCampus") {
                        text = campuses.find((c) => c.id === e.target.value)?.name || "";
                      } else if (complexConfig.operator === "attendedService") {
                        const service = services.find((s) => s.id === e.target.value);
                        text = service ? `${service.campus.name} - ${service.name}` : "";
                      } else if (complexConfig.operator === "attendedServiceTime") {
                        text = serviceTimes.find((st) => st.id === e.target.value)?.longName || "";
                      } else {
                        text = groups.find((g) => g.id === e.target.value)?.name || "";
                      }
                      setComplexConfig({ ...complexConfig, entityValue: e.target.value, entityText: text });
                    }}>
                    {complexFilterDialog.field === "memberDonations"
                      ? funds.map((f) => (
                        <MenuItem key={f.id} value={f.id}>
                          {f.name}
                        </MenuItem>
                      ))
                      : complexConfig.operator === "attendedCampus"
                        ? campuses.map((c) => (
                          <MenuItem key={c.id} value={c.id}>
                            {c.name}
                          </MenuItem>
                        ))
                        : complexConfig.operator === "attendedService"
                          ? services.map((s) => (
                            <MenuItem key={s.id} value={s.id}>
                              {s.campus.name} - {s.name}
                            </MenuItem>
                          ))
                          : complexConfig.operator === "attendedServiceTime"
                            ? serviceTimes.map((st) => (
                              <MenuItem key={st.id} value={st.id}>
                                {st.longName}
                              </MenuItem>
                            ))
                            : groups.map((g) => (
                              <MenuItem key={g.id} value={g.id}>
                                {g.name}
                              </MenuItem>
                            ))}
                  </Select>
                </FormControl>
              )}

              <Stack direction="row" spacing={2}>
                <TextField
                  fullWidth
                  label={Locale.label("people.editCondition.from")}
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={complexConfig?.fromDate || ""}
                  onChange={(e) => setComplexConfig({ ...complexConfig!, fromDate: e.target.value })}
                />
                <TextField
                  fullWidth
                  label={Locale.label("people.editCondition.to")}
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={complexConfig?.toDate || ""}
                  onChange={(e) => setComplexConfig({ ...complexConfig!, toDate: e.target.value })}
                />
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setComplexFilterDialog({ open: false, field: null })}>{Locale.label("common.cancel")}</Button>
            <Button onClick={handleComplexFilterSave} variant="contained">
              {Locale.label("common.save")}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <InputBox
        id="advancedSearch"
        headerIcon="person"
        headerText={Locale.label("people.peopleSearch.advSearch")}
        headerActionContent={
          props.toggleFunction && (
            <Button onClick={props.toggleFunction} sx={{ textTransform: "none" }}>
              {Locale.label("people.peopleSearch.simp")}
            </Button>
          )
        }
        saveFunction={handleAdvancedSearch}
        saveText={Locale.label("people.advancedSearch.search")}
        isSubmitting={Object.keys(activeFilters).length < 1}
        help="docs/b1-admin/people/searching-people">
        {renderContent()}
      </InputBox>

      {/* Complex Filter Dialog */}
      <Dialog open={complexFilterDialog.open} onClose={() => setComplexFilterDialog({ open: false, field: null })} maxWidth="sm" fullWidth>
        <DialogTitle>
          {complexFilterDialog.field === "memberDonations" ? Locale.label("people.editCondition.memDon") : Locale.label("people.editCondition.memAtt")}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>{Locale.label("people.peopleSearch.type")}</InputLabel>
              <Select
                value={complexConfig?.operator || ""}
                label={Locale.label("people.peopleSearch.type")}
                onChange={(e) => {
                  const newConfig = complexConfig || {
                    type: complexFilterDialog.field === "memberDonations" ? "donation" : "attendance",
                    operator: e.target.value,
                    entityValue: "any",
                    entityText: "Any",
                    fromDate: DateHelper.formatHtml5Date(new Date()),
                    toDate: DateHelper.formatHtml5Date(new Date())
                  };
                  setComplexConfig({ ...newConfig, operator: e.target.value });
                }}>
                {complexFilterDialog.field === "memberDonations" ? [
                  <MenuItem key="donatedToAny" value="donatedToAny">{Locale.label("people.editCondition.hasDon")}</MenuItem>,
                  <MenuItem key="donatedTo" value="donatedTo">{Locale.label("people.editCondition.donTo")}</MenuItem>
                ] : [
                  <MenuItem key="attendedAny" value="attendedAny">{Locale.label("people.editCondition.attGen")}</MenuItem>,
                  <MenuItem key="attendedCampus" value="attendedCampus">{Locale.label("people.editCondition.attCamp")}</MenuItem>,
                  <MenuItem key="attendedService" value="attendedService">{Locale.label("people.editCondition.attServ")}</MenuItem>,
                  <MenuItem key="attendedServiceTime" value="attendedServiceTime">{Locale.label("people.editCondition.attServTime")}</MenuItem>,
                  <MenuItem key="attendedGroup" value="attendedGroup">{Locale.label("people.editCondition.attGroup")}</MenuItem>
                ]}
              </Select>
            </FormControl>

            {complexConfig?.operator &&
              complexConfig.operator !== "donatedToAny" &&
              complexConfig.operator !== "attendedAny" && (
              <FormControl fullWidth>
                <InputLabel>
                  {complexFilterDialog.field === "memberDonations"
                    ? Locale.label("people.peopleSearch.fund")
                    : complexConfig.operator === "attendedCampus"
                      ? Locale.label("people.peopleSearch.campus")
                      : complexConfig.operator === "attendedService"
                        ? Locale.label("people.peopleSearch.service")
                        : complexConfig.operator === "attendedServiceTime"
                          ? Locale.label("people.peopleSearch.serviceTime")
                          : Locale.label("people.peopleSearch.group")}
                </InputLabel>
                <Select
                  value={complexConfig?.entityValue || ""}
                  label={
                    complexFilterDialog.field === "memberDonations"
                      ? Locale.label("people.peopleSearch.fund")
                      : complexConfig.operator === "attendedCampus"
                        ? Locale.label("people.peopleSearch.campus")
                        : complexConfig.operator === "attendedService"
                          ? Locale.label("people.peopleSearch.service")
                          : complexConfig.operator === "attendedServiceTime"
                            ? Locale.label("people.peopleSearch.serviceTime")
                            : Locale.label("people.peopleSearch.group")
                  }
                  onChange={(e) => {
                    let text = "";
                    if (complexFilterDialog.field === "memberDonations") {
                      text = funds.find((f) => f.id === e.target.value)?.name || "";
                    } else if (complexConfig.operator === "attendedCampus") {
                      text = campuses.find((c) => c.id === e.target.value)?.name || "";
                    } else if (complexConfig.operator === "attendedService") {
                      const service = services.find((s) => s.id === e.target.value);
                      text = service ? `${service.campus.name} - ${service.name}` : "";
                    } else if (complexConfig.operator === "attendedServiceTime") {
                      text = serviceTimes.find((st) => st.id === e.target.value)?.longName || "";
                    } else {
                      text = groups.find((g) => g.id === e.target.value)?.name || "";
                    }
                    setComplexConfig({ ...complexConfig, entityValue: e.target.value, entityText: text });
                  }}>
                  {complexFilterDialog.field === "memberDonations"
                    ? funds.map((f) => (
                      <MenuItem key={f.id} value={f.id}>
                        {f.name}
                      </MenuItem>
                    ))
                    : complexConfig.operator === "attendedCampus"
                      ? campuses.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.name}
                        </MenuItem>
                      ))
                      : complexConfig.operator === "attendedService"
                        ? services.map((s) => (
                          <MenuItem key={s.id} value={s.id}>
                            {s.campus.name} - {s.name}
                          </MenuItem>
                        ))
                        : complexConfig.operator === "attendedServiceTime"
                          ? serviceTimes.map((st) => (
                            <MenuItem key={st.id} value={st.id}>
                              {st.longName}
                            </MenuItem>
                          ))
                          : groups.map((g) => (
                            <MenuItem key={g.id} value={g.id}>
                              {g.name}
                            </MenuItem>
                          ))}
                </Select>
              </FormControl>
            )}

            <Stack direction="row" spacing={2}>
              <TextField
                fullWidth
                label={Locale.label("people.editCondition.from")}
                type="date"
                InputLabelProps={{ shrink: true }}
                value={complexConfig?.fromDate || ""}
                onChange={(e) => setComplexConfig({ ...complexConfig!, fromDate: e.target.value })}
              />
              <TextField
                fullWidth
                label={Locale.label("people.editCondition.to")}
                type="date"
                InputLabelProps={{ shrink: true }}
                value={complexConfig?.toDate || ""}
                onChange={(e) => setComplexConfig({ ...complexConfig!, toDate: e.target.value })}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setComplexFilterDialog({ open: false, field: null })}>{Locale.label("common.cancel")}</Button>
          <Button onClick={handleComplexFilterSave} variant="contained">
            {Locale.label("common.save")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
});
