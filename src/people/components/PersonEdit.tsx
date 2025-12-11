import React, { useState, memo, useCallback, useMemo } from "react";
import { MuiTelInput, matchIsValidTel } from "mui-tel-input";
import { B1AdminPersonHelper, UpdateHouseHold } from ".";
import { type PersonInterface } from "@churchapps/helpers";
import {
  PersonHelper, DateHelper, InputBox, ApiHelper, Loading, ErrorMessages, Locale, PersonAvatar 
} from "@churchapps/apphelper";
import { Navigate } from "react-router-dom";
import UserContext from "../../UserContext";
import {
  Button, FormControl, Grid, InputLabel, MenuItem, Select, TextField, Box, type SelectChangeEvent, FormControlLabel, Checkbox 
} from "@mui/material";

interface Props {
  id?: string;
  updatedFunction: () => void;
  togglePhotoEditor: (show: boolean, inProgressEditPerson: PersonInterface) => void;
  person: PersonInterface;
  showMergeSearch: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export function formattedPhoneNumber(value: string) {
  if (!value) return "";
  value = value.split("x")[0];
  value = value.replaceAll(" ", "-");
  return value;
}

export const PersonEdit = memo((props: Props) => {
  const context = React.useContext(UserContext);
  const [redirect, setRedirect] = useState("");
  const [showUpdateAddressModal, setShowUpdateAddressModal] = useState<boolean>(false);
  const [text, setText] = useState("");
  const [members, setMembers] = useState<PersonInterface[]>(null);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [phoneHasError, setPhoneHasError] = React.useState({ homePhone: false, workPhone: false, mobilePhone: false });

  const [person, setPerson] = React.useState<PersonInterface>({
    name: {
      first: "",
      last: "",
      middle: "",
      nick: "",
      display: "",
    },
    contactInfo: {
      address1: "",
      address2: "",
      city: "",
      state: "",
      zip: "",
      email: "",
      homePhone: "",
      workPhone: "",
      mobilePhone: "",
    },
    membershipStatus: "",
    gender: "",
    birthDate: null,
    maritalStatus: "",
    nametagNotes: "",
    optedOut: false,
  });

  //const handleKeyDown = (e: React.KeyboardEvent<any>) => { if (e.key === "Enter") { e.preventDefault(); handleSave(); } }
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | SelectChangeEvent) => {
      setErrors([]);
      const p = { ...person } as PersonInterface;
      const value = e.target.value;
      switch (e.target.name) {
        case "name.first":
          p.name.first = value;
          break;
        case "name.middle":
          p.name.middle = value;
          break;
        case "name.last":
          p.name.last = value;
          break;
        case "name.nick":
          p.name.nick = value;
          break;
        case "contactInfo.email":
          p.contactInfo.email = value;
          break;
        case "contactInfo.address1":
          p.contactInfo.address1 = value;
          break;
        case "contactInfo.address2":
          p.contactInfo.address2 = value;
          break;
        case "contactInfo.city":
          p.contactInfo.city = value;
          break;
        case "contactInfo.state":
          p.contactInfo.state = value;
          break;
        case "contactInfo.zip":
          p.contactInfo.zip = value;
          break;
        case "membershipStatus":
          p.membershipStatus = value;
          break;
        case "gender":
          p.gender = value;
          break;
        case "maritalStatus":
          p.maritalStatus = value;
          break;
        case "nametagNotes":
          p.nametagNotes = value;
          break;
        case "donorNumber":
          p.donorNumber = value;
          break;
        case "anniversary":
          p.anniversary = value ? DateHelper.toDate(value) : null;
          break;
        case "birthDate":
          p.birthDate = value ? DateHelper.toDate(value) : null;
          break;
        case "photo":
          p.photo = value;
          break;
        case "optedOut":
          p.optedOut = (e.target as HTMLInputElement).checked;
          break;
      }
      setPerson(p);
    },
    [person]
  );

