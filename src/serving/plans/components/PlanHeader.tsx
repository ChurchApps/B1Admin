import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Stack, Typography } from "@mui/material";
import { ArrowBack as ArrowBackIcon, EditOutlined as EditIcon, PrintOutlined as PrintIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import { type PlanInterface, type PlanTypeInterface } from "../../../helpers";
import { TextAction, VerbRow, eyebrowSx } from "../../../components/ui";

interface Props {
  plan: PlanInterface;
  planName: string;
  dateLabel: string;
  eyebrow: string;
  planType: PlanTypeInterface | null;
  canEdit: boolean;
  /** Set on a subpage: the heading becomes the subpage title with a link back to the overview. */
  subpageTitle?: string;
  editing?: boolean;
  onEdit?: () => void;
  actions?: React.ReactNode;
}

// Full-width header strip for the plan overview and its subpages: where the old identity column's date, edit and print went.
export const PlanHeader = (props: Props) => {
  const { plan, planName, dateLabel, eyebrow, planType, canEdit, subpageTitle } = props;
  const planPath = `/serving/plans/${plan.id}`;

  return (
    <Box component="header" data-testid="plan-identity" sx={{ mb: { xs: 2, md: 3 } }}>
      <VerbRow sx={{ mb: 1.5 }}>
        <TextAction small to="/serving/plans" component={RouterLink}>{Locale.label("plans.planList.plans")}</TextAction>
        {planType?.id && <TextAction small to={`/serving/planTypes/${planType.id}`} component={RouterLink}>{planType.name}</TextAction>}
        {subpageTitle && <TextAction small to={planPath} component={RouterLink}>{planName}</TextAction>}
      </VerbRow>
      <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "flex-end" }} spacing={2}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {subpageTitle ? (
            <Button component={RouterLink} to={planPath} startIcon={<ArrowBackIcon />} size="small" sx={{ ml: -1, mb: 0.5 }} data-testid="plan-back-link">
              {Locale.label("plans.planPage.backToPlan", "Back to plan")}
            </Button>
          ) : (
            eyebrow && <Typography component="p" sx={{ ...eyebrowSx, mb: 0.5 }}>{eyebrow}</Typography>
          )}
          <Typography id="page-header-title" variant="h1" component="h1" sx={{ overflowWrap: "anywhere" }}>{subpageTitle || planName}</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }} data-testid="plan-date">
            {subpageTitle ? [planName, dateLabel].filter(Boolean).join(" · ") : dateLabel}
          </Typography>
        </Box>
        <Stack direction="row" useFlexGap flexWrap="wrap" gap={1} sx={{ "& .MuiButton-root": { flex: { xs: 1, sm: "none" } } }}>
          {props.actions}
          <Button variant="outlined" startIcon={<PrintIcon />} href={`/serving/plans/print/${plan.id}`} target="_blank" rel="noopener" data-testid="print-plan-link">{Locale.label("common.print")}</Button>
          {canEdit && props.onEdit && (
            <Button variant={props.editing ? "contained" : "outlined"} startIcon={props.editing ? undefined : <EditIcon />} onClick={props.onEdit} data-testid="edit-plan-button">
              {props.editing ? Locale.label("common.done") : Locale.label("plans.planPage.editDetails", "Edit details")}
            </Button>
          )}
        </Stack>
      </Stack>
    </Box>
  );
};
