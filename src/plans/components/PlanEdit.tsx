import React from "react";
import { FormControl, InputLabel, MenuItem, Select, TextField, type SelectChangeEvent } from "@mui/material";
import { DateHelper, ErrorMessages, InputBox, Locale } from "@churchapps/apphelper";
import { type PlanInterface } from "../../helpers";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "../../queryClient";

interface Props {
  plan: PlanInterface;
  plans: PlanInterface[];
  updatedFunction: () => void;
}



export const PlanEdit = (props: Props) => {
  const [plan, setPlan] = React.useState<PlanInterface>({ ...props.plan, serviceOrder: true });
  const [copyMode, setCopyMode] = React.useState<string>("all"); // "none" | "positions" | "all"
  const [errors, setErrors] = React.useState<string[]>([]);

  // Get the most recent plan that is before the new plan's date
  const previousPlan = React.useMemo(() => {
    if (props.plans.length === 0 || !plan.serviceDate) return null;
    const currentDate = new Date(plan.serviceDate).getTime();
    const sorted = [...props.plans]
      .filter(p => {
        const planDate = p.serviceDate ? new Date(p.serviceDate).getTime() : 0;
        return planDate < currentDate;  // Only include plans before new plan's date
      })
      .sort((a, b) => {
        const dateA = a.serviceDate ? new Date(a.serviceDate).getTime() : 0;
        const dateB = b.serviceDate ? new Date(b.serviceDate).getTime() : 0;
        return dateB - dateA;  // Sort descending to get most recent previous plan first
      });
    return sorted[0] || null;
  }, [props.plans, plan.serviceDate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    setErrors([]);
    const p = { ...plan } as PlanInterface;
    const value = e.target.value;
    switch (e.target.name) {
      case "name":
        p.name = value;
        break;
      case "serviceDate":
        p.serviceDate = new Date(value);
        break;
      case "planTypeId":
        p.planTypeId = value;
        break;
      case "copyMode":
        setCopyMode(value);
        return; // Don't update plan state
    }
    setPlan(p);
  };

  const validate = () => {
    const result = [];
    if (!plan.name) result.push(Locale.label("plans.planEdit.planReq"));
    if (!plan.serviceDate) result.push(Locale.label("plans.planEdit.servReq"));
    setErrors(result);
    return result.length === 0;
  };

  const savePlanMutation = useMutation({
    mutationFn: async () => {
      const { ApiHelper } = await import("@churchapps/apphelper");
      if (copyMode === "none" || !previousPlan) {
        return ApiHelper.post("/plans", [plan], "DoingApi");
      } else {
        return ApiHelper.post("/plans/copy/" + previousPlan.id, { ...plan, copyMode }, "DoingApi");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/plans", "DoingApi"] });
      props.updatedFunction();
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async () => {
      const { ApiHelper } = await import("@churchapps/apphelper");
      return ApiHelper.delete("/plans/" + plan.id, "DoingApi");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/plans", "DoingApi"] });
      props.updatedFunction();
    },
  });

  const handleSave = () => {
    if (validate()) {
      savePlanMutation.mutate();
    }
  };

  const handleDelete = () => {
    deletePlanMutation.mutate();
  };

  return (
    <>
      <ErrorMessages errors={errors} />
      <InputBox
        headerText={plan.id ? Locale.label("plans.planEdit.planEdit") : Locale.label("plans.planEdit.planAdd")}
        headerIcon="assignment"
        saveFunction={handleSave}
        cancelFunction={props.updatedFunction}
        deleteFunction={plan.id ? handleDelete : null}>
        <TextField fullWidth label={Locale.label("common.name")} id="name" name="name" type="text" value={plan.name} onChange={handleChange} data-testid="plan-name-input" aria-label="Plan name" />
        <TextField
          fullWidth
          label={Locale.label("plans.planEdit.servDate")}
          id="serviceDate"
          name="serviceDate"
          type="date"
          value={DateHelper.formatHtml5Date(plan.serviceDate)}
          onChange={handleChange}
          data-testid="service-date-input"
          aria-label="Service date"
        />
        {!plan.id && previousPlan && (
          <FormControl fullWidth>
            <InputLabel id="copyMode">{Locale.label("plans.planEdit.copyPrevious") || "Copy from previous plan"}:</InputLabel>
            <Select
              name="copyMode"
              labelId="copyMode"
              label={Locale.label("plans.planEdit.copyPrevious") || "Copy from previous plan"}
              value={copyMode}
              onChange={handleChange}
              data-testid="copy-mode-select"
            >
              <MenuItem value="none">{Locale.label("plans.planEdit.copyNothing") || "Nothing"}</MenuItem>
              <MenuItem value="positions">{Locale.label("plans.planEdit.copyPositions") || "Positions Only"}</MenuItem>
              <MenuItem value="all">{Locale.label("plans.planEdit.copyAll") || "Positions and Assignments"}</MenuItem>
            </Select>
          </FormControl>
        )}
      </InputBox>
    </>
  );
};
