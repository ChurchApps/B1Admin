import { Alert, FormControl, Grid, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useMountedState, ApiHelper, DateHelper, Locale } from "@churchapps/apphelper";
import { FormCard } from "../../components/ui";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Props {
  formId: string;
  updatedFunction: () => void;
}

export interface FormInterface {
  id?: string;
  name?: string;
  contentType?: string;
  restricted?: boolean;
  accessStartTime?: Date;
  accessEndTime?: Date;
  archived: boolean;
  action?: string;
  thankYouMessage?: string;
}

type AnyRecord = Record<string, any>;

export function FormEdit(props: Props) {
  "use no memo"; // compiler caches register() results, breaking RHF field re-registration after reset()
  const [standAloneForm, setStandAloneForm] = useState<boolean>(false);
  const [showDates, setShowDates] = useState<boolean>(false);
  const isMounted = useMountedState();
  const queryClient = useQueryClient();

  const { control, register, handleSubmit, reset, watch, formState } = useForm<AnyRecord>({ defaultValues: { name: "", contentType: "person", thankYouMessage: "", restricted: false, accessStartTime: null, accessEndTime: null } });

  const e = formState.errors as any;
  const summaryErrors: string[] = [];
  if (e.name?.message) summaryErrors.push(e.name.message);
  if (e.accessStartTime?.message) summaryErrors.push(e.accessStartTime.message);
  if (e.accessEndTime?.message) summaryErrors.push(e.accessEndTime.message);

  const watchedId = watch("id");

  const formQuery = useQuery<FormInterface>({
    queryKey: ["/forms/" + props.formId, "MembershipApi"],
    enabled: !!props.formId
  });

  React.useEffect(() => {
    if (formQuery.data && isMounted()) {
      const data = formQuery.data;
      if (data.restricted !== undefined && data.contentType === "form") setStandAloneForm(true);
      else setStandAloneForm(false);
      setShowDates(!!data.accessEndTime);
      reset({
        ...data,
        accessStartTime: data.accessStartTime ? DateHelper.formatHtml5Date(data.accessStartTime) : null,
        accessEndTime: data.accessEndTime ? DateHelper.formatHtml5Date(data.accessEndTime) : null,
        restricted: data.restricted ?? false
      });
    }
  }, [formQuery.data, isMounted]);

  const saveFormMutation = useMutation({
    mutationFn: (formData: AnyRecord) => ApiHelper.post("/forms", [formData], "MembershipApi"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/forms", "MembershipApi"] });
      queryClient.invalidateQueries({ queryKey: ["/forms/archived", "MembershipApi"] });
      if (props.formId) queryClient.invalidateQueries({ queryKey: ["/forms/" + props.formId, "MembershipApi"] });
      props.updatedFunction();
    }
  });

  const deleteFormMutation = useMutation({
    mutationFn: (formId: string) => ApiHelper.delete("/forms/" + formId, "MembershipApi"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/forms", "MembershipApi"] });
      queryClient.invalidateQueries({ queryKey: ["/forms/archived", "MembershipApi"] });
      props.updatedFunction();
    }
  });

  const onValid = (values: AnyRecord) => {
    const f = { ...values };
    if (!showDates) { f.accessEndTime = null; f.accessStartTime = null; } else {
      f.accessStartTime = f.accessStartTime ? DateHelper.toDate(f.accessStartTime) : null;
      f.accessEndTime = f.accessEndTime ? DateHelper.toDate(f.accessEndTime) : null;
    }
    saveFormMutation.mutate(f);
  };

  function handleDelete() {
    if (window.confirm(Locale.label("forms.formEdit.confirmMsg"))) {
      deleteFormMutation.mutate(watchedId!);
    }
  }

  return (
    <FormCard id="formBox" icon="format_align_left" title={Locale.label("forms.formEdit.editForm")} onSave={handleSubmit(onValid)} isSubmitting={saveFormMutation.isPending || deleteFormMutation.isPending} onCancel={props.updatedFunction} onDelete={props.formId ? handleDelete : undefined}>
      {summaryErrors.length > 0 && <Alert severity="error" sx={{ mb: 2 }}>{summaryErrors.map((msg) => <div key={msg}>{msg}</div>)}</Alert>}
      <TextField fullWidth label={Locale.label("forms.formEdit.name")} type="text" placeholder={Locale.label("placeholders.form.name")} data-testid="form-name-input" aria-label={Locale.label("forms.formEdit.formNameAria")} error={!!e.name} helperText={e.name?.message} {...register("name", { required: Locale.label("forms.formEdit.nameReqMsg") })} />
      {!props.formId && (
        <FormControl fullWidth>
          <InputLabel id="associate">{Locale.label("forms.formEdit.associate")}</InputLabel>
          <Controller name="contentType" control={control} render={({ field }) => (
            <Select {...field} value={field.value ?? "person"} labelId="associate" label={Locale.label("forms.formEdit.associate")} data-testid="content-type-select" aria-label={Locale.label("forms.formEdit.contentTypeAria")} onChange={(e) => { field.onChange(e); if (e.target.value === "form") setStandAloneForm(true); }}>
              <MenuItem value="person">{Locale.label("forms.formEdit.ppl")}</MenuItem>
              <MenuItem value="form">{Locale.label("forms.formEdit.alone")}</MenuItem>
            </Select>
          )} />
        </FormControl>
      )}
      {standAloneForm && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>{Locale.label("forms.formEdit.access")}</InputLabel>
              <Controller name="restricted" control={control} render={({ field }) => (
                <Select {...field} value={field.value?.toString() ?? "false"} label={Locale.label("forms.formEdit.access")} data-testid="access-level-select" aria-label={Locale.label("forms.formEdit.accessLevelAria")} onChange={(e) => field.onChange(e.target.value === "true")}>
                  <MenuItem value="false">{Locale.label("forms.formEdit.public")}</MenuItem>
                  <MenuItem value="true">{Locale.label("forms.formEdit.restrict")}</MenuItem>
                </Select>
              )} />
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>{Locale.label("forms.formEdit.available")}</InputLabel>
              <Select label={Locale.label("forms.formEdit.available")} name="limit" value={showDates.toString()} onChange={(e) => { setShowDates(e.target.value === "true"); }}>
                <MenuItem value="false">{Locale.label("common.no")}</MenuItem>
                <MenuItem value="true">{Locale.label("common.yes")}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      )}
      {showDates && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth type="date" label={Locale.label("forms.formEdit.availableStart")} error={!!e.accessStartTime} helperText={e.accessStartTime?.message} {...register("accessStartTime", { required: showDates ? Locale.label("forms.formEdit.startReqMsg") : false })} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth type="date" label={Locale.label("forms.formEdit.availableEnd")} error={!!e.accessEndTime} helperText={e.accessEndTime?.message} {...register("accessEndTime", { required: showDates ? Locale.label("forms.formEdit.endReqMsg") : false })} />
          </Grid>
        </Grid>
      )}
      <TextField fullWidth label={Locale.label("forms.formEdit.thankYouMessage")} type="text" placeholder={Locale.label("placeholders.form.thankYouMessage")} {...register("thankYouMessage")} />
    </FormCard>
  );
}
