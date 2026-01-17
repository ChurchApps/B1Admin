import React from "react";
import { type QuestionInterface } from "@churchapps/helpers";
import { Locale } from "@churchapps/apphelper";
import {
  Table, TableBody, TableRow, TableCell, TableHead, FormLabel, TextField, Button 
} from "@mui/material";

interface Props {
  question: QuestionInterface;
  updatedFunction: (question: QuestionInterface) => void;
}

export const ChoicesEdit: React.FC<Props> = (props) => {
  const [choiceValue, setChoiceValue] = React.useState("");
  const [choiceText, setChoiceText] = React.useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    switch (e.target.name) {
      case "choiceValue":
        setChoiceValue(e.target.value);
        break;
      case "choiceText":
        setChoiceText(e.target.value);
        break;
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    const anchor = e.currentTarget as HTMLAnchorElement;
    const idx = parseInt(anchor.getAttribute("data-index"));
    const q = { ...props.question };
    q.choices.splice(idx, 1);
    props.updatedFunction(q);
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    const q = { ...props.question };
    if (!q.choices) q.choices = [{ value: choiceValue, text: choiceText }];
    else q.choices.push({ value: choiceValue, text: choiceText });
    props.updatedFunction(q);
    setChoiceText("");
    setChoiceValue("");
  };

  const getRows = () => {
    const result = [];
    if (props.question.choices) {
      for (let i = 0; i < props.question.choices?.length; i++) {
        const c = props.question.choices[i];
        result.push(
          <TableRow key={i}>
            <TableCell>{c.value}</TableCell>
            <TableCell>{c.text}</TableCell>
            <TableCell>
              <Button variant="contained" size="small" onClick={handleRemove} data-index={i}>
                {Locale.label("common.remove")}
              </Button>
            </TableCell>
          </TableRow>
        );
      }
    }
    return result;
  };

  return (
    <>
      <FormLabel>{Locale.label("forms.choicesEdit.choices")}</FormLabel>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ textAlign: "left" }}>
            <th>{Locale.label("forms.choicesEdit.value")}</th>
            <th>{Locale.label("forms.choicesEdit.txt")}</th>
            <th>{Locale.label("forms.choicesEdit.act")}</th>
          </TableRow>
        </TableHead>
        <TableBody>
          {getRows()}
          <TableRow>
            <TableCell>
              <TextField label={Locale.label("forms.choicesEdit.value")} fullWidth size="small" name="choiceValue" data-cy="value" value={choiceValue} onChange={handleChange} placeholder={Locale.label("placeholders.choices.value")} />
            </TableCell>
            <TableCell>
              <TextField label={Locale.label("forms.choicesEdit.txt")} fullWidth size="small" name="choiceText" data-cy="text" value={choiceText} onChange={handleChange} placeholder={Locale.label("placeholders.choices.text")} />
            </TableCell>
            <TableCell>
              <Button id="addQuestionChoiceButton" data-cy="add-button" variant="contained" size="small" onClick={handleAdd}>
                {Locale.label("common.add")}
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </>
  );
};
