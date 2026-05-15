import React, { useEffect, useState } from "react";
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Icon } from "@mui/material";
import { type FormSubmissionInterface } from "@churchapps/helpers";
import { ApiHelper, FormSubmissionEdit, Locale, Permissions, UserHelper } from "@churchapps/apphelper";
import { FormSubmission } from "../../components";

interface Props {
  contentId: string;
  formSubmissions: FormSubmissionInterface[];
  updatedFunction: () => void;
}

export const PersonAssociatedForms: React.FC<Props> = (props) => {
  const [mode, setMode] = useState("display");
  const [editFormSubmissionId, setEditFormSubmissionId] = useState("");
  const [allForms, setAllForms] = useState<any[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>("");
  const [expanded, setExpanded] = useState<string>("");
  const formPermission = UserHelper.checkAccess(Permissions.membershipApi.forms.admin) || UserHelper.checkAccess(Permissions.membershipApi.forms.edit);

  const submittedFormIds = new Set((props.formSubmissions || []).map((fs) => fs.formId));
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
    ApiHelper.get("/forms", "MembershipApi").then((data) => {
      const personPageForms = (data || []).filter((form: any) => !form.archived && (form.contentType === "person" || form.contentType === "form"));
      setAllForms(personPageForms);
    });
  }, []);

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
      {(props.formSubmissions || []).map((fs) => (
        <Accordion
          key={fs.id}
          expanded={expanded === `submitted-${fs.id}`}
          onChange={() => setExpanded(`submitted-${fs.id}`)}>
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
      {availableForms.map((form) => (
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
    </div>
  );
};
