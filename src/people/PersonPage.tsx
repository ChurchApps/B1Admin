import React, { useContext, useCallback, useMemo } from "react";
import { Groups, PersonAttendance, PersonNotes, PersonDonations, PersonForms, type PersonFormOption } from "./components";
import { type PersonInterface, type ConversationInterface } from "@churchapps/helpers";
import { ApiHelper, Locale, Permissions, SocketHelper, SubscriptionManager, UserHelper } from "@churchapps/apphelper";
import { useParams } from "react-router-dom";
import { PersonBanner } from "./components/PersonBanner";
import { PersonNavigation } from "./components/PersonNavigation";
import { PersonDetails } from "./components/PersonDetails";
import { Breadcrumbs, type BreadcrumbItem } from "../components/ui";
import UserContext from "../UserContext";
import { useQuery } from "@tanstack/react-query";

export const PersonPage = () => {
  const [selectedTab, setSelectedTab] = React.useState("");
  const context = useContext(UserContext);
  const params = useParams();
  const [inPhotoEditMode, setInPhotoEditMode] = React.useState<boolean>(false);
  const [editMode, setEditMode] = React.useState<string>("display");
  const [personForms, setPersonForms] = React.useState<PersonFormOption[]>([]);

  const formPermission = useMemo(() => UserHelper.checkAccess(Permissions.membershipApi.forms.admin) || UserHelper.checkAccess(Permissions.membershipApi.forms.edit), []);

  React.useEffect(() => {
    if (!formPermission) return;
    ApiHelper.get("/forms", "MembershipApi").then((data: PersonFormOption[]) => {
      setPersonForms((data || []).filter((form) => !form.archived && form.contentType === "person"));
    }).catch(() => setPersonForms([]));
  }, [formPermission]);

  const showForms = formPermission && personForms.length > 0;

  const personData = useQuery<PersonInterface | null>({
    queryKey: ["/people/" + params.id, "MembershipApi"],
    enabled: !!(params.id && params.id !== "add"),
    placeholderData: null
  });

  const refetch = useCallback(() => {
    personData.refetch();
  }, [personData]);

  // Stash refetch in ref to avoid subscription re-create on every react-query update.
  const refetchRef = React.useRef(refetch);
  React.useEffect(() => { refetchRef.current = refetch; }, [refetch]);

  React.useEffect(() => {
    if (!params.id || params.id === "add") return;
    const churchId = UserHelper.currentUserChurch?.church?.id;
    const personId = UserHelper.person?.id;
    if (!churchId) return;
    const room = `content-person-${params.id}`;
    SubscriptionManager.joinRoom(room, churchId, personId).catch(() => { /* ignore */ });
    const handlerId = `PersonPage-${params.id}`;
    SocketHelper.addHandler("conversationActivity", handlerId, (data: any) => {
      if (data?.contentType === "person" && data?.contentId === params.id) refetchRef.current();
    });
    return () => {
      SocketHelper.removeHandler(handlerId);
      SubscriptionManager.leaveRoom(room, churchId).catch(() => { /* ignore */ });
    };
  }, [params.id]);

  const person = useMemo<PersonInterface | null>(() => {
    if (params.id === "add" || !params.id) {
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
        membershipStatus: "Visitor",
        gender: "",
        birthDate: undefined,
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

  const handleCreateConversation = async () => {
    if (!person) return "";
    const conv: ConversationInterface = {
      allowAnonymousPosts: false,
      contentType: "person",
      contentId: person.id,
      title: person.name.display + Locale.label("people.personPage.notesSuffix"),
      visibility: "hidden"
    };
    const result: ConversationInterface[] = await ApiHelper.post("/conversations", [conv], "MessagingApi");
    const p = { ...person };
    p.conversationId = result[0].id;
    await ApiHelper.post("/people", [p], "MembershipApi");
    refetch();
    return result[0].id || "";
  };

  const defaultTab: string = "details";

  React.useEffect(() => {
    if (selectedTab === "" && defaultTab !== "") {
      setSelectedTab(defaultTab);
    }
  }, [selectedTab, defaultTab]);

  const getCurrentTab = () => {
    let currentTab: JSX.Element;
    // Guard against null person during query refetches.
    if (!person) {
      return <div key="loading" />;
    }
    if (selectedTab !== "details" && !person.id) {
      return <div key="loading" />;
    }
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
      case "notes": currentTab = <PersonNotes key={`notes-${person?.conversationId || "new"}`} context={context} conversationId={person.conversationId || ""} createConversation={handleCreateConversation} />; break;
      case "attendance": currentTab = <PersonAttendance key="attendance" personId={person.id!} personName={person.name?.display} updatedFunction={refetch} />; break;
      case "donations": currentTab = <PersonDonations key="donations" personId={person.id!} />; break;
      case "forms": currentTab = <PersonForms key="forms" person={person} forms={personForms} updatedFunction={refetch} />; break;
      case "groups": currentTab = <Groups key="groups" personId={person.id!} updatedFunction={refetch} />; break;
      default: currentTab = <div key="default">{Locale.label("people.tabs.noImplement")}</div>; break;
    }
    return currentTab;
  };

  if (!person) return null;

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: Locale.label("components.wrapper.ppl"), path: "/people" },
    { label: person.name?.display || Locale.label("createPerson.addNewPerson") }
  ];

  return (
    <>
      <PersonBanner
        person={person}
        togglePhotoEditor={setInPhotoEditMode}
        tabs={<PersonNavigation selectedTab={selectedTab} onTabChange={setSelectedTab} showForms={showForms} onHeader />}
        breadcrumbs={<Breadcrumbs items={breadcrumbItems} showHome={true} />}
      />
      <div style={{ padding: "24px" }}>
        {getCurrentTab()}
      </div>
    </>
  );
};
