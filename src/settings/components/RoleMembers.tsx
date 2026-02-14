import React, { memo, useCallback, useMemo } from "react";
import { ApiHelper, DisplayBox, UserHelper, Permissions, SmallButton, Locale } from "@churchapps/apphelper";
import { type RoleMemberInterface, type RoleInterface } from "@churchapps/helpers";
import { Alert, Stack, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";

interface Props {
  role: RoleInterface;
  addFunction: (role: RoleInterface) => void;
  setSelectedRoleMember: (id: string) => void;
  roleMembers: RoleMemberInterface[];
  updatedFunction: () => void;
}

export const RoleMembers: React.FC<Props> = memo((props) => {
  const { roleMembers } = props;
  const isRoleEveryone = props.role.id === null;

  const handleAdd = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      props.addFunction(props.role);
    },
    [props]
  );

  const editContent = useMemo(() => {
    if (isRoleEveryone) return null;
    return <SmallButton onClick={handleAdd} icon="add" text={Locale.label("common.add")} data-testid="add-role-member-button" ariaLabel="Add role member" />;
  }, [isRoleEveryone, handleAdd]);

  const handleRemove = useCallback(
    (roleMember: RoleMemberInterface) => {
      if (window.confirm(`${Locale.label("settings.roleMembers.confirmMsg")} ${props.role.name}?`)) {
        ApiHelper.delete("/rolemembers/" + roleMember.id, "MembershipApi").then(() => props.updatedFunction());
      }
    },
    [props.role.name, props.updatedFunction]
  );

  const canEdit = useMemo(() => UserHelper.checkAccess(Permissions.membershipApi.roles.edit), []);
  const canDelete = useMemo(() => (props.role.name === "Domain Admins" ? canEdit && roleMembers.length > 1 : canEdit), [props.role.name, canEdit, roleMembers.length]);

  const tableRows = useMemo(() => {
    const rows: JSX.Element[] = [];
    if (isRoleEveryone) {
      rows.push(
        <TableRow key="0">
          <TableCell>{Locale.label("settings.roleMembers.roleAppMsg")}</TableCell>
        </TableRow>
      );
      return rows;
    }

    for (let i = 0; i < roleMembers.length; i++) {
      const rm = roleMembers[i];
      const removeLink = canDelete ? (
        <SmallButton
          icon="delete"
          color="error"
          toolTip={Locale.label("common.delete")}
          onClick={() => {
            handleRemove(rm);
          }}
          data-testid={`remove-role-member-button-${rm.id}`}
          ariaLabel={`Remove role member ${rm.user?.firstName} ${rm.user?.lastName}`}
        />
      ) : null;
      const editLink = canEdit ? (
        <SmallButton
          icon="edit"
          toolTip={Locale.label("common.edit")}
          onClick={() => {
            props.setSelectedRoleMember(rm.userId);
          }}
          data-testid={`edit-role-member-button-${rm.id}`}
          ariaLabel={`Edit role member ${rm.user?.firstName} ${rm.user?.lastName}`}
        />
      ) : null;

      const { firstName, lastName } = rm.user;
      rows.push(
        <TableRow key={i}>
          <TableCell>{`${firstName} ${lastName}`}</TableCell>
          <TableCell>{rm.user.email}</TableCell>
          <TableCell>
            <Stack direction="row" spacing={1} justifyContent="end">
              {editLink}
              {removeLink}
            </Stack>
          </TableCell>
        </TableRow>
      );
    }
    return rows;
  }, [isRoleEveryone, roleMembers, canEdit, canDelete, handleRemove, props.setSelectedRoleMember]);

  const tableHeader = useMemo(() => {
    if (isRoleEveryone) return null;
    return (
      <TableRow>
        <TableCell>{Locale.label("common.name")}</TableCell>
        <TableCell>{Locale.label("person.email")}</TableCell>
        <TableCell></TableCell>
      </TableRow>
    );
  }, [isRoleEveryone]);

  const lastAdminWarning = useMemo(() => {
    if (props.role.name === "Domain Admins" && roleMembers.length === 1) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          At least one Domain Admin is required. Add another admin before removing this one.
        </Alert>
      );
    }
    return null;
  }, [props.role.name, roleMembers.length]);

  return (
    <DisplayBox id="roleMembersBox" headerText={Locale.label("settings.roleMembers.mem")} headerIcon="person" editContent={editContent} help="docs/b1-admin/settings/roles-permissions">
      <Table id="roleMemberTable">
        <TableHead>{tableHeader}</TableHead>
        <TableBody>{tableRows}</TableBody>
      </Table>
      {lastAdminWarning}
    </DisplayBox>
  );
});
