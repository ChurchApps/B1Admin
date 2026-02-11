import React, { memo, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { DisplayBox, UserHelper, ApiHelper, Permissions, type ChurchInterface, type RoleInterface, type RolePermissionInterface, Locale } from "@churchapps/apphelper";
import { Divider, Icon, IconButton, Menu, MenuItem, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import { SmallButton } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";

interface Props {
  selectRoleId: (id: string) => void;
  selectedRoleId: string;
  church: ChurchInterface | null;
}

export const Roles = memo(({ selectRoleId, selectedRoleId, church }: Props) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  const roles = useQuery<RoleInterface[]>({
    queryKey: [`/roles/church/${church?.id}`, "MembershipApi"],
    enabled: !!church?.id && selectedRoleId === "notset",
    placeholderData: []
  });

  const handleClick = useCallback((e: React.MouseEvent) => {
    setAnchorEl(e.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const predefined = useMemo(
    () => [
      {
        name: Locale.label("settings.roles.acc"),
        description: Locale.label("settings.roles.accDesc"),
        permissions: [
          Permissions.membershipApi.people.view,
          Permissions.membershipApi.people.edit,
          Permissions.givingApi.donations.edit,
          Permissions.givingApi.donations.view,
          Permissions.givingApi.donations.viewSummary,
          Permissions.givingApi.settings.edit
        ]
      },
      {
        name: Locale.label("settings.roles.churchStaff"),
        description: Locale.label("settings.roles.canEdit") + "B1.church," + Locale.label("settings.roles.churchDesc"),
        permissions: [
          Permissions.membershipApi.people.view,
          Permissions.membershipApi.people.edit,
          Permissions.membershipApi.groups.edit,
          Permissions.membershipApi.groupMembers.view,
          Permissions.membershipApi.groupMembers.edit,
          Permissions.membershipApi.forms.edit,
          Permissions.membershipApi.forms.admin,
          Permissions.attendanceApi.attendance.edit,
          Permissions.attendanceApi.attendance.view,
          Permissions.attendanceApi.services.edit
        ]
      },
      {
        name: Locale.label("settings.roles.contAdmin"),
        description: Locale.label("settings.roles.contAdminDesc"),
        permissions: [Permissions.contentApi.chat.host, Permissions.contentApi.content.edit, Permissions.contentApi.streamingServices.edit]
      },
      {
        name: Locale.label("settings.roles.lesAdmin"),
        description: Locale.label("settings.roles.lesAdminDesc") + "Lessons.church.",
        permissions: [{ api: "LessonsApi", contentType: "Schedules", permission: "Edit" }]
      }
    ],
    []
  );

  const addRole = useCallback(
    async (role: any) => {
      handleClose();
      if (window.confirm(Locale.label("settings.roles.roleCreate") + role.name + Locale.label("settings.roles.itMsg") + role.description.toLowerCase())) {
        const rolesData = await ApiHelper.post("/roles", [{ name: role.name }], "MembershipApi");
        const r = rolesData[0];
        const perms: RolePermissionInterface[] = [];
        role.permissions.forEach((p: any) => {
          perms.push({
            roleId: r.id,
            apiName: p.api,
            contentType: p.contentType,
            action: p.action
          });
        });
        await ApiHelper.post("/rolepermissions/", perms, "MembershipApi");
        roles.refetch();
      }
    },
    [handleClose, roles]
  );

  const handleAddCustomRole = useCallback(() => {
    handleClose();
    selectRoleId("");
  }, [handleClose, selectRoleId]);

  const editContent = useMemo(() => {
    if (!UserHelper.checkAccess(Permissions.membershipApi.roles.edit)) return null;

    return (
      <>
        <IconButton
          aria-label="addButton"
          id="addBtnGroup"
          data-cy="add-button"
          aria-controls={open ? "add-menu" : undefined}
          aria-expanded={open ? "true" : undefined}
          aria-haspopup="true"
          onClick={handleClick}
          data-testid="add-role-button">
          <Icon color="primary">add</Icon>
        </IconButton>
        <Menu id="add-menu" MenuListProps={{ "aria-labelledby": "addBtnGroup" }} anchorEl={anchorEl} open={open} onClose={handleClose}>
          <MenuItem data-cy="add-campus" onClick={handleAddCustomRole} data-testid="add-custom-role-menu-item" aria-label="Add custom role">
            <Icon sx={{ mr: "3px" }}>lock</Icon> {Locale.label("settings.roles.custAdd")}
          </MenuItem>
          <Divider />
          {predefined.map((role) => (
            <MenuItem
              key={role.name}
              onClick={() => {
                addRole(role);
              }}
              title={role.description}
              data-testid={`add-predefined-role-${role.name.toLowerCase().replace(/\s+/g, "-")}`}
              aria-label={`Add ${role.name} role`}>
              <Icon sx={{ mr: "3px" }}>lock</Icon> {Locale.label("common.add")} "<strong>{role.name}</strong>" {Locale.label("settings.roles.role")}
            </MenuItem>
          ))}
        </Menu>
      </>
    );
  }, [open, anchorEl, handleClick, handleClose, handleAddCustomRole, predefined, addRole]);

  const sortedRoles = useMemo(() => [...(roles.data || [])].sort((a, b) => (a.name > b.name ? 1 : -1)), [roles.data]);

  const canEdit = useMemo(
    () => UserHelper.checkAccess(Permissions.membershipApi.roles.edit) && UserHelper.checkAccess(Permissions.membershipApi.roles.edit) && UserHelper.checkAccess(Permissions.membershipApi.people.view),
    []
  );

  const rows = useMemo(() => {
    const result: JSX.Element[] = [];

    if (UserHelper.checkAccess(Permissions.membershipApi.roles.edit)) {
      result.push(
        <TableRow key="everyone">
          <TableCell>
            <i className="groups" /> <Link to={`/settings/role/everyone`}>({Locale.label("settings.roles.everyone")})</Link>
          </TableCell>
          <TableCell></TableCell>
        </TableRow>
      );
    }

    sortedRoles.forEach((role) => {
      const editLink = canEdit ? (
        <SmallButton
          icon="edit"
          toolTip={Locale.label("common.edit")}
          onClick={() => {
            selectRoleId(role.id);
          }}
          data-testid="edit-role-button"
          ariaLabel="Edit role"
        />
      ) : null;
      result.push(
        <TableRow key={role.id}>
          <TableCell>
            <i className="lock" /> <Link to={`/settings/role/${role.id}`}>{role.name}</Link>
          </TableCell>
          <TableCell align="right">{editLink}</TableCell>
        </TableRow>
      );
    });

    return result;
  }, [sortedRoles, canEdit, selectRoleId]);

  return (
    <DisplayBox id="rolesBox" headerText={Locale.label("settings.roles.roles")} headerIcon="lock" editContent={editContent} help="b1Admin/assigning-roles">
      <Table id="roleMemberTable">
        <TableHead>
          <TableRow>
            <TableCell>{Locale.label("common.name")}</TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>{rows}</TableBody>
      </Table>
    </DisplayBox>
  );
});
