import React, { useContext, useCallback, useMemo } from "react";
import { HouseholdEdit, Merge, PersonAttendance, PersonDonations, PersonEdit, PersonExportDialog, PersonForms, PersonNotes, type PersonFormOption } from "./components";
import { type PersonInterface, type ConversationInterface } from "@churchapps/helpers";
import { ApiHelper, ImageEditor, Locale, Permissions, PersonHelper, SocketHelper, SubscriptionManager, UserHelper } from "@churchapps/apphelper";
import { Box } from "@mui/material";
import { useParams } from "react-router-dom";
import { BackVerb, PageContainer, RecordLayout, TextAction, VerbRow, useRecordView } from "../components/ui";
import UserContext from "../UserContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PersonIdentity } from "./components/PersonIdentity";
import { useHousehold } from "./components/Household";
import { PersonAttendanceSummary, PersonFormsSummary, PersonGivingSummary, PersonGroupsSummary, PersonNotesSummary } from "./components/PersonSummaries";
import { LogGiftDialog } from "../donations/components/LogGiftDialog";

const FORM_VIEWS = ["edit", "household"];

export const PersonPage = () => {
  const context = useContext(UserContext);
  const params = useParams();
  // Forms (edit, household) replace history so Back doesn't reopen a finished form.
  const { view: requestedView, setView, searchParams } = useRecordView("view", { replace: FORM_VIEWS });
  const [inPhotoEditMode, setInPhotoEditMode] = React.useState<boolean>(false);
  const [showMergeSearch, setShowMergeSearch] = React.useState(false);
  const [showExportDialog, setShowExportDialog] = React.useState(false);
  const [personForms, setPersonForms] = React.useState<PersonFormOption[]>([]);
  const [editPerson, setEditPerson] = React.useState<PersonInterface | null>(null);

  const canEdit = useMemo(() => UserHelper.checkAccess(Permissions.membershipApi.people.edit), []);
  const canViewAttendance = useMemo(() => UserHelper.checkAccess(Permissions.attendanceApi.attendance.view), []);
  const canViewGiving = useMemo(() => UserHelper.checkAccess(Permissions.givingApi.donations.view), []);
  const canLogGift = useMemo(() => UserHelper.checkAccess(Permissions.givingApi.donations.edit), []);
  const [showLogGift, setShowLogGift] = React.useState(false);
  const [giftVersion, setGiftVersion] = React.useState(0);
  const queryClient = useQueryClient();
  const formPermission = useMemo(() => UserHelper.checkAccess(Permissions.membershipApi.forms.admin) || UserHelper.checkAccess(Permissions.membershipApi.forms.edit), []);
  const canViewConfidentialNotes = useMemo(() => UserHelper.checkAccess({ api: "MembershipApi", contentType: "People", action: "View Confidential Notes" }), []);
  const [confidentialConversationId, setConfidentialConversationId] = React.useState("");

  React.useEffect(() => {
    setShowMergeSearch(false);
    setInPhotoEditMode(false);
  }, [params.id]);

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
    placeholderData: null
  });

  const refetch = useCallback(() => {
    personData.refetch();
  }, [personData]);

  // Stash refetch in ref to avoid subscription re-create on every react-query update.
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

  const person = useMemo<PersonInterface | null>(() => {
    if (!personData.data) return null;
    const p: PersonInterface = personData.data;
    if (!p.contactInfo) p.contactInfo = { homePhone: "", workPhone: "", mobilePhone: "" };
    else {
      if (!p.contactInfo.homePhone) p.contactInfo.homePhone = "";
      if (!p.contactInfo.mobilePhone) p.contactInfo.mobilePhone = "";
      if (!p.contactInfo.workPhone) p.contactInfo.workPhone = "";
    }
    return p;
  }, [personData.data]);

  React.useEffect(() => setEditPerson(person), [person]);

  const household = useHousehold(person);

  // Person forms show for everyone; a stand-alone form only shows for the people it's linked to.
  const visibleForms = useMemo(() => {
    const submissions = person?.formSubmissions || [];
    const submittedFormIds = new Set(submissions.map((fs) => fs.formId));
    const result = personForms.filter((form) => form.contentType === "person" || submittedFormIds.has(form.id));
    // /forms omits archived forms, but archiving only stops new submissions - a form
    // the person already filled out has to keep showing its answers, so add it back
    // from the submission itself.
    const listedIds = new Set(result.map((form) => form.id));
    submissions.forEach((fs) => {
      if (!fs.formId || !fs.form || listedIds.has(fs.formId)) return;
      listedIds.add(fs.formId);
      result.push({ id: fs.formId, name: fs.form.name, archived: fs.form.archived, contentType: fs.form.contentType });
    });
    return result;
  }, [personForms, person?.formSubmissions]);

  const showForms = formPermission && visibleForms.length > 0;

  const allowedViews: Record<string, boolean> = {
    edit: canEdit,
    household: canEdit && !!household.household && household.members !== null,
    attendance: canViewAttendance,
    giving: canViewGiving,
    notes: canEdit,
    forms: showForms
  };
  const view = allowedViews[requestedView] ? requestedView : "";

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
    setConfidentialConversationId(result[0].id);
    return result[0].id || "";
  };

  const handlePhotoUpdated = (dataUrl?: string) => {
    if (!editPerson) return;
    const updatedPerson = { ...editPerson, photo: dataUrl };
    if (!dataUrl) updatedPerson.photoUpdated = undefined;
    setEditPerson(updatedPerson);
    setInPhotoEditMode(false);
    // Edit mode saves the photo with the form; otherwise nothing else will persist it.
    if (view !== "edit" && updatedPerson.id) {
      const toSave = { ...updatedPerson, photo: dataUrl ?? null, photoUpdated: dataUrl ? updatedPerson.photoUpdated : null } as unknown as PersonInterface;
      ApiHelper.post("/people", [toSave], "MembershipApi").then(() => refetch()).catch((error) => console.error("Error saving photo:", error));
    }
  };

  const togglePhotoEditor = (show: boolean, updatedPerson?: PersonInterface) => {
    setInPhotoEditMode(show);
    if (updatedPerson) setEditPerson(updatedPerson);
  };

  if (!person || !editPerson) return null;

  const backButton = (
    <Box>
      <BackVerb name={person.name?.display || ""} onClick={() => setView("")} labelKey="people.personRecord.backTo" data-testid="person-record-back" />
    </Box>
  );

  const notes = (
    <React.Fragment key={`notes-${person.conversationId || "new"}-${confidentialConversationId || "new"}`}>
      <PersonNotes context={context} conversationId={person.conversationId || ""} createConversation={handleCreateConversation} />
      {canViewConfidentialNotes && (
        <PersonNotes
          title={Locale.label("people.personPage.confidentialNotes")}
          context={context}
          conversationId={confidentialConversationId}
          createConversation={handleCreateConfidentialConversation}
        />
      )}
    </React.Fragment>
  );

  const detailColumn = () => {
    switch (view) {
      case "edit":
        return (
          <PersonEdit
            id="personDetailsBox"
            person={editPerson}
            updatedFunction={() => { setView(""); refetch(); }}
            togglePhotoEditor={togglePhotoEditor}
            showMergeSearch={() => setShowMergeSearch(true)}
          />
        );
      case "household":
        return (
          <HouseholdEdit
            household={household.household!}
            currentMembers={household.members}
            currentPerson={person}
            updatedFunction={() => { household.reload(); setView(""); }}
          />
        );
      case "attendance":
        return <>{backButton}<PersonAttendance personId={person.id!} personName={person.name?.display} updatedFunction={refetch} autoPrint={searchParams.get("print") === "1"} /></>;
      case "giving":
        return (
          <>
            <VerbRow plain>
              <BackVerb name={person.name?.display || ""} onClick={() => setView("")} labelKey="people.personRecord.backTo" data-testid="person-record-back" />
              {canLogGift && <TextAction onClick={() => setShowLogGift(true)} data-testid="person-log-gift">{Locale.label("donations.logGift.title", "Log a gift")}</TextAction>}
            </VerbRow>
            <PersonDonations key={giftVersion} personId={person.id!} />
          </>
        );
      case "notes":
        return <>{backButton}{notes}</>;
      case "forms":
        return <>{backButton}<PersonForms person={person} forms={visibleForms} initialFormId={searchParams.get("form") || ""} updatedFunction={refetch} /></>;
      default:
        return (
          <>
            {canViewAttendance && <PersonAttendanceSummary personId={person.id!} onViewAll={() => setView("attendance")} onPrint={() => setView("attendance", { print: "1" })} />}
            {canViewGiving && <PersonGivingSummary personId={person.id!} householdMembers={household.members} onViewAll={() => setView("giving")} onLogGift={canLogGift ? () => setShowLogGift(true) : undefined} />}
            <PersonGroupsSummary personId={person.id!} />
            {canEdit && <PersonNotesSummary conversationId={person.conversationId || ""} onViewAll={() => setView("notes")} />}
            {showForms && <PersonFormsSummary person={person} forms={visibleForms} onOpen={(formId) => setView("forms", { form: formId || "" })} />}
          </>
        );
    }
  };

  const archive = view !== "";

  return (
    <PageContainer>
      <RecordLayout
        spacing={archive ? 3 : 5}
        data-testid="person-record-details"
        identity={(
          <PersonIdentity
            person={editPerson}
            household={household.household}
            householdMembers={household.members}
            view={view}
            onEdit={() => setView("edit")}
            onEditHousehold={() => setView("household")}
            onMerge={() => setShowMergeSearch(true)}
            onExport={() => setShowExportDialog(true)}
            onPhoto={() => setInPhotoEditMode(true)}
          />
        )}>
        {showMergeSearch && <Merge hideMergeBox={() => setShowMergeSearch(false)} person={person} />}
        {inPhotoEditMode && (
          <ImageEditor aspectRatio={4 / 3} photoUrl={PersonHelper.getPhotoUrl(editPerson)} onCancel={() => togglePhotoEditor(false)} onUpdate={handlePhotoUpdated} />
        )}
        {detailColumn()}
      </RecordLayout>
      <PersonExportDialog open={showExportDialog} onClose={() => setShowExportDialog(false)} person={person} />
      {canLogGift && (
        <LogGiftDialog
          open={showLogGift}
          person={person}
          onClose={() => setShowLogGift(false)}
          onSaved={() => {
            setShowLogGift(false);
            queryClient.invalidateQueries({ queryKey: ["/donations?personId=" + person.id, "GivingApi"] });
            setGiftVersion((v) => v + 1);
            setView("giving");
          }}
        />
      )}
    </PageContainer>
  );
};
