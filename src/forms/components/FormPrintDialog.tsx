import React, { useRef } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import { Print as PrintIcon } from "@mui/icons-material";
import { type FormInterface, type QuestionInterface } from "@churchapps/helpers";
import { Loading, Locale } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { useReactToPrint } from "react-to-print";
import { PrintStyles } from "../../components";

interface Props {
  formId: string;
  onClose: () => void;
}

// Stand-alone forms carry a description the shared FormInterface does not declare yet.
type PrintableFormInterface = FormInterface & { description?: string };

// Fields that only make sense online are left off the paper copy.
const SKIPPED_FIELD_TYPES = ["Payment"];

const lineSx = { borderBottom: "1px solid", borderColor: "grey.800", height: 28 };
const boxSx = { border: "1px solid", borderColor: "grey.800", borderRadius: 1, height: 96 };
const checkSx = { display: "inline-block", width: 14, height: 14, border: "1px solid", borderColor: "grey.800", mr: 1, verticalAlign: "middle", flexShrink: 0 };
const radioSx = { ...checkSx, borderRadius: "50%" };

const BlankAnswer: React.FC<{ question: QuestionInterface }> = ({ question }) => {
  const choices = question.choices || [];
  switch (question.fieldType) {
    case "Heading":
      return null;
    case "Text Area":
      return <Box sx={boxSx} />;
    case "Yes/No":
      return (
        <Stack direction="row" spacing={3}>
          <Typography variant="body2" sx={{ display: "flex", alignItems: "center" }}><Box component="span" sx={checkSx} />{Locale.label("common.yes")}</Typography>
          <Typography variant="body2" sx={{ display: "flex", alignItems: "center" }}><Box component="span" sx={checkSx} />{Locale.label("common.no")}</Typography>
        </Stack>
      );
    case "Multiple Choice":
    case "Checkbox": {
      const markerSx = question.fieldType === "Checkbox" ? checkSx : radioSx;
      if (choices.length === 0) return <Box sx={lineSx} />;
      return (
        <Stack spacing={0.5}>
          {choices.map((choice, index) => (
            <Typography key={choice.value || index} variant="body2" sx={{ display: "flex", alignItems: "center" }}>
              <Box component="span" sx={markerSx} />{choice.text || choice.value}
            </Typography>
          ))}
        </Stack>
      );
    }
    default:
      return <Box sx={lineSx} />;
  }
};

// Paper copy of a form: every question with an empty space to write the answer.
export const BlankForm: React.FC<{ form: PrintableFormInterface; questions: QuestionInterface[] }> = ({ form, questions }) => {
  const printable = questions.filter((q) => !SKIPPED_FIELD_TYPES.includes(q.fieldType || ""));
  const hasRequired = printable.some((q) => q.required);
  return (
    <Box className="blank-form" sx={{ color: "common.black", "& *": { color: "common.black" } }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>{form.name}</Typography>
      {form.description && <Typography variant="body2" sx={{ mb: 1, whiteSpace: "pre-wrap" }}>{form.description}</Typography>}
      {hasRequired && <Typography variant="caption" sx={{ display: "block", mb: 1 }}>{Locale.label("forms.formPrint.requiredNote")}</Typography>}
      {printable.length === 0 && <Typography variant="body2">{Locale.label("forms.form.noCustomMsg")}</Typography>}
      <Stack spacing={2.5} sx={{ mt: 1 }}>
        {printable.map((q, index) => (
          <Box key={q.id || index} sx={{ breakInside: "avoid" }}>
            {q.fieldType === "Heading" ? (
              <Typography variant="h6" sx={{ fontWeight: 600, borderBottom: "2px solid", borderColor: "grey.800", pb: 0.5, mt: 1 }}>{q.title}</Typography>
            ) : (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {q.title}{q.required ? " *" : ""}
                </Typography>
                {q.description && <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>{q.description}</Typography>}
                <Box sx={{ mt: 0.5 }}><BlankAnswer question={q} /></Box>
              </>
            )}
          </Box>
        ))}
      </Stack>
    </Box>
  );
};

// Preview + print of a blank form, opened from the Forms list. Uses the same
// react-to-print pattern as FormSubmissions.tsx.
export const FormPrintDialog: React.FC<Props> = (props) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const form = useQuery<PrintableFormInterface>({ queryKey: ["/forms/" + props.formId, "MembershipApi"] });
  const questions = useQuery<QuestionInterface[]>({ queryKey: ["/questions?formId=" + props.formId, "MembershipApi"] });
  const handlePrint = useReactToPrint({ contentRef, documentTitle: form.data?.name || Locale.label("forms.formPrint.title") });
  const loading = form.isLoading || questions.isLoading || !form.data;

  return (
    <Dialog open onClose={props.onClose} maxWidth="md" fullWidth data-testid="form-print-dialog">
      <DialogTitle>{Locale.label("forms.formPrint.title")}</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Loading size="sm" />
        ) : (
          <Box ref={contentRef} sx={{ p: 2, backgroundColor: "common.white" }}>
            <PrintStyles />
            <BlankForm form={form.data} questions={questions.data || []} />
          </Box>
        )}
      </DialogContent>
      <DialogActions className="no-print">
        <Button onClick={props.onClose} data-testid="form-print-close">{Locale.label("common.close")}</Button>
        <Button variant="contained" startIcon={<PrintIcon />} onClick={() => handlePrint()} disabled={loading} data-testid="form-print-confirm">
          {Locale.label("common.print")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
