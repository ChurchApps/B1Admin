"use client";

import React from "react";
import { UserHelper, ApiHelper, Locale } from "../helpers";
import { Permissions } from "@churchapps/helpers";
import type { PersonInterface, HouseholdInterface } from "@churchapps/helpers";
import { Autocomplete, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, Grid, InputLabel, MenuItem, Select, TextField, Typography } from "@mui/material";
import { ErrorMessages } from "@churchapps/apphelper";
import { useMountedState } from "@churchapps/apphelper";
import { DuplicateDialog } from "../people/components/DuplicateDialog";
import { useQuery } from "@tanstack/react-query";
import { HOUSEHOLD_ROLES, parseTitleOptions } from "../helpers/PersonConstants";

interface CommonProps {
  onCreate?: (person: PersonInterface) => void;
  /** Ask which household role the new person will have (Add Household Member). */
  showHouseholdRole?: boolean;
}

type ConditionalProps = { showInModal: true; onClose: () => void } | { showInModal?: false; onClose?: never };

type Props = CommonProps & ConditionalProps;

export function CreatePerson({ onCreate = () => {}, showInModal = false, showHouseholdRole = false, ...props }: Props) {
  const [person, setPerson] = React.useState<PersonInterface>({ name: { first: "", last: "" }, contactInfo: {} });
  const [errors, setErrors] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [duplicates, setDuplicates] = React.useState<PersonInterface[]>([]);
  const [householdRole, setHouseholdRole] = React.useState("Other");
  const isMounted = useMountedState();
  const churchId = UserHelper.currentUserChurch?.church?.id || "";
  const publicSettings = useQuery<any>({ queryKey: ["/settings/public/" + churchId, "MembershipApi"], enabled: !!churchId });
  const titleOptions = React.useMemo(() => parseTitleOptions(publicSettings.data?.titleOptions), [publicSettings.data]);

  const validate = () => {
    const result = [];
    if (!person.name?.first) result.push(Locale.label("common.createPerson.validate.firstName"));
    if (!person.name?.last) result.push(Locale.label("common.createPerson.validate.lastName"));
    setErrors(result);
    return result.length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setErrors([]);
    const p = { ...person } as PersonInterface;
    const value = e.target.value;
    switch (e.target.name) {
      case "first": p.name.first = value; break;
      case "last": p.name.last = value; break;
      case "email": p.contactInfo.email = value; break;
      case "mobilePhone": p.contactInfo.mobilePhone = value; break;
    }
    setPerson(p);
  };

  const handlePrefixChange = (value: string) => {
    setPerson({ ...person, name: { ...person.name, prefix: value } });
  };

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const checkDuplicates = async (): Promise<PersonInterface[]> => (await ApiHelper.post("/people/duplicates", {
    email: person.contactInfo.email || undefined,
    firstName: person.name.first || undefined,
    lastName: person.name.last || undefined
  }, "MembershipApi")) || [];

  const handleUseExisting = (existing: PersonInterface) => {
    setDuplicates([]);
    onCreate(existing);
    if (showInModal) props.onClose?.();
  };

  const handleCreateAnyway = () => {
    setDuplicates([]);
    handleSave();
  };

  const handleSave = () => {
    const household = { name: person.name.last } as HouseholdInterface;

    setIsSubmitting(true);
    ApiHelper.post("/households", [household], "MembershipApi").then((data: any) => {
      household.id = data[0].id;
      const newPerson: PersonInterface = { ...person, householdId: household.id, name: { ...person.name, display: [person.name.first, person.name.last].join(" ") } };
      ApiHelper.post("/people", [newPerson], "MembershipApi")
        .then((data: any) => {
          newPerson.id = data[0].id;
          onCreate(showHouseholdRole ? { ...newPerson, householdRole } : newPerson);
          setPerson({ name: { first: "", last: "" }, contactInfo: { email: "" } });
          setHouseholdRole("Other");
        })
        .finally(() => {
          if (isMounted()) {
            setIsSubmitting(false);
            if (showInModal) props.onClose?.();
          }
        });
    }).catch(() => { if (isMounted()) setIsSubmitting(false); });
  };

  async function handleSubmit() {
    if (validate()) {
      if (person.contactInfo.email) {
        if (!validateEmail(person.contactInfo.email)) {
          setErrors([Locale.label("common.createPerson.validate.validEmail")]);
          return;
        }
        const matches = await checkDuplicates();
        if (matches.length > 0) {
          setDuplicates(matches);
          return;
        }
      }
      handleSave();
    }
  }

  const titleField = (size?: "small") => (
    <Autocomplete
      freeSolo
      size={size}
      options={titleOptions}
      value={person.name.prefix || ""}
      onInputChange={(_, val) => handlePrefixChange(val)}
      renderInput={(params) => <TextField {...params} margin={size ? "none" : "dense"} fullWidth label={Locale.label("createPerson.title")} inputProps={{ ...params.inputProps, maxLength: 10, "data-testid": "create-person-title" }} />}
    />
  );

  const phoneField = (size?: "small") => (
    <TextField
      size={size}
      margin={size ? "none" : "dense"}
      fullWidth
      type="tel"
      aria-label="mobilePhone"
      label={Locale.label("createPerson.mobilePhone")}
      name="mobilePhone"
      value={person.contactInfo.mobilePhone || ""}
      onChange={handleChange}
      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && !isSubmitting && handleSubmit()}
    />
  );

  const roleField = showHouseholdRole && (
    <FormControl fullWidth margin="dense">
      <InputLabel id="create-person-role">{Locale.label("createPerson.householdRole")}</InputLabel>
      <Select labelId="create-person-role" label={Locale.label("createPerson.householdRole")} value={householdRole} onChange={(e) => setHouseholdRole(e.target.value)} data-testid="create-person-role">
        {HOUSEHOLD_ROLES.map((r) => <MenuItem key={r} value={r}>{Locale.label("people.householdEdit." + r.toLowerCase())}</MenuItem>)}
      </Select>
    </FormControl>
  );

  if (!UserHelper.checkAccess(Permissions.membershipApi.people.edit)) return null;
  const duplicateDialog = duplicates.length > 0 && (
    <DuplicateDialog matches={duplicates} onUseExisting={handleUseExisting} onCreateAnyway={handleCreateAnyway} onClose={() => setDuplicates([])} />
  );
  if (showInModal) {
    return (
      <>
        {duplicateDialog}
        <ErrorMessages errors={errors} />
        <Dialog open onClose={props.onClose} fullWidth>
          <DialogTitle>{Locale.label("createPerson.addNewPerson")}</DialogTitle>
          <DialogContent>
            {titleField()}
            <TextField
              margin="dense"
              required
              fullWidth
              type="text"
              aria-label="firstName"
              label={Locale.label("createPerson.firstName")}
              name="first"
              value={person.name.first || ""}
              onChange={handleChange}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && !isSubmitting && handleSubmit()}
              placeholder={Locale.label("placeholders.person.firstName")}
            />
            <TextField
              margin="dense"
              required
              fullWidth
              type="text"
              aria-label="lastName"
              label={Locale.label("createPerson.lastName")}
              name="last"
              value={person.name.last || ""}
              onChange={handleChange}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && !isSubmitting && handleSubmit()}
              placeholder={Locale.label("placeholders.person.lastName")}
            />
            <TextField
              margin="dense"
              fullWidth
              type="text"
              aria-label="email"
              label={Locale.label("createPerson.email")}
              name="email"
              value={person.contactInfo.email || ""}
              onChange={handleChange}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && !isSubmitting && handleSubmit()}
              placeholder={Locale.label("placeholders.person.simpleEmail")}
            />
            {phoneField()}
            {roleField}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                props.onClose?.();
              }}>
              {Locale.label("common.cancel")}
            </Button>
            <Button type="submit" variant="contained" disabled={isSubmitting} onClick={handleSubmit}>
              {Locale.label("common.add")}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }
  return (
    <div>
      {duplicateDialog}
      <Typography variant="h3" component="h2" sx={{ mb: 2 }}>{Locale.label("createPerson.addNewPerson")}</Typography>
      <ErrorMessages errors={errors} />
      <Grid container spacing={3} alignItems="center">
        <Grid size={{ xs: 12, md: 2 }}>{titleField("small")}</Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <TextField
            size="small"
            margin="none"
            required
            fullWidth
            type="text"
            aria-label="firstName"
            label={Locale.label("createPerson.firstName")}
            name="first"
            value={person.name.first || ""}
            onChange={handleChange}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && !isSubmitting && handleSubmit()}
            placeholder={Locale.label("placeholders.person.firstName")}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <TextField
            size="small"
            margin="none"
            required
            fullWidth
            type="text"
            aria-label="lastName"
            label={Locale.label("createPerson.lastName")}
            name="last"
            value={person.name.last || ""}
            onChange={handleChange}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && !isSubmitting && handleSubmit()}
            placeholder={Locale.label("placeholders.person.lastName")}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <TextField
            size="small"
            margin="none"
            fullWidth
            type="text"
            aria-label="email"
            label={Locale.label("createPerson.email")}
            name="email"
            value={person.contactInfo.email || ""}
            onChange={handleChange}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && !isSubmitting && handleSubmit()}
            placeholder={Locale.label("placeholders.person.simpleEmail")}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>{phoneField("small")}</Grid>
        <Grid size={12}>
          <Button type="submit" fullWidth variant="contained" disabled={isSubmitting} onClick={handleSubmit}>
            {Locale.label("common.add")}
          </Button>
        </Grid>
      </Grid>
    </div>
  );
}
