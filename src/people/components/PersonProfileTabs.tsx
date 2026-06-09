import React, { useEffect, useMemo, useState } from "react";
import { Box, Grid, Stack, Typography } from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as EmptyCircleIcon,
  Person as PersonIcon,
  Description as DescriptionIcon
} from "@mui/icons-material";
import { type PersonInterface, type FormSubmissionInterface, type QuestionInterface, type AnswerInterface } from "@churchapps/helpers";
import { ApiHelper, DisplayBox, Loading, Locale, Permissions, UserHelper } from "@churchapps/apphelper";
import { FormSubmissionEdit } from "@churchapps/apphelper/forms";
import { Question } from "../../components";

interface Props {
  person: PersonInterface;
  updatedFunction: () => void;
  profileContent: React.ReactNode;
}

interface PersonFormOption {
  id: string;
  name?: string;
  archived?: boolean;
  contentType?: string;
}

interface FormDetail {
  questions: QuestionInterface[];
  answers: AnswerInterface[];
}

// The person record's "Profile" view plus a vertical side rail with one entry per person-form
// (Planning Center style). Profile is selected by default; each form shows a completion dot
// (filled = submitted, hollow = not). The selected entry renders inline on the right and edits in place.
export const PersonProfileTabs: React.FC<Props> = (props) => {
  const [allForms, setAllForms] = useState<PersonFormOption[]>([]);
  const [details, setDetails] = useState<Record<string, FormDetail>>({});
  const [selectedKey, setSelectedKey] = useState<string>("profile");
  const [editingFormId, setEditingFormId] = useState<string>("");
  const formPermission = UserHelper.checkAccess(Permissions.membershipApi.forms.admin) || UserHelper.checkAccess(Permissions.membershipApi.forms.edit);
  const contentId = props.person?.id;

  const personFormSubmissions = useMemo(
    () => (props.person?.formSubmissions || []).filter((fs) => fs.form?.contentType === "person" || fs.contentType === "person"),
    [props.person?.formSubmissions]
  );

  const submissionByFormId = useMemo(() => {
    const map: Record<string, FormSubmissionInterface> = {};
    personFormSubmissions.forEach((fs) => { if (fs.formId) map[fs.formId] = fs; });
    return map;
  }, [personFormSubmissions]);

  useEffect(() => {
    if (!formPermission) return;
    ApiHelper.get("/forms", "MembershipApi").then((data: PersonFormOption[]) => {
      setAllForms((data || []).filter((form) => !form.archived && form.contentType === "person"));
    });
  }, [formPermission]);

  // Load questions + answers for each form so its pane renders inline rows. Submitted forms
  // come back with answers; unsubmitted forms load just the questions (blank values).
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (allForms.length === 0) {
        setDetails({});
        return;
      }
      const entries = await Promise.all(allForms.map(async (form): Promise<[string, FormDetail]> => {
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
  }, [allForms, submissionByFormId]);

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
              {firstHalf.map((q, index) => <Question key={`first-${q.id || index}`} question={q} answer={getAnswer(q.id)} showEmpty />)}
            </Stack>
          </Grid>
          {secondHalf.length > 0 && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={2}>
                {secondHalf.map((q, index) => <Question key={`second-${q.id || index}`} question={q} answer={getAnswer(q.id)} showEmpty />)}
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
            contentId={contentId}
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

  // No forms (or no permission) → just the profile, no rail.
  if (!formPermission || allForms.length === 0) {
    return <>{props.profileContent}</>;
  }

  const selectedForm = selectedKey === "profile" ? undefined : allForms.find((f) => f.id === selectedKey);

  // Affixed full-height left rail, flush to the content edge — same look as /site/pages.
  // PersonPage wraps tab content in 24px padding, so break out of it (negative margins) to
  // butt up against the tabs (mt) and reach the left/bottom edges (mx/mb), and give the row a
  // viewport-based minHeight so the panel spans the screen even when the selected pane is short.
  return (
    <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, mx: -3, mt: -3, mb: -3, minHeight: { md: "calc(100vh - 250px)" } }}>
      <Box
        sx={(theme) => ({
          width: { xs: "100%", md: 280 },
          flexShrink: 0,
          py: 2,
          backgroundColor: theme.palette.mode === "light" ? "#FFF" : "#292929",
          borderRight: `1px solid ${theme.palette.divider}`,
          position: "relative",
          zIndex: 1
        })}>
        <Typography sx={{ px: 2.5, py: 1, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "text.secondary" }}>
          {Locale.label("people.personProfile.railLabel") || "Profile & Forms"}
        </Typography>

        <RailItem
          icon={<PersonIcon sx={{ fontSize: 20 }} />}
          label={Locale.label("people.personNavigation.profile") || "Profile"}
          active={selectedKey === "profile"}
          onClick={() => setSelectedKey("profile")}
        />
        {allForms.map((form) => (
          <RailItem
            key={form.id}
            icon={<DescriptionIcon sx={{ fontSize: 20 }} />}
            label={form.name || Locale.label("people.personForm.form") || "Form"}
            active={selectedKey === form.id}
            submitted={!!submissionByFormId[form.id]}
            onClick={() => setSelectedKey(form.id)}
          />
        ))}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, p: 3 }}>
        {selectedForm ? renderFormPane(selectedForm) : props.profileContent}
      </Box>
    </Box>
  );
};

interface RailItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  submitted?: boolean;
  onClick: () => void;
}

const RailItem: React.FC<RailItemProps> = ({ icon, label, active, submitted, onClick }) => (
  <Box
    onClick={onClick}
    sx={(theme) => ({
      display: "flex",
      alignItems: "center",
      gap: 1.5,
      px: 2.5,
      py: 1.5,
      cursor: "pointer",
      borderLeft: "3px solid",
      borderColor: active ? theme.palette.primary.main : "transparent",
      backgroundColor: active ? theme.palette.action.selected : "transparent",
      color: active ? theme.palette.primary.main : theme.palette.text.primary,
      fontWeight: active ? 500 : 400,
      "&:hover": { backgroundColor: active ? theme.palette.action.selected : theme.palette.action.hover }
    })}>
    {icon}
    <Typography sx={{ flex: 1, fontSize: "0.9rem", fontWeight: "inherit", color: "inherit", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
      {label}
    </Typography>
    {submitted === true && <CheckCircleIcon sx={{ fontSize: 18, color: "success.main" }} />}
    {submitted === false && <EmptyCircleIcon sx={{ fontSize: 18, color: "text.disabled" }} />}
  </Box>
);
