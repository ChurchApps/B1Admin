import React, { type ReactNode } from "react";
import { Box, Stack, Typography, TableCell } from "@mui/material";
import { InRecordContext } from "./RecordLayout";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  /** "card" = its own bordered panel; "plain" = inside an existing panel; "table" = a full-width table cell. */
  variant?: "table" | "card" | "plain";
  colSpan?: number; // Required for table variant
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, variant = "card", colSpan = 5 }) => {
  const inRecord = React.useContext(InRecordContext);
  // Inside a panel or record, empty is one quiet line plus its verbs, not a centered hero.
  if ((inRecord && variant !== "table") || variant === "plain") {
    return (
      <Stack spacing={1} alignItems="flex-start">
        <Typography variant="body1" color="text.secondary">{title}</Typography>
        {description && <Typography variant="body2" color="text.secondary">{description}</Typography>}
        {action}
      </Stack>
    );
  }

  const content = (
    <Stack spacing={1} alignItems="center" sx={{ maxWidth: 480, mx: "auto" }}>
      {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement<any>, { sx: { fontSize: 32, color: "text.secondary", mb: 0.5 }, "aria-hidden": true })}
      <Typography variant="h3" component="p">{title}</Typography>
      {description && <Typography variant="body2" color="text.secondary">{description}</Typography>}
      {action && <Box sx={{ pt: 1 }}>{action}</Box>}
    </Stack>
  );

  if (variant === "table") {
    return (
      <TableCell colSpan={colSpan} sx={{ textAlign: "center", py: 4 }}>
        {content}
      </TableCell>
    );
  }

  return (
    <Box
      sx={{
        py: 4,
        px: 3,
        textAlign: "center",
        ...(variant === "card" ? { bgcolor: "background.paper", border: 1, borderColor: "divider", borderRadius: "var(--b1-radius-panel)" } : {})
      }}>
      {content}
    </Box>
  );
};
