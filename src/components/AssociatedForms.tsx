import React, { useState, useEffect } from "react";
import { FormSubmission } from "./";
import { Accordion, AccordionDetails, AccordionSummary, Button, Icon, Box } from "@mui/material";
import { type FormSubmissionInterface } from "@churchapps/helpers";
import { Permissions, FormSubmissionEdit, UserHelper, ApiHelper, Locale } from "@churchapps/apphelper";

interface Props {
  contentType: string;
  contentId: string;
  formSubmissions: FormSubmissionInterface[];
  updatedFunction: () => void;
}

export const AssociatedForms: React.FC<Props> = (props) => {
  const [mode, setMode] = useState("display");
  const [editFormSubmissionId, setEditFormSubmissionId] = useState("");
  const [allForms, setAllForms] = useState(null);
  const [unsubmittedForms, setUnsubmittedForms] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState<string>("");
  const [expanded, setExpanded] = useState<string>("");
  const formPermission = UserHelper.checkAccess(Permissions.membershipApi.forms.admin) || UserHelper.checkAccess(Permissions.membershipApi.forms.edit);

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

  const getCards = () => {
    const cards: any[] = [];
    const submittedCards = getSubmittedCards() || []; // when there are no submitted cards, function will return undefined
    const unsubmittedCards = getUnsubmittedCards();
    cards.push(...submittedCards, ...unsubmittedCards);
    return cards;
  };

  const getSubmittedCards = () =>
    props.formSubmissions?.map((fs) => (
      <Accordion
        key={fs.id}
        expanded={expanded === "submitted" + fs.id}
        onChange={() => {
          setExpanded("submitted" + fs.id);
        }}>
        <AccordionSummary>
          <span>{fs.form.name}</span>
        </AccordionSummary>
        <AccordionDetails>
          <div className="card-body">
            <FormSubmission formSubmissionId={fs.id} editFunction={handleEdit} />{" "}
          </div>
        </AccordionDetails>
      </Accordion>
    ));

  const getUnsubmittedCards = () =>
    unsubmittedForms
      .filter((v) => v.contentType !== "form")
      .map((uf) => (
        <Accordion
          key={uf.id}
          expanded={expanded === "unsubmitted" + uf.id}
          onChange={() => {
            setExpanded("unsubmitted" + uf.id);
          }}>
          <AccordionSummary onClick={() => handleAdd(uf.id)}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Button variant="text" onClick={() => handleAdd(uf.id)} data-testid="add-form-button" aria-label={Locale.label("components.associatedForms.addForm")}>
                <Icon>add</Icon>
              </Button>
              <span>{uf.name}</span>
            </Box>
          </AccordionSummary>
          <AccordionDetails></AccordionDetails>
        </Accordion>
      ));

  const determineUnsubmitted = () => {
    let unsubmitted = [];
    if (allForms !== undefined && allForms !== null && props !== null) {
      const sf = props.formSubmissions;
      if (sf !== undefined && sf !== null) {
        for (let i = 0; i < allForms.length; i++) {
          let exists = false;
          for (let j = 0; j < sf.length; j++) if (sf[j].formId === allForms[i].id) exists = true;
          if (!exists) unsubmitted.push(allForms[i]);
        }
      } else unsubmitted = allForms;
    }

    setUnsubmittedForms(unsubmitted);
  };

  useEffect(() => {
    ApiHelper.get("/forms?contentType=person", "MembershipApi").then((data) => setAllForms(data));
  }, []);

  useEffect(determineUnsubmitted, [allForms, props]);
  //add unRestrictedFormId=""
  if (!formPermission) return <></>;
  if (mode === "edit") {
    return (
      <FormSubmissionEdit
        formSubmissionId={editFormSubmissionId}
        updatedFunction={handleUpdate}
        addFormId={selectedFormId}
        contentType={props.contentType}
        contentId={props.contentId}
        personId={props.contentId}
      />
    );
  } else return <div id="formSubmissionsAccordion">{getCards()}</div>;
};
