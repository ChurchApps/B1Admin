import React from "react";
import "./omarchy.css";

export type PlatedSlice = "live" | "archive" | "edit";

interface Props {
  identity: React.ReactNode;
  live: React.ReactNode;
  archive?: React.ReactNode;
  edit?: React.ReactNode;
  slice?: PlatedSlice;
}

export const PlatedRecord: React.FC<Props> = ({ identity, live, archive, edit, slice = "live" }) => {
  const right = slice === "archive" ? archive : slice === "edit" ? edit : live;

  return (
    <div className="om-record">
      <section className="om-record-identity">{identity}</section>
      <section className="om-record-slice">{right}</section>
    </div>
  );
};
