import React, { type ReactNode } from "react";
import { Card, Box, Stack, Typography, Button, Icon } from "@mui/material";
import { HelpIcon, Locale } from "@churchapps/apphelper";
import { LoadingButton } from "./LoadingButton";

interface FormCardProps {
  id?: string;
  title: string;
  /** Material icon name ("volunteer_activism") or an icon element. */
  icon?: ReactNode;
  help?: string;
  children: ReactNode;
  onSave?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  saveText?: string;
  cancelText?: string;
  deleteText?: string;
  saveTestId?: string;
  deleteTestId?: string;
  /** Extra footer buttons rendered next to Delete. */
  footerActions?: ReactNode;
  isSubmitting?: boolean;
  disabled?: boolean;
  headerActions?: ReactNode;
  stickyFooter?: boolean;
  "data-testid"?: string;
  elevation?: number;
}

export const FormCard: React.FC<FormCardProps> = (props) => {
  const icon = typeof props.icon === "string" ? <Icon sx={{ fontSize: 20, color: "text.secondary" }}>{props.icon}</Icon> : props.icon;
  const hasFooter = props.onSave || props.onCancel || props.onDelete || props.footerActions;

  return (
    <Card id={props.id} data-testid={props["data-testid"]} elevation={props.elevation} sx={{ mb: props.elevation === 0 ? 0 : 3, position: "relative" }}>

      {props.help && <HelpIcon article={props.help} />}
      <Box className="om-head" sx={{ px: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 }, pb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            {icon && <Box className="om-icon" sx={{ display: "flex", color: "text.secondary", "& .MuiSvgIcon-root": { fontSize: 20 } }}>{icon}</Box>}
            <Typography className="om-title" variant="h3" component="h2">{props.title}</Typography>
          </Stack>
          {props.headerActions}
        </Stack>
      </Box>
      <Box className="om-body" sx={{ px: { xs: 2, md: 3 }, pb: hasFooter ? 1 : { xs: 2, md: 3 }, "& > *:not(:last-child)": { mb: 2 } }}>{props.children}</Box>
      {hasFooter && (
        <Box className="om-foot" sx={{ px: { xs: 2, md: 3 }, py: 2, ...(props.stickyFooter ? { position: "sticky", bottom: 0, borderTop: 1, borderColor: "divider", backgroundColor: "background.paper", zIndex: 2 } : {}) }}>
          <Stack direction="row" spacing={1} alignItems="center">
            {props.onDelete && (
              <Button id="delete" color="error" onClick={props.onDelete} data-testid={props.deleteTestId} aria-label={props.deleteText || Locale.label("common.delete")}>
                {props.deleteText || Locale.label("common.delete")}
              </Button>
            )}
            {props.footerActions}
            <Box sx={{ flex: 1 }} />
            {props.onCancel && <Button variant="outlined" onClick={props.onCancel}>{props.cancelText || Locale.label("common.cancel")}</Button>}
            {props.onSave && (
              <LoadingButton variant="contained" loading={!!props.isSubmitting} disabled={props.disabled} onClick={props.onSave} data-testid={props.saveTestId}>
                {props.saveText || Locale.label("common.save")}
              </LoadingButton>
            )}
          </Stack>
        </Box>
      )}
    </Card>
  );
};
