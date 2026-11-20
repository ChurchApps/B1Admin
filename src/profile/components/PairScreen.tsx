import { useEffect, useState } from "react";
import { Alert, TextField, FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { useForm } from "react-hook-form";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { FormCard } from "../../components/ui";
import { type PlanTypeInterface } from "../../helpers";
import { type GroupInterface } from "@churchapps/helpers";

interface Props {
  updatedFunction: () => void;
}

type PairFormValues = { code: string };

export const PairScreen = (props: Props) => {
  const { register, handleSubmit, setError, formState } = useForm<PairFormValues>({ defaultValues: { code: "" } });
  const [planTypes, setPlanTypes] = useState<PlanTypeInterface[]>([]);
  const [ministries, setMinistries] = useState<GroupInterface[]>([]);
  const [planTypeId, setPlanTypeId] = useState("");
  const e = formState.errors;
  const summaryErrors: string[] = [];
  if (e.code?.message) summaryErrors.push(e.code.message);

  useEffect(() => {
    ApiHelper.get("/planTypes", "DoingApi").then((data: PlanTypeInterface[]) => setPlanTypes(data || []));
    ApiHelper.get("/groups/tag/ministry", "MembershipApi").then((data: GroupInterface[]) => setMinistries(data || []));
  }, []);

  const getPlanTypeLabel = (pt: PlanTypeInterface) => {
    const ministry = ministries.find(m => m.id === pt.ministryId);
    return ministry ? `${ministry.name} — ${pt.name}` : pt.name;
  };

  const onValid = (values: PairFormValues) => {
    const query = planTypeId ? `?contentType=b1church&contentId=${planTypeId}` : "";
    ApiHelper.get("/devices/pair/" + values.code + query, "MessagingApi").then((data: { success?: boolean }) => {
      if (data.success) props.updatedFunction();
      else setError("code", { message: Locale.label("profile.pairScreen.invalidCode") });
    });
  };

  return (
    <>
      <FormCard title={Locale.label("profile.devices.addScreen")} icon="tv" onSave={handleSubmit(onValid)} onCancel={props.updatedFunction}>
        {summaryErrors.length > 0 && <Alert severity="error" sx={{ mb: 2 }}>{summaryErrors.map((msg) => <div key={msg}>{msg}</div>)}</Alert>}
        <TextField fullWidth label={Locale.label("profile.pairScreen.pairingCode")} id="code" type="text" placeholder={Locale.label("placeholders.pairScreen.code")} error={!!e.code} helperText={e.code?.message} {...register("code", { required: Locale.label("profile.pairScreen.codeRequired") })} />
        {planTypes.length > 0 && (
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>{Locale.label("profile.pairScreen.planType") || "Show Plans For"}</InputLabel>
            <Select
              label={Locale.label("profile.pairScreen.planType") || "Show Plans For"}
              value={planTypeId}
              onChange={(event) => setPlanTypeId(event.target.value)}
              data-testid="pair-plan-type-select"
            >
              <MenuItem value="">{Locale.label("profile.pairScreen.planTypeNone") || "None (notifications only)"}</MenuItem>
              {planTypes.map(pt => <MenuItem key={pt.id} value={pt.id}>{getPlanTypeLabel(pt)}</MenuItem>)}
            </Select>
          </FormControl>
        )}
      </FormCard>
    </>
  );
};
