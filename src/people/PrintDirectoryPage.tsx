import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, Checkbox, CircularProgress, FormControlLabel, Typography } from "@mui/material";
import { type HouseholdInterface, type PersonInterface } from "@churchapps/helpers";
import { Locale, PersonHelper, DateHelper, SmallButton } from "@churchapps/apphelper";
import UserContext from "../UserContext";
import { PrintChurchHeader, usePrintLogo } from "../components/PrintChurchHeader";
import { buildHouseholds, firstName, memberLabel } from "./buildHouseholds";

const EXCLUDED_STATUSES = new Set(["Inactive", "Visitor", "Deceased"]);

const readSearchIds = (): Set<string> => {
  try {
    const ids = JSON.parse(localStorage.getItem("printDirectoryPersonIds") || "[]");
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
};

type DirectoryOptions = { photos: boolean; address: boolean; phone: boolean; email: boolean; birthdays: boolean; anniversaries: boolean };

const DEFAULT_OPTIONS: DirectoryOptions = { photos: true, address: true, phone: true, email: true, birthdays: true, anniversaries: true };

const OPTION_KEYS = Object.keys(DEFAULT_OPTIONS) as (keyof DirectoryOptions)[];

const readOptions = (): DirectoryOptions => {
  try {
    const saved = JSON.parse(localStorage.getItem("printDirectoryOptions") || "{}");
    return { ...DEFAULT_OPTIONS, ...(saved && typeof saved === "object" ? saved : {}) };
  } catch {
    return DEFAULT_OPTIONS;
  }
};

const formatDate = (date?: string): string => {
  if (!date) return "";
  const d = new Date(date.toString().split("T")[0] + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(DateHelper.locale, { month: "short", day: "numeric" });
};

const memberBirthdays = (members: PersonInterface[]) => {
  const parts = members
    .map((m) => ({ name: firstName(m), date: formatDate(m.birthDate) }))
    .filter((x) => x.date)
    .map((x) => `${x.name} ${x.date}`);
  return parts.join("  ·  ");
};

const memberAnniversaries = (members: PersonInterface[]) => {
  const seen = new Set<string>();
  const parts: string[] = [];
  members.forEach((m) => {
    const d = formatDate(m.anniversary);
    if (d && !seen.has(d)) {
      seen.add(d);
      parts.push(d);
    }
  });
  return parts.join("  ·  ");
};

export const PrintDirectoryPage = () => {
  const navigate = useNavigate();
  const context = useContext(UserContext);
  const printLogo = usePrintLogo(context?.userChurch?.church?.id);
  const [searchParams] = useSearchParams();
  const searchIds = useMemo(() => (searchParams.get("scope") === "search" ? readSearchIds() : null), [searchParams]);
  const [options, setOptions] = useState<DirectoryOptions>(readOptions);

  const toggle = (key: keyof DirectoryOptions) => {
    const updated = { ...options, [key]: !options[key] };
    setOptions(updated);
    try {
      localStorage.setItem("printDirectoryOptions", JSON.stringify(updated));
    } catch {
      // Storage unavailable (private mode); the choice still applies to this print.
    }
  };

  const people = useQuery<PersonInterface[]>({
    queryKey: ["/people", "MembershipApi"],
    placeholderData: []
  });

  const householdRecords = useQuery<HouseholdInterface[]>({
    queryKey: ["/households", "MembershipApi"],
    placeholderData: []
  });

  const householdNameById = useMemo(() => {
    const map = new Map<string, string>();
    (householdRecords.data || []).forEach((h) => {
      if (h.id && h.name?.trim()) map.set(h.id, h.name.trim());
    });
    return map;
  }, [householdRecords.data]);

  const households = useMemo(() => {
    if (!people.data) return [];
    // A search print keeps whoever the user searched for, regardless of membership status.
    const eligible = searchIds
      ? people.data.filter((p) => !p.optedOut && !!p.id && searchIds.has(p.id))
      : people.data.filter((p) => !p.optedOut && !EXCLUDED_STATUSES.has(p.membershipStatus || ""));
    return buildHouseholds(eligible, householdNameById);
  }, [people.data, householdNameById, searchIds]);

  const isLoading = people.isLoading || householdRecords.isLoading;

  useEffect(() => {
    const handleAfterPrint = () => navigate("/people");
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, [navigate]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" flexDirection="column" gap={2}>
        <CircularProgress />
        <Typography>{Locale.label("people.peoplePage.loading")}</Typography>
      </Box>
    );
  }

  const church = context?.userChurch?.church;
  const churchLocation = church
    ? [church.city, church.state].filter(Boolean).join(", ")
    : "";
  const year = new Date().getFullYear();
  const printedOn = new Date().toLocaleDateString(DateHelper.locale, { month: "long", day: "numeric", year: "numeric" });

  // Group each letter's households into two-card rows. Browsers ignore break-inside: avoid on items of a grid that
  // runs across pages, so each row is its own block and is kept whole on a printed page.
  const sections: { letter: string; rows: (typeof households)[] }[] = [];
  households.forEach((h) => {
    let section = sections[sections.length - 1];
    if (!section || section.letter !== h.letter) {
      section = { letter: h.letter, rows: [] };
      sections.push(section);
    }
    const row = section.rows[section.rows.length - 1];
    if (row && row.length < 2) row.push(h);
    else section.rows.push([h]);
  });

  return (
    <>
      <style>
        {`
          @media print {
            @page { margin: 0.5in; size: letter; }
            body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .print-toolbar { display: none !important; }
            .household-row, .household-card { break-inside: avoid; page-break-inside: avoid; }
            .section-band { break-inside: avoid; page-break-inside: avoid; break-after: avoid-page; page-break-after: avoid; }
            .directory-cover { break-after: page; page-break-after: always; }
          }

          .directory-root {
            font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
            color: #1F2937;
            background: #FFF;
            padding: 0;
          }

          .directory-cover {
            min-height: 9.5in;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            padding: 0 1in;
            position: relative;
          }

          .cover-eyebrow {
            font-size: 11px;
            letter-spacing: 0.32em;
            text-transform: uppercase;
            color: #6B7280;
            margin-bottom: 24px;
          }

          .cover-church-name {
            font-family: Georgia, "Times New Roman", serif;
            font-size: 44px;
            font-weight: 400;
            color: #1A2332;
            margin: 0;
            line-height: 1.15;
            letter-spacing: -0.5px;
          }

          .cover-ornament {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin: 32px 0;
            color: #B8860B;
          }
          .cover-ornament .rule {
            width: 80px;
            height: 1px;
            background: #B8860B;
          }
          .cover-ornament .dot {
            width: 6px;
            height: 6px;
            background: #B8860B;
            transform: rotate(45deg);
          }

          .cover-title {
            font-family: Georgia, "Times New Roman", serif;
            font-style: italic;
            font-size: 26px;
            font-weight: 400;
            color: #374151;
            margin: 0 0 12px 0;
          }

          .cover-year {
            font-family: Georgia, "Times New Roman", serif;
            font-size: 64px;
            font-weight: 400;
            color: #1A2332;
            letter-spacing: 4px;
            margin: 16px 0 0 0;
          }

          .cover-location {
            font-size: 13px;
            color: #6B7280;
            margin-top: 48px;
            letter-spacing: 0.08em;
          }

          .cover-footer {
            position: absolute;
            bottom: 0.5in;
            left: 0;
            right: 0;
            font-size: 10px;
            color: #9CA3AF;
            letter-spacing: 0.15em;
            text-transform: uppercase;
          }

          .directory-body {
            padding: 0 0.25in;
          }

          .section-band {
            display: flex;
            align-items: center;
            gap: 16px;
            margin: 52px 0 40px 0;
          }
          .section-band:first-child {
            margin-top: 0;
          }
          .section-letter {
            font-family: Georgia, "Times New Roman", serif;
            font-size: 28px;
            font-weight: 400;
            color: #1A2332;
            line-height: 1;
            min-width: 36px;
          }
          .section-rule {
            flex: 1;
            height: 1px;
            background: linear-gradient(90deg, #1A2332 0%, #1A2332 24px, #E5E7EB 24px, #E5E7EB 100%);
          }

          .household-grid {
            padding: 8px 0 16px 0;
          }

          .household-row {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            column-gap: 32px;
            margin-bottom: 28px;
          }

          .household-card {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .household-name {
            font-family: Georgia, "Times New Roman", serif;
            font-size: 17px;
            font-weight: 400;
            color: #1A2332;
            margin: 0;
            line-height: 1.2;
          }

          .household-underline {
            width: 32px;
            height: 1px;
            background: #B8860B;
            margin: 0;
          }

          .household-members {
            font-size: 11px;
            color: #374151;
            line-height: 1.4;
          }

          .member-photos {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin: 4px 0;
          }

          .member-photo-block {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 64px;
          }

          .member-photo {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            object-fit: cover;
            background: #F3F4F6;
            border: 1px solid #E5E7EB;
            display: block;
          }

          .member-photo-name {
            font-size: 10px;
            color: #4B5563;
            margin-top: 4px;
            text-align: center;
            line-height: 1.2;
            max-width: 64px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .household-details {
            display: grid;
            grid-template-columns: 64px 1fr;
            row-gap: 3px;
            column-gap: 8px;
            font-size: 11px;
            line-height: 1.45;
            color: #374151;
          }

          .detail-label {
            text-transform: uppercase;
            letter-spacing: 0.08em;
            font-size: 9px;
            color: #9CA3AF;
            padding-top: 2px;
          }

          .detail-value {
            color: #1F2937;
          }

          .detail-value strong {
            font-weight: 600;
            color: #1A2332;
          }
        `}
      </style>

      <Box className="print-toolbar" sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2, px: 2, py: 1, borderBottom: 1, borderColor: "divider" }}>
        <Typography variant="body2">{Locale.label("people.printDirectory.include")}</Typography>
        {OPTION_KEYS.map((key) => (
          <FormControlLabel
            key={key}
            label={Locale.label("people.printDirectory." + key)}
            control={<Checkbox size="small" checked={options[key]} onChange={() => toggle(key)} inputProps={{ "data-testid": `print-directory-option-${key}` } as React.InputHTMLAttributes<HTMLInputElement>} />}
          />
        ))}
        <Box sx={{ display: "flex", gap: 1, ml: "auto" }}>
          <SmallButton icon="print" text={Locale.label("common.print")} ariaLabel={Locale.label("common.print")} onClick={() => window.print()} data-testid="print-directory-print-button" />
          <SmallButton icon="close" text={Locale.label("common.close")} ariaLabel={Locale.label("common.close")} onClick={() => navigate("/people")} />
        </Box>
      </Box>
      <div className="directory-root">
        <div className="directory-cover">
          <PrintChurchHeader churchName={church?.name || ""} logoUrl={printLogo.logoUrl} style={{ maxHeight: 120, maxWidth: 360, margin: "0 auto 32px" }} />
          <div className="cover-eyebrow">Established Community</div>
          <h1 className="cover-church-name">{church?.name || "Our Church"}</h1>
          <div className="cover-ornament">
            <span className="rule" />
            <span className="dot" />
            <span className="rule" />
          </div>
          <p className="cover-title">Member Directory</p>
          <div className="cover-year">{year}</div>
          {churchLocation && <div className="cover-location">{churchLocation.toUpperCase()}</div>}
          <div className="cover-footer">Printed {printedOn} · {households.length} Households</div>
        </div>

        <div className="directory-body">
          <div className="household-grid">
            {sections.map((section) => (
              <React.Fragment key={section.letter}>
                <div className="section-band">
                  <div className="section-letter">{section.letter}</div>
                  <div className="section-rule" />
                </div>
                {section.rows.map((row) => (
                  <div className="household-row" key={row[0].key}>
                    {row.map((h) => {
                      const birthdays = options.birthdays ? memberBirthdays(h.members) : "";
                      const anniversaries = options.anniversaries ? memberAnniversaries(h.members) : "";
                      // Without photos there are no captions, so name the members unless the title already does.
                      const names = options.photos ? [] : h.members.map((m) => memberLabel(m, h.surname)).filter(Boolean);
                      const showNames = names.length > 0 && !names.every((n) => h.displayName.includes(n));

                      return (
                        <div className="household-card" key={h.key}>
                          <h3 className="household-name">{h.displayName}</h3>
                          <div className="household-underline" />

                          {showNames && (
                            <div className="household-members" data-testid="print-directory-members">
                              {names.length > 1 ? `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}` : names[0]}
                            </div>
                          )}

                          {options.photos && (
                            <div className="member-photos">
                              {h.members.map((m) => (
                                <div key={m.id} className="member-photo-block">
                                  <img
                                    className="member-photo"
                                    src={PersonHelper.getPhotoUrl(m)}
                                    alt=""
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.src = "/images/sample-profile.png";
                                    }}
                                  />
                                  <div className="member-photo-name">{memberLabel(m, h.surname)}</div>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="household-details">
                            {options.address && (h.address1 || h.cityStateZip) && (
                              <>
                                <div className="detail-label">Home</div>
                                <div className="detail-value">
                                  {h.address1}
                                  {h.address2 ? <>, {h.address2}</> : null}
                                  {h.cityStateZip ? <><br />{h.cityStateZip}</> : null}
                                </div>
                              </>
                            )}
                            {options.phone && h.phones.length > 0 && (
                              <>
                                <div className="detail-label">Phone</div>
                                <div className="detail-value">
                                  {h.phones.map((line) => (
                                    <div key={line.value} data-testid="print-directory-phone-line">{line.name ? `${line.name}: ${line.value}` : line.value}</div>
                                  ))}
                                </div>
                              </>
                            )}
                            {options.email && h.emails.length > 0 && (
                              <>
                                <div className="detail-label">Email</div>
                                <div className="detail-value">
                                  {h.emails.map((line) => (
                                    <div key={line.value} data-testid="print-directory-email-line">{line.name ? `${line.name}: ${line.value}` : line.value}</div>
                                  ))}
                                </div>
                              </>
                            )}
                            {birthdays && (
                              <>
                                <div className="detail-label">Birthdays</div>
                                <div className="detail-value">{birthdays}</div>
                              </>
                            )}
                            {anniversaries && (
                              <>
                                <div className="detail-label">Anniversary</div>
                                <div className="detail-value">{anniversaries}</div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
