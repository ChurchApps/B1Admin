import React, { useState, useCallback } from "react";
import { RoleCheck } from "./";
import { ApiHelper, DisplayBox, type PermissionInterface, Locale } from "@churchapps/apphelper";
import { type RoleInterface, type RolePermissionInterface } from "@churchapps/helpers";
import { Accordion, AccordionSummary, AccordionDetails, Typography, Icon, TextField } from "@mui/material";

interface Props {
  role: RoleInterface;
}

export const RolePermissions: React.FC<Props> = (props) => {
  const [rolePermissions, setRolePermissions] = useState<RolePermissionInterface[]>([]);
  const [permissions, setPermissions] = useState<PermissionInterface[]>([]);

  const [expanded, setExpanded] = React.useState<string | false>(false);
  const [filter, setFilter] = useState("");

  const search = filter.trim().toLowerCase();
  const visible = search
    ? permissions.filter((p) => `${p.displayAction || ""} ${p.displaySection || ""} ${p.section || ""}`.toLowerCase().includes(search))
    : permissions;

  const handleChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const loadData = useCallback(() => {
    ApiHelper.get("/rolepermissions/roles/" + props.role.id, "MembershipApi").then((data: any) => setRolePermissions(data));
  }, [props.role]);
  const loadPermissions = useCallback(() => {
    ApiHelper.get("/permissions", "MembershipApi").then((data: any) => setPermissions(data));
  }, []);

  const getSections = () => {
    const lastSection: string[] = [];
    const result: JSX.Element[] = [];
    const sortedPermissions = [...visible].sort((a, b) => ((a.displaySection || "") > (b.displaySection || "") ? 1 : -1));

    sortedPermissions.forEach((p, index) => {
      if (!lastSection.includes(p.displaySection || "")) {
        result.push(
          <Accordion key={p.displaySection || index} expanded={!!search || expanded === "panel" + index} onChange={handleChange("panel" + index)}>
            <AccordionSummary expandIcon={<Icon>expand_more</Icon>}>
              <Typography>{p.displaySection}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <div>{getChecks(p.displaySection || "")}</div>
            </AccordionDetails>
          </Accordion>
        );
        lastSection.push(p.displaySection || "");
      }
    });
    return result;
  };

  const getChecks = (displaySection: string) => {
    const result: JSX.Element[] = [];
    visible.forEach((p, index) => {
      if (p.displaySection === displaySection) {
        result.push(<RoleCheck key={index} roleId={props.role.id || ""} rolePermissions={rolePermissions} apiName={p.apiName || ""} contentType={p.section || ""} action={p.action || ""} label={p.displayAction || ""} />);
      }
    });
    return result;
  };

  React.useEffect(() => {
    if (props.role?.id !== undefined) loadData();
  }, [props.role, loadData]);
  React.useEffect(() => {
    if (props.role?.id !== undefined) loadPermissions();
  }, [props.role, loadPermissions]);

  return (
    <DisplayBox id="rolePermissionsBox" headerText={Locale.label("settings.rolePermissions.permEdit")} headerIcon="lock" help="docs/b1-admin/settings/roles-permissions">
      <TextField
        fullWidth
        size="small"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        label={Locale.label("settings.rolePermissions.filter")}
        data-testid="role-permission-filter"
      />
      <div>{getSections()}</div>
    </DisplayBox>
  );
};
