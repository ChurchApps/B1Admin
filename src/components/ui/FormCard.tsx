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
  isSubmitting?: boolean;
  disabled?: boolean;
  headerActions?: ReactNode;
  stickyFooter?: boolean;
  "data-testid"?: string;
  elevation?: number;
}

/** Card-based form shell: icon + h6 header, padded content, footer divider with
 * right-aligned Cancel/Save and a destructive Delete alone on the left. */
export const FormCard: React.FC<FormCardProps> = (props) => {
  const icon = typeof props.icon === "string" ? <Icon sx={{ fontSize: 20, color: "primary.main" }}>{props.icon}</Icon> : props.icon;
  const hasFooter = props.onSave || props.onCancel || props.onDelete;

  return (
    <Card id={props.id} data-testid={props["data-testid"]} elevation={props.elevation} sx={{ mb: props.elevation === 0 ? 0 : 3, position: "relative" }}>

      {props.help && <HelpIcon article={props.help} />}
      <Box sx={{ p: 2, borderBottom: "1px solid var(--border-light)" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            {icon}
            <Typography variant="h6" component="h2">{props.title}</Typography>
          </Stack>
          {props.headerActions}
        </Stack>
      </Box>
      <Box sx={{ p: 2, "& > *:not(:last-child)": { mb: 2 } }}>{props.children}</Box>
      {hasFooter && (
        <Box sx={{ p: 2, borderTop: "1px solid var(--border-light)", ...(props.stickyFooter ? { position: "sticky", bottom: 0, backgroundColor: "background.paper", zIndex: 2 } : {}) }}>
          <Stack direction="row" spacing={1} alignItems="center">
            {props.onDelete && (
              <Button id="delete" color="error" onClick={props.onDelete} aria-label={props.deleteText || Locale.label("common.delete")}>
                {props.deleteText || Locale.label("common.delete")}
              </Button>
            )}
            <Box sx={{ flex: 1 }} />
            {props.onCancel && <Button onClick={props.onCancel}>{props.cancelText || Locale.label("common.cancel")}</Button>}
            {props.onSave && (
              <LoadingButton variant="contained" disableElevation loading={!!props.isSubmitting} disabled={props.disabled} onClick={props.onSave}>
                {props.saveText || Locale.label("common.save")}
              </LoadingButton>
            )}
          </Stack>
        </Box>
      )}
    </Card>
  );
};
