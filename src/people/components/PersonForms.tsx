import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Card, Chip, Grid, List, ListItemButton, Stack, Typography } from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as EmptyCircleIcon,
  Description as DescriptionIcon
} from "@mui/icons-material";
import { type PersonInterface, type FormSubmissionInterface, type QuestionInterface, type AnswerInterface } from "@churchapps/helpers";
import { ApiHelper, DateHelper, DisplayBox, Loading, Locale, SmallButton } from "@churchapps/apphelper";
import { useReactToPrint } from "react-to-print";
import { FormSubmissionEdit } from "@churchapps/apphelper/forms";
import { Question, PrintStyles } from "../../components";

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

const submissionTime = (fs: FormSubmissionInterface) => (fs.submissionDate ? new Date(fs.submissionDate).getTime() : 0);

// Details are cached per submission, since the same form can hold several of them.
// Forms with nothing submitted yet cache their blank question list under the form id.
const detailKey = (formId: string, submissionId?: string) => (submissionId ? `fs-${submissionId}` : `form-${formId}`);

// The "Forms" tab: a list of the person's person-contentType forms with a completion
// dot each, plus the selected form's view/edit pane. Replaces the old profile left rail.
export const PersonForms: React.FC<Props> = (props) => {
  const { person, forms } = props;
  const [details, setDetails] = useState<Record<string, FormDetail>>({});
  const [selectedFormId, setSelectedFormId] = useState<string>("");
  const [editingFormId, setEditingFormId] = useState<string>("");
  // Per form, which of its submissions is on screen. Absent means "the newest one".
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<Record<string, string>>({});
  const contentId = person?.id;
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: `${forms.find((f) => f.id === selectedFormId)?.name || "Form"} - ${person?.name?.display || ""}` });

  const personFormSubmissions = useMemo(
    () => (person?.formSubmissions || []).filter((fs) => fs.form?.contentType === "person" || fs.contentType === "person"),
    [person?.formSubmissions]
  );

  // A person can fill the same form out more than once, so every submission is kept.
  // Keying by form id alone used to drop all but the last one the Api happened to return.
  const submissionsByFormId = useMemo(() => {
    const map: Record<string, FormSubmissionInterface[]> = {};
    personFormSubmissions.forEach((fs) => {
      if (!fs.formId) return;
      (map[fs.formId] ||= []).push(fs);
    });
    // Newest first, so the pane opens on the most recent submission whatever order the Api sent.
    Object.values(map).forEach((list) => list.sort((a, b) => submissionTime(b) - submissionTime(a)));
    return map;
  }, [personFormSubmissions]);

  const selectedSubmissionFor = (formId: string) => {
    const submissions = submissionsByFormId[formId] || [];
    return submissions.find((fs) => fs.id === selectedSubmissionIds[formId]) || submissions[0];
  };

  useEffect(() => {
    if (forms.length > 0 && !forms.some((f) => f.id === selectedFormId)) setSelectedFormId(forms[0].id);
  }, [forms, selectedFormId]);

  // The person reloads after a submission is saved, and an edit keeps the same submission
  // id, so the cache has to be dropped here rather than served for a stale answer set.
  useEffect(() => { setDetails({}); }, [personFormSubmissions]);

  // Load questions + answers for the submission on screen for each form; submitted forms
  // return answers, unsubmitted return blank questions. Switching between two submissions
  // of the same form fetches the other one once and then reads it from the cache.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (forms.length === 0) {
        setDetails({});
        return;
      }
      const wanted = forms.map((form) => {
        const submission = selectedSubmissionFor(form.id);
        return { form, submission, key: detailKey(form.id, submission?.id) };
      }).filter(({ key }) => !details[key]);
      if (wanted.length === 0) return;

      const entries = await Promise.all(wanted.map(async ({ form, submission, key }): Promise<[string, FormDetail]> => {
        if (submission) {
          const detail = await ApiHelper.get(`/formsubmissions/${submission.id}/?include=questions,answers`, "MembershipApi");
          return [key, { questions: detail?.questions || [], answers: detail?.answers || [] }];
        }
        const questions = await ApiHelper.get(`/questions/?formId=${form.id}`, "MembershipApi");
        return [key, { questions: questions || [], answers: [] }];
      }));
      if (cancelled) return;
      setDetails((prev) => {
        const map = { ...prev };
        entries.forEach(([key, detail]) => { map[key] = detail; });
        return map;
      });
    };
    void load();
    return () => { cancelled = true; };
  }, [forms, submissionsByFormId, selectedSubmissionIds, details]);

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

  // One chip per submission when the person filled the same form out more than once,
  // so the earlier ones are reachable instead of hidden behind the newest.
  const renderSubmissionPicker = (form: PersonFormOption, submissions: FormSubmissionInterface[], selected: FormSubmissionInterface | undefined) => {
    if (submissions.length < 2) return null;
    return (
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }} className="no-print" data-testid="submission-picker">
        {submissions.map((fs, index) => (
          <Chip
            key={fs.id}
            size="small"
            data-testid={`submission-option-${index}`}
            label={fs.submissionDate ? DateHelper.prettyDate(new Date(fs.submissionDate)) : `#${submissions.length - index}`}
            color={fs.id === selected?.id ? "primary" : "default"}
            variant={fs.id === selected?.id ? "filled" : "outlined"}
            onClick={() => setSelectedSubmissionIds((prev) => ({ ...prev, [form.id]: fs.id || "" }))}
          />
        ))}
      </Stack>
    );
  };

  const renderFormPane = (form: PersonFormOption) => {
    const submissions = submissionsByFormId[form.id] || [];
    const submission = selectedSubmissionFor(form.id);
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
    // DisplayBox renders either editFunction or editContent, so the print button rides
    // along in editContent next to the same edit button editFunction would have drawn.
    const actions = (
      <Stack direction="row" spacing={1} alignItems="center" className="no-print">
        {submission && <SmallButton icon="print" ariaLabel={Locale.label("common.print")} toolTip={Locale.label("common.print")} onClick={() => handlePrint()} data-testid="print-form-submission-button" />}
        <SmallButton icon="edit" toolTip={Locale.label("people.personForm.editAria")?.replace("{name}", form.name || "form")} onClick={() => setEditingFormId(form.id)} />
      </Stack>
    );
    return (
      <DisplayBox headerText={headerText} headerIcon="description" editContent={actions}>
        <div ref={printRef}>
          <PrintStyles />
          {renderSubmissionPicker(form, submissions, submission)}
          {submission && (
            <Box className="print-only" sx={{ mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>{headerText}</Typography>
              <Typography variant="body2">{Locale.label("forms.formSubmissions.subFor")}: {person?.name?.display}</Typography>
              {submission.submissionDate && <Typography variant="body2">{Locale.label("forms.formSubmissions.subDate")}: {DateHelper.prettyDate(new Date(submission.submissionDate))}</Typography>}
            </Box>
          )}
          {renderFields(submission, details[detailKey(form.id, submission?.id)])}
        </div>
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
                {(submissionsByFormId[form.id]?.length || 0) > 0
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
