import React, { type ReactNode } from "react";
import { Button, Card, Stack, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { Loading } from "@churchapps/apphelper";
import { CountChip } from "./CountChip";
import { EmptyState } from "./EmptyState";

interface SectionListEmpty {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

interface SectionListCardProps {
  icon: ReactNode;
  title: string;
  count: number;
  onAdd?: () => void;
  addLabel?: string;
  addButtonVariant?: "text" | "outlined" | "contained";
  addButtonSize?: "small" | "medium" | "large";
  addButtonTestId?: string;
  loading?: boolean;
  empty: SectionListEmpty;
  cardSx?: SxProps<Theme>;
  children?: ReactNode;
}

export const SectionListCard: React.FC<SectionListCardProps> = ({ icon, title, count, onAdd, addLabel, addButtonVariant = "contained", addButtonSize = "medium", addButtonTestId, loading, empty, cardSx, children }) => (
  <Card sx={cardSx}>
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2, borderBottom: 1, borderColor: "var(--border-light)" }}>
      <Stack direction="row" spacing={1} alignItems="center">
        {React.cloneElement(icon as React.ReactElement<any>, { sx: { color: "primary.main", fontSize: 20 } })}
        <Typography variant="h6">{title}</Typography>
        {count > 0 && <CountChip count={count} />}
      </Stack>
      {onAdd && (
        <Button variant={addButtonVariant} size={addButtonSize} startIcon={<AddIcon />} onClick={onAdd} data-testid={addButtonTestId}>
          {addLabel}
        </Button>
      )}
    </Stack>
    {loading ? <Loading /> : count === 0 ? (
      <EmptyState variant="card" icon={empty.icon} title={empty.title} description={empty.description} action={empty.action} />
    ) : children}
  </Card>
);
