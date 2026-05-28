import React, { useState, memo, useCallback } from "react";
import { useForm, Controller, useFormState } from "react-hook-form";
import { MuiTelInput, matchIsValidTel } from "mui-tel-input";
import { B1AdminPersonHelper, UpdateHouseHold } from ".";
import { type PersonInterface } from "@churchapps/helpers";
import { PersonHelper, DateHelper, InputBox, ApiHelper, Loading, ErrorMessages, Locale, PersonAvatar } from "@churchapps/apphelper";
import { Navigate } from "react-router-dom";
import UserContext from "../../UserContext";
import { Button, FormControl, Grid, InputLabel, MenuItem, Select, TextField, Box, FormControlLabel, Checkbox } from "@mui/material";
import { getMembershipStatusOptions } from "../helpers/MembershipStatusOptions";

// PersonInterface has typed subfields; RHF nested paths require looser typing
type AnyRecord = Record<string, any>;

interface Props {
  id?: string;
  updatedFunction: () => void;
  togglePhotoEditor: (show: boolean, inProgressEditPerson: PersonInterface) => void;
  person: PersonInterface;
  showMergeSearch: () => void;
}

export function formattedPhoneNumber(value: string) {
  if (!value) return "";
  value = value.split("x")[0];
  value = value.replaceAll(" ", "-");
  return value;
}

const phoneSlotProps = { htmlInput: { "aria-describedby": "errorMsg", "aria-labelledby": "tel-label errorMsg" } };
const phoneMenuProps = { "aria-label": "phone-number" };
const phoneRules = (v: string) => !v || v.length <= 4 || matchIsValidTel(v.split("x")[0]) || Locale.label("people.personEdit.invalForm");
const phoneHelperText = (hasError: boolean) => (
  <div id="errorMsg">{hasError && <p style={{ margin: 0, color: "#d32f2f" }}>{Locale.label("people.personEdit.invalForm")}</p>}</div>
);

// Normalize legacy phone formats like "(217) 555-2504" or "217-555-2504" into E.164
// so MuiTelInput can render them with country flag and spacing.
const normalizePhone = (raw: string | null | undefined): string => {
  if (!raw) return "";
  const [base, ext] = raw.split("x");
  const digits = (base ?? "").replace(/\D/g, "");
  if (!digits) return ext ? "x" + ext : "";
  const normalized = (base ?? "").trim().startsWith("+") ? "+" + digits
    : digits.length === 10 ? "+1" + digits
      : digits.length === 11 && digits.startsWith("1") ? "+" + digits
        : "+" + digits;
  return ext ? normalized + "x" + ext : normalized;
};

const buildFormDefaults = (p: PersonInterface) => ({
  ...p,
  birthDate: DateHelper.formatHtml5Date(p?.birthDate) || null,
  anniversary: DateHelper.formatHtml5Date(p?.anniversary) || null,
  contactInfo: {
    ...p?.contactInfo,
    homePhone: normalizePhone(p?.contactInfo?.homePhone),
    workPhone: normalizePhone(p?.contactInfo?.workPhone),
    mobilePhone: normalizePhone(p?.contactInfo?.mobilePhone)
  }
});

