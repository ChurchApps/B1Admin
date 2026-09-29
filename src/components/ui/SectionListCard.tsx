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

export const SectionListCard: React.FC<SectionListCardProps> = ({ icon, title, count, onAdd, addLabel, addButtonVariant = "outlined", addButtonSize = "medium", addButtonTestId, loading, empty, cardSx, children }) => (
  <Card sx={cardSx}>
    <Stack className="om-head" direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ px: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 }, pb: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
        {React.cloneElement(icon as React.ReactElement<any>, { className: "om-icon", sx: { color: "text.secondary", fontSize: 20 } })}
        <Typography className="om-title" variant="h3" component="h2">{title}</Typography>
        {count > 0 && <CountChip count={count} />}
      </Stack>
      {onAdd && (
        <Button variant={addButtonVariant} size={addButtonSize} startIcon={<AddIcon />} onClick={onAdd} data-testid={addButtonTestId}>
          {addLabel}
        </Button>
      )}
    </Stack>
    {loading ? <Loading /> : count === 0 ? (
      <EmptyState variant="plain" icon={empty.icon} title={empty.title} description={empty.description} action={empty.action} />
    ) : children}
  </Card>
);
