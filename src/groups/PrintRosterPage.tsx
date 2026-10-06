import React, { useContext, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, CircularProgress, Typography } from "@mui/material";
import { type ContactInfoInterface, type GroupInterface, type GroupMemberInterface } from "@churchapps/helpers";
import { ApiHelper, Locale, DateHelper } from "@churchapps/apphelper";
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

// Contact roster: leaders first, then by surname.
export const contactSort = (a: GroupMemberInterface, b: GroupMemberInterface) => Number(!!b.leader) - Number(!!a.leader) || sortKey(a).localeCompare(sortKey(b));

export const contactPhone = (ci?: ContactInfoInterface) => ci?.mobilePhone || ci?.homePhone || ci?.workPhone || "";

export const contactAddress = (ci?: ContactInfoInterface) => {
  const street = [ci?.address1, ci?.address2].filter(Boolean).join(" ");
  const region = [ci?.state, ci?.zip].filter(Boolean).join(" ");
  return [street, ci?.city, region].filter(Boolean).join(", ");
};

const formatSheetDate = (date: string | null): string => {
  if (!date) return "";
  const d = new Date(date + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(DateHelper.locale, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
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
    // Groups and their service times live in different modules, so match them here.
    const [groups, groupServiceTimes] = await Promise.all([
      ApiHelper.get("/groups", "MembershipApi") as Promise<GroupInterface[]>,
      ApiHelper.get("/groupservicetimes", "AttendanceApi") as Promise<GroupServiceTimeRow[]>
    ]);
    const groupIds = new Set((groupServiceTimes || []).filter((g) => g.serviceTimeId === serviceTimeId).map((g) => g.groupId));
    const matched = (groups || []).filter((g) => groupIds.has(g.id)).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return Promise.all(matched.map((g) => loadSheet(g, serviceTimeId)));
  }
  return [];
};

export const PrintRosterPage = () => {
  const context = useContext(UserContext);
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get("groupId");
  const serviceTimeId = searchParams.get("serviceTimeId");
  const autoprint = searchParams.get("autoprint") === "1";
  const contacts = searchParams.get("layout") === "contacts" && !!groupId;
  const sheetDate = formatSheetDate(searchParams.get("date") || (contacts ? DateHelper.formatHtml5Date(new Date()) : null));
  const hasPrinted = React.useRef(false);

  const sheets = useQuery<RosterSheet[]>({
    queryKey: ["print-roster", groupId, serviceTimeId, contacts],
    queryFn: () => loadSheets(groupId, serviceTimeId)
  });

  useEffect(() => {
    if (!autoprint || hasPrinted.current || sheets.isLoading || !sheets.data?.length) return;
    hasPrinted.current = true;
    const t = setTimeout(() => window.print(), 500);
    return () => clearTimeout(t);
  }, [autoprint, sheets.isLoading, sheets.data]);

  const churchName = context?.userChurch?.church?.name || "";
  const visitorRows = useMemo(() => Array.from({ length: Math.ceil(VISITOR_LINES / 2) }, (_, i) => i), []);

  // Two columns per row: read down the left column, then the right.
  const splitColumns = (members: GroupMemberInterface[]) => {
    const half = Math.ceil(members.length / 2);
    const left = members.slice(0, half);
    const right = members.slice(half);
    return left.map((gm, i) => [gm, right[i]] as const);
  };

  const boxCells = () => (
    <>
      <td className="roster-box-cell"><span className="roster-box" /></td>
      <td className="roster-box-cell"><span className="roster-box" /></td>
    </>
  );

  const headerCells = (split: boolean) => (
    <>
      <th className={split ? "roster-name-cell roster-split" : "roster-name-cell"}>{Locale.label("common.name")}</th>
      <th className="roster-box-cell">{Locale.label("groups.printRoster.present")}</th>
      <th className="roster-box-cell">{Locale.label("groups.printRoster.absent")}</th>
    </>
  );

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

          .roster-date {
            font-size: 18px;
            font-weight: 700;
            color: #1A2332;
            margin: 2px 0 6px;
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
            table-layout: fixed;
            font-size: 13px;
          }

          .roster-table .roster-split { border-left: 1.5px solid #9CA3AF; }

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

          .roster-name-cell { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

          .roster-box-cell { width: 0.6in; text-align: center; }

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

          .roster-contacts td { white-space: normal; overflow-wrap: break-word; vertical-align: top; }

          .roster-leader {
            display: inline-block;
            margin-left: 6px;
            padding: 0 5px;
            border: 1px solid #6B7280;
            border-radius: 3px;
            font-size: 9px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #374151;
            vertical-align: middle;
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
            <div className="roster-date" data-testid="roster-date">
              {Locale.label("groups.printRoster.date")}: {sheetDate || "________________________"}
            </div>
            {contacts ? (
              <>
                <div className="roster-meta">
                  <span>{Locale.label("groups.printRoster.contactRoster")}</span>
                </div>
                <table className="roster-table roster-contacts">
                  <colgroup>
                    <col style={{ width: "24%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "31%" }} />
                    <col style={{ width: "30%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>{Locale.label("common.name")}</th>
                      <th>{Locale.label("person.phone")}</th>
                      <th>{Locale.label("person.email")}</th>
                      <th>{Locale.label("person.address")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...sheet.members].sort(contactSort).map((gm) => {
                      const ci = gm.person?.optedOut ? undefined : gm.person?.contactInfo;
                      return (
                        <tr key={gm.id || gm.personId} data-testid="roster-contact-row">
                          <td data-testid="roster-member">
                            {gm.person?.name?.display}
                            {gm.leader && <> <span className="roster-leader">{Locale.label("groups.groupMembers.leader")}</span></>}
                          </td>
                          <td>{contactPhone(ci)}</td>
                          <td>{ci?.email || ""}</td>
                          <td>{contactAddress(ci)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            ) : (
              <>
                <div className="roster-meta">
                  <span>{sheet.serviceTimeName}</span>
                </div>

                <table className="roster-table">
                  <thead>
                    <tr>
                      {headerCells(false)}
                      {headerCells(true)}
                    </tr>
                  </thead>
                  <tbody>
                    {splitColumns(sheet.members).map(([left, right]) => (
                      <tr key={left.id || left.personId}>
                        <td className="roster-name-cell" data-testid="roster-member">{left.person?.name?.display}</td>
                        {boxCells()}
                        {right ? (
                          <>
                            <td className="roster-name-cell roster-split" data-testid="roster-member">{right.person?.name?.display}</td>
                            {boxCells()}
                          </>
                        ) : (
                          <td colSpan={3} className="roster-split"></td>
                        )}
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={6} className="roster-section">{Locale.label("groups.printRoster.visitors")}</td>
                    </tr>
                    {visitorRows.map((i) => (
                      <tr key={"visitor-" + i}>
                        <td></td>
                        {boxCells()}
                        <td className="roster-split"></td>
                        {boxCells()}
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="roster-notes">
                  <div>{Locale.label("groups.printRoster.teacherNotes")}</div>
                  <div className="roster-notes-line" />
                  <div className="roster-notes-line" />
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </>
  );
};