export const PersonEdit = memo((props: Props) => {
  const context = React.useContext(UserContext);
  const [redirect, setRedirect] = useState("");
  const [showUpdateAddressModal, setShowUpdateAddressModal] = useState(false);
  const [modalText, setModalText] = useState("");
  const [members, setMembers] = useState<PersonInterface[]>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, register, handleSubmit, reset, getValues } = useForm<AnyRecord>({ defaultValues: buildFormDefaults(props.person) });

  const { errors } = useFormState({ control });

  React.useEffect(() => {
    if (props.person) reset(buildFormDefaults(props.person));
  }, [props.person, reset]);

  const e = errors as any;
  const summaryErrors: string[] = React.useMemo(() => {
    const errs: string[] = [];
    if (e.name?.first?.message) errs.push(e.name.first.message);
    if (e.name?.last?.message) errs.push(e.name.last.message);
    if (e.contactInfo?.email?.message) errs.push(e.contactInfo.email.message);
    return errs;
  }, [errors]);

  const fetchMembers = useCallback(() => {
    if (props.person.householdId != null) {
      ApiHelper.get("/people/household/" + props.person.householdId, "MembershipApi").then((data: PersonInterface[]) => setMembers(data));
    }
  }, [props.person.householdId]);

  React.useEffect(fetchMembers, [fetchMembers]);

  const buildPerson = useCallback((values: AnyRecord): PersonInterface => {
    const p: PersonInterface = JSON.parse(JSON.stringify(props.person));
    Object.assign(p, values);
    if (p.contactInfo) {
      p.contactInfo.homePhone = (p.contactInfo.homePhone?.length ?? 0) <= 4 ? null : p.contactInfo.homePhone;
      p.contactInfo.workPhone = (p.contactInfo.workPhone?.length ?? 0) <= 4 ? null : p.contactInfo.workPhone;
      p.contactInfo.mobilePhone = (p.contactInfo.mobilePhone?.length ?? 0) <= 4 ? null : p.contactInfo.mobilePhone;
    }
    return p;
  }, [props.person]);

  const updatePerson = useCallback(async (p: PersonInterface) => {
    try {
      await ApiHelper.post("/people/", [p], "MembershipApi");
      props.updatedFunction();
    } catch (error) {
      console.error("Error updating person:", error);
    }
    setIsSubmitting(false);
  }, [props.updatedFunction]);

  const onValid = useCallback(async (values: AnyRecord) => {
    setIsSubmitting(true);
    const p = buildPerson(values);

    if (B1AdminPersonHelper.getExpandedPersonObject(p).id === context.person?.id) context.setPerson(p);

    if (members && members.length > 1 && PersonHelper.compareAddress(props.person.contactInfo, p.contactInfo)) {
      setModalText(
        `${Locale.label("people.personEdit.upAddress")} ${PersonHelper.addressToString(p.contactInfo)} ${Locale.label("people.personEdit.for")} ${p.name.display}.  ${Locale.label("people.personEdit.applyQuestion")} ${p.name.last} ${Locale.label("people.personEdit.family")}?`
      );
      setShowUpdateAddressModal(true);
      setIsSubmitting(false);
      return;
    }
    await updatePerson(p);
  }, [props.person, members, context, updatePerson, buildPerson]);

  const handleDelete = useCallback(() => {
    if (!props.person?.id) return;
    if (B1AdminPersonHelper.getExpandedPersonObject(props.person).id === context.person?.id) {
      alert(Locale.label("people.personEdit.cannotDeleteSelf"));
      return;
    }
    if (window.confirm(Locale.label("people.personEdit.confirmMsg"))) {
      ApiHelper.delete("/people/" + props.person.id.toString(), "MembershipApi").then(() => setRedirect("/people"));
    }
  }, [props.person?.id, context.person?.id]);

  const handleYes = useCallback(async () => {
    setShowUpdateAddressModal(false);
    const p = buildPerson(getValues());
    await Promise.all(members.map(async (member) => {
      member.contactInfo = PersonHelper.changeOnlyAddress(member.contactInfo, p.contactInfo);
      try { await ApiHelper.post("/people", [member], "MembershipApi"); } catch (error) { console.log(`error in updating ${p.name.display}"s address`, error); }
    }));
    props.updatedFunction();
  }, [members, getValues, buildPerson, props.updatedFunction]);

  const handleNo = useCallback(() => {
    setShowUpdateAddressModal(false);
    updatePerson(buildPerson(getValues()));
  }, [getValues, buildPerson, updatePerson]);

  if (!props.person) return <Loading />;

  return (
    <>
      <UpdateHouseHold show={showUpdateAddressModal} text={modalText} onHide={() => setShowUpdateAddressModal(false)} handleNo={handleNo} handleYes={handleYes} />
      <InputBox headerIcon="person" headerText={Locale.label("people.personEdit.persDet")} cancelFunction={props.updatedFunction} deleteFunction={handleDelete} saveFunction={handleSubmit(onValid)} isSubmitting={isSubmitting}
        headerActionContent={
          <Button id="mergeButton" size="small" onClick={props.showMergeSearch} data-testid="merge-person-button" aria-label={Locale.label("people.personEdit.mergePersonAria")}>
            {Locale.label("people.personEdit.merge")}
          </Button>
        }>
        <ErrorMessages errors={summaryErrors} />
        <Grid container spacing={3}>
          <Grid size={{ sm: 3 }} className="my-auto">
            <Box sx={{ textAlign: "center" }}>
              <div style={{ border: "3px solid #fff", borderRadius: "50%", boxShadow: "0 2px 4px rgba(0,0,0,0.2)", display: "inline-block" }}>
                <PersonAvatar person={props.person} size="xxlarge" onClick={() => props.togglePhotoEditor(true, buildPerson(getValues()))} />
              </div>
            </Box>
          </Grid>
          <Grid size={{ sm: 1 }}></Grid>
          <Grid size={{ sm: 8 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth label={Locale.label("person.firstName")} id="first" placeholder={Locale.label("placeholders.person.firstName")} data-testid="first-name-input" aria-label="First name" error={!!e.name?.first} helperText={e.name?.first?.message} {...register("name.first", { required: Locale.label("people.personEdit.firstReq") })} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth label={Locale.label("person.middleName")} id="middle" placeholder={Locale.label("placeholders.person.middleName")} {...register("name.middle")} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth label={Locale.label("person.lastName")} id="last" placeholder={Locale.label("placeholders.person.lastName")} data-testid="last-name-input" aria-label="Last name" error={!!e.name?.last} helperText={e.name?.last?.message} {...register("name.last", { required: Locale.label("people.personEdit.lastReq") })} />
              </Grid>
            </Grid>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth label={Locale.label("person.email")} type="email" id="email" placeholder={Locale.label("placeholders.person.email")} data-testid="email-input" aria-label="Email address" error={!!e.contactInfo?.email} helperText={e.contactInfo?.email?.message} {...register("contactInfo.email", { validate: (v: string) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || Locale.label("people.personEdit.valEmail") })} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField inputProps={{ maxLength: 20 }} fullWidth label={Locale.label("people.personEdit.nameNote")} id="nametagnotes" placeholder={Locale.label("placeholders.person.nameTag")} {...register("nametagNotes")} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth label={Locale.label("people.personEdit.donorNumber")} id="donorNumber" placeholder={Locale.label("placeholders.person.donorNumber")} data-testid="donor-number-input" aria-label="Donor number" {...register("donorNumber")} />
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField fullWidth id="nick" label={Locale.label("person.nickName")} placeholder={Locale.label("placeholders.person.nickname")} data-testid="nickname-input" aria-label="Nickname" {...register("name.nick")} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel id="membershipStatus-label">{Locale.label("person.membershipStatus")}</InputLabel>
              <Controller name="membershipStatus" control={control} render={({ field }) => (
                <Select {...field} value={field.value ?? ""} id="membershipStatus" labelId="membershipStatus-label" label={Locale.label("person.membershipStatus")} data-testid="membership-status-select" aria-label="Membership status">
                  {getMembershipStatusOptions().map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                </Select>
              )} />
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField fullWidth type="date" id="birthDate" InputLabelProps={{ shrink: true }} label={Locale.label("person.birthDate")} data-testid="birth-date-input" aria-label="Birth date" {...register("birthDate")} />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel id="gender-label">{Locale.label("person.gender")}</InputLabel>
              <Controller name="gender" control={control} render={({ field }) => (
                <Select {...field} value={field.value ?? ""} id="gender" labelId="gender-label" label={Locale.label("person.gender")} data-testid="gender-select" aria-label="Gender">
                  <MenuItem value="Unspecified">{Locale.label("person.unspecified")}</MenuItem>
                  <MenuItem value="Male">{Locale.label("person.male")}</MenuItem>
                  <MenuItem value="Female">{Locale.label("person.female")}</MenuItem>
                </Select>
              )} />
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel id="maritalStatus-label">{Locale.label("person.maritalStatus")}</InputLabel>
              <Controller name="maritalStatus" control={control} render={({ field }) => (
                <Select {...field} value={field.value ?? ""} id="maritalStatus" labelId="maritalStatus-label" label={Locale.label("people.personEdit.maritalStatus")} data-testid="marital-status-select" aria-label="Marital status">
                  <MenuItem value="Unknown">{Locale.label("person.unknown")}</MenuItem>
                  <MenuItem value="Single">{Locale.label("person.single")}</MenuItem>
                  <MenuItem value="Married">{Locale.label("person.married")}</MenuItem>
                  <MenuItem value="Divorced">{Locale.label("person.divorced")}</MenuItem>
                  <MenuItem value="Widowed">{Locale.label("person.widowed")}</MenuItem>
                </Select>
              )} />
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField fullWidth type="date" id="anniversary" InputLabelProps={{ shrink: true }} label={Locale.label("person.anniversary")} data-testid="anniversary-input" aria-label="Anniversary" {...register("anniversary")} />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid size={{ md: 8 }}>
            <div className="section">{Locale.label("person.address")}</div>
            <TextField fullWidth id="address1" label={Locale.label("person.line1")} placeholder={Locale.label("placeholders.person.address1")} data-testid="address1-input" aria-label="Address line 1" {...register("contactInfo.address1")} />
            <TextField fullWidth id="address2" label={Locale.label("person.line2")} placeholder={Locale.label("placeholders.person.address2")} data-testid="address2-input" aria-label="Address line 2" {...register("contactInfo.address2")} />
            <Grid container spacing={3}>
              <Grid size={{ xs: 6 }}>
                <TextField fullWidth id="city" label={Locale.label("person.city")} placeholder={Locale.label("placeholders.person.city")} data-testid="city-input" aria-label="City" {...register("contactInfo.city")} />
              </Grid>
              <Grid size={{ xs: 3 }}>
                <TextField fullWidth id="state" label={Locale.label("person.state")} placeholder={Locale.label("placeholders.person.state")} data-testid="state-input" aria-label="State" {...register("contactInfo.state")} />
              </Grid>
              <Grid size={{ xs: 3 }}>
                <TextField fullWidth id="zip" label={Locale.label("person.zip")} placeholder={Locale.label("placeholders.person.zip")} data-testid="zip-input" aria-label="ZIP code" {...register("contactInfo.zip")} />
              </Grid>
            </Grid>
          </Grid>

          <Grid size={{ md: 3 }}>
            <div className="section">{Locale.label("person.phone")}</div>
            {(["homePhone", "workPhone", "mobilePhone"] as const).map((field) => {
              const labelKey = field === "homePhone" ? "people.personEdit.home" : field === "workPhone" ? "people.personEdit.work" : "people.personEdit.mobile";
              return (
                <Controller key={field} name={`contactInfo.${field}`} control={control} rules={{ validate: phoneRules }} render={({ field: f, fieldState }) => (
                  <MuiTelInput fullWidth id={field} label={Locale.label(labelKey)} value={f.value?.split("x")[0] ?? ""} onChange={(v) => { const ext = f.value?.split("x")[1] ?? ""; f.onChange(ext ? v + "x" + ext : v); }} defaultCountry="US" focusOnSelectCountry slotProps={phoneSlotProps} error={!!fieldState.error} MenuProps={phoneMenuProps} helperText={phoneHelperText(!!fieldState.error)} />
                )} />
              );
            })}
          </Grid>

          <Grid size={{ md: 1 }}>
            <div className="section">{Locale.label("people.personEdit.exten")}</div>
            {(["homePhone", "workPhone", "mobilePhone"] as const).map((field) => {
              const labelKey = field === "homePhone" ? "people.personEdit.home" : field === "workPhone" ? "people.personEdit.work" : "people.personEdit.mobile";
              return (
                <Controller key={field} name={`contactInfo.${field}`} control={control} render={({ field: f }) => (
                  <TextField fullWidth label={Locale.label(labelKey)} value={f.value?.split("x")[1] ?? ""} onChange={(ev) => { const base = f.value?.split("x")[0] ?? ""; f.onChange(base + "x" + ev.target.value); }} InputProps={{ inputProps: { maxLength: 4 } }} placeholder={Locale.label("placeholders.person.phoneExt")} />
                )} />
              );
            })}
          </Grid>
        </Grid>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid size={12}>
            <Controller name="optedOut" control={control} render={({ field }) => (
              <FormControlLabel control={<Checkbox checked={field.value ?? false} onChange={(ev) => field.onChange(ev.target.checked)} data-testid="opt-out-checkbox" />} label={Locale.label("profile.profilePage.noDirect")} />
            )} />
          </Grid>
        </Grid>
      </InputBox>
      {redirect !== "" && <Navigate to={redirect} />}
    </>
  );
});
