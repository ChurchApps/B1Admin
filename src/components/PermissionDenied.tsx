import React from "react";
import { Alert, Box } from "@mui/material";
import { UserHelper } from "@churchapps/apphelper";
import type { IApiPermission } from "@churchapps/helpers";

interface Props {
  permissions: IApiPermission[];
  message?: string;
}

export const hasPermission = (...perms: IApiPermission[]): boolean => perms.every(p => UserHelper.checkAccess(p));

export const PermissionDenied: React.FC<Props> = ({ permissions, message }) => (
  <Box sx={{ p: 3 }}>
    <Alert severity="warning">
      {message || "You do not have the required permission(s) to access this feature:"}
      <ul style={{ margin: "8px 0 0 0", paddingLeft: 20 }}>
        {permissions.map((p, i) => (
          <li key={i}>{p.api} - {p.contentType} - {p.action}</li>
        ))}
      </ul>
      Please contact your church administrator to request access.
    </Alert>
  </Box>
);