  const handlePhoneChange = useCallback(
    (value: string, field: "homePhone" | "workPhone" | "mobilePhone") => {
      setPhoneHasError((prevState) => ({ ...prevState, [field]: !matchIsValidTel(value) }));
      const p: PersonInterface = { ...person };
      p.contactInfo[field] = value;
      setPerson(p);
    },
    [person]
  );

  const handleDelete = useCallback(() => {
    if (!person?.id) return;
    if (window.confirm(Locale.label("people.personEdit.confirmMsg"))) {
      ApiHelper.delete("/people/" + person.id.toString(), "MembershipApi").then(() => setRedirect("/people"));
    }
  }, [person?.id]);

  const validateEmail = useCallback((email: string) => /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(.\w{2,3})+$/.test(email), []);

  const validate = useCallback(() => {
    const result = [];
    if (!person.name.first) result.push(Locale.label("people.personEdit.firstReq"));
    if (!person.name.last) result.push(Locale.label("people.personEdit.lastReq"));
    if (person.contactInfo.email && !validateEmail(person.contactInfo.email)) result.push(Locale.label("people.personEdit.valEmail"));
    setErrors(result);
    return result.length === 0;
  }, [person.name.first, person.name.last, person.contactInfo.email, validateEmail]);

  const handleSave = useCallback(async () => {
    if (validate()) {
      setIsSubmitting(true);
      const p = JSON.parse(JSON.stringify({ ...person }));
      p.contactInfo.homePhone = p.contactInfo.homePhone?.length <= 4 ? null : p.contactInfo.homePhone;
      p.contactInfo.workPhone = p.contactInfo.workPhone?.length <= 4 ? null : p.contactInfo.workPhone;
      p.contactInfo.mobilePhone = p.contactInfo.mobilePhone?.length <= 4 ? null : p.contactInfo.mobilePhone;
      if (B1AdminPersonHelper.getExpandedPersonObject(person).id === context.person?.id) context.setPerson(person);

      const { contactInfo: contactFromProps } = props.person;

      if (members && members.length > 1 && PersonHelper.compareAddress(contactFromProps, person.contactInfo)) {
        setText(
          `${Locale.label("people.personEdit.upAddress")} ${PersonHelper.addressToString(person.contactInfo)} ${Locale.label("people.personEdit.for")} ${person.name.display}.  ${Locale.label("people.personEdit.applyQuestion")} ${person.name.last} ${Locale.label("people.personEdit.family")}?`
        );
        setShowUpdateAddressModal(true);
        return;
      }

      await updatePerson(p);
    }
  }, [validate, person, context, props.person, members]);

