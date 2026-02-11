import React from "react";
import { ApiHelper, type RolePermissionInterface } from "@churchapps/apphelper";
import { FormGroup, FormControlLabel, Checkbox } from "@mui/material";

interface Props {
  apiName: string;
  contentType: string;
  action: string;
  label: string;
  roleId: string;
  rolePermissions: RolePermissionInterface[];
}

export const RoleCheck: React.FC<Props> = (props) => {
  const [rolePermission, setRolePermission] = React.useState<RolePermissionInterface>(null);

  const init = () => {
    for (let i = 0; i < props.rolePermissions.length; i++) {
      const rp = props.rolePermissions[i];
      if (rp.apiName === props.apiName && rp.contentType === props.contentType && rp.action === props.action) setRolePermission(rp);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const rp: RolePermissionInterface = {
        roleId: props.roleId,
        apiName: props.apiName,
        contentType: props.contentType,
        action: props.action
      };
      ApiHelper.post("/rolepermissions/", [rp], "MembershipApi").then((data) => {
        rp.id = data[0];
        setRolePermission(rp);
      });
    } else {
      ApiHelper.delete("/rolepermissions/" + rolePermission.id, "MembershipApi");
      setRolePermission(null);
    }
  };

  React.useEffect(init, [props.rolePermissions]);

  return (
    <FormGroup>
      <FormControlLabel
        control={
          <Checkbox checked={rolePermission !== null} onChange={handleChange} data-testid={`role-permission-checkbox-${props.contentType}-${props.action}`} aria-label={`Permission ${props.label}`} />
        }
        label={props.label}
      />
    </FormGroup>
  );
};
