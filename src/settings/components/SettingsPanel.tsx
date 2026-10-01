import React, { type ReactNode } from "react";
import { Box, Card, Icon, Stack, Typography } from "@mui/material";
import { HelpIcon } from "@churchapps/apphelper";

interface Props {
  headerText: string;
  /** Material icon name or an icon element. */
  headerIcon?: ReactNode;
  editContent?: ReactNode;
  help?: string;
  id?: string;
  footerContent?: ReactNode;
  children?: ReactNode;
  "data-testid"?: string;
  /** Render as a plain section inside a parent surface instead of its own card. */
  flat?: boolean;
}

export const SettingsPanel: React.FC<Props> = ({ headerText, headerIcon, editContent, help, id, footerContent, children, flat, ...rest }) => {
  const icon = typeof headerIcon === "string" ? <Icon>{headerIcon}</Icon> : headerIcon;
  return (
    <Box component={flat ? "section" : Card} id={id} data-testid={rest["data-testid"]} sx={flat ? { position: "relative", "& + &": { mt: 4 } } : { mb: 3, p: { xs: 2, md: 3 }, position: "relative" }}>
      {help && <HelpIcon article={help} />}
      {(headerText || editContent) && <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
          {icon && <Box aria-hidden sx={{ display: "flex", color: "text.secondary", "& .MuiSvgIcon-root, & .material-icons": { fontSize: 20 } }}>{icon}</Box>}
          <Typography variant="h3" component="h2">{headerText}</Typography>
        </Stack>
        {editContent && <Box>{editContent}</Box>}
      </Stack>}
      <Box data-testid="display-box-content">{children}</Box>
      {footerContent && <Box sx={{ mt: 2 }}>{footerContent}</Box>}
    </Box>
  );
};
