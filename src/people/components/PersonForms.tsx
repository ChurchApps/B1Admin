import React, { useEffect, useMemo, useState } from "react";
import { Card, Grid, List, ListItemButton, Stack, Typography } from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as EmptyCircleIcon,
  Description as DescriptionIcon
} from "@mui/icons-material";
import { type PersonInterface, type FormSubmissionInterface, type QuestionInterface, type AnswerInterface } from "@churchapps/helpers";
import { ApiHelper, DisplayBox, Loading, Locale } from "@churchapps/apphelper";
import { FormSubmissionEdit } from "@churchapps/apphelper/forms";
import { Question } from "../../components";

export interface PersonFormOption {
  id: string;
  name?: string;
  archived?: boolean;
  contentType?: string;
}

interface FormDetail {
  questions: QuestionInterface[];
  answers: AnswerInterface[];
}

interface Props {
  person: PersonInterface;
  forms: PersonFormOption[];
  updatedFunction: () => void;
}

// The "Forms" tab: a list of the person's person-contentType forms with a completion
// dot each, plus the selected form's view/edit pane. Replaces the old profile left rail.
export const PersonForms: React.FC<Props> = (props) => {
  const { person, forms } = props;
  const [details, setDetails] = useState<Record<string, FormDetail>>({});
  const [selectedFormId, setSelectedFormId] = useState<string>("");
  const [editingFormId, setEditingFormId] = useState<string>("");
  const contentId = person?.id;

  const personFormSubmissions = useMemo(
    () => (person?.formSubmissions || []).filter((fs) => fs.form?.contentType === "person" || fs.contentType === "person"),
    [person?.formSubmissions]
  );

  const submissionByFormId = useMemo(() => {
    const map: Record<string, FormSubmissionInterface> = {};
    personFormSubmissions.forEach((fs) => { if (fs.formId) map[fs.formId] = fs; });
    return map;
  }, [personFormSubmissions]);

  useEffect(() => {
    if (forms.length > 0 && !forms.some((f) => f.id === selectedFormId)) setSelectedFormId(forms[0].id);
  }, [forms, selectedFormId]);

  // Load questions + answers for each form; submitted forms return answers, unsubmitted return blank questions.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (forms.length === 0) {
        setDetails({});
        return;
      }
      const entries = await Promise.all(forms.map(async (form): Promise<[string, FormDetail]> => {
        const submission = submissionByFormId[form.id];
        if (submission) {
          const detail = await ApiHelper.get(`/formsubmissions/${submission.id}/?include=questions,answers`, "MembershipApi");
          return [form.id, { questions: detail?.questions || [], answers: detail?.answers || [] }];
        }
        const questions = await ApiHelper.get(`/questions/?formId=${form.id}`, "MembershipApi");
        return [form.id, { questions: questions || [], answers: [] }];
      }));
      if (cancelled) return;
      const map: Record<string, FormDetail> = {};
      entries.forEach(([id, detail]) => { map[id] = detail; });
      setDetails(map);
    };
    void load();
    return () => { cancelled = true; };
  }, [forms, submissionByFormId]);

  const handleSaved = () => {
    setEditingFormId("");
    props.updatedFunction();
  };

  const renderFields = (submission: FormSubmissionInterface | undefined, detail: FormDetail | undefined) => {
    if (!detail) return <Loading size="sm" />;
    const questions = detail.questions || [];
    if (questions.length === 0) return <Typography variant="body2" color="text.secondary">{Locale.label("common.formSubmission.noQuestions")}</Typography>;

    const getAnswer = (questionId: string) => detail.answers.find((a) => a.questionId === questionId) || null;
    const halfWay = Math.round(questions.length / 2);
    const firstHalf = questions.slice(0, halfWay);
    const secondHalf = questions.slice(halfWay);

    return (
      <>
        {!submission && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontStyle: "italic" }}>
            {Locale.label("people.personForm.notFilledOut") || "Not filled out yet."}
          </Typography>
        )}
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: questions.length > 1 ? 6 : 12 }}>
            <Stack spacing={2}>
              {firstHalf.map((q, index) => <Question key={`first-${q.id || index}`} question={q} answer={getAnswer(q.id || "") as AnswerInterface} showEmpty />)}
            </Stack>
          </Grid>
          {secondHalf.length > 0 && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={2}>
                {secondHalf.map((q, index) => <Question key={`second-${q.id || index}`} question={q} answer={getAnswer(q.id || "") as AnswerInterface} showEmpty />)}
              </Stack>
            </Grid>
          )}
        </Grid>
      </>
    );
  };

  const renderFormPane = (form: PersonFormOption) => {
    const submission = submissionByFormId[form.id];
    const headerText = form.name || Locale.label("people.personForm.form") || "Form";
    if (editingFormId === form.id) {
      return (
        <DisplayBox headerText={headerText} headerIcon="description">
          <FormSubmissionEdit
            formSubmissionId={submission?.id || ""}
            addFormId={submission ? "" : form.id}
            contentType="person"
            contentId={contentId || ""}
            personId={contentId}
            showHeader={false}
            updatedFunction={handleSaved}
            cancelFunction={() => setEditingFormId("")}
          />
        </DisplayBox>
      );
    }
    return (
      <DisplayBox
        headerText={headerText}
        headerIcon="description"
        editFunction={() => setEditingFormId(form.id)}
        ariaLabel={Locale.label("people.personForm.editAria")?.replace("{name}", form.name || "form")}>
        {renderFields(submission, details[form.id])}
      </DisplayBox>
    );
  };

  if (forms.length === 0) return null;
  const selectedForm = forms.find((f) => f.id === selectedFormId) || forms[0];

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 8 }}>
        {renderFormPane(selectedForm)}
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card>
          <List disablePadding>
            {forms.map((form) => (
              <ListItemButton key={form.id} selected={form.id === selectedForm.id} onClick={() => setSelectedFormId(form.id)}>
                <DescriptionIcon sx={{ fontSize: 20, mr: 1.5, color: "text.secondary" }} />
                <Typography sx={{ flex: 1, fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {form.name || Locale.label("people.personForm.form") || "Form"}
                </Typography>
                {submissionByFormId[form.id]
                  ? <CheckCircleIcon sx={{ fontSize: 18, color: "success.main" }} />
                  : <EmptyCircleIcon sx={{ fontSize: 18, color: "text.disabled" }} />}
              </ListItemButton>
            ))}
          </List>
        </Card>
      </Grid>
    </Grid>
  );
};
