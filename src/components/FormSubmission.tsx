import React, { memo } from "react";
import { Question } from "./";
import { Grid, Box, IconButton, Tooltip, Typography, Stack } from "@mui/material";
import { Edit as EditIcon } from "@mui/icons-material";
import { type FormSubmissionInterface } from "@churchapps/helpers";
import { Permissions, ApiHelper, UserHelper, UniqueIdHelper, Loading, Locale } from "@churchapps/apphelper";

interface Props {
  formSubmissionId: string;
  editFunction: (formSubmissionId: string) => void;
}

export const FormSubmission: React.FC<Props> = memo((props) => {
  const [formSubmission, setFormSubmission] = React.useState<FormSubmissionInterface | null>(null);
  const [loading, setLoading] = React.useState(true);
  const formPermission = UserHelper.checkAccess(Permissions.membershipApi.forms.admin) || UserHelper.checkAccess(Permissions.membershipApi.forms.edit);

  const loadData = React.useCallback(async () => {
    if (!UniqueIdHelper.isMissing(props.formSubmissionId)) {
      setLoading(true);
      try {
        const data = await ApiHelper.get("/formsubmissions/" + props.formSubmissionId + "/?include=questions,answers", "MembershipApi");
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
      {/* Edit Button */}
      {formPermission && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            zIndex: 1
          }}>
          <Tooltip title={Locale.label("common.formSubmission.edit")}>
            <IconButton
              onClick={() => props.editFunction(props.formSubmissionId)}
              size="small"
              sx={{
                color: "primary.main",
                "&:hover": {
                  backgroundColor: "primary.light",
                  color: "primary.contrastText"
                }
              }}
              data-testid="edit-form-submission-button"
              aria-label={Locale.label("common.formSubmission.edit")}>
              <EditIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Form Submission Content */}
      <Box sx={{ pr: formPermission ? 5 : 0 }}>
        {questions.length > 0 ? (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: questions.length > 1 ? 6 : 12 }}>
              <Stack spacing={2}>
                {firstHalf.map((question, index) => (
                  <Question key={`first-${question.id || index}`} question={question} answer={getAnswer(question.id)} />
                ))}
              </Stack>
            </Grid>
            {secondHalf.length > 0 && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack spacing={2}>
                  {secondHalf.map((question, index) => (
                    <Question key={`second-${question.id || index}`} question={question} answer={getAnswer(question.id)} />
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
