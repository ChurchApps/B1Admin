import React from "react";
import { Link } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { Permissions, UserHelper } from "@churchapps/apphelper";

interface Props {
  type?: string;
  id?: string;
  label?: string;
  fallback: string;
  testId: string;
}

// A task's assignee or associated party: groups link to the group page (its roster decides what the viewer sees);
// people link to their record only for viewers who may open people.
export const TaskPartyLink: React.FC<Props> = ({ type, id, label, fallback, testId }) => {
  const kind = type?.toLowerCase();
  let to = "";
  if (id && kind === "group") to = "/groups/" + id;
  else if (id && kind === "person" && UserHelper.checkAccess(Permissions.membershipApi.people.view)) to = "/people/" + id;

  if (!label || !to) return <span data-testid={testId}>{label || fallback}</span>;
  return <Link component={RouterLink} to={to} underline="hover" data-testid={testId}>{label}</Link>;
};
