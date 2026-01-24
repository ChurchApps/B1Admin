import React from "react";
import { Loading } from "@churchapps/apphelper";

interface Props {
  rows: React.ReactElement[];
  isLoading?: boolean;
}

export const TableList: React.FC<Props> = ({ rows, isLoading = false }) => {
  if (isLoading) return <Loading />;
  return (
    <table className="table" style={{ width: "100%" }}>
      <tbody>{rows}</tbody>
    </table>
  );
};
