import React, { useState, memo } from "react";
import { FormSubmission } from "./";
import { Button, Box, Card, CardContent, Typography, Paper } from "@mui/material";
import { Description as DescriptionIcon, Add as AddIcon } from "@mui/icons-material";
import { type FormSubmissionInterface, type FormInterface } from "@churchapps/helpers";
import { FormSubmissionEdit, DisplayBox, Locale } from "@churchapps/apphelper";

interface Props {
  contentType: string;
  contentId: string;
  form: FormInterface;
  formSubmissions: FormSubmissionInterface[];
  updatedFunction: () => void;
}

export const PersonForm: React.FC<Props> = memo((props) => {
  const [mode, setMode] = useState("display");
  const [editFormSubmissionId, setEditFormSubmissionId] = useState("");

  let submission: FormSubmissionInterface = null;
  props.formSubmissions?.forEach((fs) => {
    if (fs.formId === props.form?.id) submission = fs;
  });

  const handleEdit = (formSubmissionId: string) => {
    setMode("edit");
    setEditFormSubmissionId(formSubmissionId);
  };

  const handleUpdate = () => {
    setMode("display");
    setEditFormSubmissionId("");
    props.updatedFunction();
  };

  const handleAdd = () => {
    setMode("edit");
  };

  if (mode === "edit") {
    return (
      <FormSubmissionEdit
        formSubmissionId={editFormSubmissionId}
        updatedFunction={handleUpdate}
        addFormId={props.form?.id}
        contentType={props.contentType}
        contentId={props.contentId}
        personId={props.contentId}
      />
    );
  }

  const content = submission ? (
    <Box
      sx={{
        "& .MuiCard-root": {
          borderRadius: 2,
          border: "1px solid",
          borderColor: "grey.200"
        }
      }}>
      <Card
        sx={{
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            transform: "translateY(-1px)",
            boxShadow: 2
          }
        }}>
        <CardContent sx={{ pb: "16px !important" }}>
          <FormSubmission formSubmissionId={submission.id} editFunction={handleEdit} />
        </CardContent>
      </Card>
    </Box>
  ) : (
    <Paper
      sx={{
        p: 4,
        textAlign: "center",
        backgroundColor: "grey.50",
        border: "1px dashed",
        borderColor: "grey.300"
      }}>
      <DescriptionIcon sx={{ fontSize: 48, color: "grey.400", mb: 2 }} />
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        {Locale.label("people.personForm.noFormMsg") || "No form submission found for this person"}
      </Typography>
      <Button
        variant="contained"
        onClick={handleAdd}
        startIcon={<AddIcon />}
        sx={{
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            transform: "translateY(-1px)",
            boxShadow: 2
          }
        }}
        data-testid="add-form-button"
        aria-label={`Add ${props.form?.name || "form"} submission`}>
        {Locale.label("people.personForm.addForm") || "Add Form"}
      </Button>
    </Paper>
  );

  return (
    <DisplayBox
      headerText={props.form?.name || Locale.label("people.personForm.form") || "Form"}
      headerIcon="description"
      help="b1Admin/forms"
      ariaLabel={`${props.form?.name || "form"} submission details`}>
      {content}
    </DisplayBox>
  );
});
