import React, { memo } from "react";
import { Household, Merge, PersonAssociatedForms, PersonEdit } from "./";
import { type PersonInterface } from "@churchapps/helpers";
import { ApiHelper, DisplayBox, ImageEditor, Locale, Permissions, PersonHelper, UserHelper } from "@churchapps/apphelper";
import { Button } from "@mui/material";
import { FileDownload as ExportIcon } from "@mui/icons-material";

interface Props {
  person: PersonInterface;
  updatedFunction: () => void;
  inPhotoEditMode: boolean;
  setInPhotoEditMode: (show: boolean) => void;
  editMode: string;
  setEditMode: (mode: string) => void;
}
export const PersonDetails = memo((props: Props) => {
  const [person, setPerson] = React.useState<PersonInterface>(props.person);
  const [showMergeSearch, setShowMergeSearch] = React.useState<boolean>(false);
  const [exporting, setExporting] = React.useState(false);
  const { inPhotoEditMode, setInPhotoEditMode, editMode, setEditMode } = props;
  const formPermission = UserHelper.checkAccess(Permissions.membershipApi.forms.admin) || UserHelper.checkAccess(Permissions.membershipApi.forms.edit);

  React.useEffect(() => setPerson(props.person), [props.person]);

  const handlePhotoUpdated = (dataUrl: string) => {
    const updatedPerson = { ...person };
    updatedPerson.photo = dataUrl;
    if (!dataUrl) {
      updatedPerson.photoUpdated = null;
    }
    setPerson(updatedPerson);
    setInPhotoEditMode(false);
  };

  const togglePhotoEditor = (show: boolean, updatedPerson?: PersonInterface) => {
    setInPhotoEditMode(show);
    if (updatedPerson) {
      setPerson(updatedPerson);
    }
  };

  const imageEditor = inPhotoEditMode && <ImageEditor aspectRatio={4 / 3} photoUrl={PersonHelper.getPhotoUrl(person)} onCancel={() => togglePhotoEditor(false)} onUpdate={handlePhotoUpdated} />;

  const handleShowSearch = () => {
    setShowMergeSearch(true);
  };

  const hideMergeBox = () => {
    setShowMergeSearch(false);
  };

  const addMergeSearch = showMergeSearch ? <Merge hideMergeBox={hideMergeBox} person={person} /> : null;

  const handleUpdated = () => {
    setEditMode("display");
    props.updatedFunction();
  };

  const formatAnswerValue = (question: any, answer: any) => {
    if (!answer?.value) return "";
    if (question?.fieldType === "Yes/No") {
      if (answer.value === "True") return Locale.label("common.yes") || "Yes";
      if (answer.value === "False") return Locale.label("common.no") || "No";
    }
    return answer.value;
  };

  const buildCsvValue = (value: unknown) => {
    const normalized = String(value ?? "");
    return `"${normalized.replace(/"/g, "\"\"")}"`;
  };

  const handleExport = async () => {
    if (!person?.id || exporting) return;

    setExporting(true);
    try {
      const personFormSubmissions = (person.formSubmissions || []).filter((submission) => submission.form?.contentType === "person" || submission.contentType === "person");
      const rows: Record<string, string>[] = [
        { section: "Person", form: "", question: "Display Name", answer: person.name?.display || "" },
        { section: "Person", form: "", question: "First Name", answer: person.name?.first || "" },
        { section: "Person", form: "", question: "Middle Name", answer: person.name?.middle || "" },
        { section: "Person", form: "", question: "Last Name", answer: person.name?.last || "" },
        { section: "Person", form: "", question: "Nick Name", answer: person.name?.nick || "" },
        { section: "Person", form: "", question: "Email", answer: person.contactInfo?.email || "" },
        { section: "Person", form: "", question: "Name Tag Notes", answer: person.nametagNotes || "" },
        { section: "Person", form: "", question: "Donor Number", answer: person.donorNumber || "" },
        { section: "Person", form: "", question: "Membership Status", answer: person.membershipStatus || "" },
        { section: "Person", form: "", question: "Gender", answer: person.gender || "" },
        { section: "Person", form: "", question: "Marital Status", answer: person.maritalStatus || "" },
        { section: "Person", form: "", question: "Birth Date", answer: person.birthDate ? new Date(person.birthDate).toISOString().split("T")[0] : "" },
        { section: "Person", form: "", question: "Anniversary", answer: person.anniversary ? new Date(person.anniversary).toISOString().split("T")[0] : "" },
        { section: "Person", form: "", question: "Address 1", answer: person.contactInfo?.address1 || "" },
        { section: "Person", form: "", question: "Address 2", answer: person.contactInfo?.address2 || "" },
        { section: "Person", form: "", question: "City", answer: person.contactInfo?.city || "" },
        { section: "Person", form: "", question: "State/Province", answer: person.contactInfo?.state || "" },
        { section: "Person", form: "", question: "Zip/Postal", answer: person.contactInfo?.zip || "" },
        { section: "Person", form: "", question: "Home Phone", answer: person.contactInfo?.homePhone?.split("x")[0] || person.contactInfo?.homePhone || "" },
        { section: "Person", form: "", question: "Home Extension", answer: person.contactInfo?.homePhone?.split("x")[1] || "" },
        { section: "Person", form: "", question: "Work Phone", answer: person.contactInfo?.workPhone?.split("x")[0] || person.contactInfo?.workPhone || "" },
        { section: "Person", form: "", question: "Work Extension", answer: person.contactInfo?.workPhone?.split("x")[1] || "" },
        { section: "Person", form: "", question: "Mobile Phone", answer: person.contactInfo?.mobilePhone?.split("x")[0] || person.contactInfo?.mobilePhone || "" },
        { section: "Person", form: "", question: "Mobile Extension", answer: person.contactInfo?.mobilePhone?.split("x")[1] || "" },
        { section: "Person", form: "", question: "Hide Me From Member Directory", answer: person.optedOut ? (Locale.label("common.yes") || "Yes") : (Locale.label("common.no") || "No") }
      ];

      const detailedSubmissions = await Promise.all(personFormSubmissions.map((submission) => ApiHelper.get(`/formsubmissions/${submission.id}/?include=questions,answers`, "MembershipApi")));
      detailedSubmissions.forEach((submission: any) => {
        const answersByQuestionId = new Map((submission.answers || []).map((answer: any) => [answer.questionId, answer]));
        (submission.questions || []).forEach((question: any) => {
          if (question.fieldType === "Heading") return;
          const answer = answersByQuestionId.get(question.id);
          rows.push({
            section: "Form",
            form: submission.form?.name || "Form",
            question: question.title || "",
            answer: formatAnswerValue(question, answer)
          });
        });
      });

      const headers = ["section", "form", "question", "answer"];
      const csv = [headers.map(buildCsvValue).join(","), ...rows.map((row) => headers.map((header) => buildCsvValue(row[header])).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${(person.name?.display || "person").replace(/\s+/g, "_")}_details.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  if (!person) return null;

  return (
    <>
      {addMergeSearch}
      {imageEditor}

      {editMode === "edit" ? (
        <PersonEdit id="personDetailsBox" person={person} updatedFunction={handleUpdated} togglePhotoEditor={togglePhotoEditor} showMergeSearch={handleShowSearch} />
      ) : (
        <>
          <Household person={person} reload={person?.photoUpdated} />
            {formPermission && (
              <DisplayBox
                id="personFormsBox"
                headerIcon="description"
                headerText={Locale.label("people.personNavigation.forms") || "Forms"}
                editContent={(
                  <Button size="small" variant="outlined" startIcon={<ExportIcon />} onClick={handleExport} disabled={exporting} sx={{ minWidth: "auto" }}>
                    {exporting ? (Locale.label("people.peoplePage.loading") || "Exporting...") : (Locale.label("people.peoplePage.export") || "Export")}
                  </Button>
                )}>
                <PersonAssociatedForms contentId={person.id} formSubmissions={person.formSubmissions} updatedFunction={props.updatedFunction} />
              </DisplayBox>
            )}
        </>
      )}
    </>
  );
});
