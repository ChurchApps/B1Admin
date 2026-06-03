import React, { useEffect, useMemo, useState } from "react";
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Icon, TextField } from "@mui/material";
import { type FormSubmissionInterface } from "@churchapps/helpers";
import { ApiHelper, Loading, Locale, Permissions, UserHelper } from "@churchapps/apphelper";
import { FormSubmissionEdit } from "@churchapps/apphelper/forms";
import { FormSubmission } from "../../components";

interface Props {
  contentId: string;
  formSubmissions: FormSubmissionInterface[];
  updatedFunction: () => void;
}

interface PersonFormOption {
  id: string;
  name?: string;
  archived?: boolean;
  contentType?: string;
}

interface SubmissionAnswer {
  questionId: string;
  value?: string;
}

interface SubmissionQuestion {
  id: string;
  title?: string;
  fieldType: string;
}

interface DetailedSubmissionSearchResult {
  id: string;
  form?: { name?: string };
  answers?: SubmissionAnswer[];
  questions?: SubmissionQuestion[];
}

export const PersonAssociatedForms: React.FC<Props> = (props) => {
  const [mode, setMode] = useState("display");
  const [editFormSubmissionId, setEditFormSubmissionId] = useState("");
  const [allForms, setAllForms] = useState<PersonFormOption[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>("");
  const [expanded, setExpanded] = useState<string>("");
  const [searchText, setSearchText] = useState("");
  const [submissionSearchData, setSubmissionSearchData] = useState<Record<string, string>>({});
  const [loadingSearchData, setLoadingSearchData] = useState(false);
  const formPermission = UserHelper.checkAccess(Permissions.membershipApi.forms.admin) || UserHelper.checkAccess(Permissions.membershipApi.forms.edit);
  const personFormSubmissions = useMemo(
    () => (props.formSubmissions || []).filter((fs) => fs.form?.contentType === "person" || fs.contentType === "person"),
    [props.formSubmissions]
  );

  const submittedFormIds = new Set(personFormSubmissions.map((fs) => fs.formId));
  const availableForms = allForms.filter((form) => !submittedFormIds.has(form.id));

  const handleEdit = (formSubmissionId: string) => {
    setMode("edit");
    setEditFormSubmissionId(formSubmissionId);
  };

  const handleUpdate = () => {
    setMode("display");
    setSelectedFormId("");
    setEditFormSubmissionId("");
    props.updatedFunction();
  };

  const handleAdd = (formId: string) => {
    setMode("edit");
    setSelectedFormId(formId);
  };

  useEffect(() => {
    ApiHelper.get("/forms", "MembershipApi").then((data: PersonFormOption[]) => {
      const personPageForms = (data || []).filter((form) => !form.archived && form.contentType === "person");
      setAllForms(personPageForms);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadSubmissionSearchData = async () => {
      if (personFormSubmissions.length === 0) {
        setSubmissionSearchData({});
        setLoadingSearchData(false);
        return;
      }

      setLoadingSearchData(true);
      try {
        const detailedSubmissions: DetailedSubmissionSearchResult[] = await Promise.all(
          personFormSubmissions.map((submission) => ApiHelper.get(`/formsubmissions/${submission.id}/?include=questions,answers`, "MembershipApi"))
        );

        if (cancelled) return;

        const nextSearchData: Record<string, string> = {};
        detailedSubmissions.forEach((submission) => {
          const answersByQuestionId = new Map<string, SubmissionAnswer>((submission.answers || []).map((answer) => [answer.questionId, answer]));
          const searchableText = [
            submission.form?.name || "",
            ...(submission.questions || []).flatMap((question) => {
              const answer = answersByQuestionId.get(question.id);
              return [question.title || "", formatAnswerValue(question.fieldType, answer?.value || "")];
            })
          ]
            .join(" ")
            .toLowerCase();
          nextSearchData[submission.id] = searchableText;
        });
        setSubmissionSearchData(nextSearchData);
      } finally {
        if (!cancelled) setLoadingSearchData(false);
      }
    };

    void loadSubmissionSearchData();

    return () => {
      cancelled = true;
    };
  }, [personFormSubmissions]);

  const normalizedSearch = searchText.trim().toLowerCase();
  const filteredSubmittedForms = normalizedSearch
    ? personFormSubmissions.filter((submission) => (submissionSearchData[submission.id] || submission.form?.name?.toLowerCase() || "").includes(normalizedSearch))
    : personFormSubmissions;
  const filteredAvailableForms = normalizedSearch
    ? availableForms.filter((form) => (form.name || "").toLowerCase().includes(normalizedSearch))
    : availableForms;

  if (!formPermission) return <></>;

  if (mode === "edit") {
    return (
      <FormSubmissionEdit
        formSubmissionId={editFormSubmissionId}
        updatedFunction={handleUpdate}
        addFormId={selectedFormId}
        contentType="person"
        contentId={props.contentId}
        personId={props.contentId}
      />
    );
  }

  return (
    <div id="personFormsAccordion">
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          label={Locale.label("common.search") || "Search"}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search questions, or answers"
        />
      </Box>
      {loadingSearchData && normalizedSearch && (
        <Box sx={{ py: 2, display: "flex", justifyContent: "center" }}>
          <Loading size="sm" />
        </Box>
      )}
      {filteredSubmittedForms.map((fs) => (
        <Accordion
          key={fs.id}
          expanded={!!normalizedSearch || expanded === `submitted-${fs.id}`}
          onChange={(_, isExpanded) => {
            if (normalizedSearch) return;
            setExpanded(isExpanded ? `submitted-${fs.id}` : "");
          }}>
          <AccordionSummary>
            <span>{fs.form.name}</span>
          </AccordionSummary>
          <AccordionDetails>
            <div className="card-body">
              <FormSubmission formSubmissionId={fs.id} editFunction={handleEdit} />
            </div>
          </AccordionDetails>
        </Accordion>
      ))}
      {filteredAvailableForms.map((form) => (
        <Accordion
          key={form.id}
          expanded={expanded === `unsubmitted-${form.id}`}
          onChange={() => setExpanded(`unsubmitted-${form.id}`)}>
          <AccordionSummary onClick={() => handleAdd(form.id)}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Button variant="text" onClick={() => handleAdd(form.id)} data-testid="add-form-button" aria-label={Locale.label("components.associatedForms.addForm")}>
                <Icon>add</Icon>
              </Button>
              <span>{form.name}</span>
            </Box>
          </AccordionSummary>
          <AccordionDetails />
        </Accordion>
      ))}
      {!loadingSearchData && filteredSubmittedForms.length === 0 && filteredAvailableForms.length === 0 && normalizedSearch && (
        <Box sx={{ py: 2, color: "text.secondary" }}>
          {Locale.label("people.peoplePage.noPeopleFound") || "No matching forms found."}
        </Box>
      )}
    </div>
  );
};

function formatAnswerValue(fieldType: string, value: string) {
  if (!value) return "";
  if (fieldType === "Yes/No") {
    if (value === "True") return Locale.label("common.yes") || "Yes";
    if (value === "False") return Locale.label("common.no") || "No";
  }
  return value;
}
