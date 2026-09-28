import React, { useContext, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, CircularProgress, Typography } from "@mui/material";
import { type GroupInterface, type GroupMemberInterface } from "@churchapps/helpers";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import UserContext from "../UserContext";

interface GroupServiceTimeRow { groupId?: string; serviceTimeId?: string; serviceTimeName?: string }

interface RosterSheet {
  group: GroupInterface;
  serviceTimeName: string;
  members: GroupMemberInterface[];
}

const VISITOR_LINES = 5;

// Group member payloads only carry name.display, so fall back to its last word for the surname.
const sortKey = (gm: GroupMemberInterface) => {
  const name = gm.person?.name;
  const display = (name?.display || "").trim();
  const last = name?.last || display.split(" ").pop() || "";
  return `${last.toLowerCase()}|${(name?.first || display).toLowerCase()}`;
};

const formatSheetDate = (date: string | null): string => {
  if (!date) return "";
  const d = new Date(date + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
};

const loadSheet = async (group: GroupInterface, serviceTimeId: string | null): Promise<RosterSheet> => {
  const [members, groupServiceTimes] = await Promise.all([
    ApiHelper.get("/groupmembers?groupId=" + group.id, "MembershipApi") as Promise<GroupMemberInterface[]>,
    ApiHelper.get("/groupservicetimes?groupId=" + group.id, "AttendanceApi") as Promise<GroupServiceTimeRow[]>
  ]);
  const gsts = groupServiceTimes || [];
  const match = (serviceTimeId && gsts.find((g) => g.serviceTimeId === serviceTimeId)) || gsts[0];
  return {
    group,
    serviceTimeName: match?.serviceTimeName || "",
    members: [...(members || [])].sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
  };
};

const loadSheets = async (groupId: string | null, serviceTimeId: string | null): Promise<RosterSheet[]> => {
  if (groupId) {
    const group: GroupInterface = await ApiHelper.get("/groups/" + groupId, "MembershipApi");
    return group?.id ? [await loadSheet(group, serviceTimeId)] : [];
  }
  if (serviceTimeId) {
    const groups: GroupInterface[] = await ApiHelper.get("/groups/search?campusId=0&serviceId=0&serviceTimeId=" + serviceTimeId, "MembershipApi");
    return Promise.all((groups || []).map((g) => loadSheet(g, serviceTimeId)));
  }
  return [];
};

export const PrintRosterPage = () => {
  const context = useContext(UserContext);
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get("groupId");
  const serviceTimeId = searchParams.get("serviceTimeId");
  const autoprint = searchParams.get("autoprint") === "1";
  const sheetDate = formatSheetDate(searchParams.get("date"));
  const hasPrinted = React.useRef(false);

  const sheets = useQuery<RosterSheet[]>({
    queryKey: ["print-roster", groupId, serviceTimeId],
    queryFn: () => loadSheets(groupId, serviceTimeId)
  });

  useEffect(() => {
    if (!autoprint || hasPrinted.current || sheets.isLoading || !sheets.data?.length) return;
    hasPrinted.current = true;
    const t = setTimeout(() => window.print(), 500);
    return () => clearTimeout(t);
  }, [autoprint, sheets.isLoading, sheets.data]);

  const churchName = context?.userChurch?.church?.name || "";
  const visitorLines = useMemo(() => Array.from({ length: VISITOR_LINES }, (_, i) => i), []);

  if (sheets.isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" flexDirection="column" gap={2}>
        <CircularProgress />
        <Typography>{Locale.label("common.loading")}</Typography>
      </Box>
    );
  }

  if (!sheets.data?.length) {
    return (
      <Box p={4}>
        <Typography>{Locale.label("groups.printRoster.noGroups")}</Typography>
      </Box>
    );
  }

  return (
    <>
      <style>
        {`
          @media print {
            @page { margin: 0.5in; size: letter; }
            body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .roster-sheet { break-after: page; page-break-after: always; }
            .roster-sheet:last-child { break-after: auto; page-break-after: auto; }
            .roster-table tr { break-inside: avoid; page-break-inside: avoid; }
          }

          .roster-root {
            font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
            color: #1F2937;
            background: #FFF;
          }

          .roster-sheet {
            max-width: 7.5in;
            margin: 0 auto;
            padding: 0.25in 0;
          }

          .roster-church {
            font-size: 11px;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            color: #6B7280;
          }

          .roster-title {
            font-family: Georgia, "Times New Roman", serif;
            font-size: 26px;
            font-weight: 400;
            color: #1A2332;
            margin: 4px 0;
          }

          .roster-meta {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            font-size: 13px;
            color: #374151;
            border-bottom: 2px solid #1A2332;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }

          .roster-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          }

          .roster-table th {
            text-align: left;
            font-size: 10px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #6B7280;
            border-bottom: 1px solid #9CA3AF;
            padding: 4px 6px;
          }

          .roster-table td {
            border-bottom: 1px solid #E5E7EB;
            padding: 7px 6px;
            height: 18px;
          }

          .roster-box-cell { width: 70px; text-align: center; }

          .roster-box {
            display: inline-block;
            width: 14px;
            height: 14px;
            border: 1.5px solid #374151;
            border-radius: 2px;
          }

          .roster-section {
            font-size: 11px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #6B7280;
            padding-top: 14px !important;
          }

          .roster-notes {
            margin-top: 24px;
            font-size: 13px;
          }

          .roster-notes-line {
            border-bottom: 1px solid #9CA3AF;
            height: 28px;
          }
        `}
      </style>

      <div className="roster-root" data-testid="print-roster">
        {sheets.data.map((sheet) => (
          <div className="roster-sheet" key={sheet.group.id} data-testid="roster-sheet">
            {churchName && <div className="roster-church">{churchName}</div>}
            <h1 className="roster-title">{sheet.group.name}</h1>
            <div className="roster-meta">
              <span>{sheet.serviceTimeName}</span>
              <span data-testid="roster-date">
                {Locale.label("groups.printRoster.date")}: {sheetDate || "________________________"}
              </span>
            </div>

            <table className="roster-table">
              <thead>
                <tr>
                  <th>{Locale.label("common.name")}</th>
                  <th className="roster-box-cell">{Locale.label("groups.printRoster.present")}</th>
                  <th className="roster-box-cell">{Locale.label("groups.printRoster.absent")}</th>
                </tr>
              </thead>
              <tbody>
                {sheet.members.map((gm) => (
                  <tr key={gm.id || gm.personId}>
                    <td data-testid="roster-member">{gm.person?.name?.display}</td>
                    <td className="roster-box-cell"><span className="roster-box" /></td>
                    <td className="roster-box-cell"><span className="roster-box" /></td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3} className="roster-section">{Locale.label("groups.printRoster.visitors")}</td>
                </tr>
                {visitorLines.map((i) => (
                  <tr key={"visitor-" + i}>
                    <td></td>
                    <td className="roster-box-cell"><span className="roster-box" /></td>
                    <td className="roster-box-cell"><span className="roster-box" /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="roster-notes">
              <div>{Locale.label("groups.printRoster.teacherNotes")}</div>
              <div className="roster-notes-line" />
              <div className="roster-notes-line" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
