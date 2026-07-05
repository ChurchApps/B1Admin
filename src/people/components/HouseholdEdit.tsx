import React from "react";
import { useForm, useFormState } from "react-hook-form";
import { UpdateHouseHold } from "./modals/UpdateHouseHold";
import { type HouseholdInterface, type PersonInterface } from "@churchapps/helpers";
import { PersonHelper, ApiHelper, ErrorMessages, Locale, PersonAvatar } from "@churchapps/apphelper";
import { FormCard } from "../../components/ui";
import { useErrorSummary } from "../../hooks";
import { PersonAdd } from "../../components";
import { Table, TableBody, TableCell, TableRow, TextField, FormControl, Select, MenuItem, InputLabel, type SelectChangeEvent } from "@mui/material";
import { PersonRemove as PersonRemoveIcon, PersonAdd as PersonAddIcon, Close as CloseIcon } from "@mui/icons-material";
import { AppIconButton } from "../../components/ui/AppIconButton";

type AnyRecord = Record<string, any>;

interface Props {
  updatedFunction: () => void;
  household: HouseholdInterface;
  currentMembers: PersonInterface[];
  currentPerson: PersonInterface;
}

export function HouseholdEdit(props: Props) {
  "use no memo"; // compiler caches register() results, breaking RHF field re-registration after reset()
  const [members, setMembers] = React.useState<PersonInterface[]>([...(props.currentMembers || [])]);
  const [showAdd, setShowAdd] = React.useState(false);
  const [showUpdateAddressModal, setShowUpdateAddressModal] = React.useState<boolean>(false);
  const [text, setText] = React.useState("");
  const [selectedPerson, setSelectedPerson] = React.useState<PersonInterface>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { control, register, handleSubmit, reset } = useForm<AnyRecord>({ defaultValues: { name: props.household?.name || "" } });

  const { errors } = useFormState({ control });
  const e = errors as any;
  const summaryErrors = useErrorSummary(errors, ["name"]);

  React.useEffect(() => {
    if (props.household) reset({ name: props.household.name || "" });
  }, [props.household, reset]);

  function handleRemove(index: number) {
    const m = [...members];
    m.splice(index, 1);
    setMembers(m);
  }

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

  const onValid = (values: AnyRecord) => {
    if (!props.household?.id) return;
    setIsSubmitting(true);
    const household: HouseholdInterface = { ...props.household, name: values.name };
    const promises = [];
    promises.push(ApiHelper.post("/households", [household], "MembershipApi"));
    promises.push(ApiHelper.post("/people/household/" + household.id, members, "MembershipApi"));
    Promise.all(promises)
      .then(() => props.updatedFunction())
      .finally(() => setIsSubmitting(false));
  };

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
        <AppIconButton intent="remove" label={Locale.label("common.remove")} icon={<PersonRemoveIcon />} onClick={() => handleRemove(index)} data-testid="remove-household-member-button" />
      </TableCell>
    </TableRow>
  ));

  const personAdd = showAdd ? (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h3>{Locale.label("people.householdEdit.addMember")}</h3>
        <AppIconButton label={Locale.label("common.close")} icon={<CloseIcon />} onClick={() => setShowAdd(false)} />
      </div>
      <PersonAdd getPhotoUrl={PersonHelper.getPhotoUrl} addFunction={handlePersonAdd} person={props.currentPerson} showCreatePersonOnNotFound={true} />
    </div>
  ) : null;

  return (
    <>
      <UpdateHouseHold show={showUpdateAddressModal} onHide={() => setShowUpdateAddressModal(false)} handleNo={handleNo} handleYes={handleYes} text={text} />
      <FormCard
        id="householdBox"
        icon="group"
        title={(props.household?.name || "") + Locale.label("people.householdEdit.house")}
        isSubmitting={isSubmitting}
        onSave={handleSubmit(onValid)}
        onCancel={props.updatedFunction}>
        <ErrorMessages errors={summaryErrors} />
        <TextField fullWidth id="name" type="text" label={Locale.label("people.householdEdit.houseName")} placeholder={Locale.label("placeholders.household.name")} data-testid="household-name-input" aria-label={Locale.label("people.householdEdit.householdNameAria")} error={!!e.name} helperText={e.name?.message} {...register("name", { required: Locale.label("people.householdEdit.blankMsg") })} />
        <Table size="small" id="householdMemberTable">
          <TableBody>
            {rows}
            <TableRow>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell>
                <AppIconButton intent="add" label={Locale.label("common.add")} icon={<PersonAddIcon />} tone="card" onClick={() => setShowAdd(true)} data-testid="add-household-member-button" />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        {personAdd}
      </FormCard>
    </>
  );
}
