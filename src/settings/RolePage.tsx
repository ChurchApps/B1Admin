import React, { useState } from "react";
import { UserAdd, RolePermissions, RoleMembers } from "./components";
import { type RoleInterface, type RoleMemberInterface } from "@churchapps/helpers";
import { ApiHelper, UserHelper, Permissions, Locale } from "@churchapps/apphelper";
import { useParams, Link as RouterLink } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { Plate, Record, Verbs, verbSx, h1Sx, ledeSx, SectionLabel } from "./plated";

export const RolePage = () => {
  const params = useParams();
  const [role, setRole] = React.useState<RoleInterface>({} as RoleInterface);
  const [showAdd, setShowAdd] = React.useState<boolean>(false);
  const [selectedRoleMemberId, setSelectedRoleMemberId] = React.useState<string>("");
  const [roleMembers, setRoleMembers] = useState<RoleMemberInterface[]>([]);

  const handleShowAdd = () => {
    setShowAdd(true);
  };
  const handleAdd = () => {
    setShowAdd(false);
    setSelectedRoleMemberId("");
    loadData();
    loadRoleMembers();
  };

  const loadData = () => {
    if (params.roleId === "everyone") {
      setRole({ id: undefined, name: "Everyone" });
      return;
    }
    ApiHelper.get("/roles/" + params.roleId, "MembershipApi").then((data: any) => setRole(data));
  };
  const loadRoleMembers = () => {
    ApiHelper.get("/rolemembers/roles/" + params.roleId + "?include=users", "MembershipApi").then((data: any) => {
      setRoleMembers(data);
    });
  };

  const getAddUser = () => {
    if (showAdd || selectedRoleMemberId) return <UserAdd role={role} roleMembers={roleMembers} selectedUser={selectedRoleMemberId} updatedFunction={handleAdd} />;
    return null;
  };

  const canEdit = UserHelper.checkAccess(Permissions.membershipApi.roles.edit);

  React.useEffect(loadData, [params.roleId]);
  React.useEffect(loadRoleMembers, [params.roleId]);

  if (!UserHelper.checkAccess(Permissions.membershipApi.roles.view)) return <></>;

  return (
    <Plate>
      <Record
        who={(
          <>
            <Box component="h1" sx={h1Sx}>{role?.name || ""}</Box>
            <Box sx={ledeSx}>{Locale.label("settings.rolePage.roleEdit")}</Box>
            <Verbs>
              <Box component={RouterLink} to="/settings/roles" sx={verbSx}>{Locale.label("settings.roles.roles")}</Box>
            </Verbs>
            {role.name === "Domain Admins" && (
              <Typography variant="body2" sx={{ mt: 2 }}>{Locale.label("settings.rolePage.noEditMsg")}</Typography>
            )}
          </>
        )}
        rest={(
          <>
            {getAddUser()}
            <SectionLabel sx={{ mt: 0 }}>{Locale.label("settings.roleMembers.mem")}</SectionLabel>
            <RoleMembers role={role} roleMembers={roleMembers} addFunction={handleShowAdd} setSelectedRoleMember={setSelectedRoleMemberId} updatedFunction={handleAdd} />
            {canEdit && role.name !== "Domain Admins" && (
              <>
                <SectionLabel>{Locale.label("settings.rolePage.permEdit")}</SectionLabel>
                <RolePermissions role={role} />
              </>
            )}
          </>
        )}
      />
    </Plate>
  );
};
