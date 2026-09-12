import React, { useContext, useCallback, useMemo } from "react";
import { Groups, PersonAttendance, PersonNotes, PersonDonations, PersonForms, type PersonFormOption, Merge, PersonEdit } from "./components";
import { type PersonInterface, type ConversationInterface } from "@churchapps/helpers";
import { ApiHelper, ImageEditor, Locale, Permissions, PersonHelper, SocketHelper, SubscriptionManager, UserHelper } from "@churchapps/apphelper";
import { useParams, useSearchParams } from "react-router-dom";
import UserContext from "../UserContext";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { PlatedRecord } from "./PlatedRecord";
import { YearLedger } from "./YearLedger";
import { NoteThread } from "./NoteThread";
import { PersonIdentity } from "./components/PersonIdentity";
import { PersonPlate } from "./components/PersonPlate";
import { LogGiftSheet } from "./components/LogGiftSheet";
import { type PersonFieldInterface, type PersonFieldValueInterface } from "../helpers/Interfaces";
import { useCampuses } from "../hooks/useCampuses";
import { sortHouseholdMembers } from "./sortHouseholdMembers";
import "./people.css";

export const PersonPage = () => {
  const context = useContext(UserContext);
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view") || "";
  const yearParam = Number(searchParams.get("year")) || new Date().getFullYear();
  const [inPhotoEditMode, setInPhotoEditMode] = React.useState(false);
  const [showMergeSearch, setShowMergeSearch] = React.useState(false);
  const [personForms, setPersonForms] = React.useState<PersonFormOption[]>([]);
  const [userEmail, setUserEmail] = React.useState("");
  const [customFields, setCustomFields] = React.useState<PersonFieldInterface[]>([]);
  const [customValues, setCustomValues] = React.useState<Record<string, string>>({});
  const [giftYear, setGiftYear] = React.useState(yearParam);
  const [sundayYear, setSundayYear] = React.useState(yearParam);

  const formPermission = useMemo(() => UserHelper.checkAccess(Permissions.membershipApi.forms.admin) || UserHelper.checkAccess(Permissions.membershipApi.forms.edit), []);
  const canViewConfidentialNotes = useMemo(() => UserHelper.checkAccess({ api: "MembershipApi", contentType: "People", action: "View Confidential Notes" }), []);
  const [confidentialConversationId, setConfidentialConversationId] = React.useState("");
  const campuses = useCampuses();

  const setView = useCallback((next: string, y?: number) => {
    const q = new URLSearchParams();
    if (next) q.set("view", next);
    if (next === "gifts" || next === "sundays") q.set("year", String(y ?? (next === "gifts" ? giftYear : sundayYear)));
    setSearchParams(q, { replace: true });
  }, [giftYear, sundayYear, setSearchParams]);

  React.useEffect(() => {
    if (!canViewConfidentialNotes || !params.id) return;
    ApiHelper.get("/conversations/messages/personConfidential/" + params.id + "?limit=1", "MessagingApi")
      .then((data: ConversationInterface[]) => setConfidentialConversationId(data?.[0]?.id || ""))
      .catch(() => setConfidentialConversationId(""));
  }, [canViewConfidentialNotes, params.id]);

  React.useEffect(() => {
    if (!formPermission) return;
    ApiHelper.get("/forms", "MembershipApi").then((data: PersonFormOption[]) => {
      setPersonForms((data || []).filter((form) => !form.archived));
    }).catch(() => setPersonForms([]));
  }, [formPermission]);

  const personData = useQuery<PersonInterface | null>({
    queryKey: ["/people/" + params.id, "MembershipApi"],
    enabled: !!params.id,
    placeholderData: keepPreviousData
  });

  const refetch = useCallback(() => {
    personData.refetch();
  }, [personData]);

  const refetchRef = React.useRef(refetch);
  React.useEffect(() => { refetchRef.current = refetch; }, [refetch]);

  React.useEffect(() => {
    if (!params.id) return;
    const churchId = UserHelper.currentUserChurch?.church?.id;
    const personId = UserHelper.person?.id;
    const conversationId = personData.data?.conversationId;
    if (!churchId || !conversationId) return;
    SubscriptionManager.joinRoom(conversationId, churchId, personId).catch(() => { /* ignore */ });
    const handlerId = `PersonPage-${params.id}`;
    SocketHelper.addHandler("conversationActivity", handlerId, (data: any) => {
      if (data?.contentType === "person" && data?.contentId === params.id) refetchRef.current();
    });
    return () => {
      SocketHelper.removeHandler(handlerId);
      SubscriptionManager.leaveRoom(conversationId, churchId).catch(() => { /* ignore */ });
    };
  }, [params.id, personData.data?.conversationId]);

  const householdId = (personData.data?.id === params.id ? personData.data?.householdId : undefined)
    || personData.data?.householdId
    || "";

  const householdQuery = useQuery<PersonInterface[]>({
    queryKey: ["/people/household/" + householdId, "MembershipApi"],
    enabled: !!householdId,
    placeholderData: keepPreviousData
  });

  const person = useMemo<PersonInterface | null>(() => {
    const fromQuery = personData.data?.id === params.id ? personData.data : null;
    const fromHousehold = (householdQuery.data || []).find((p) => p.id === params.id);
    const raw = fromQuery || fromHousehold || null;
    if (!raw) return null;
    const p: PersonInterface = { ...raw };
    if (!p.contactInfo) p.contactInfo = { homePhone: "", workPhone: "", mobilePhone: "" };
    else {
      if (!p.contactInfo.homePhone) p.contactInfo.homePhone = "";
      if (!p.contactInfo.mobilePhone) p.contactInfo.mobilePhone = "";
      if (!p.contactInfo.workPhone) p.contactInfo.workPhone = "";
    }
    return p;
  }, [personData.data, householdQuery.data, params.id]);

  const householdPeople = sortHouseholdMembers(householdQuery.data?.length ? householdQuery.data : (person ? [person] : []));

  React.useEffect(() => {
    if (!person?.id) return;
    ApiHelper.get("/userchurch/personid/" + person.id, "MembershipApi")
      .then((data: { email: string } | null) => setUserEmail(data?.email || ""))
      .catch(() => setUserEmail(""));
  }, [person?.id]);

  React.useEffect(() => {
    ApiHelper.get("/personfields", "MembershipApi")
      .then((data: PersonFieldInterface[]) => setCustomFields(data || []))
      .catch(() => setCustomFields([]));
  }, []);

  React.useEffect(() => {
    if (!person?.id) return;
    ApiHelper.get(`/personfieldvalues/person/${person.id}`, "MembershipApi")
      .then((data: PersonFieldValueInterface[]) => {
        const map: Record<string, string> = {};
        (data || []).forEach((v) => { if (v.fieldId) map[v.fieldId] = v.value || ""; });
        setCustomValues(map);
      })
      .catch(() => setCustomValues({}));
  }, [person?.id]);

  const visibleForms = useMemo(() => {
    const submissions = person?.formSubmissions || [];
    const submittedFormIds = new Set(submissions.map((fs) => fs.formId));
    const result = personForms.filter((form) => form.contentType === "person" || submittedFormIds.has(form.id));
    const listedIds = new Set(result.map((form) => form.id));
    submissions.forEach((fs) => {
      if (!fs.formId || !fs.form || listedIds.has(fs.formId)) return;
      listedIds.add(fs.formId);
      result.push({ id: fs.formId, name: fs.form.name, archived: fs.form.archived, contentType: fs.form.contentType });
    });
    return result;
  }, [personForms, person?.formSubmissions]);

  const showForms = formPermission && visibleForms.length > 0;

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

  const handleCreateConfidentialConversation = async () => {
    if (!person) return "";
    const conv: ConversationInterface = {
      allowAnonymousPosts: false,
      contentType: "personConfidential",
      contentId: person.id,
      title: person.name.display + Locale.label("people.personPage.confidentialNotesSuffix"),
      visibility: "hidden"
    };
    const result: ConversationInterface[] = await ApiHelper.post("/conversations", [conv], "MessagingApi");
    setConfidentialConversationId(result[0].id || "");
    return result[0].id || "";
  };

  const handlePhotoUpdated = (dataUrl?: string) => {
    if (!person) return;
    const updated = { ...person, photo: dataUrl };
    if (!dataUrl) updated.photoUpdated = undefined;
    ApiHelper.post("/people", [updated], "MembershipApi").then(() => {
      refetch();
      householdQuery.refetch();
    });
    setInPhotoEditMode(false);
  };

  if (!person) return null;

  const campusName = person.campusId ? (campuses.find((c) => c.id === person.campusId)?.name || "") : "";
  const imageEditor = inPhotoEditMode && (
    <ImageEditor aspectRatio={4 / 3} photoUrl={PersonHelper.getPhotoUrl(person)} onCancel={() => setInPhotoEditMode(false)} onUpdate={handlePhotoUpdated} />
  );

  const identity = (
    <PersonIdentity
      person={person}
      userEmail={userEmail}
      campusName={campusName}
      customFields={customFields}
      customValues={customValues}
      onEdit={() => setView("edit")}
      onMerge={() => setShowMergeSearch(true)}
      onPhoto={() => setInPhotoEditMode(true)}
    />
  );

  const notesArchive = (
    <NoteThread
      count={undefined}
      backLabel={"← " + (person.name?.display || "")}
      onBack={() => setView("")}>
      <PersonNotes context={context} conversationId={person.conversationId || ""} createConversation={handleCreateConversation} />
      {canViewConfidentialNotes && (
        <PersonNotes
          title={Locale.label("people.personPage.confidentialNotes")}
          context={context}
          conversationId={confidentialConversationId}
          createConversation={handleCreateConfidentialConversation}
        />
      )}
    </NoteThread>
  );

  const rest = (() => {
    if (view === "notes") return notesArchive;
    if (view === "sundays") {
      return (
        <YearLedger
          title="Attendance"
          years={[]}
          year={sundayYear}
          onYear={(y) => { setSundayYear(y); setView("sundays", y); }}
          big=""
          backLabel={"← " + (person.name?.display || "")}
          onBack={() => setView("")}
          actions={<button type="button" className="back" onClick={() => window.print()}>{Locale.label("common.print")}</button>}>
          <PersonAttendance personId={person.id!} personName={person.name?.display} updatedFunction={refetch} />
        </YearLedger>
      );
    }
    if (view === "gifts") {
      return (
        <YearLedger
          title="Giving"
          years={[]}
          year={giftYear}
          onYear={(y) => { setGiftYear(y); setView("gifts", y); }}
          big=""
          backLabel={"← " + (person.name?.display || "")}
          onBack={() => setView("")}
          actions={<button type="button" className="back" onClick={() => setView("log")}>Log a gift</button>}>
          <PersonDonations personId={person.id!} />
        </YearLedger>
      );
    }
    if (view === "forms" && showForms) {
      return (
        <>
          <button className="back" type="button" onClick={() => setView("")}>{"← " + (person.name?.display || "")}</button>
          <PersonForms person={person} forms={visibleForms} updatedFunction={refetch} />
        </>
      );
    }
    if (view === "groups") {
      return (
        <>
          <button className="back" type="button" onClick={() => setView("")}>{"← " + (person.name?.display || "")}</button>
          <h3 style={{ marginTop: 8 }}>Groups</h3>
          <Groups personId={person.id!} updatedFunction={refetch} />
        </>
      );
    }
    return (
      <PersonPlate
        person={person}
        householdPeople={householdPeople}
        forms={showForms ? visibleForms : []}
        onView={(v) => setView(v)}
      />
    );
  })();

  return (
    <div className="omarchy-record">
      {imageEditor}
      {showMergeSearch && <Merge hideMergeBox={() => setShowMergeSearch(false)} person={person} />}
      {view === "edit" ? (
        <PersonEdit
          id="personDetailsBox"
          person={person}
          updatedFunction={() => { setView(""); refetch(); }}
          togglePhotoEditor={(show) => setInPhotoEditMode(show)}
          showMergeSearch={() => setShowMergeSearch(true)}
        />
      ) : (
        <PlatedRecord who={identity} rest={rest} />
      )}
      <LogGiftSheet
        open={view === "log"}
        person={person}
        householdName={householdPeople[0]?.name?.last}
        onClose={() => setView(searchParams.get("view") === "log" ? "gifts" : "")}
        onSaved={() => { refetch(); setView("gifts"); }}
      />
    </div>
  );
};
