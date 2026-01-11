import React, { ReactNode } from "react";
import { Paper, Stack, Typography, TableCell } from "@mui/material";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: "table" | "card";
  colSpan?: number; // Required for table variant
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon, title, description, action, variant = "card", colSpan = 5
}) => {
  const content = (
    <Stack spacing={2} alignItems="center">
      {React.cloneElement(icon as React.ReactElement, { sx: { fontSize: variant === "card" ? 64 : 48, color: variant === "card" ? "grey.400" : "text.secondary" } })}
      <Typography variant={variant === "card" ? "h6" : "body1"} color="text.secondary" gutterBottom={variant === "card"}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: variant === "card" ? 3 : 0 }}>
          {description}
        </Typography>
      )}
      {action}
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
    <Paper
      sx={{
        p: 6,
        textAlign: "center",
        backgroundColor: "var(--bg-sub)",
        border: "1px dashed",
        borderColor: "var(--border-main)",
        borderRadius: 2,
      }}>
      {content}
    </Paper>
  );
};
