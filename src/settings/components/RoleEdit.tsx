import { TextField } from "@mui/material";
import React, { useState, useCallback } from "react";
import { type RoleInterface } from "@churchapps/helpers";
import { ApiHelper, InputBox, UniqueIdHelper, ErrorMessages, Locale, Loading } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";

interface Props {
  roleId: string;
  updatedFunction: () => void;
}

export const RoleEdit: React.FC<Props> = ({ roleId, updatedFunction }) => {
  const [role, setRole] = useState<RoleInterface>({} as RoleInterface);
  const [errors, setErrors] = useState<string[]>([]);

  const roleQuery = useQuery<RoleInterface>({
    queryKey: [`/roles/${roleId}`, "MembershipApi"],
    enabled: !UniqueIdHelper.isMissing(roleId)
  });

  React.useEffect(() => {
    if (!UniqueIdHelper.isMissing(roleId) && roleQuery.data) {
      setRole(roleQuery.data);
    } else if (UniqueIdHelper.isMissing(roleId)) {
      setRole({} as RoleInterface);
    }
  }, [roleId, roleQuery.data]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const r = { ...role };
      r.name = e.currentTarget.value;

      setRole(r);
      setErrors([]);
    },
    [role]
  );

  const handleSave = useCallback(() => {
    if (!role.name?.trim()) {
      setErrors([Locale.label("settings.roleEdit.valMsg")]);
      return;
    }

    const r = {
      ...role,
      name: role.name.trim()
    };
    ApiHelper.post("/roles", [r], "MembershipApi").then(() => updatedFunction());
  }, [role, updatedFunction]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<any>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave]
  );

  const handleCancel = useCallback(() => updatedFunction(), [updatedFunction]);

  const handleDelete = useCallback(() => {
    if (window.confirm(Locale.label("settings.roleEdit.confirmMsg"))) {
      ApiHelper.delete("/roles/" + role.id, "MembershipApi").then(() => updatedFunction());
    }
  }, [role.id, updatedFunction]);

  if (roleQuery.isLoading && !UniqueIdHelper.isMissing(roleId)) return <Loading />;

  return (
    <InputBox
      id="roleBox"
      headerIcon="lock"
      headerText={Locale.label("settings.roleEdit.roleEdit")}
      saveFunction={handleSave}
      cancelFunction={handleCancel}
      deleteFunction={!UniqueIdHelper.isMissing(roleId) && role.name !== "Domain Admins" ? handleDelete : undefined}>
      <ErrorMessages errors={errors} />
      <TextField
        fullWidth
        name="roleName"
        label={Locale.label("settings.roleEdit.roleName")}
        value={role?.name || ""}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={Locale.label("placeholders.role.name")}
        data-testid="role-name-input"
        aria-label="Role name"
      />
    </InputBox>
  );
};