  const handleChangeExtention = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const p = { ...person } as PersonInterface;
      const value = e.target.value;
      switch (e.target.name) {
        case "contactInfo.homePhone":
          p.contactInfo.homePhone = p.contactInfo.homePhone?.split("x")[0] + "x" + value;
          break;
        case "contactInfo.workPhone":
          p.contactInfo.workPhone = p.contactInfo.workPhone?.split("x")[0] + "x" + value;
          break;
        case "contactInfo.mobilePhone":
          p.contactInfo.mobilePhone = p.contactInfo.mobilePhone?.split("x")[0] + "x" + value;
          break;
      }
      setPerson(p);
    },
    [person]
  );

  const updatePerson = useCallback(
    async (p: PersonInterface) => {
      try {
        await ApiHelper.post("/people/", [p], "MembershipApi");
        props.updatedFunction();
        setIsSubmitting(false);
      } catch (error) {
        console.error("Error updating person:", error);
        setIsSubmitting(false);
      }
    },
    [props.updatedFunction]
  );

  const handleYes = useCallback(async () => {
    setShowUpdateAddressModal(false);
    await Promise.all(
      members.map(async (member) => {
        member.contactInfo = PersonHelper.changeOnlyAddress(member.contactInfo, person.contactInfo);
        try {
          await ApiHelper.post("/people", [member], "MembershipApi");
        } catch (error) {
          console.log(`error in updating ${person.name.display}"s address`, error);
        }
      })
    );
    props.updatedFunction();
  }, [members, person.contactInfo, person.name.display, props.updatedFunction]);

  const handleNo = useCallback(() => {
    setShowUpdateAddressModal(false);
    updatePerson(person);
  }, [person, updatePerson]);

  const fetchMembers = useCallback(() => {
    try {
      if (props.person.householdId != null) {
        ApiHelper.get("/people/household/" + props.person.householdId, "MembershipApi").then((data) => {
          setMembers(data);
        });
      }
    } catch (error) {
      console.log(`Error occured in fetching household members`, error);
    }
  }, [props.person.householdId]);

  const handlePhotoClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      props.togglePhotoEditor(true, person);
    },
    [props.togglePhotoEditor, person]
  );

  React.useEffect(() => {
    setPerson({ ...props.person });
    return () => {
      setPerson(null);
    };
  }, [props.person]);

  React.useEffect(fetchMembers, [fetchMembers]);

  const ariaLabel = useMemo(() => ({ "aria-label": "phone-number" }), []);

  const ariaDesc = useMemo(
    () => ({
      "aria-describedby": "errorMsg",
      "aria-labelledby": "tel-label errorMsg",
    }),
    []
  );

  const editForm = !person ? (
    <Loading />
  ) : (
    <InputBox
      headerIcon="person"
      headerText={Locale.label("people.personEdit.persDet")}
      cancelFunction={props.updatedFunction}
      deleteFunction={handleDelete}
      saveFunction={handleSave}
      isSubmitting={isSubmitting}
      headerActionContent={
        <Button id="mergeButton" size="small" onClick={props.showMergeSearch} data-testid="merge-person-button" aria-label="Merge person">
          {Locale.label("people.personEdit.merge")}
        </Button>
      }>
      <ErrorMessages errors={errors} />
      <Grid container spacing={3}>
        <Grid size={{ sm: 3 }} className="my-auto">
          <Box sx={{ textAlign: "center" }}>
            <div style={{ border: "3px solid #fff", borderRadius: "50%", boxShadow: "0 2px 4px rgba(0,0,0,0.2)", display: "inline-block" }}>
              <PersonAvatar person={person} size="xxlarge" onClick={handlePhotoClick} />
            </div>
          </Box>
        </Grid>
        <Grid size={{ sm: 1 }}></Grid>
        <Grid size={{ sm: 8 }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth name="name.first" label={Locale.label("person.firstName")} id="first" value={person.name.first || ""} onChange={handleChange} data-testid="first-name-input" aria-label="First name" />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth name="name.middle" label={Locale.label("person.middleName")} id="middle" value={person.name.middle || ""} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth name="name.last" label={Locale.label("person.lastName")} id="last" value={person.name.last || ""} onChange={handleChange} data-testid="last-name-input" aria-label="Last name" />
            </Grid>
          </Grid>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth name="contactInfo.email" label={Locale.label("person.email")} type="email" id="email" value={person.contactInfo.email || ""} onChange={handleChange} data-testid="email-input" aria-label="Email address" />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField inputProps={{ maxLength: 20 }} fullWidth name="nametagNotes" label={Locale.label("people.personEdit.nameNote")} id="nametagnotes" value={person.nametagNotes || ""} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth name="donorNumber" label={Locale.label("people.personEdit.donorNumber")} id="donorNumber" value={person.donorNumber || ""} onChange={handleChange} data-testid="donor-number-input" aria-label="Donor number" />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField fullWidth name="name.nick" id="nick" label={Locale.label("person.nickName")} value={person.name.nick || ""} onChange={handleChange} data-testid="nickname-input" aria-label="Nickname" />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <FormControl fullWidth>
            <InputLabel id="membershipStatus-label">{Locale.label("person.membershipStatus")}</InputLabel>
            <Select name="membershipStatus" id="membershipStatus" labelId="membershipStatus-label" label={Locale.label("person.membershipStatus")} value={person.membershipStatus || ""} onChange={handleChange} data-testid="membership-status-select" aria-label="Membership status">
              <MenuItem value="Visitor">{Locale.label("person.visitor")}</MenuItem>
              <MenuItem value="Regular Attendee">{Locale.label("person.regularAttendee")}</MenuItem>
              <MenuItem value="Member">{Locale.label("person.member")}</MenuItem>
              <MenuItem value="Staff">{Locale.label("person.staff")}</MenuItem>
              <MenuItem value="Inactive">{Locale.label("person.inactive")}</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField fullWidth type="date" name="birthDate" id="birthDate" InputLabelProps={{ shrink: true }} label={Locale.label("person.birthDate")} value={DateHelper.formatHtml5Date(person.birthDate)} onChange={handleChange} data-testid="birth-date-input" aria-label="Birth date" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <FormControl fullWidth>
            <InputLabel id="gender-label">{Locale.label("person.gender")}</InputLabel>
            <Select name="gender" id="gender" labelId="gender-label" label={Locale.label("person.gender")} value={person.gender || ""} onChange={handleChange} data-testid="gender-select" aria-label="Gender">
              <MenuItem value="Unspecified">{Locale.label("person.unspecified")}</MenuItem>
              <MenuItem value="Male">{Locale.label("person.male")}</MenuItem>
              <MenuItem value="Female">{Locale.label("person.female")}</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <FormControl fullWidth>
            <InputLabel id="maritalStatus-label">{Locale.label("person.maritalStatus")}</InputLabel>
            <Select name="maritalStatus" id="maritalStatus" label={Locale.label("people.personEdit.maritalStatus")} labelId="maritalStatus-label" value={person.maritalStatus || ""} onChange={handleChange} data-testid="marital-status-select" aria-label="Marital status">
              <MenuItem value="Unknown">{Locale.label("person.unknown")}</MenuItem>
              <MenuItem value="Single">{Locale.label("person.single")}</MenuItem>
              <MenuItem value="Married">{Locale.label("person.married")}</MenuItem>
              <MenuItem value="Divorced">{Locale.label("person.divorced")}</MenuItem>
              <MenuItem value="Widowed">{Locale.label("person.widowed")}</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField fullWidth type="date" name="anniversary" id="anniversary" InputLabelProps={{ shrink: true }} label={Locale.label("person.anniversary")} value={DateHelper.formatHtml5Date(person.anniversary)} onChange={handleChange} data-testid="anniversary-input" aria-label="Anniversary" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ md: 8 }}>
          <div className="section">{Locale.label("person.address")}</div>
          <TextField name="contactInfo.address1" id="address1" fullWidth label={Locale.label("person.line1")} value={person.contactInfo?.address1 || ""} onChange={handleChange} data-testid="address1-input" aria-label="Address line 1" />
          <TextField name="contactInfo.address2" id="address2" fullWidth label={Locale.label("person.line2")} value={person.contactInfo?.address2 || ""} onChange={handleChange} data-testid="address2-input" aria-label="Address line 2" />
          <Grid container spacing={3}>
            <Grid size={{ xs: 6 }}>
              <TextField name="contactInfo.city" id="city" fullWidth label={Locale.label("person.city")} value={person.contactInfo?.city || ""} onChange={handleChange} data-testid="city-input" aria-label="City" />
            </Grid>
            <Grid size={{ xs: 3 }}>
              <TextField name="contactInfo.state" id="state" fullWidth label={Locale.label("person.state")} value={person.contactInfo?.state || ""} onChange={handleChange} data-testid="state-input" aria-label="State" />
            </Grid>
            <Grid size={{ xs: 3 }}>
              <TextField name="contactInfo.zip" id="zip" fullWidth label={Locale.label("person.zip")} value={person.contactInfo?.zip || ""} onChange={handleChange} data-testid="zip-input" aria-label="ZIP code" />
            </Grid>
          </Grid>
        </Grid>
        <Grid size={{ md: 3 }}>
          <div className="section">{Locale.label("person.phone")}</div>
          <MuiTelInput fullWidth name="contactInfo.homePhone" id="homePhone" label={Locale.label("people.personEdit.home")} value={person.contactInfo?.homePhone} onChange={(value) => handlePhoneChange(value, "homePhone")} defaultCountry="US" focusOnSelectCountry inputProps={ariaDesc} error={phoneHasError.homePhone} MenuProps={ariaLabel} helperText={<div id="errorMsg">{phoneHasError.homePhone && <p style={{ margin: 0, color: "#d32f2f" }}>{Locale.label("people.personEdit.invalForm")}</p>}</div>} />
          <MuiTelInput fullWidth name="contactInfo.workPhone" id="workPhone" label={Locale.label("people.personEdit.work")} value={person.contactInfo?.workPhone} onChange={(value) => handlePhoneChange(value, "workPhone")} defaultCountry="US" focusOnSelectCountry inputProps={ariaDesc} error={phoneHasError.workPhone} MenuProps={ariaLabel} helperText={<div id="errorMsg">{phoneHasError.workPhone && <p style={{ margin: 0, color: "#d32f2f" }}>{Locale.label("people.personEdit.invalForm")}</p>}</div>} />
          <MuiTelInput fullWidth name="contactInfo.mobilePhone" id="mobilePhone" label={Locale.label("people.personEdit.mobile")} value={person.contactInfo?.mobilePhone} onChange={(value) => handlePhoneChange(value, "mobilePhone")} defaultCountry="US" focusOnSelectCountry inputProps={ariaDesc} error={phoneHasError.mobilePhone} MenuProps={ariaLabel} helperText={<div id="errorMsg">{phoneHasError.mobilePhone && <p style={{ margin: 0, color: "#d32f2f" }}>{Locale.label("people.personEdit.invalForm")}</p>}</div>} />
        </Grid>
        <Grid size={{ md: 1 }}>
          <div className="section">{Locale.label("people.personEdit.exten")}</div>
          <TextField fullWidth name="contactInfo.homePhone" label={Locale.label("people.personEdit.home")} value={person.contactInfo?.homePhone?.split("x")[1] || ""} onChange={handleChangeExtention} InputProps={{ inputProps: { maxLength: 4 } }} />
          <TextField fullWidth name="contactInfo.workPhone" label={Locale.label("people.personEdit.work")} value={person.contactInfo?.workPhone?.split("x")[1] || ""} onChange={handleChangeExtention} InputProps={{ inputProps: { maxLength: 4 } }} />
          <TextField fullWidth name="contactInfo.mobilePhone" label={Locale.label("people.personEdit.mobile")} value={person.contactInfo?.mobilePhone?.split("x")[1] || ""} onChange={handleChangeExtention} InputProps={{ inputProps: { maxLength: 4 } }} />
        </Grid>
      </Grid>
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid size={12}>
          <FormControlLabel
            control={<Checkbox name="optedOut" checked={person.optedOut || false} onChange={handleChange} data-testid="opt-out-checkbox" />}
            label={Locale.label("profile.profilePage.noDirect")}
          />
        </Grid>
      </Grid>
    </InputBox>
  );

  if (redirect !== "") return <Navigate to={redirect} />;
  else {
    return (
      <>
        <UpdateHouseHold show={showUpdateAddressModal} text={text} onHide={() => setShowUpdateAddressModal(false)} handleNo={handleNo} handleYes={handleYes} />
        {editForm}
      </>
    );
  }
});
