import React from "react";
import { Alert, Box, Typography } from "@mui/material";
import { UserHelper, Locale } from "@churchapps/apphelper";
import type { IApiPermission } from "@churchapps/helpers";

interface Props {
  permissions: IApiPermission[];
  message?: string;
}

export const hasPermission = (...perms: IApiPermission[]): boolean => perms.every(p => UserHelper.checkAccess(p));

export const PermissionDenied: React.FC<Props> = ({ permissions, message }) => (
  <Box sx={{ p: 3 }}>
    <Alert severity="warning" data-testid="permission-denied">
      {message || Locale.label("components.permissionDenied.defaultMessage")} {Locale.label("components.permissionDenied.contactAdmin")}
      <Typography variant="caption" component="div" sx={{ mt: 1, opacity: 0.8 }}>
        {Locale.label("components.permissionDenied.required")}: {permissions.map((p) => `${p.api} - ${p.contentType} - ${p.action}`).join(", ")}
      </Typography>
    </Alert>
  </Box>
);
