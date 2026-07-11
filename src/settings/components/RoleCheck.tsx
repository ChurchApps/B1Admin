import React from "react";
import { ApiHelper, ErrorMessages, Locale } from "@churchapps/apphelper";
import { type RolePermissionInterface } from "@churchapps/helpers";
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
  const [rolePermission, setRolePermission] = React.useState<RolePermissionInterface | null>(null);
  const [errors, setErrors] = React.useState<string[]>([]);

  const init = () => {
    for (let i = 0; i < props.rolePermissions.length; i++) {
      const rp = props.rolePermissions[i];
      if (rp.apiName === props.apiName && rp.contentType === props.contentType && rp.action === props.action) setRolePermission(rp);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const rp: RolePermissionInterface = {
        roleId: props.roleId,
        apiName: props.apiName,
        contentType: props.contentType,
        action: props.action
      };
      setRolePermission(rp); // optimistic
      try {
        const data: any = await ApiHelper.post("/rolepermissions/", [rp], "MembershipApi");
        setRolePermission({ ...rp, id: data[0] });
      } catch {
        setRolePermission(null); // revert
        setErrors([Locale.label("common.saveError")]);
      }
    } else {
      const previous = rolePermission;
      setRolePermission(null); // optimistic
      try {
        await ApiHelper.delete("/rolepermissions/" + previous!.id, "MembershipApi");
      } catch {
        setRolePermission(previous); // revert
        setErrors([Locale.label("common.saveError")]);
      }
    }
  };

  React.useEffect(init, [props.rolePermissions]);

  return (
    <FormGroup>
      <ErrorMessages errors={errors} />
      <FormControlLabel
        control={
          <Checkbox checked={rolePermission !== null} onChange={handleChange} data-testid={`role-permission-checkbox-${props.contentType}-${props.action}`} aria-label={Locale.label("settings.roleCheck.permissionAria").replace("{label}", props.label)} />
        }
        label={props.label}
      />
    </FormGroup>
  );
};
