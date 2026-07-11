import React, { memo, useEffect, useMemo, useState } from "react";
import { type FormSubmissionInterface, type PersonInterface } from "@churchapps/helpers";
import { ApiHelper, DateHelper, Loading, Locale } from "@churchapps/apphelper";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@mui/material";

interface Props {
  open: boolean;
  onClose: () => void;
  person: PersonInterface;
}

interface ResponseRow {
  formId: string;
  formName: string;
  questionId: string;
  questionTitle: string;
  answerValue: string;
}

interface DetailedSubmission extends FormSubmissionInterface {
  questions?: any[];
  answers?: any[];
}

export const PersonExportDialog: React.FC<Props> = memo((props) => {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [detailedSubmissions, setDetailedSubmissions] = useState<DetailedSubmission[]>([]);
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (!props.open) return;

    let cancelled = false;

    const loadData = async () => {
      const personFormSubmissions = (props.person?.formSubmissions || []).filter((submission) => submission.form?.contentType === "person" || submission.contentType === "person");
      if (personFormSubmissions.length === 0) {
        setDetailedSubmissions([]);
        setSelectedFormIds([]);
        return;
      }

      setLoading(true);
      try {
        const data = await Promise.all(personFormSubmissions.map((submission) => ApiHelper.get(`/formsubmissions/${submission.id}/?include=questions,answers`, "MembershipApi")));
        if (!cancelled) {
          setDetailedSubmissions(data);
          setSelectedFormIds(data.map((submission) => submission.formId));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [props.open, props.person]);

  useEffect(() => {
    if (!props.open) {
      setSearchText("");
      setSelectedFormIds([]);
    }
  }, [props.open]);

  const formNameMap = useMemo(() => {
    const result = new Map<string, string>();
    (props.person?.formSubmissions || []).forEach((submission) => {
      if (submission.formId && submission.form?.name) result.set(submission.formId, submission.form.name);
    });
    detailedSubmissions.forEach((submission) => {
      if (submission.formId && submission.form?.name) result.set(submission.formId, submission.form.name);
    });
    return result;
  }, [detailedSubmissions, props.person?.formSubmissions]);

  const formOptions = useMemo(() => {
    const seen = new Set<string>();
    return detailedSubmissions
      .map((submission) => ({ id: submission.formId || "", name: formNameMap.get(submission.formId || "") || submission.form?.name || "Form" }))
      .filter((option) => {
        if (!option.id || seen.has(option.id)) return false;
        seen.add(option.id);
        return true;
      });
  }, [detailedSubmissions, formNameMap]);

  const responseRows = useMemo(() => {
    const rows: ResponseRow[] = [];
    detailedSubmissions.forEach((submission) => {
      const answersByQuestionId = new Map((submission.answers || []).map((answer: any) => [answer.questionId, answer]));
      (submission.questions || []).forEach((question: any) => {
        if (question.fieldType === "Heading" || question.fieldType === "Payment") return;
        const answer = answersByQuestionId.get(question.id);
        rows.push({
          formId: submission.formId || "",
          formName: formNameMap.get(submission.formId || "") || submission.form?.name || "Form",
          questionId: question.id,
          questionTitle: question.title || "",
          answerValue: formatAnswerValue(question.fieldType, answer?.value || "")
        });
      });
    });
    return rows;
  }, [detailedSubmissions, formNameMap]);

  const filteredRows = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    return responseRows.filter((row) => {
      if (!selectedFormIds.includes(row.formId)) return false;
      if (!search) return true;
      return row.formName.toLowerCase().includes(search)
        || row.questionTitle.toLowerCase().includes(search)
        || row.answerValue.toLowerCase().includes(search);
    });
  }, [responseRows, searchText, selectedFormIds]);

  const allSelected = formOptions.length > 0 && selectedFormIds.length === formOptions.length;

  const toggleForm = (formId: string) => {
    setSelectedFormIds((current) => (current.includes(formId) ? current.filter((id) => id !== formId) : [...current, formId]));
  };

  const toggleAllForms = () => {
    setSelectedFormIds(allSelected ? [] : formOptions.map((option) => option.id));
  };

  const getBaseRows = () => [
    { section: "Person", form: "", question: "Display Name", answer: props.person?.name?.display || "" },
    { section: "Person", form: "", question: "First Name", answer: props.person?.name?.first || "" },
    { section: "Person", form: "", question: "Middle Name", answer: props.person?.name?.middle || "" },
    { section: "Person", form: "", question: "Last Name", answer: props.person?.name?.last || "" },
    { section: "Person", form: "", question: "Nick Name", answer: props.person?.name?.nick || "" },
    { section: "Person", form: "", question: "Email", answer: props.person?.contactInfo?.email || "" },
    { section: "Person", form: "", question: "Name Tag Notes", answer: props.person?.nametagNotes || "" },
    { section: "Person", form: "", question: "Donor Number", answer: props.person?.donorNumber || "" },
    { section: "Person", form: "", question: "Membership Status", answer: props.person?.membershipStatus || "" },
    { section: "Person", form: "", question: "Gender", answer: props.person?.gender || "" },
    { section: "Person", form: "", question: "Marital Status", answer: props.person?.maritalStatus || "" },
    { section: "Person", form: "", question: "Birth Date", answer: props.person?.birthDate ? new Date(props.person.birthDate).toISOString().split("T")[0] : "" },
    { section: "Person", form: "", question: "Anniversary", answer: props.person?.anniversary ? new Date(props.person.anniversary).toISOString().split("T")[0] : "" },
    { section: "Person", form: "", question: "Address 1", answer: props.person?.contactInfo?.address1 || "" },
    { section: "Person", form: "", question: "Address 2", answer: props.person?.contactInfo?.address2 || "" },
    { section: "Person", form: "", question: "City", answer: props.person?.contactInfo?.city || "" },
    { section: "Person", form: "", question: "State/Province", answer: props.person?.contactInfo?.state || "" },
    { section: "Person", form: "", question: "Zip/Postal", answer: props.person?.contactInfo?.zip || "" },
    { section: "Person", form: "", question: "Home Phone", answer: props.person?.contactInfo?.homePhone?.split("x")[0] || props.person?.contactInfo?.homePhone || "" },
    { section: "Person", form: "", question: "Home Extension", answer: props.person?.contactInfo?.homePhone?.split("x")[1] || "" },
    { section: "Person", form: "", question: "Work Phone", answer: props.person?.contactInfo?.workPhone?.split("x")[0] || props.person?.contactInfo?.workPhone || "" },
    { section: "Person", form: "", question: "Work Extension", answer: props.person?.contactInfo?.workPhone?.split("x")[1] || "" },
    { section: "Person", form: "", question: "Mobile Phone", answer: props.person?.contactInfo?.mobilePhone?.split("x")[0] || props.person?.contactInfo?.mobilePhone || "" },
    { section: "Person", form: "", question: "Mobile Extension", answer: props.person?.contactInfo?.mobilePhone?.split("x")[1] || "" },
    { section: "Person", form: "", question: "Hide Me From Member Directory", answer: props.person?.optedOut ? (Locale.label("common.yes") || "Yes") : (Locale.label("common.no") || "No") }
  ];

  const buildCsvValue = (value: unknown) => {
    let normalized = String(value ?? "");
    // Neutralize CSV formula injection: a leading =,+,-,@ or control char can execute as a
    // formula when the export is opened in Excel/Sheets. Prefix with a quote to defuse it.
    if (/^[=+\-@\t\r]/.test(normalized)) normalized = "'" + normalized;
    if (normalized.includes(",") || normalized.includes("\"") || normalized.includes("\n") || normalized.includes("\r")) {
      return `"${normalized.replace(/"/g, "\"\"")}"`;
    }
    return normalized;
  };

  const exportButtonLabel = selectedFormIds.length === 0
    ? "Export without forms"
    : (Locale.label("people.peoplePage.export") || "Export");

  const handleExport = () => {
    if (exporting) return;

    setExporting(true);
    try {
      const csvSections: string[][] = [];

      // 1. Person Section
      const personHeader = ["Section", "Field", "Value"];
      const personRows = getBaseRows().map((row) => [
        "Person",
        row.question,
        row.answer
      ]);
      csvSections.push([
        personHeader.map(buildCsvValue).join(","),
        ...personRows.map((row) => row.map(buildCsvValue).join(","))
      ]);

      // 2. Form Sections
      const selectedFormsWithData = formOptions.filter((f) => selectedFormIds.includes(f.id));
      selectedFormsWithData.forEach((form) => {
        const formRows = filteredRows.filter((row) => row.formId === form.id);
        if (formRows.length > 0) {
          const formHeader = ["Form", "Field", "Value"];
          const formSectionRows = formRows.map((row) => [
            row.formName,
            row.questionTitle,
            row.answerValue
          ]);
          csvSections.push([
            formHeader.map(buildCsvValue).join(","),
            ...formSectionRows.map((row) => row.map(buildCsvValue).join(","))
          ]);
        }
      });

      // Join sections with one blank row containing empty columns (,,)
      const csv = csvSections.map((section) => section.join("\n")).join("\n,,\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${(props.person?.name?.display || "person").replace(/\s+/g, "_")}_details.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      props.onClose();
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={props.open} onClose={props.onClose} maxWidth="lg" fullWidth>
      <DialogTitle>{Locale.label("people.peoplePage.export") || "Export"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Alert severity="info">
            Choose which forms to include. Existing personal detail rows will remain in the CSV.
          </Alert>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper variant="outlined" sx={{ p: 2, maxHeight: 260, overflowY: "auto" }}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {Locale.label("people.personNavigation.forms") || "Forms"}
                  </Typography>
                  <FormControlLabel
                    control={<Checkbox checked={allSelected} indeterminate={selectedFormIds.length > 0 && !allSelected} onChange={toggleAllForms} />}
                    label="All Forms"
                  />
                  {formOptions.map((option) => (
                    <FormControlLabel
                      key={option.id}
                      control={<Checkbox checked={selectedFormIds.includes(option.id)} onChange={() => toggleForm(option.id)} />}
                      label={option.name}
                    />
                  ))}
                </Stack>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                fullWidth
                label={Locale.label("common.search") || "Search"}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search questions or answers"
              />
            </Grid>
          </Grid>

          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={`${filteredRows.length} matching responses`} size="small" />
            <Chip label={`${selectedFormIds.length} forms selected`} size="small" variant="outlined" />
          </Stack>

          {loading ? (
            <Box sx={{ py: 8, display: "flex", justifyContent: "center" }}>
              <Loading />
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Form</TableCell>
                  <TableCell>Question</TableCell>
                  <TableCell>Answer</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} sx={{ textAlign: "center", py: 4 }}>
                      No matching form data found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => (
                    <TableRow key={`${row.formId}-${row.questionId}`} hover>
                      <TableCell>{row.formName}</TableCell>
                      <TableCell>{row.questionTitle}</TableCell>
                      <TableCell>{row.answerValue}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleExport} disabled={loading || exporting}>
          {exporting ? (Locale.label("people.peoplePage.loading") || "Exporting...") : exportButtonLabel}
        </Button>
        <Button onClick={props.onClose}>{Locale.label("common.close") || "Close"}</Button>
      </DialogActions>
    </Dialog>
  );
});

function formatAnswerValue(fieldType: string, value: string) {
  if (!value) return "";
  if (fieldType === "Yes/No") {
    if (value === "True") return Locale.label("common.yes") || "Yes";
    if (value === "False") return Locale.label("common.no") || "No";
  }
  if (fieldType === "Date") {
    try {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return DateHelper.getShortDate(parsed);
    } catch {
      return value;
    }
  }
  return value;
}
