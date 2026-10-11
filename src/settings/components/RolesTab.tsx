import { Roles, RoleEdit } from "./";
import { type ChurchInterface } from "@churchapps/apphelper";

interface Props {
  church: ChurchInterface | null;
  selectedRoleId: string;
  onSelectRole: (id: string) => void;
}

export const RolesTab = ({ church, selectedRoleId, onSelectRole }: Props) => (
  <>
    {selectedRoleId !== "notset" && <RoleEdit key="roleEdit" roleId={selectedRoleId} updatedFunction={() => onSelectRole("notset")} />}
    {church && <Roles selectRoleId={onSelectRole} selectedRoleId={selectedRoleId} church={church} />}
  </>
);
