import { Alert, TextField } from "@mui/material";
import React from "react";
import { useForm } from "react-hook-form";
import { type RoleInterface } from "@churchapps/helpers";
import { ApiHelper, InputBox, UniqueIdHelper, Locale, Loading } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";

interface Props {
  roleId: string;
  updatedFunction: () => void;
}

type AnyRecord = Record<string, any>;

export const RoleEdit: React.FC<Props> = ({ roleId, updatedFunction }) => {
  const { register, handleSubmit, reset, formState } = useForm<AnyRecord>({ defaultValues: { roleName: "" } });
  const e = formState.errors as any;
  const summaryErrors: string[] = [];
  if (e.roleName?.message) summaryErrors.push(e.roleName.message);

  const roleQuery = useQuery<RoleInterface>({
    queryKey: [`/roles/${roleId}`, "MembershipApi"],
    enabled: !UniqueIdHelper.isMissing(roleId)
  });

  React.useEffect(() => {
    if (!UniqueIdHelper.isMissing(roleId) && roleQuery.data) {
      reset({ roleName: roleQuery.data.name || "" });
    } else if (UniqueIdHelper.isMissing(roleId)) {
      reset({ roleName: "" });
    }
  }, [roleId, roleQuery.data, reset]);

  const onValid = (values: AnyRecord) => {
    const r = { ...roleQuery.data, name: values.roleName.trim() };
    ApiHelper.post("/roles", [r], "MembershipApi").then(() => updatedFunction());
  };

  const handleDelete = () => {
    if (window.confirm(Locale.label("settings.roleEdit.confirmMsg"))) {
      ApiHelper.delete("/roles/" + roleQuery.data?.id, "MembershipApi").then(() => updatedFunction());
    }
  };

  if (roleQuery.isLoading && !UniqueIdHelper.isMissing(roleId)) return <Loading />;

  return (
    <InputBox
      id="roleBox"
      headerIcon="lock"
      headerText={Locale.label("settings.roleEdit.roleEdit")}
      saveFunction={handleSubmit(onValid)}
      cancelFunction={updatedFunction}
      deleteFunction={!UniqueIdHelper.isMissing(roleId) && roleQuery.data?.name !== "Domain Admins" ? handleDelete : undefined}>
      {summaryErrors.length > 0 && <Alert severity="error" sx={{ mb: 2 }}>{summaryErrors.map((msg) => <div key={msg}>{msg}</div>)}</Alert>}
      <TextField fullWidth label={Locale.label("settings.roleEdit.roleName")} placeholder={Locale.label("placeholders.role.name")} data-testid="role-name-input" aria-label={Locale.label("settings.roleEdit.roleNameAria")} error={!!e.roleName} helperText={e.roleName?.message} {...register("roleName", { required: Locale.label("settings.roleEdit.valMsg") })} />
    </InputBox>
  );
};
