import React, { useState, useCallback, useEffect } from "react";
import {
  InputBox,
  type RoleInterface,
  ApiHelper,
  type RoleMemberInterface,
  UserHelper,
  type LoadCreateUserRequestInterface,
  type PersonInterface,
  type HouseholdInterface,
  ErrorMessages,
  type UserInterface,
  type UserChurchInterface,
  Locale
} from "@churchapps/apphelper";
import { AssociatePerson } from "./";
import { TextField } from "@mui/material";

interface Props {
  role: RoleInterface;
  updatedFunction: () => void;
  selectedUser: string;
  roleMembers: RoleMemberInterface[];
}

const validateEmail = (email: string) => /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(.\w{2,3})+$/.test(email);

export const UserAdd = (props: Props) => {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [fetchedUser, setFetchedUser] = useState<UserInterface>(null);
  const [errors, setErrors] = useState([]);
  const [linkedPerson, setLinkedPerson] = useState<PersonInterface>(null);
  const [selectedPerson, setSelectedPerson] = useState<PersonInterface>(null);
  const [showEmailField, setShowEmailField] = useState<boolean>(false);
  const [showNameFields, setShowNameFields] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  const saveExistingUser = async () => {
    if (validate()) {
      await ApiHelper.post(`/users/setDisplayName`, { firstName, lastName, userId: fetchedUser.id }, "MembershipApi");
      try {
        await ApiHelper.post(`/users/updateEmail`, { email, userId: fetchedUser.id }, "MembershipApi");
        const person = { ...linkedPerson };
        person.contactInfo.email = email;
        person.name.first = firstName;
        person.name.last = lastName;
        await ApiHelper.post("/people", [person], "MembershipApi");
        props.updatedFunction();
      } catch {
        setErrors([Locale.label("settings.userAdd.errAnother")]);
      }
    }
  };

  const saveNewUser = async () => {
    if (validate()) {
      const user = await createUserAndToGroup(firstName, lastName, email);
      const person = await createPerson(user.id);
      await linkUserAndPerson(user.id, person.id);
      props.updatedFunction();
    }
  };

  const saveUserFromPerson = async () => {
    if (showEmailField && !validateEmail(email)) {
      setErrors([Locale.label("settings.userAdd.valEmail")]);
      return;
    }
    if (!selectedPerson) return;
    const { first, last } = selectedPerson.name;
    const userEmail = showEmailField ? email : selectedPerson.contactInfo.email;
    const user = await createUserAndToGroup(first, last, userEmail);
    try {
      await linkUserAndPerson(user.id, selectedPerson.id);

      if (showEmailField) {
        const person = { ...selectedPerson };
        person.contactInfo.email = email;
        await ApiHelper.post("/people", [person], "MembershipApi");
      }
    } catch {
      setErrors([Locale.label("settings.userAdd.errDiff")]);
    }

    props.updatedFunction();
  };

  const handleSave = async () => {
    if (editMode) saveExistingUser();
    else if (showNameFields) saveNewUser();
    else saveUserFromPerson();
  };

  const validate = () => {
    const warnings: string[] = [];
    if (!firstName) warnings.push(Locale.label("settings.userAdd.firstMsg"));
    if (!lastName) warnings.push(Locale.label("settings.userAdd.lastMsg"));
    if (!validateEmail(email)) warnings.push(Locale.label("settings.userAdd.valEmailMsg"));
    setErrors(warnings);
    return warnings.length === 0;
  };

  const linkUserAndPerson = async (userId: string, personId: string) => {
    await ApiHelper.post(`/userchurch?userId=${userId}`, { personId }, "MembershipApi");
  };

  const createUserAndToGroup = async (firstName: string, lastName: string, userEmail: string) => {
    const userPayload: LoadCreateUserRequestInterface = { firstName, lastName, userEmail };
    const user: UserInterface = await ApiHelper.post("/users/loadOrCreate", userPayload, "MembershipApi");
    const roleMember: RoleMemberInterface = { userId: user.id, roleId: props.role.id, churchId: UserHelper.currentUserChurch.church.id };
    await ApiHelper.post("/rolemembers/", [roleMember], "MembershipApi");

    return user;
  };

  const createPerson = async (userId: string) => {
    const house: HouseholdInterface = { name: lastName };
    const households = await ApiHelper.post("/households", [house], "MembershipApi");

    const personRecord: PersonInterface = {
      householdId: households[0].id,
      name: { first: firstName, last: lastName },
      userId,
      contactInfo: { email }
    };
    const person: PersonInterface[] = await ApiHelper.post("/people", [personRecord], "MembershipApi");

    return person[0];
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrors([]);
    const val = e.currentTarget.value;
    switch (e.currentTarget.name) {
      case "email": setEmail(val); break;
      case "firstName": setFirstName(val); break;
      case "lastName": setLastName(val);
    }
  };

  const handleAssociatePerson = async (person: PersonInterface) => {
    setSelectedPerson(person);

    if (!person.contactInfo.email) {
      setShowEmailField(true);
    } else {
      // Auto-save when person with email is selected
      const { first, last } = person.name;
      const userEmail = person.contactInfo.email;
      const user = await createUserAndToGroup(first, last, userEmail);
      try {
        await linkUserAndPerson(user.id, person.id);
      } catch {
        setErrors([Locale.label("settings.userAdd.errDiff")]);
        return;
      }
      props.updatedFunction();
    }
  };

  const CreateNewUser = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowNameFields(true);
    setShowEmailField(true);
  };

  const handleSearchStatus = useCallback((value: boolean) => {
    setHasSearched(value);
  }, []);

  useEffect(() => {
    (async () => {
      if (props.selectedUser) {
        setEditMode(true);
        const user: UserInterface = await ApiHelper.post("/users/loadOrCreate", { userId: props.selectedUser }, "MembershipApi");
        setFetchedUser(user);
        setFirstName(user.firstName);
        setLastName(user.lastName);
        setEmail(user.email);
        try {
          const userChurch: UserChurchInterface = await ApiHelper.get(`/userchurch/userid/${user.id}`, "MembershipApi");
          const person = await ApiHelper.get(`/people/${userChurch.personId}`, "MembershipApi");
          setLinkedPerson(person);
        } catch {
          setLinkedPerson(null);
        }
      }
    })();
  }, [props.selectedUser]);

  const message = !showNameFields && !editMode && hasSearched && (
    <span>
      {Locale.label("settings.userAdd.noAcc")}{" "}
      <button type="button" onClick={CreateNewUser} data-testid="create-new-user-link" aria-label="Create new user" style={{ background: "none", border: 0, padding: 0, color: "#1976d2", cursor: "pointer" }}>
        {Locale.label("settings.userAdd.createNew")}
      </button>
    </span>
  );
  const nameField = (showNameFields || editMode) && (
    <>
      <TextField fullWidth name="firstName" label={Locale.label("person.firstName")} value={firstName} onChange={handleChange} placeholder={Locale.label("placeholders.user.firstName")} data-testid="first-name-input" aria-label="First name" />
      <TextField fullWidth name="lastName" label={Locale.label("person.lastName")} value={lastName} onChange={handleChange} placeholder={Locale.label("placeholders.user.lastName")} data-testid="last-name-input" aria-label="Last name" />
    </>
  );
  const emailField = (showEmailField || editMode) && (
    <TextField type="email" fullWidth name="email" label={Locale.label("person.email")} value={email} onChange={handleChange} placeholder={Locale.label("placeholders.user.email")} data-testid="email-input" aria-label="Email address" />
  );

  return (
    <InputBox headerIcon="lock" headerText={Locale.label("settings.userAdd.addTo") + props.role.name} saveFunction={handleSave} cancelFunction={props.updatedFunction}>
      <ErrorMessages errors={errors} />
      {(!showNameFields || editMode) && (
        <AssociatePerson
          person={selectedPerson || linkedPerson}
          handleAssociatePerson={handleAssociatePerson}
          searchStatus={handleSearchStatus}
          filterList={props.roleMembers.map((rm) => rm.personId)}
          onChangeClick={() => setShowEmailField(false)}
          showChangeOption={!editMode}
        />
      )}
      {nameField}
      {emailField}
      {message}
    </InputBox>
  );
};
