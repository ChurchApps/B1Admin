import React, { useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Box, Link, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { Check as CheckIcon, CheckCircle as CheckCircleIcon, RadioButtonUnchecked as EmptyCircleIcon } from "@mui/icons-material";
import { type AttendanceRecordInterface, type DonationInterface, type GroupInterface, type GroupMemberInterface, type MessageInterface, type PersonInterface } from "@churchapps/helpers";
import { ArrayHelper, ConversationStore, CurrencyHelper, DateHelper, Loading, Locale, UniqueIdHelper, filterVisibleMessages } from "@churchapps/apphelper";
import { RecordHeading, TextAction, VerbRow, numericCellSx, tableScrollSx } from "../../components/ui";
import { type PersonFormOption } from "./PersonForms";

const WEEKS = 13;

const toDay = (value?: string | Date | null) => {
  if (!value) return null;
  const key = typeof value === "string" ? value.split("T")[0] : DateHelper.formatHtml5Date(value);
  const d = new Date(key + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
};

const pretty = (d: Date) => DateHelper.prettyDate(d);

const ViewAll = ({ label, onClick, testId }: { label: string; onClick: () => void; testId?: string }) => (
  <TextAction small onClick={onClick} data-testid={testId}>{label}</TextAction>
);

const LoadError = ({ what, onRetry }: { what: string; onRetry: () => void }) => (
  <VerbRow>
    <span>{Locale.label("people.personRecord.loadError", "We couldn't load {what}.").replace("{what}", what)}</span>
    <TextAction small onClick={onRetry}>{Locale.label("common.tryAgain")}</TextAction>
  </VerbRow>
);

const Section = ({ id, title, children, testId }: { id: string; title: string; children: React.ReactNode; testId?: string }) => (
  <Box component="section" aria-labelledby={id} data-testid={testId}>
    <RecordHeading id={id} label={title} />
    {children}
  </Box>
);

const Muted = ({ children }: { children: React.ReactNode }) => <Typography variant="body1" color="text.secondary">{children}</Typography>;

const plainTableSx = { "& .MuiTableCell-root": { pl: 0, pr: 2 }, "& .MuiTableCell-root:last-of-type": { pr: 0 } } as const;

interface AttendanceProps {
  personId: string;
  onViewAll: () => void;
  onPrint: () => void;
}

export const PersonAttendanceSummary: React.FC<AttendanceProps> = ({ personId, onViewAll, onPrint }) => {
  const records = useQuery<AttendanceRecordInterface[]>({
    queryKey: ["/attendancerecords?personId=" + personId, "AttendanceApi"],
    enabled: !UniqueIdHelper.isMissing(personId)
  });
  const groups = useQuery<GroupInterface[]>({ queryKey: ["/groups", "MembershipApi"], placeholderData: [] });
  const title = Locale.label("people.personNavigation.attendance");

  const summary = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentWeek = new Date(today);
    currentWeek.setDate(today.getDate() - today.getDay());
    const weeks = Array.from({ length: WEEKS }, (_, i) => {
      const start = new Date(currentWeek);
      start.setDate(currentWeek.getDate() - (WEEKS - 1 - i) * 7);
      return start;
    });
    const dated = (records.data || [])
      .map((r) => ({ r, day: toDay(r.visitDate) }))
      .filter((x): x is { r: AttendanceRecordInterface; day: Date } => !!x.day)
      .sort((a, b) => b.day.getTime() - a.day.getTime());
    const present = weeks.map((start) => {
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      return dated.some((x) => x.day >= start && x.day < end);
    });
    return { weeks, present, dated, count: present.filter(Boolean).length };
  }, [records.data]);

  const allVerb = <ViewAll label={Locale.label("people.personRecord.allYears", "All years")} onClick={onViewAll} testId="person-attendance-all" />;
  const printVerb = <ViewAll label={Locale.label("common.print")} onClick={onPrint} testId="person-attendance-print" />;

  const body = () => {
    if (records.isLoading) return <Loading size="sm" />;
    if (records.isError) return <LoadError what={title.toLowerCase()} onRetry={() => records.refetch()} />;
    if (summary.dated.length === 0) {
      return (
        <Stack spacing={1}>
          <Muted>{Locale.label("people.personRecord.noAttendance", "No attendance recorded yet.")}</Muted>
          <VerbRow>{allVerb}</VerbRow>
        </Stack>
      );
    }

    const recent = summary.dated.slice(0, 3);
    const thisWeek = summary.weeks[WEEKS - 1];
    const here = summary.dated.filter((x) => x.day >= thisWeek);
    const where = [...new Set(here.map(({ r }) => ArrayHelper.getOne(groups.data || [], "id", r.groupId)?.name || r.service?.name || "").filter(Boolean))];
    return (
      <Stack spacing={1.5}>
        <Typography variant="body1">
          {here.length > 0
            ? Locale.label("people.personRecord.hereThisWeek", "Here this week") + (where.length ? ` · ${where.join(", ")}` : "")
            : Locale.label("people.personRecord.lastAttended", "Last attended {date}").replace("{date}", pretty(summary.dated[0].day))}
        </Typography>
        <Box component="ul" aria-label={Locale.label("people.personRecord.weeklyAttendance", "Weekly attendance")} sx={{ display: "flex", flexWrap: "wrap", gap: { xs: 0.5, sm: 0.75 }, listStyle: "none", m: 0, p: 0 }}>
          {summary.weeks.map((start, i) => {
            const label = (summary.present[i]
              ? Locale.label("people.personRecord.weekAttended", "Week of {date}: attended")
              : Locale.label("people.personRecord.weekNoRecord", "Week of {date}: no attendance recorded")).replace("{date}", pretty(start));
            return (
              <Box
                component="li"
                key={start.getTime()}
                aria-label={label}
                title={label}
                sx={{
                  width: { xs: 18, sm: 20 },
                  height: { xs: 18, sm: 20 },
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  ...(summary.present[i]
                    ? { bgcolor: "primary.main", color: "primary.contrastText" }
                    : { bgcolor: "var(--b1-neutral-bg)" }),
                  ...(i === WEEKS - 1 ? { outline: "1px solid", outlineColor: "var(--b1-control-border)", outlineOffset: 1 } : {})
                }}>
                {summary.present[i] && <CheckIcon aria-hidden sx={{ fontSize: 14 }} />}
              </Box>
            );
          })}
        </Box>
        <VerbRow>
          <span>{Locale.label("people.personRecord.attendanceSummary", "{count} of the last {weeks} weeks").replace("{count}", String(summary.count)).replace("{weeks}", String(WEEKS))}</span>
          {allVerb}
          {printVerb}
        </VerbRow>
        <Box sx={tableScrollSx} role="region" aria-label={Locale.label("people.personRecord.recentAttendance", "Recent attendance")} tabIndex={0}>
          <Table size="small" sx={plainTableSx}>
            <TableHead>
              <TableRow>
                <TableCell>{Locale.label("donation.page.date")}</TableCell>
                <TableCell>{Locale.label("people.personRecord.service", "Service")}</TableCell>
                <TableCell align="right">{Locale.label("people.personRecord.where", "Where")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recent.map(({ r, day }, i) => {
                const group = ArrayHelper.getOne(groups.data || [], "id", r.groupId);
                const service = [r.service?.name, r.serviceTime?.name].filter(Boolean).join(" · ");
                return (
                  <TableRow key={r.id || i}>
                    <TableCell>{pretty(day)}</TableCell>
                    <TableCell>{service || "—"}</TableCell>
                    <TableCell align="right">{group ? <Link component={RouterLink} to={"/groups/" + group.id}>{group.name}</Link> : "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      </Stack>
    );
  };

  return <Section id="person-attendance-heading" title={title} testId="person-attendance-section">{body()}</Section>;
};

interface GivingProps {
  personId: string;
  householdMembers?: PersonInterface[] | null;
  onViewAll: () => void;
  onLogGift?: () => void;
}

export const PersonGivingSummary: React.FC<GivingProps> = ({ personId, householdMembers, onViewAll, onLogGift }) => {
  const [currency, setCurrency] = React.useState("usd");
  React.useEffect(() => { CurrencyHelper.loadCurrency().then(setCurrency); }, []);
  // Giving follows the household: the summary covers every member, "All giving" is this person's ledger.
  const donors = useMemo(() => {
    const list = (householdMembers || []).filter((m) => m.id);
    return list.some((m) => m.id === personId) ? list : [{ id: personId } as PersonInterface];
  }, [householdMembers, personId]);
  const results = useQueries({ queries: donors.map((m) => ({ queryKey: ["/donations?personId=" + m.id, "GivingApi"], enabled: !UniqueIdHelper.isMissing(m.id) })) });
  const isLoading = results.some((r) => r.isLoading);
  const isError = results.some((r) => r.isError);
  const year = new Date().getFullYear();
  const title = Locale.label("people.personNavigation.donations");
  const household = donors.length > 1;

  const { yearRows, total, lastGift } = (() => {
    const dated = results.flatMap((r) => (r.data as DonationInterface[] | undefined) || [])
      .map((d) => ({ d, day: toDay(d.donationDate) }))
      .filter((x): x is { d: DonationInterface; day: Date } => !!x.day)
      .sort((a, b) => b.day.getTime() - a.day.getTime());
    const rows = dated.filter((x) => x.day.getFullYear() === year);
    return { yearRows: rows, total: rows.reduce((sum, x) => sum + (x.d.fund?.amount ?? x.d.amount ?? 0), 0), lastGift: dated[0]?.day };
  })();

  const giverName = (id?: string) => donors.find((m) => m.id === id)?.name?.display || "";
  const showGiver = household && new Set(yearRows.map((x) => x.d.personId)).size > 1;
  const refetch = () => results.forEach((r) => r.refetch());

  const money = (n: number) => CurrencyHelper.formatCurrencyWithLocale(n, currency);
  const allVerb = <ViewAll label={Locale.label("people.personRecord.allYears", "All years")} onClick={onViewAll} testId="person-giving-all" />;
  const logVerb = onLogGift ? <ViewAll label={Locale.label("donations.logGift.title", "Log a gift")} onClick={onLogGift} testId="person-log-gift" /> : null;
  const householdNote = household ? " · " + Locale.label("people.personRecord.wholeHousehold", "whole household") : "";

  const body = () => {
    if (isLoading) return <Loading size="sm" />;
    if (isError) return <LoadError what={title.toLowerCase()} onRetry={refetch} />;
    if (yearRows.length === 0) {
      return (
        <Stack spacing={1}>
          <Muted>
            {(household
              ? Locale.label("people.personRecord.noHouseholdGiftsYear", "No household gifts recorded in {year}.")
              : Locale.label("people.personRecord.noGiftsYear", "No gifts recorded in {year}.")).replace("{year}", String(year))}
            {lastGift && " " + Locale.label("people.personRecord.lastGift", "Last gift {date}.").replace("{date}", pretty(lastGift))}
          </Muted>
          <VerbRow>{logVerb}{allVerb}</VerbRow>
        </Stack>
      );
    }
    const shown = yearRows.slice(0, 5);
    return (
      <Stack spacing={1.5}>
        <Typography variant="body1" color="text.secondary">
          <Box component="span" sx={{ color: "text.primary", fontVariantNumeric: "tabular-nums" }}>{money(total)}</Box>
          {" " + Locale.label("people.personRecord.givingYear", "in {year} · {count} gifts").replace("{year}", String(year)).replace("{count}", String(yearRows.length))}
          {householdNote}
          {yearRows.length > shown.length && " · " + Locale.label("people.personRecord.showingLatest", "showing latest {count}").replace("{count}", String(shown.length))}
        </Typography>
        <Box sx={tableScrollSx} role="region" aria-label={Locale.label("people.personRecord.recentGifts", "Gifts in {year}").replace("{year}", String(year))} tabIndex={0}>
          <Table size="small" sx={plainTableSx}>
            <TableHead>
              <TableRow>
                <TableCell>{Locale.label("donation.page.date")}</TableCell>
                <TableCell>{Locale.label("donation.page.fund")}</TableCell>
                {showGiver && <TableCell>{Locale.label("people.personRecord.givenBy", "Given by")}</TableCell>}
                <TableCell sx={numericCellSx}>{Locale.label("donation.page.amount")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {shown.map(({ d, day }, i) => (
                <TableRow key={(d.id || "") + i}>
                  <TableCell>{pretty(day)}</TableCell>
                  <TableCell>{d.fund?.name || "—"}</TableCell>
                  {showGiver && <TableCell>{giverName(d.personId)}</TableCell>}
                  <TableCell sx={numericCellSx}>{money(d.fund?.amount ?? d.amount ?? 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
        <VerbRow>
          {logVerb}
          {allVerb}
          <TextAction small component={RouterLink} to={`/donations/print/${personId}?year=${year}`}>
            {Locale.label("people.personRecord.statement", "{year} statement").replace("{year}", String(year))}
          </TextAction>
        </VerbRow>
      </Stack>
    );
  };

  return <Section id="person-giving-heading" title={title} testId="person-giving-section">{body()}</Section>;
};

export const PersonGroupsSummary: React.FC<{ personId: string }> = ({ personId }) => {
  const groupMembers = useQuery<GroupMemberInterface[]>({
    queryKey: ["/groupmembers?personId=" + personId, "MembershipApi"],
    enabled: !UniqueIdHelper.isMissing(personId)
  });
  const title = Locale.label("people.personNavigation.groups");

  const body = () => {
    if (groupMembers.isLoading) return <Loading size="sm" />;
    if (groupMembers.isError) return <LoadError what={title.toLowerCase()} onRetry={() => groupMembers.refetch()} />;
    const list = groupMembers.data || [];
    if (list.length === 0) return <Muted>{Locale.label("people.groups.notMemMsg")}</Muted>;
    return (
      <Box component="ul" sx={{ display: "flex", flexWrap: "wrap", gap: 1, listStyle: "none", m: 0, p: 0 }}>
        {list.map((gm) => (
          <li key={gm.id}>
            <Link
              component={RouterLink}
              to={`/groups/${gm.groupId}`}
              underline="none"
              sx={{ display: "inline-flex", alignItems: "baseline", gap: 0.75, border: 1, borderColor: "var(--b1-border)", borderRadius: "var(--b1-radius-pill)", px: 2, py: 0.75, color: "text.primary", fontWeight: 600, typography: "body2", "&:hover": { borderColor: "primary.main", bgcolor: "var(--b1-hover)" } }}>
              {gm.group?.name || Locale.label("people.groups.unknownGroup")}
              {(gm.group?.categoryName || gm.leader) && (
                <Box component="span" sx={{ color: "text.secondary", fontWeight: 400 }}>
                  {[gm.group?.categoryName, gm.leader ? Locale.label("people.groups.leader") : ""].filter(Boolean).join(" · ")}
                </Box>
              )}
            </Link>
          </li>
        ))}
      </Box>
    );
  };

  return <Section id="person-groups-heading" title={title} testId="person-groups-section">{body()}</Section>;
};

interface NotesProps {
  conversationId: string;
  onViewAll: () => void;
}

export const PersonNotesSummary: React.FC<NotesProps> = ({ conversationId, onViewAll }) => {
  const [messages, setMessages] = React.useState<MessageInterface[] | null>(null);

  React.useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    ConversationStore.loadByConversationId(conversationId)
      .catch((): null => null)
      .then(() => {
        if (cancelled) return;
        unsubscribe = ConversationStore.subscribe(conversationId, (conv: { messages?: MessageInterface[] } | undefined) => setMessages(conv?.messages ?? []));
      });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [conversationId]);

  const visible = useMemo(() => filterVisibleMessages(messages || []) as MessageInterface[], [messages]);
  const latest = useMemo(
    () => [...visible].sort((a, b) => new Date(b.timeSent || 0).getTime() - new Date(a.timeSent || 0).getTime())[0],
    [visible]
  );
  const allVerb = <ViewAll label={Locale.label("people.personRecord.allNotes", "All notes")} onClick={onViewAll} testId="person-notes-all" />;

  const body = () => {
    if (messages === null) return <Loading size="sm" />;
    if (!latest) {
      return (
        <Stack spacing={1}>
          <Muted>{Locale.label("people.personRecord.noNotes", "No notes yet.")}</Muted>
          <VerbRow>{allVerb}</VerbRow>
        </Stack>
      );
    }
    const by = [latest.timeSent ? DateHelper.prettyDate(new Date(latest.timeSent)) : "", latest.displayName || latest.person?.name?.display || ""].filter(Boolean).join(" · ");
    return (
      <Stack spacing={1}>
        <Typography variant="body2" color="text.secondary">{by}</Typography>
        <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {latest.content}
        </Typography>
        <VerbRow>
          <span>{Locale.label("people.personRecord.noteCount", "{count} notes").replace("{count}", String(visible.length))}</span>
          {allVerb}
        </VerbRow>
      </Stack>
    );
  };

  return <Section id="person-notes-heading" title={Locale.label("people.personNavigation.notes")} testId="person-notes-section">{body()}</Section>;
};

interface FormsProps {
  person: PersonInterface;
  forms: PersonFormOption[];
  onOpen: (formId?: string) => void;
}

export const PersonFormsSummary: React.FC<FormsProps> = ({ person, forms, onOpen }) => {
  const submitted = useMemo(() => new Set((person.formSubmissions || []).map((fs) => fs.formId)), [person.formSubmissions]);
  return (
    <Section id="person-forms-heading" title={Locale.label("people.personNavigation.forms")} testId="person-forms-section">
      <Stack spacing={1.5}>
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
          {forms.map((form) => {
            const done = submitted.has(form.id);
            return (
              <Stack component="li" key={form.id} direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ py: 1, borderBottom: 1, borderColor: "divider" }}>
                <TextAction onClick={() => onOpen(form.id)}>{form.name || Locale.label("people.personForm.form", "Form")}</TextAction>
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: done ? "success.main" : "text.secondary", flexShrink: 0 }}>
                  {done ? <CheckCircleIcon aria-hidden sx={{ fontSize: 18 }} /> : <EmptyCircleIcon aria-hidden sx={{ fontSize: 18 }} />}
                  <Typography variant="body2">{done ? Locale.label("people.personRecord.submitted", "Submitted") : Locale.label("people.personRecord.notSubmitted", "Not submitted")}</Typography>
                </Stack>
              </Stack>
            );
          })}
        </Box>
        <VerbRow><ViewAll label={Locale.label("people.personRecord.allForms", "All forms")} onClick={() => onOpen()} testId="person-forms-all" /></VerbRow>
      </Stack>
    </Section>
  );
};
