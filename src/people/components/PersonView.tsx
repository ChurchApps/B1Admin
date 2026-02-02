import React, { memo, useMemo, useState, useEffect } from "react";
import { AssociatedForms } from ".";
import { type PersonInterface } from "@churchapps/helpers";
import { PersonHelper, Loading, DisplayBox, DateHelper, Locale, PersonAvatar, ApiHelper } from "@churchapps/apphelper";
import { Grid, Icon, Table, TableBody, TableRow, TableCell, Chip } from "@mui/material";
import { formattedPhoneNumber } from "./PersonEdit";

interface Props {
  id?: string;
  person: PersonInterface;
  editFunction: () => void;
  updatedFunction: () => void;
}

export const PersonView = memo(({ person, editFunction, updatedFunction }: Props) => {
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    if (person?.id) {
      ApiHelper.get("/userchurch/personid/" + person.id, "MembershipApi")
        .then((data: { email: string } | null) => {
          setUserEmail(data?.email || "");
        })
        .catch(() => setUserEmail(""));
    }
  }, [person?.id]);

  const leftAttributes = useMemo(() => {
    if (!person) return [];

    const attributes = [];
    const p = { ...person };

    if (p.gender && p.gender !== "Unspecified") {
      attributes.push(
        <div key="gender">
          <label>{Locale.label("person.gender")}</label> <b>{p.gender}</b>
        </div>
      );
    }
    if (p.birthDate) {
      attributes.push(
        <div key="age">
          <label>{Locale.label("person.age")}</label> <b>{PersonHelper.getAge(p.birthDate)}</b>
        </div>
      );
    }
    if (p.maritalStatus && p.maritalStatus !== "Single") {
      if (p.anniversary) {
        attributes.push(
          <div key="maritalStatus">
            <label>{Locale.label("person.maritalStatus")}:</label>{" "}
            <b>
              {p.maritalStatus} ({DateHelper.getShortDate(DateHelper.toDate(p.anniversary))})
            </b>
          </div>
        );
      } else {
        attributes.push(
          <div key="maritalStatus">
            <label>{Locale.label("person.maritalStatus")}:</label> <b>{p.maritalStatus}</b>
          </div>
        );
      }
    }
    if (p.membershipStatus) {
      attributes.push(
        <div key="membership">
          <label>{Locale.label("people.personView.memShip")}</label> <b>{p.membershipStatus}</b>
        </div>
      );
    }

    return attributes;
  }, [person]);

  const contactMethods = useMemo(() => {
    if (!person) return [];

    const methods = [];
    const p = { ...person };
    let homeLabel = Locale.label("people.personView.home");

    if (p.contactInfo.email) {
      methods.push(
        <TableRow key="email">
          <TableCell>
            <label>{homeLabel}</label>
          </TableCell>
          <TableCell>
            <Icon>mail</Icon>
          </TableCell>
          <TableCell>
            <a href={"mailto:" + p.contactInfo.email}>
              <b>{p.contactInfo.email}</b>
            </a>
          </TableCell>
        </TableRow>
      );
      homeLabel = "";
    }
    if (p.contactInfo.homePhone) {
      methods.push(
        <TableRow key="homePhone">
          <TableCell>
            <label>{homeLabel}</label>
          </TableCell>
          <TableCell>
            <Icon>call</Icon>
          </TableCell>
          <TableCell>
            <b>{formattedPhoneNumber(p.contactInfo.homePhone)}</b>
          </TableCell>
        </TableRow>
      );
      homeLabel = "";
    }

    if (p.contactInfo.address1) {
      const lines = [];
      lines.push(
        <div key="address1">
          <b>{p.contactInfo.address1}</b>
        </div>
      );
      if (p.contactInfo.address2) {
        lines.push(
          <div key="address2">
            <b>{p.contactInfo.address2}</b>
          </div>
        );
      }
      lines.push(
        <div key="contactInfo">
          {p.contactInfo.city}, {p.contactInfo.state} {p.contactInfo.zip}
        </div>
      );

      methods.push(
        <TableRow key="address">
          <TableCell>
            <label>{homeLabel}</label>
          </TableCell>
          <TableCell>
            <Icon>home_pin</Icon>
          </TableCell>
          <TableCell>{lines}</TableCell>
        </TableRow>
      );
    }
    if (p.contactInfo.mobilePhone) {
      methods.push(
        <TableRow key="mobilePHone">
          <TableCell>
            <label>{Locale.label("people.personView.mobile")}</label>
          </TableCell>
          <TableCell>
            <Icon>phone_iphone</Icon>
          </TableCell>
          <TableCell>
            <b>{formattedPhoneNumber(p.contactInfo.mobilePhone)}</b>
          </TableCell>
        </TableRow>
      );
    }
    if (p.contactInfo.workPhone) {
      methods.push(
        <TableRow key="workPhone">
          <TableCell>
            <label>{Locale.label("people.personView.work")}</label>
          </TableCell>
          <TableCell>
            <Icon>call</Icon>
          </TableCell>
          <TableCell>
            <b>{formattedPhoneNumber(p.contactInfo.workPhone)}</b>
          </TableCell>
        </TableRow>
      );
    }

    return methods;
  }, [person]);

  const personFields = useMemo(() => {
    if (!person) return <Loading />;

    return (
      <Grid container spacing={3}>
        <Grid size={{ xs: 3 }}>
          <div style={{ border: "3px solid #fff", borderRadius: "50%", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
            <PersonAvatar person={person} size="xxlarge" />
          </div>
        </Grid>
        <Grid size={{ xs: 9 }}>
          <h2>{person?.name.display}</h2>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              {leftAttributes}
              {userEmail && (
                <div key="hasLogin">
                  <Chip label={"Has login: " + userEmail} size="small" color="primary" icon={<Icon>person</Icon>} />
                </div>
              )}
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Table className="contactTable">
                <TableBody>{contactMethods}</TableBody>
              </Table>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    );
  }, [person, leftAttributes, contactMethods, userEmail]);

  return (
    <DisplayBox
      headerText={Locale.label("people.personView.persDet")}
      editFunction={editFunction}
      footerContent={<AssociatedForms contentType="person" contentId={person?.id} formSubmissions={person?.formSubmissions} updatedFunction={updatedFunction} />}>
      {personFields}
    </DisplayBox>
  );
});
