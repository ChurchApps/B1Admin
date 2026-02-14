import React, { useState, useCallback } from "react";
import { RoleCheck } from "./";
import { ApiHelper, DisplayBox, type RoleInterface, type RolePermissionInterface, type PermissionInterface, Locale } from "@churchapps/apphelper";
import { Accordion, AccordionSummary, AccordionDetails, Typography, Icon } from "@mui/material";

interface Props {
  role: RoleInterface;
}

export const RolePermissions: React.FC<Props> = (props) => {
  const [rolePermissions, setRolePermissions] = useState<RolePermissionInterface[]>([]);
  const [permissions, setPermissions] = useState<PermissionInterface[]>([]);

  const [expanded, setExpanded] = React.useState<string | false>(false);

  const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const loadData = useCallback(() => {
    ApiHelper.get("/rolepermissions/roles/" + props.role.id, "MembershipApi").then((data) => setRolePermissions(data));
  }, [props.role]);
  const loadPermissions = useCallback(() => {
    ApiHelper.get("/permissions", "MembershipApi").then((data) => setPermissions(data));
  }, []);

  const getSections = () => {
    const lastSection: string[] = [];
    const result: JSX.Element[] = [];
    const sortedPermissions = [...permissions].sort((a, b) => (a.displaySection > b.displaySection ? 1 : -1));

    sortedPermissions.forEach((p, index) => {
      if (!lastSection.includes(p.displaySection)) {
        result.push(
          <Accordion expanded={expanded === "panel" + index} onChange={handleChange("panel" + index)}>
            <AccordionSummary expandIcon={<Icon>expand_more</Icon>}>
              <Typography>{p.displaySection}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <div>{getChecks(p.displaySection)}</div>
            </AccordionDetails>
          </Accordion>
        );
        lastSection.push(p.displaySection);
      }
    });
    return result;
  };

  const getChecks = (displaySection: string) => {
    const result: JSX.Element[] = [];
    permissions.forEach((p, index) => {
      if (p.displaySection === displaySection) {
        result.push(<RoleCheck key={index} roleId={props.role.id} rolePermissions={rolePermissions} apiName={p.apiName} contentType={p.section} action={p.action} label={p.displayAction} />);
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
      <div>{getSections()}</div>
    </DisplayBox>
  );
};
