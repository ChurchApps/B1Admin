import React from "react";
import { ApiHelper, ErrorMessages, Locale } from "@churchapps/apphelper";
import { type RolePermissionInterface } from "@churchapps/helpers";
import { FormGroup, FormControlLabel, Checkbox } from "@mui/material";

interface Props {
  apiName: string;
  contentType: string;
  action: string;
  label: string;
  roleId?: string;
  rolePermissions: RolePermissionInterface[];
  onChange?: (rp: RolePermissionInterface, checked: boolean) => void;
}

export const RoleCheck: React.FC<Props> = (props) => {
  const [rolePermission, setRolePermission] = React.useState<RolePermissionInterface | null>(null);
  const [errors, setErrors] = React.useState<string[]>([]);

  const init = () => {
    const match = props.rolePermissions.find((rp) => rp.apiName === props.apiName && rp.contentType === props.contentType && rp.action === props.action);
    setRolePermission(match || null);
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
      props.onChange?.(rp, true);
      try {
        const data: RolePermissionInterface[] = await ApiHelper.post("/rolepermissions/", [rp], "MembershipApi");
        const saved = { ...rp, id: data[0].id };
        setRolePermission(saved);
        props.onChange?.(saved, true);
      } catch {
        setRolePermission(null); // revert
        props.onChange?.(rp, false);
        setErrors([Locale.label("common.saveError")]);
      }
    } else {
      const previous = rolePermission;
      setRolePermission(null); // optimistic
      props.onChange?.(previous!, false);
      try {
        await ApiHelper.delete("/rolepermissions/" + previous!.id, "MembershipApi");
      } catch {
        setRolePermission(previous); // revert
        props.onChange?.(previous!, true);
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
