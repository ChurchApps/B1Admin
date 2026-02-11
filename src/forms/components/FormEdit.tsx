import { FormControl, InputLabel, MenuItem, Select, TextField, type SelectChangeEvent } from "@mui/material";
import React, { useState } from "react";
import { useMountedState, ApiHelper, InputBox, DateHelper, ErrorMessages, Locale } from "@churchapps/apphelper";
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

export function FormEdit(props: Props) {
  const [form, setForm] = useState<FormInterface>({ name: "", contentType: "person", thankYouMessage: "" } as FormInterface);
  const [standAloneForm, setStandAloneForm] = useState<boolean>(false);
  const [showDates, setShowDates] = useState<boolean>(false);
  const [errors, setErrors] = React.useState<string[]>([]);
  const isMounted = useMountedState();
  const queryClient = useQueryClient();

  const formQuery = useQuery<FormInterface>({
    queryKey: ["/forms/" + props.formId, "MembershipApi"],
    enabled: !!props.formId
  });

  React.useEffect(() => {
    if (formQuery.data && isMounted()) {
      const data = formQuery.data;
      if (data.restricted !== undefined && data.contentType === "form") {
        setStandAloneForm(true);
      } else {
        setStandAloneForm(false);
      }
      setForm(data);
      setShowDates(!!data.accessEndTime);
    }
  }, [formQuery.data, isMounted]);

  const saveFormMutation = useMutation({
    mutationFn: (formData: FormInterface) => ApiHelper.post("/forms", [formData], "MembershipApi"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/forms", "MembershipApi"] });
      queryClient.invalidateQueries({ queryKey: ["/forms/archived", "MembershipApi"] });
      if (props.formId) {
        queryClient.invalidateQueries({ queryKey: ["/forms/" + props.formId, "MembershipApi"] });
      }
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    setErrors([]);
    const f = { ...form } as FormInterface;
    const value = e.target.value;
    switch (e.target.name) {
      case "name": f.name = value; break;
      case "contentType": f.contentType = value; break;
      case "restricted": f.restricted = value === "true"; break;
      case "accessStartTime": f.accessStartTime = showDates ? DateHelper.toDate(value) : null; break;
      case "accessEndTime": f.accessEndTime = showDates ? DateHelper.toDate(value) : null; break;
      case "thankYouMessage": f.thankYouMessage = value; break;
    }
    setForm(f);
  };

  const validate = () => {
    const result = [];
    if (!form.name) result.push(Locale.label("forms.formEdit.nameReqMsg"));
    if (showDates) {
      if (!form.accessStartTime) result.push(Locale.label("forms.formEdit.startReqMsg"));
      if (!form.accessEndTime) result.push(Locale.label("forms.formEdit.endReqMsg"));
    }
    setErrors(result);
    return result.length === 0;
  };

  function handleSave() {
    if (validate()) {
      const f = form;
      if (!showDates) {
        f.accessEndTime = null;
        f.accessStartTime = null;
      }
      saveFormMutation.mutate(f);
    }
  }

  function handleDelete() {
    if (window.confirm(Locale.label("forms.formEdit.confirmMsg"))) {
      deleteFormMutation.mutate(form.id!);
    }
  }

  return (
    <InputBox
      id="formBox"
      headerIcon="format_align_left"
      headerText={Locale.label("forms.formEdit.editForm")}
      saveFunction={handleSave}
      isSubmitting={saveFormMutation.isPending || deleteFormMutation.isPending}
      cancelFunction={props.updatedFunction}
      deleteFunction={props.formId ? handleDelete : undefined}>
      <ErrorMessages errors={errors} />
      <TextField fullWidth={true} label={Locale.label("forms.formEdit.name")} type="text" name="name" value={form.name} onChange={handleChange} placeholder={Locale.label("placeholders.form.name")} data-testid="form-name-input" aria-label="Form name" />
      {!props.formId && (
        <FormControl fullWidth>
          <InputLabel id="associate">{Locale.label("forms.formEdit.associate")}</InputLabel>
          <Select
            name="contentType"
            labelId="associate"
            label={Locale.label("forms.formEdit.associate")}
            value={form.contentType}
            onChange={(e) => {
              handleChange(e);
              if (e.target.value === "form") setStandAloneForm(true);
            }}
            data-testid="content-type-select"
            aria-label="Content type">
            <MenuItem value="person">{Locale.label("forms.formEdit.ppl")}</MenuItem>
            <MenuItem value="form">{Locale.label("forms.formEdit.alone")}</MenuItem>
          </Select>
        </FormControl>
      )}
      {standAloneForm && (
        <>
          <FormControl fullWidth>
            <InputLabel>{Locale.label("forms.formEdit.access")}</InputLabel>
            <Select
              label={Locale.label("forms.formEdit.access")}
              name="restricted"
              value={form?.restricted?.toString()}
              onChange={handleChange}
              data-testid="access-level-select"
              aria-label="Access level">
              <MenuItem value="false">{Locale.label("forms.formEdit.public")}</MenuItem>
              <MenuItem value="true">{Locale.label("forms.formEdit.restrict")}</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>{Locale.label("forms.formEdit.available")}</InputLabel>
            <Select
              label={Locale.label("forms.formEdit.available")}
              name="limit"
              value={showDates.toString()}
              onChange={(e) => {
                setShowDates(e.target.value === "true");
              }}>
              <MenuItem value="false">{Locale.label("common.no")}</MenuItem>
              <MenuItem value="true">{Locale.label("common.yes")}</MenuItem>
            </Select>
          </FormControl>
        </>
      )}
      {showDates && (
        <>
          <TextField
            fullWidth={true}
            type="date"
            label={Locale.label("forms.formEdit.availableStart")}
            InputLabelProps={{ shrink: true }}
            name="accessStartTime"
            value={DateHelper.formatHtml5Date(form.accessStartTime)}
            onChange={handleChange}
            InputProps={{ inputProps: { max: DateHelper.formatHtml5Date(form.accessEndTime) } }}
          />
          <TextField
            fullWidth={true}
            type="date"
            label={Locale.label("forms.formEdit.availableEnd")}
            InputLabelProps={{ shrink: true }}
            name="accessEndTime"
            value={DateHelper.formatHtml5Date(form.accessEndTime)}
            onChange={handleChange}
            InputProps={{ inputProps: { min: DateHelper.formatHtml5Date(form.accessStartTime) } }}
          />
        </>
      )}
      <TextField fullWidth={true} label={Locale.label("forms.formEdit.thankYouMessage")} type="text" name="thankYouMessage" value={form.thankYouMessage} onChange={handleChange} placeholder={Locale.label("placeholders.form.thankYouMessage")} />
    </InputBox>
  );
}
