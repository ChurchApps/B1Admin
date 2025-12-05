import React from "react";
import { type PersonInterface, type ContactInfoInterface, type NameInterface } from "@churchapps/helpers";
import { Locale } from "@churchapps/apphelper";
import { EnvironmentHelper } from "../../../helpers";
import {
  Dialog, Button, Container, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem 
} from "@mui/material";

interface Props {
  show: boolean;
  onHide: () => void;
  person1: PersonInterface;
  person2: PersonInterface;
  merge: (person: PersonInterface, personToRemove: PersonInterface) => void;
  mergeInProgress: boolean;
}

interface IConflicts {
  value: string;
  options: string[];
  selected: string;
}

const SpecialKeys = {
  CONTACT_INFO: "contactInfo",
  HOUSEHOLD_ID: "householdId",
  ID: "id",
  NAME: "name",
} as const;

const getDisplayValue = (key: string) => {
  switch (key) {
    case SpecialKeys.CONTACT_INFO:
      return Locale.label("people.mergeModal.contactInfo");
    case SpecialKeys.HOUSEHOLD_ID:
      return Locale.label("people.mergeModal.householdId");
    case SpecialKeys.ID:
      return Locale.label("people.mergeModal.id");
    case SpecialKeys.NAME:
      return Locale.label("people.mergeModal.name");
    default:
      return key;
  }
};

export const MergeModal: React.FC<Props> = (props) => {
  const [aggregatePerson, setAggregatePerson] = React.useState<PersonInterface>(null);
  const [conflicts, setConflicts] = React.useState<IConflicts[]>([]);
  const [error, setError] = React.useState<string>(null);

  const { person1, person2 } = props;

  const merge = () => {
    if (!person1 || !person2) return;

    const keys = Object.keys(person1) as Array<keyof PersonInterface>;
    const aggregate: any = {};
    const newConflicts: IConflicts[] = [];

    const determine = (basedOn: boolean, key: string, value1: any, value2: any, subKey?: string) => {
      if (basedOn) {
        if (subKey) {
          aggregate[key][subKey] = value1 || value2;
          return;
        }
        aggregate[key] = value1 || value2;
        return;
      }

      newConflicts.push({
        value: subKey || key,
        options: [value1, value2],
        selected: "",
      });
    };

    keys.forEach((key) => {
      const value1 = person1[key];
      const value2 = person2[key];
      // TODO:: CONTACT_INFO & NAME are having almost identical code, lets have a function instead.
      switch (key) {
        case SpecialKeys.CONTACT_INFO:
          if (person1.contactInfo) {
            const contactKeys = Object.keys(person1.contactInfo) as Array<keyof ContactInfoInterface>;
            aggregate[SpecialKeys.CONTACT_INFO] = {};
            contactKeys.forEach((contactKey) => {
              const cv1 = person1.contactInfo[contactKey];
              const cv2 = person2.contactInfo?.[contactKey];
              const check = primitiveCompare(cv1, cv2);
              determine(check, key, cv1, cv2, contactKey);
            });
          }
          break;
        case SpecialKeys.NAME:
          if (person1.name) {
            const nameKeys = Object.keys(person1.name) as Array<keyof NameInterface>;
            aggregate[SpecialKeys.NAME] = {};
            nameKeys.forEach((nameKey) => {
              const cv1 = person1.name[nameKey];
              const cv2 = person2.name?.[nameKey];
              const check = primitiveCompare(cv1, cv2);
              determine(check, key, cv1, cv2, nameKey);
            });
          }
          break;
        case SpecialKeys.HOUSEHOLD_ID:
          aggregate.householdId = value1;
          break;
        case SpecialKeys.ID:
          aggregate.id = value1;
          break;
        default:
          const check = primitiveCompare(value1, value2);
          determine(check, key, value1, value2);
          break;
      }
    });

    //set initial values
    newConflicts.forEach((c) => {
      c.selected = c.options[0];
    });

    setAggregatePerson(aggregate);
    setConflicts(newConflicts);
  };

  const primitiveCompare = (value1: any, value2: any): boolean => {
    if (!value2 || !value1 || value1 === value2) return true;
    return false;
  };

  const handleSelect = (propertyName: string, value: string) => {
    const conflictsCopy = conflicts.map((c) => {
      if (c.value === propertyName) c.selected = value;
      return c;
    });
    setConflicts(conflictsCopy);
  };

  const handleConfirm = () => {
    const test = conflicts.some((e) => e.selected === "");
    setError(null);
    if (test) {
      setError(Locale.label("people.mergeModal.selMsg"));
      return;
    }
    let person: PersonInterface = { ...aggregatePerson };
    const contactkeys = person1.contactInfo ? Object.keys(person1.contactInfo) as Array<keyof ContactInfoInterface> : [];
    const nameKeys = person1.name ? Object.keys(person1.name) as Array<keyof NameInterface> : [];

    conflicts.forEach((e) => {
      if (contactkeys.some((c) => c === e.value)) {
        person.contactInfo = {
          ...person.contactInfo,
          [e.value]: e.selected,
        };
        return;
      }
      if (nameKeys.some((n) => n === e.value)) {
        person.name = {
          ...person.name,
          [e.value]: e.selected,
        };
        return;
      }
      person = {
        ...person,
        [e.value]: e.selected,
      };
    });
    setAggregatePerson(person);
    props.merge(person, person2);
  };

  React.useEffect(merge, [person1, person2]);

  const createConflictRows = () =>
    conflicts.map((outer) => (
      <FormControl key={outer.value} fullWidth>
        <InputLabel>{getDisplayValue(outer.value)}</InputLabel>
        <Select
          name={outer.value}
          label={getDisplayValue(outer.value)}
          id={outer.value}
          value={outer.selected}
          onChange={(e) => {
            handleSelect(outer.value, e.target.value);
          }}>
          {outer.options.map((name, i) => {
            const label = outer.value === "photo" ? <img src={EnvironmentHelper.Common.ContentRoot + name} alt={Locale.label("people.mergeModal.profile")} height="200px" width="200px" /> : name;
            return (
              <MenuItem key={`${outer.value}-${name || i}`} value={name}>
                {label}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>
    ));

  const { mergeInProgress } = props;

  return (
    <Dialog open={props.show} aria-labelledby="contained-modal-title-vcenter" data-cy="merge-modal">
      <DialogTitle>
        {Locale.label("people.mergeModal.mergeQuestion")} {person1?.name.display} {Locale.label("people.mergeModal.with")} {person2?.name.display}?
      </DialogTitle>
      <DialogContent>
        {conflicts.length > 0 && (
          <>
            <p>{Locale.label("people.mergeModal.fieldCon")} </p>
            <Container>{createConflictRows()}</Container>
            <span style={{ color: "#dc3545", fontStyle: "italic" }}>{error}</span>
          </>
        )}
        {mergeInProgress && <p style={{ textAlign: "center", fontStyle: "italic", marginBottom: 0 }}>{Locale.label("people.mergeModal.merge")}</p>}
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onHide} data-cy="cancel-merge">
          {Locale.label("people.mergeModal.cancel")}
        </Button>
        <Button onClick={handleConfirm} data-cy="confirm-merge">
          {Locale.label("people.mergeModal.confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
