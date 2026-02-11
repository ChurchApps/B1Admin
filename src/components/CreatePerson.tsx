"use client";

import React from "react";
import { UserHelper, ApiHelper, Locale } from "../helpers";
import { Permissions } from "@churchapps/helpers";
import type { PersonInterface, HouseholdInterface } from "@churchapps/helpers";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, TextField } from "@mui/material";
import { ErrorMessages } from "@churchapps/apphelper";
import { useMountedState } from "@churchapps/apphelper";

interface CommonProps {
  onCreate?: (person: PersonInterface) => void;
}

type ConditionalProps = { showInModal: true; onClose: () => void } | { showInModal?: false; onClose?: never };

type Props = CommonProps & ConditionalProps;

export function CreatePerson({ onCreate = () => {}, showInModal = false, ...props }: Props) {
  const [person, setPerson] = React.useState<PersonInterface>({ name: { first: "", last: "" }, contactInfo: {} });
  const [errors, setErrors] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const isMounted = useMountedState();

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
    }
    setPerson(p);
  };

  const validateEmail = (email: string) => /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(.\w{2,3})+$/.test(email);

  const checkExistingEmail = async () => {
    const result = await ApiHelper.get("/people/search?email=" + person.contactInfo.email, "MembershipApi");
    return result[0];
  };

  const handleSave = () => {
    const household = { name: person.name.last } as HouseholdInterface;

    setIsSubmitting(true);
    ApiHelper.post("/households", [household], "MembershipApi").then((data) => {
      household.id = data[0].id;
      person.householdId = household.id;
      person.name.display = [person.name.first, person.name.last].join(" ");
      ApiHelper.post("/people", [person], "MembershipApi")
        .then((data) => {
          person.id = data[0].id;
          onCreate(person);
          setPerson({ ...person, name: { first: "", last: "" }, contactInfo: { email: "" } });
        })
        .finally(() => {
          if (isMounted()) {
            setIsSubmitting(false);
            if (showInModal) props.onClose();
          }
        });
    });
  };

  async function handleSubmit() {
    if (validate()) {
      if (person.contactInfo.email && (person.contactInfo.email?.trim() !== undefined || person.contactInfo.email?.trim() !== "")) {
        if (!validateEmail(person.contactInfo.email)) {
          setErrors([Locale.label("common.createPerson.validate.validEmail")]);
        } else {
          const existingPerson = await checkExistingEmail();
          if (existingPerson) {
            if (
              window.confirm(
                Locale.label("common.createPerson.confirmDuplicate", {
                  existingName: existingPerson.name.display,
                  existingEmail: existingPerson.contactInfo.email,
                  firstName: person.name.first,
                  lastName: person.name.last
                })
              )
            ) {
              handleSave();
            }
          } else {
            handleSave();
          }
        }
      } else {
        handleSave();
      }
    }
  }

  if (!UserHelper.checkAccess(Permissions.membershipApi.people.edit)) return null;
  if (showInModal) {
    return (
      <>
        <ErrorMessages errors={errors} />
        <Dialog open onClose={props.onClose} fullWidth>
          <DialogTitle>{Locale.label("createPerson.addNewPerson")}</DialogTitle>
          <DialogContent>
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
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && handleSubmit}
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
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && handleSubmit}
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
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && handleSubmit}
              placeholder={Locale.label("placeholders.person.simpleEmail")}
            />
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                props.onClose();
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
      <p className="pl-1 mb-3 text-dark">
        <b>{Locale.label("createPerson.addNewPerson")}</b>
      </p>
      <ErrorMessages errors={errors} />
      <Grid container spacing={3} alignItems="center">
        <Grid size={{ xs: 12, md: 6 }}>
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
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && handleSubmit}
            placeholder={Locale.label("placeholders.person.firstName")}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
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
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && handleSubmit}
            placeholder={Locale.label("placeholders.person.lastName")}
          />
        </Grid>
        <Grid size={12}>
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
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && handleSubmit}
            placeholder={Locale.label("placeholders.person.simpleEmail")}
          />
        </Grid>
        <Grid size={12}>
          <Button type="submit" fullWidth variant="contained" disabled={isSubmitting} onClick={handleSubmit}>
            {Locale.label("common.add")}
          </Button>
        </Grid>
      </Grid>
    </div>
  );
}
