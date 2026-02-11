import React, { useRef, useState, memo, useCallback, useMemo } from "react";
import {
  type AnswerInterface,
  type FormSubmissionInterface,
  type MemberPermissionInterface,
  type PersonInterface,
  type QuestionInterface
} from "@churchapps/helpers";
import {
  DateHelper,
  DisplayBox,
  ExportLink,
  Locale,
  Loading
} from "@churchapps/apphelper";
import { useReactToPrint } from "react-to-print";
import { Grid, Icon, Table, TableBody, TableRow, TableCell, TableHead, Card, Box, Typography, Stack } from "@mui/material";
import { useQuery } from "@tanstack/react-query";

interface Props {
  formId: string;
  memberPermissions: MemberPermissionInterface;
}

export const FormSubmissions: React.FC<Props> = memo((props) => {
  const [summary, setSummary] = useState<any>([]);
  const [summaryCsv, setSummaryCsv] = useState<any>([]);
  const yesNoMap = useMemo(() => ({ True: Locale.label("common.yes"), False: Locale.label("common.no") }), []);
  const yesNoDefault = useMemo(
    () => [
      { value: "Yes", text: Locale.label("common.yes") },
      { value: "No", text: Locale.label("common.no") }
    ],
    []
  );
  const contentRef: any = useRef<HTMLDivElement>(null);
  const handleSummaryPrint = useReactToPrint({ content: () => contentRef.current });

  const getPerson = useCallback((people: PersonInterface[], formSubmission: any) => {
    let result = people.find((person: PersonInterface) => person.id === formSubmission.submittedBy);
    if (formSubmission.contentType === "person") result = people.find((person: PersonInterface) => person.id === formSubmission.contentId);
    return result;
  }, []);

  const setSummaryResultDefault = useCallback(
    (question: QuestionInterface, answer: AnswerInterface) => {
      const choices: any = [];
      const questionChoices = question.choices || yesNoDefault;
      questionChoices.forEach((choice: any) => {
        const choiceCount = { [choice.value]: 0, text: choice.text };
        if (question.fieldType === "Checkbox") {
          if (answer && answer?.value) {
            const splitAnswer = answer.value?.split(",");
            if (splitAnswer.indexOf(choice.value) > -1) choiceCount[choice.value] = 1;
          }
        } else {
          if (answer && answer?.value && choice.value === answer.value) choiceCount[choice.value] = 1;
        }
        choices.push(choiceCount);
      });
      return { title: question.title, values: choices };
    },
    [yesNoDefault]
  );

  const setSummaryResultData = useCallback((summaryData: any, question: QuestionInterface, answer: AnswerInterface) => {
    const match = summaryData.find((result: any) => result.title === question.title);
    if (match) {
      match.values.forEach((resultValue: any) => {
        const key: string = Object.keys(resultValue)[0];
        if (question.fieldType === "Checkbox") {
          const splitAnswer = answer?.value?.split(",");
          if (splitAnswer?.indexOf(key) > -1) resultValue[key] = resultValue[key] + 1;
        } else {
          if (key === answer?.value) resultValue[key] = resultValue[key] + 1;
        }
      });
    } else summaryData.push(setSummaryResultDefault(question, answer));
  }, [setSummaryResultDefault]);

  const setFormSubmissionData = useCallback(
    (people: PersonInterface[], formSubmission: any) => {
      const submittedBy = getPerson(people, formSubmission);

      formSubmission.person = { name: submittedBy?.name?.display || Locale.label("forms.formSubmissions.anon"), id: submittedBy?.id || null };
      formSubmission.mappedQA = [];
      formSubmission.csvData = [];
      if (formSubmission.questions) {
        formSubmission.questions = formSubmission.questions.sort((a: QuestionInterface, b: QuestionInterface) => (a.title > b.title ? 1 : -1));
      }
      return formSubmission;
    },
    [getPerson]
  );

  const people = useQuery<PersonInterface[]>({
    queryKey: ["/people", "MembershipApi"],
    placeholderData: []
  });

  const formSubmissions = useQuery<any[]>({
    queryKey: ["/formsubmissions/formId/" + props.formId, "MembershipApi"],
    placeholderData: []
  });

  // Process data when both queries are loaded
  React.useEffect(() => {
    if (people.data && formSubmissions.data) {
      const csv: any[] = [];
      const summaryData: any = [];
      formSubmissions.data.forEach((formSubmission: any) => {
        const submittedBy = getPerson(people.data, formSubmission);
        const csvData: any = {};
        csvData["For"] = submittedBy?.name?.display || Locale.label("forms.formSubmissions.anon");
        formSubmission = setFormSubmissionData(people.data, formSubmission);
        formSubmission.questions.forEach((question: QuestionInterface) => {
          const answer = formSubmission.answers.find((answer: AnswerInterface) => answer.questionId === question.id) || null;
          const answerValue = answer?.value || "";
          if (question.fieldType === "Yes/No" && answer?.value) answer.value = yesNoMap[answer.value];
          csvData[question.title] = answerValue;
          formSubmission.csvData.push({ [question.title]: answerValue });
          if (question.fieldType === "Multiple Choice" || question.fieldType === "Yes/No" || question.fieldType === "Checkbox") {
            if (!summaryData.length) summaryData.push(setSummaryResultDefault(question, answer));
            else setSummaryResultData(summaryData, question, answer);
          }
        });
        csv.push(csvData);
      });
      setSummary(summaryData);
      setSummaryCsv(csv);
    }
  }, [people.data, formSubmissions.data, yesNoMap, getPerson, setFormSubmissionData, setSummaryResultData, setSummaryResultDefault]);

  const getResultCount = useCallback((summaryValues: any[]) => {
    const results: JSX.Element[] = [];
    summaryValues.forEach((sv: any, i: number) => {
      const key: string = Object.keys(sv)[0];
      results.push(<div key={sv.text + "-" + i}>{`${sv.text}: ${sv[key]}`}</div>);
    });
    return results;
  }, []);

  const summaryContent = useMemo(() => {
    const results: JSX.Element[] = [];
    summary.forEach((s: any, i: number) => {
      results.push(
        <Grid size={{ xs: 12, md: 6 }} key={s.id + "-" + i}>
          <h4>{s.title}</h4>
          {getResultCount(s.values)}
        </Grid>
      );
    });
    return results;
  }, [summary, getResultCount]);

  const tableHeader = useMemo(() => {
    const result: JSX.Element[] = [];
    if (formSubmissions.data?.length) {
      result.push(
        <TableCell key="submittedBy" sx={{ fontWeight: 600 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {formSubmissions.data[0].contentType === "person" ? Locale.label("forms.formSubmissions.subFor") : Locale.label("forms.formSubmissions.subBy")}
          </Typography>
        </TableCell>
      );
      result.push(
        <TableCell key="submissionDate" sx={{ fontWeight: 600 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {Locale.label("forms.formSubmissions.subDate")}
          </Typography>
        </TableCell>
      );
      formSubmissions.data[0].questions.forEach((question: QuestionInterface) =>
        result.push(
          <TableCell key={question.id} sx={{ fontWeight: 600 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {question.title}
            </Typography>
          </TableCell>
        ));
    }
    return result;
  }, [formSubmissions.data]);

  const getAnswers = useCallback((formSubmission: FormSubmissionInterface) => {
    const rows: JSX.Element[] = [];
    formSubmission.questions?.forEach((question: QuestionInterface) => {
      if (!question?.id) return;
      const answer = formSubmission.answers?.find((answer: AnswerInterface) => answer.questionId === question.id);
      rows.push(
        <TableCell key={question.id}>
          <Typography variant="body2">{answer?.value || "-"}</Typography>
        </TableCell>
      );
    });
    return rows;
  }, []);

  const tableRows = useMemo(() => {
    const rows: JSX.Element[] = [];

    if (formSubmissions.data?.length === 0) {
      rows.push(
        <TableRow key="0">
          <TableCell colSpan={6} sx={{ textAlign: "center", py: 4 }}>
            <Stack spacing={2} alignItems="center">
              <Icon sx={{ fontSize: 48, color: "text.secondary" }}>assignment</Icon>
              <Typography variant="body1" color="text.secondary">
                No form submissions found
              </Typography>
            </Stack>
          </TableCell>
        </TableRow>
      );
      return rows;
    }

    formSubmissions.data?.forEach((submission: any, i: number) => {
      // Process the submission data inline
      const processedSubmission = people.data ? setFormSubmissionData(people.data, submission) : submission;

      // Allow submissions even without a person ID (anonymous submissions)
      const personName = processedSubmission.person?.name || Locale.label("forms.formSubmissions.anon");
      const personId = processedSubmission.person?.id;

      rows.push(
        <TableRow
          key={i}
          sx={{
            "&:hover": { backgroundColor: "action.hover" },
            transition: "background-color 0.2s ease"
          }}>
          <TableCell key="personName">
            {personId ? (
              <a
                href={"/people/" + personId}
                style={{
                  textDecoration: "none",
                  color: "var(--c1l2)",
                  fontWeight: 500
                }}>
                {personName}
              </a>
            ) : (
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {personName}
              </Typography>
            )}
          </TableCell>
          <TableCell key="subDate">
            <Typography variant="body2">{DateHelper.prettyDate(new Date(processedSubmission.submissionDate))}</Typography>
          </TableCell>
          {getAnswers(processedSubmission)}
        </TableRow>
      );
    });
    return rows;
  }, [formSubmissions.data, people.data, getAnswers, setFormSubmissionData]);

  const editLinks = useMemo(() => {
    const formName = formSubmissions.data?.length ? formSubmissions.data[0].form?.name + ".csv" : "form_submissions.csv";
    return (
      <>
        <ExportLink data={summaryCsv} spaceAfter={true} filename={formName} />
        <button
          type="button"
          aria-label="print-summary"
          onClick={handleSummaryPrint}
          style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: "inherit" }}>
          <Icon>print</Icon>
        </button>
      </>
    );
  }, [formSubmissions.data, summaryCsv, handleSummaryPrint]);

  const formSubmissionsTable = useMemo(
    () => (
      <Card>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center">
              <Icon>assignment</Icon>
              <Typography variant="h6">{Locale.label("forms.formSubmissions.subRes")}</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              {editLinks}
            </Stack>
          </Stack>
        </Box>
        <Box>
          <Table sx={{ minWidth: 650 }}>
            <TableHead
              sx={{
                backgroundColor: "grey.50",
                "& .MuiTableCell-root": {
                  borderBottom: "2px solid",
                  borderBottomColor: "divider"
                }
              }}>
              <TableRow key="header">{tableHeader}</TableRow>
            </TableHead>
            <TableBody>{tableRows}</TableBody>
          </Table>
        </Box>
      </Card>
    ),
    [tableHeader, tableRows, editLinks]
  );

  if (people.isLoading || formSubmissions.isLoading) return <Loading />;

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 8 }} className="form-submission-summary">
        <div ref={contentRef} className="form-submission-summary">
          <DisplayBox headerText={Locale.label("forms.formSubmissions.subSum")} headerIcon="group" editContent={editLinks}>
            <Grid container spacing={3}>
              {summaryContent}
            </Grid>
          </DisplayBox>
          {formSubmissionsTable}
        </div>
      </Grid>
    </Grid>
  );
});
