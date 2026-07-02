import React, { useContext, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, CircularProgress, Typography } from "@mui/material";
import { type PersonInterface } from "@churchapps/helpers";
import { Locale, PersonHelper } from "@churchapps/apphelper";
import UserContext from "../UserContext";

interface DirectoryHousehold {
  key: string;
  sortName: string;
  letter: string;
  displayName: string;
  address1?: string;
  address2?: string;
  cityStateZip?: string;
  phone?: string;
  email?: string;
  members: PersonInterface[];
}

const EXCLUDED_STATUSES = new Set(["Inactive", "Visitor"]);

const ageFrom = (birthDate?: string): number => {
  if (!birthDate) return -1;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return -1;
  const ms = Date.now() - d.getTime();
  return ms / (365.25 * 24 * 60 * 60 * 1000);
};

const firstName = (p: PersonInterface) => p.name?.nick || p.name?.first || p.name?.display || "";

const buildHouseholds = (people: PersonInterface[]): DirectoryHousehold[] => {
  const groups = new Map<string, PersonInterface[]>();
  people.forEach((p) => {
    const key = p.householdId || `solo-${p.id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  });

  const households: DirectoryHousehold[] = [];
  groups.forEach((members, key) => {
    const sorted = [...members].sort((a, b) => ageFrom(b.birthDate) - ageFrom(a.birthDate));
    const primary = sorted[0];
    const lastName = (primary.name?.last || primary.name?.display?.split(" ").pop() || "").trim();

    let displayName: string;
    if (members.length === 1) {
      displayName = primary.name?.display || `${firstName(primary)} ${lastName}`.trim();
    } else if (members.length === 2 && lastName) {
      displayName = `${firstName(sorted[0])} & ${firstName(sorted[1])} ${lastName}`;
    } else if (lastName) {
      displayName = `The ${lastName} Family`;
    } else {
      displayName = primary.name?.display || "";
    }

    const addressSource = members.find((m) => m.contactInfo?.address1) || primary;
    const ci = addressSource.contactInfo || {};
    const cityStateZip = [ci.city, ci.state].filter(Boolean).join(", ") + (ci.zip ? ` ${ci.zip}` : "");

    const phoneSource = members.find((m) => m.contactInfo?.homePhone || m.contactInfo?.mobilePhone);
    const phone = phoneSource?.contactInfo?.homePhone || phoneSource?.contactInfo?.mobilePhone;
    const emailSource = members.find((m) => m.contactInfo?.email);

    const letter = (lastName[0] || displayName[0] || "#").toUpperCase();

    households.push({
      key,
      sortName: (lastName || displayName).toLowerCase(),
      letter,
      displayName,
      address1: ci.address1,
      address2: ci.address2,
      cityStateZip: cityStateZip.trim() || undefined,
      phone,
      email: emailSource?.contactInfo?.email,
      members: sorted
    });
  });

  return households.sort((a, b) => a.sortName.localeCompare(b.sortName));
};

const formatDate = (date?: string): string => {
  if (!date) return "";
  const d = new Date(date.toString().split("T")[0] + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
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

  const people = useQuery<PersonInterface[]>({
    queryKey: ["/people", "MembershipApi"],
    placeholderData: []
  });

  const households = useMemo(() => {
    if (!people.data) return [];
    const eligible = people.data.filter((p) => !p.optedOut && !EXCLUDED_STATUSES.has(p.membershipStatus || ""));
    return buildHouseholds(eligible);
  }, [people.data]);

  useEffect(() => {
    if (!people.isLoading && households.length > 0) {
      const t = setTimeout(() => {
        window.print();
        navigate("/people");
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [people.isLoading, households.length, navigate]);

  if (people.isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" flexDirection="column" gap={2}>
        <CircularProgress />
        <Typography>{Locale.label("people.peoplePage.loading")}</Typography>
      </Box>
    );
  }

  const church = context.userChurch?.church;
  const churchLocation = church
    ? [church.city, church.state].filter(Boolean).join(", ")
    : "";
  const year = new Date().getFullYear();
  const printedOn = new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });

  let currentLetter = "";

  return (
    <>
      <style>
        {`
          @media print {
            @page { margin: 0.5in; size: letter; }
            body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .household-card { break-inside: avoid; page-break-inside: avoid; }
            .section-band { break-inside: avoid; page-break-inside: avoid; break-after: avoid-page; page-break-after: avoid; }
            .directory-cover { break-after: page; page-break-after: always; }
          }

          .directory-root {
            font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
            color: #1F2937;
            background: #FFF;
            padding: 0;
          }

          /* ---------- Cover page ---------- */
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

          /* ---------- Sections + grid ---------- */
          .directory-body {
            padding: 0 0.25in;
          }

          .section-band {
            grid-column: 1 / -1;
            display: flex;
            align-items: center;
            gap: 16px;
            margin: 24px 0 12px 0;
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
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 28px 32px;
            padding: 8px 0 16px 0;
          }

          /* ---------- Household card ---------- */
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

      <div className="directory-root">
        {/* Cover page */}
        <div className="directory-cover">
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

        {/* Directory body */}
        <div className="directory-body">
          <div className="household-grid">
            {households.map((h) => {
              const showSection = h.letter !== currentLetter;
              if (showSection) currentLetter = h.letter;
              const birthdays = memberBirthdays(h.members);
              const anniversaries = memberAnniversaries(h.members);

              return (
                <React.Fragment key={h.key}>
                  {showSection && (
                    <div className="section-band">
                      <div className="section-letter">{h.letter}</div>
                      <div className="section-rule" />
                    </div>
                  )}
                  <div className="household-card">
                    <h3 className="household-name">{h.displayName}</h3>
                    <div className="household-underline" />

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
                          <div className="member-photo-name">{firstName(m)}</div>
                        </div>
                      ))}
                    </div>

                    <div className="household-details">
                      {(h.address1 || h.cityStateZip) && (
                        <>
                          <div className="detail-label">Home</div>
                          <div className="detail-value">
                            {h.address1}
                            {h.address2 ? <>, {h.address2}</> : null}
                            {h.cityStateZip ? <><br />{h.cityStateZip}</> : null}
                          </div>
                        </>
                      )}
                      {h.phone && (
                        <>
                          <div className="detail-label">Phone</div>
                          <div className="detail-value">{h.phone}</div>
                        </>
                      )}
                      {h.email && (
                        <>
                          <div className="detail-label">Email</div>
                          <div className="detail-value">{h.email}</div>
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
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};
