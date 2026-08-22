import React, { memo } from "react";
import { Box, Typography, Chip, Divider } from "@mui/material";
import { type QuestionInterface, type AnswerInterface } from "@churchapps/helpers";
import { DateHelper, Locale } from "@churchapps/apphelper";

interface Props {
  question: QuestionInterface;
  answer: AnswerInterface;
  showEmpty?: boolean;
}

export const Question: React.FC<Props> = memo((props) => {
  const q = props.question;
  const a = props.answer;
  const showEmpty = props.showEmpty;

  if (a === null && q.fieldType !== "Heading" && !showEmpty) return null;

  if (q.fieldType === "Heading") {
    return (
      <Box sx={{ py: 2 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: "primary.main",
            mb: 1
          }}>
          {q.title}
        </Typography>
        <Divider />
      </Box>
    );
  }

  let displayValue: string;
  let chipColor: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" = "default";

  switch (q.fieldType) {
    case "Date":
      displayValue = "";
      if (a?.value) {
        try {
          const theDate = new Date(a.value);
          const localDate = new Date(theDate.getTime() + theDate.getTimezoneOffset() * 60000);
          displayValue = DateHelper.getShortDate(localDate);
        } catch (e) {
          // Date parsing failed
        }
      }
      break;
    case "Yes/No":
      if (a?.value === "True") {
        displayValue = Locale.label("common.yes") || "Yes";
        chipColor = "success";
      } else if (a?.value === "False") {
        displayValue = Locale.label("common.no") || "No";
        chipColor = "error";
      } else {
        displayValue = "";
      }
      break;
    default:
      displayValue = a?.value || "";
      break;
  }

  const isEmpty = !displayValue;
  if (isEmpty && !showEmpty) return null;
  const shownValue = isEmpty ? "—" : displayValue;

  return (
    <Box
      sx={(theme) => ({
        py: 1.5,
        px: 2,
        backgroundColor: theme.palette.mode === "dark" ? "grey.900" : "grey.50",
        borderRadius: 1,
        border: "1px solid",
        borderColor: theme.palette.mode === "dark" ? "grey.800" : "grey.200"
      })}>
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 600,
          color: "text.primary",
          mb: 0.5,
          fontSize: "0.875rem"
        }}>
        {q.title}
      </Typography>

      {q.fieldType === "Yes/No" && !isEmpty ? (
        <Chip
          label={shownValue}
          color={chipColor}
          variant="filled"
          size="small"
          sx={{
            fontWeight: 500,
            fontSize: "0.75rem"
          }}
        />
      ) : (
        <Typography
          variant="body2"
          sx={{
            color: isEmpty ? "text.disabled" : "text.secondary",
            fontWeight: 400,
            wordBreak: "break-word"
          }}>
          {shownValue}
        </Typography>
      )}
    </Box>
  );
});
