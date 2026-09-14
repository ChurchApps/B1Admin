import React, { memo, useRef } from "react";
import { Question, PrintStyles } from "./";
import { Grid, Box, Typography, Stack } from "@mui/material";
import { Edit as EditIcon, Print as PrintIcon } from "@mui/icons-material";
import { useReactToPrint } from "react-to-print";
import { type FormSubmissionInterface, type AnswerInterface } from "@churchapps/helpers";
import { Permissions, ApiHelper, UserHelper, UniqueIdHelper, Loading, Locale, DateHelper } from "@churchapps/apphelper";
import { AppIconButton } from "./ui/AppIconButton";

interface Props {
  formSubmissionId: string;
  editFunction: (formSubmissionId: string) => void;
}

export const FormSubmission: React.FC<Props> = memo((props) => {
  const [formSubmission, setFormSubmission] = React.useState<FormSubmissionInterface | null>(null);
  const [loading, setLoading] = React.useState(true);
  const formPermission = UserHelper.checkAccess(Permissions.membershipApi.forms.admin) || UserHelper.checkAccess(Permissions.membershipApi.forms.edit);
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: formSubmission?.form?.name || Locale.label("forms.formPrint.title") });

  const loadData = React.useCallback(async () => {
    if (!UniqueIdHelper.isMissing(props.formSubmissionId)) {
      setLoading(true);
      try {
        const data = await ApiHelper.get("/formsubmissions/" + props.formSubmissionId + "/?include=form,questions,answers", "MembershipApi");
        setFormSubmission(data);
      } catch (error) {
        console.error("Failed to load form submission:", error);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [props.formSubmissionId]);

  const getAnswer = (questionId: string) => {
    if (!formSubmission?.answers) return null;
    const answers = formSubmission.answers;
    for (let i = 0; i < answers.length; i++) {
      if (answers[i].questionId === questionId) return answers[i];
    }
    return null;
  };

  React.useEffect(() => {
    loadData();
  }, [props.formSubmissionId, loadData]);

  if (loading) {
    return <Loading size="sm" />;
  }

  if (!formSubmission) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
        {Locale.label("common.formSubmission.noData")}
      </Typography>
    );
  }

  const questions = formSubmission.questions || [];
  const halfWay = Math.round(questions.length / 2);
  const firstHalf = questions.slice(0, halfWay);
  const secondHalf = questions.slice(halfWay);

  return (
    <Box sx={{ position: "relative" }}>
      <Stack
        direction="row"
        spacing={0.5}
        className="no-print"
        sx={{
          position: "absolute",
          top: 0,
          right: 0,
          zIndex: 1
        }}>
        <AppIconButton label={Locale.label("common.print")} icon={<PrintIcon />} tone="card" onClick={() => handlePrint()} data-testid="print-form-submission-button" />
        {formPermission && (
          <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon />} tone="card" onClick={() => props.editFunction(props.formSubmissionId)} data-testid="edit-form-submission-button" />
        )}
      </Stack>

      <Box ref={printRef} sx={{ pr: formPermission ? 9 : 5, "@media print": { pr: 0 } }}>
        <PrintStyles />
        <Box className="print-only" sx={{ mb: 2 }}>
          {formSubmission.form?.name && <Typography variant="h5" sx={{ fontWeight: 600 }}>{formSubmission.form.name}</Typography>}
          {formSubmission.submissionDate && <Typography variant="body2">{Locale.label("forms.formSubmissions.subDate")}: {DateHelper.prettyDate(new Date(formSubmission.submissionDate))}</Typography>}
        </Box>
        {questions.length > 0 ? (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: questions.length > 1 ? 6 : 12 }}>
              <Stack spacing={2}>
                {firstHalf.map((question, index) => (
                  <Question key={`first-${question.id || index}`} question={question} answer={getAnswer(question.id || "") as AnswerInterface} />
                ))}
              </Stack>
            </Grid>
            {secondHalf.length > 0 && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack spacing={2}>
                  {secondHalf.map((question, index) => (
                    <Question key={`second-${question.id || index}`} question={question} answer={getAnswer(question.id || "") as AnswerInterface} />
                  ))}
                </Stack>
              </Grid>
            )}
          </Grid>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
            {Locale.label("common.formSubmission.noQuestions")}
          </Typography>
        )}
      </Box>
    </Box>
  );
});
