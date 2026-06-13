import { useState, useCallback } from "react";
import { Roles, RoleEdit } from "./";
import { type ChurchInterface } from "@churchapps/apphelper";

interface Props {
  church: ChurchInterface | null;
}

export const RolesTab = (props: Props) => {
  const [selectedRoleId, setSelectedRoleId] = useState<string>("notset");

  const handleRoleUpdated = useCallback(() => {
    setSelectedRoleId("notset");
  }, []);

  const getSidebar = () => {
    const modules: JSX.Element[] = [];
    if (selectedRoleId !== "notset") {
      modules.push(<RoleEdit key="roleEdit" roleId={selectedRoleId} updatedFunction={handleRoleUpdated} />);
    }
    return modules;
  };

  return (
    <>
      {getSidebar()}
      {props.church && <Roles selectRoleId={setSelectedRoleId} selectedRoleId={selectedRoleId} church={props.church} />}
    </>
  );
};
