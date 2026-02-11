import React from "react";
import { FormQuestionEdit } from ".";
import { type FormInterface, type QuestionInterface } from "@churchapps/helpers";
import { ApiHelper, Permissions, Loading, UserHelper, Locale } from "@churchapps/apphelper";
import { Icon, Table, TableBody, TableCell, TableRow, TableHead, Box, Typography, Stack, Button, Card } from "@mui/material";

interface Props {
  id: string;
}

export const Form: React.FC<Props> = (props) => {
  const [form, setForm] = React.useState<FormInterface>({} as FormInterface);
  const [questions, setQuestions] = React.useState<QuestionInterface[]>(null);
  const [editQuestionId, setEditQuestionId] = React.useState("notset");
  const formPermission = UserHelper.checkAccess(Permissions.membershipApi.forms.admin) || UserHelper.checkAccess(Permissions.membershipApi.forms.edit);
  const questionUpdated = () => {
    loadQuestions();
    setEditQuestionId("notset");
  };
  const loadData = () => {
    ApiHelper.get("/forms/" + props.id, "MembershipApi").then((data) => setForm(data));
    loadQuestions();
  };
  const loadQuestions = () => ApiHelper.get("/questions?formId=" + props.id, "MembershipApi").then((data) => setQuestions(data));
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const anchor = e.currentTarget as HTMLAnchorElement;
    const row = anchor.parentNode.parentNode as HTMLElement;
    const idx = parseInt(row.getAttribute("data-index"));
    setEditQuestionId(questions[idx].id);
  };
  const moveUp = (e: React.MouseEvent) => {
    e.preventDefault();
    const button = e.currentTarget as HTMLButtonElement;
    const row = button.closest("tr") as HTMLElement;
    const idx = parseInt(row.getAttribute("data-index"));
    const tmpQuestions = [...questions];
    const question = tmpQuestions.splice(idx, 1)[0];
    tmpQuestions.splice(idx - 1, 0, question);
    setQuestions(tmpQuestions);
    ApiHelper.get("/questions/sort/" + question.id + "/up", "MembershipApi");
  };
  const moveDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const button = e.currentTarget as HTMLButtonElement;
    const row = button.closest("tr") as HTMLElement;
    const idx = parseInt(row.getAttribute("data-index"));
    const tmpQuestions = [...questions];
    const question = tmpQuestions.splice(idx, 1)[0];
    tmpQuestions.splice(idx + 1, 0, question);
    setQuestions(tmpQuestions);
    ApiHelper.get("/questions/sort/" + question.id + "/down", "MembershipApi");
  };
  const getRows = () => {
    const rows: JSX.Element[] = [];
    if (questions.length === 0) {
      rows.push(
        <TableRow key="0">
          <TableCell colSpan={4} sx={{ textAlign: "center", py: 4 }}>
            <Stack spacing={2} alignItems="center">
              <Icon sx={{ fontSize: 48, color: "text.secondary" }}>help</Icon>
              <Typography variant="body1" color="text.secondary">
                {Locale.label("forms.form.noCustomMsg")}
              </Typography>
            </Stack>
          </TableCell>
        </TableRow>
      );
      return rows;
    }
    for (let i = 0; i < questions.length; i++) {
      const upArrow =
        i === 0 ? (
          <span style={{ display: "inline-block", width: 20 }} />
        ) : (
          <Button size="small" onClick={moveUp} sx={{ minWidth: "auto", p: 0.5, mr: 0.5 }} aria-label="moveUp">
            <Icon sx={{ fontSize: 18 }}>arrow_upward</Icon>
          </Button>
        );
      const downArrow =
        i === questions.length - 1 ? (
          <></>
        ) : (
          <Button size="small" onClick={moveDown} sx={{ minWidth: "auto", p: 0.5 }} aria-label="moveDown">
            <Icon sx={{ fontSize: 18 }}>arrow_downward</Icon>
          </Button>
        );
      rows.push(
        <TableRow
          key={i}
          data-index={i}
          sx={{
            "&:hover": { backgroundColor: "action.hover" },
            transition: "background-color 0.2s ease"
          }}>
          <TableCell>
            <button
              type="button"
              onClick={handleClick}
              style={{ background: "none", border: 0, padding: 0, color: "var(--c1l2)", cursor: "pointer", fontWeight: 500 }}>
              {questions[i].title}
            </button>
          </TableCell>
          <TableCell>
            <Typography variant="body2">{questions[i].fieldType}</Typography>
          </TableCell>
          <TableCell>
            <Stack direction="row" spacing={0.5} alignItems="center">
              {upArrow}
              {downArrow}
            </Stack>
          </TableCell>
          <TableCell>
            <Typography variant="body2">{questions[i].required ? Locale.label("common.yes") : Locale.label("common.no")}</Typography>
          </TableCell>
        </TableRow>
      );
    }
    return rows;
  };
  const getTableHeader = () => {
    const rows: JSX.Element[] = [];
    if (questions.length === 0) {
      return rows;
    }
    rows.push(
      <TableRow key="header">
        <TableCell sx={{ fontWeight: 600 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {Locale.label("forms.form.question")}
          </Typography>
        </TableCell>
        <TableCell sx={{ fontWeight: 600 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {Locale.label("forms.form.type")}
          </Typography>
        </TableCell>
        <TableCell sx={{ fontWeight: 600 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {Locale.label("forms.form.act")}
          </Typography>
        </TableCell>
        <TableCell sx={{ fontWeight: 600 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {Locale.label("forms.form.req")}
          </Typography>
        </TableCell>
      </TableRow>
    );
    return rows;
  };
  const getSidebarModules = () => {
    const result = [];
    if (editQuestionId !== "notset") result.push(<FormQuestionEdit key="form-questions" questionId={editQuestionId} updatedFunction={questionUpdated} formId={form.id} />);
    return result;
  };

  React.useEffect(loadData, []);

  if (!formPermission) return <></>;
  else {
    let contents = <Loading />;
    if (questions) {
      contents = (
        <Table sx={{ minWidth: 650 }}>
          <TableHead
            sx={{
              backgroundColor: "grey.50",
              "& .MuiTableCell-root": {
                borderBottom: "2px solid",
                borderBottomColor: "divider"
              }
            }}>
            {getTableHeader()}
          </TableHead>
          <TableBody>{getRows()}</TableBody>
        </Table>
      );
    }
    return (
      <>
        {/* Edit Question Content - Appears above when editing */}
        {getSidebarModules()}

        {/* Main Questions Content - Full Width Card */}
        <Card sx={{ width: "100%" }}>
          {/* Card Header */}
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1} alignItems="center">
                <Icon>help</Icon>
                <Typography variant="h6">{Locale.label("forms.form.questions")}</Typography>
              </Stack>
              {formPermission && (
                <Button
                  variant="contained"
                  startIcon={<Icon>add</Icon>}
                  onClick={() => {
                    setEditQuestionId("");
                  }}
                  size="small"
                  aria-label="addQuestion">
                  Add Question
                </Button>
              )}
            </Stack>
          </Box>

          {/* Card Content */}
          <Box sx={{ p: 0 }}>{contents}</Box>
        </Card>
      </>
    );
  }
};
