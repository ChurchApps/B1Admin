import React from "react";
import { UpdateHouseHold } from "./modals/UpdateHouseHold";
import { type HouseholdInterface, type PersonInterface } from "@churchapps/helpers";
import { InputBox, PersonHelper, ApiHelper, ErrorMessages, Locale, PersonAvatar } from "@churchapps/apphelper";
import { PersonAdd } from "../../components";
import { Table, TableBody, TableCell, TableRow, TextField, FormControl, Select, MenuItem, InputLabel, type SelectChangeEvent } from "@mui/material";
import { SmallButton } from "@churchapps/apphelper";

interface Props {
  updatedFunction: () => void;
  household: HouseholdInterface;
  currentMembers: PersonInterface[];
  currentPerson: PersonInterface;
}

export function HouseholdEdit(props: Props) {
  const [members, setMembers] = React.useState<PersonInterface[]>([...(props.currentMembers || [])]);
  const [showAdd, setShowAdd] = React.useState(false);
  const [showUpdateAddressModal, setShowUpdateAddressModal] = React.useState<boolean>(false);
  const [text, setText] = React.useState("");
  const [selectedPerson, setSelectedPerson] = React.useState<PersonInterface>(null);
  const [household, setHousehold] = React.useState<HouseholdInterface>({ name: "" });
  const [errors, setErrors] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  function handleRemove(index: number) {
    const m = [...members];
    m.splice(index, 1);
    setMembers(m);
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setErrors([]);
    const h = { ...household } as HouseholdInterface;
    const value = e.target.value;
    switch (e.target.name) {
      case "name": h.name = value; break;
    }
    setHousehold(h);
  };

  function handleChangeRole(e: SelectChangeEvent, index: number) {
    const m = [...members];
    m[index].householdRole = e.target.value;
    setMembers(m);
  }

  function handlePersonAdd(person: PersonInterface) {
    setSelectedPerson(person);
    if (!PersonHelper.checkAddressAvailabilty(person)) {
      addPerson(person);
      return;
    }
    setText(
      `${Locale.label("people.householdEdit.updQuestion")} ${person.name.first}"s ${Locale.label("people.householdEdit.addMatch")} ${props.currentPerson.name.first}"s (${PersonHelper.addressToString(props.currentPerson.contactInfo)})?`
    );
    setShowUpdateAddressModal(true);
  }

  function addPerson(person?: PersonInterface) {
    const addPerson: PersonInterface = person || selectedPerson;
    if (!addPerson || !props.household?.id) return;
    addPerson.householdId = props.household.id;
    addPerson.householdRole = "Other";
    const m = [...members];
    m.push(addPerson);
    setMembers(m);
    setShowAdd(false);
  }

  const validate = () => {
    const result = [];
    if (!household.name) result.push(Locale.label("people.householdEdit.blankMsg"));
    setErrors(result);
    return result.length === 0;
  };

  function handleSave() {
    if (!household?.id) return;
    if (validate()) {
      setIsSubmitting(true);
      const promises = [];
      promises.push(ApiHelper.post("/households", [household], "MembershipApi"));
      promises.push(ApiHelper.post("/people/household/" + household.id, members, "MembershipApi"));
      Promise.all(promises)
        .then(() => props.updatedFunction())
        .finally(() => setIsSubmitting(false));
    }
  }

  function handleNo() {
    setShowUpdateAddressModal(false);
    addPerson();
  }

  async function handleYes() {
    setShowUpdateAddressModal(false);
    selectedPerson.contactInfo = PersonHelper.changeOnlyAddress(selectedPerson.contactInfo, props.currentPerson.contactInfo);
    try {
      await ApiHelper.post("/people", [selectedPerson], "MembershipApi");
    } catch (error) {
      console.log(`error in updating ${selectedPerson.name.display}"s address`, error);
    }
    addPerson();
  }

  const rows = members.map((m, index) => (
    <TableRow key={m.id || index}>
      <TableCell>
        <PersonAvatar person={m} size="small" />
      </TableCell>
      <TableCell>
        <FormControl fullWidth style={{ marginTop: 0 }}>
          <InputLabel id="household-role">{m.name.display}</InputLabel>
          <Select
            aria-label="role"
            value={m.householdRole || ""}
            size="small"
            label={m.name.display}
            labelId="household-role"
            onChange={(e: SelectChangeEvent) => handleChangeRole(e, index)}
            data-testid="household-role-select">
            <MenuItem value="Head">{Locale.label("people.householdEdit.head")}</MenuItem>
            <MenuItem value="Spouse">{Locale.label("people.householdEdit.spouse")}</MenuItem>
            <MenuItem value="Child">{Locale.label("people.householdEdit.child")}</MenuItem>
            <MenuItem value="Other">{Locale.label("people.householdEdit.other")}</MenuItem>
          </Select>
        </FormControl>
      </TableCell>
      <TableCell>
        <SmallButton icon="person_remove" text={Locale.label("common.remove")} onClick={() => handleRemove(index)} data-testid="remove-household-member-button" ariaLabel="Remove household member" />
      </TableCell>
    </TableRow>
  ));

  React.useEffect(() => {
    setHousehold(props.household);
    return () => {
      setHousehold(null);
    };
  }, [props.household]);

  const personAdd = showAdd ? (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h3>Add Household Member</h3>
        <SmallButton icon="close" onClick={() => setShowAdd(false)} ariaLabel="Cancel add member" />
      </div>
      <PersonAdd getPhotoUrl={PersonHelper.getPhotoUrl} addFunction={handlePersonAdd} person={props.currentPerson} showCreatePersonOnNotFound={true} />
    </div>
  ) : null;
  return (
    <>
      <UpdateHouseHold show={showUpdateAddressModal} onHide={() => setShowUpdateAddressModal(false)} handleNo={handleNo} handleYes={handleYes} text={text} />
      <InputBox
        id="householdBox"
        headerIcon="group"
        headerText={household?.name + Locale.label("people.householdEdit.house")}
        isSubmitting={isSubmitting}
        saveFunction={handleSave}
        cancelFunction={props.updatedFunction}>
        <ErrorMessages errors={errors} />
        <TextField
          fullWidth
          name="name"
          id="name"
          type="text"
          value={household?.name}
          onChange={handleChange}
          label={Locale.label("people.householdEdit.houseName")}
          placeholder={Locale.label("placeholders.household.name")}
          data-testid="household-name-input"
          aria-label="Household name"
        />
        <Table size="small" id="householdMemberTable">
          <TableBody>
            {rows}
            <TableRow>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell>
                <SmallButton icon="person_add" text={Locale.label("common.add")} onClick={() => setShowAdd(true)} data-testid="add-household-member-button" ariaLabel="Add household member" />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        {personAdd}
      </InputBox>
    </>
  );
}
