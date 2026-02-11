import React, { useContext, useState, useCallback, useMemo } from "react";
import { Groups, PersonAttendance, PersonNotes, PersonDonations } from "./components";
import { type PersonInterface, type ConversationInterface, type FormInterface } from "@churchapps/helpers";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { useParams } from "react-router-dom";
import { PersonBanner } from "./components/PersonBanner";
import { PersonNavigation } from "./components/PersonNavigation";
import { PersonDetails } from "./components/PersonDetails";
import UserContext from "../UserContext";
import { PersonForm } from "./components/PersonForm";
import { useQuery } from "@tanstack/react-query";

export const PersonPage = () => {
  const [selectedTab, setSelectedTab] = React.useState("");
  const context = useContext(UserContext);
  const params = useParams();
  const [form, setForm] = useState<FormInterface>(null);
  const [inPhotoEditMode, setInPhotoEditMode] = React.useState<boolean>(false);
  const [editMode, setEditMode] = React.useState<string>("display");

  const personData = useQuery<PersonInterface>({
    queryKey: ["/people/" + params.id, "MembershipApi"],
    enabled: !!(params.id && params.id !== "add"),
    placeholderData: null
  });

  const formsData = useQuery<FormInterface[]>({
    queryKey: ["/forms?contentType=person", "MembershipApi"],
    placeholderData: []
  });

  const refetch = useCallback(() => {
    personData.refetch();
    formsData.refetch();
  }, [personData, formsData]);

  const person = useMemo(() => {
    if (params.id === "add" || !params.id) {
      // Create a new empty person for adding
      return {
        name: {
          first: "",
          last: "",
          middle: "",
          nick: "",
          display: ""
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
          mobilePhone: ""
        },
        membershipStatus: "",
        gender: "",
        birthDate: null,
        maritalStatus: "",
        nametagNotes: ""
      };
    }

    if (!personData.data) return null;
    const p: PersonInterface = personData.data;
    if (!p.contactInfo) p.contactInfo = { homePhone: "", workPhone: "", mobilePhone: "" };
    else {
      if (!p.contactInfo.homePhone) p.contactInfo.homePhone = "";
      if (!p.contactInfo.mobilePhone) p.contactInfo.mobilePhone = "";
      if (!p.contactInfo.workPhone) p.contactInfo.workPhone = "";
    }
    return p;
  }, [params.id, personData.data]);

  const allForms = formsData.data;

  const handleCreateConversation = async () => {
    const conv: ConversationInterface = {
      allowAnonymousPosts: false,
      contentType: "person",
      contentId: person.id,
      title: person.name.display + " Notes",
      visibility: "hidden"
    };
    const result: ConversationInterface[] = await ApiHelper.post("/conversations", [conv], "MessagingApi");
    const p = { ...person };
    p.conversationId = result[0].id;
    await ApiHelper.post("/people", [p], "MembershipApi");
    refetch();
    return result[0].id;
  };

  const defaultTab = "details";

  React.useEffect(() => {
    if (selectedTab === "" && defaultTab !== "") {
      setSelectedTab(defaultTab);
    }
  }, [selectedTab, defaultTab]);

  const getCurrentTab = () => {
    let currentTab = null;
    switch (selectedTab) {
      case "details":
        currentTab = (
          <PersonDetails
            key="details"
            person={person}
            updatedFunction={refetch}
            inPhotoEditMode={inPhotoEditMode}
            setInPhotoEditMode={setInPhotoEditMode}
            editMode={editMode}
            setEditMode={setEditMode}
          />
        );
        break;
      case "notes": currentTab = <PersonNotes key={`notes-${person?.conversationId || "new"}`} context={context} conversationId={person?.conversationId} createConversation={handleCreateConversation} />; break;
      case "attendance": currentTab = <PersonAttendance key="attendance" personId={person.id} updatedFunction={refetch} />; break;
      case "donations": currentTab = <PersonDonations key="donations" personId={person.id} />; break;
      case "groups": currentTab = <Groups key="groups" personId={person?.id} updatedFunction={refetch} />; break;
      case "form": currentTab = <PersonForm key="form" form={form} contentType={"person"} contentId={person.id} formSubmissions={person.formSubmissions} updatedFunction={refetch} />; break;
      default: currentTab = <div key="default">{Locale.label("people.tabs.noImplement")}</div>; break;
    }
    return currentTab;
  };

  return (
    <>
      <PersonBanner
        person={person}
        togglePhotoEditor={setInPhotoEditMode}
        onEdit={() => {
          setEditMode("edit");
          setSelectedTab("details");
        }}
      />
      <PersonNavigation
        selectedTab={selectedTab}
        onTabChange={setSelectedTab}
        allForms={allForms}
        onFormSelect={(form) => {
          setForm(form);
          setSelectedTab("form");
        }}
      />
      <div style={{ padding: "24px" }}>{getCurrentTab()}</div>
    </>
  );
};
