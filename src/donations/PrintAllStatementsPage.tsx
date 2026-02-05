import { ArrayHelper, CurrencyHelper, DateHelper } from "@churchapps/apphelper";
import { type DonationInterface, type FundDonationInterface, type FundInterface, type PersonInterface } from "@churchapps/helpers";
import React, { useContext, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import UserContext from "../UserContext";
import { Box, CircularProgress, Typography } from "@mui/material";

export const PrintAllStatementsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const yearParam = searchParams.get("year");
  const currYear = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
  const context = useContext(UserContext);

  // Fetch all donations
  const allDonations = useQuery<DonationInterface[]>({
    queryKey: ["/donations", "GivingApi"],
    placeholderData: [],
  });

  // Fetch all fund donations
  const allFundDonations = useQuery<FundDonationInterface[]>({
    queryKey: ["/fundDonations", "GivingApi"],
    placeholderData: [],
  });

  // Fetch all funds
  const funds = useQuery<FundInterface[]>({
    queryKey: ["/funds", "GivingApi"],
    placeholderData: [],
  });

  // Filter donations by selected year
  const yearDonations = useMemo(() => {
    return (
      allDonations.data?.filter((don) => {
        if (!don.donationDate) return false;
        const donationDate = new Date(don.donationDate.toString().split("T")[0] + "T00:00:00");
        return donationDate.getFullYear() === currYear;
      }) || []
    );
  }, [allDonations.data, currYear]);

  // Get unique person IDs from donations
  const personIds = useMemo(() => {
    const ids = new Set<string>();
    yearDonations.forEach((donation) => {
      if (donation.personId) {
        ids.add(donation.personId);
      }
    });
    return Array.from(ids).sort();
  }, [yearDonations]);

  // Fetch all people who made donations
  const people = useQuery<PersonInterface[]>({
    queryKey: ["/people/ids?ids=" + personIds.join(","), "MembershipApi"],
    placeholderData: [],
    enabled: personIds.length > 0,
  });

  // Filter fund donations for selected year
  const yearFundDonations = useMemo(() => {
    return allFundDonations.data?.filter((fundDonation) =>
      yearDonations.some((donation) => donation.id === fundDonation.donationId)
    ) || [];
  }, [allFundDonations.data, yearDonations]);

  const isLoading = allDonations.isLoading || allFundDonations.isLoading || funds.isLoading || (personIds.length > 0 && people.isLoading);

  useEffect(() => {
    if (!isLoading && people.data && people.data.length > 0) {
      setTimeout(() => {
        window.print();
        navigate(-1);
      }, 1500);
    }
  }, [isLoading, people.data, navigate]);

  const getDate = () => {
    const date = DateHelper.prettyDate(new Date());
    const time = DateHelper.prettyTime(new Date());
    return `${date} ${time}`;
  };

  const getTotalContributions = (personId: string) => {
    let result = 0;
    yearFundDonations.forEach((fd) => {
      const donation = yearDonations.find((d) => d.id === fd.donationId && d.personId === personId);
      if (donation) {
        result += fd.amount || 0;
      }
    });
    return result;
  };

  const getFundTotals = (personId: string) => {
    const result: any[] = [];
    const personDonations = yearDonations.filter((d) => d.personId === personId);

    yearFundDonations.forEach((fd) => {
      const donation = personDonations.find((d) => d.id === fd.donationId);
      if (donation) {
        const fund = funds.data?.find((f) => f.id === fd.fundId);
        const existing = result.find((r) => r.fund === fund?.name);
        if (existing) {
          existing.total += fd.amount || 0;
        } else {
          result.push({ fund: fund?.name, total: fd.amount || 0 });
        }
      }
    });

    return result;
  };

  const getDonationDetails = (personId: string) => {
    const result: any[] = [];
    const personDonations = yearDonations.filter((d) => d.personId === personId);

    yearFundDonations.forEach((fd) => {
      const donation = personDonations.find((d) => d.id === fd.donationId);
      if (donation) {
        const fund = funds.data?.find((f) => f.id === fd.fundId);
        result.push({
          date: donation.donationDate,
          method: donation.method,
          fund: fund?.name,
          amount: fd.amount || 0,
        });
      }
    });

    return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" flexDirection="column" gap={2}>
        <CircularProgress />
        <Typography>Loading statements...</Typography>
      </Box>
    );
  }

  return (
    <>
      <style>
        {`
          @media print {
            @page {
              margin: 0;
              size: auto;
            }
            body {
              margin: 0;
            }
            .page-break {
              page-break-after: always;
              break-after: page;
            }
          }

          .print-container {
            margin: 0;
            padding: 40px 60px;
            background-color: white;
            font-family: Roboto, Helvetica, Arial, sans-serif;
            color: #333;
            box-sizing: border-box;
          }

          .page-break {
            page-break-after: always;
            break-after: page;
          }

          .header-bar {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 8px;
            background: linear-gradient(90deg, #1976D2 0%, #1565C0 100%);
          }

          .title-section {
            margin-bottom: 32px;
            text-align: center;
          }

          .page-title {
            font-size: 32px;
            font-weight: 500;
            margin: 0 0 8px 0;
            color: #1976D2;
            letter-spacing: -0.5px;
          }

          .subtitle {
            font-size: 14px;
            color: #666;
            margin: 4px 0;
          }

          .meta-text {
            font-size: 13px;
            color: #999;
            margin: 4px 0;
          }

          .gradient-divider {
            height: 1px;
            background: linear-gradient(90deg, transparent 0%, #1976D2 20%, #1976D2 80%, transparent 100%);
            margin: 24px 0 32px 0;
          }

          .info-section {
            display: flex;
            gap: 40px;
            margin-bottom: 40px;
          }

          .info-column {
            flex: 1;
            min-width: 0;
          }

          .section-label {
            font-size: 14px;
            font-weight: 600;
            color: #1976D2;
            margin: 0 0 12px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .info-card {
            padding: 16px;
            background-color: #F8F9FA;
            border-radius: 4px;
            border-left: 3px solid #1976D2;
          }

          .info-name {
            font-size: 16px;
            font-weight: 600;
            margin: 0 0 8px 0;
            color: #333;
          }

          .info-detail {
            font-size: 13px;
            margin: 4px 0;
            color: #666;
          }

          .section-container {
            margin-bottom: 40px;
          }

          .section-title {
            font-size: 20px;
            font-weight: 500;
            color: #1976D2;
            margin: 0 0 20px 0;
            padding-bottom: 8px;
            border-bottom: 2px solid #E3F2FD;
          }

          .summary-grid {
            display: flex;
            gap: 32px;
          }

          .summary-column {
            flex: 1;
          }

          .total-box {
            padding: 24px;
            text-align: center;
            border: 2px solid #1976D2;
            border-radius: 8px;
            background-color: #F8F9FA;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          }

          .total-amount {
            font-size: 36px;
            font-weight: 600;
            color: #1976D2;
            letter-spacing: -1px;
          }

          .data-table {
            width: 100%;
            border-collapse: collapse;
            background-color: white;
            border-radius: 4px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }

          .table-header {
            background-color: #1976D2;
          }

          .table-header th {
            padding: 12px;
            text-align: left;
            font-size: 12px;
            font-weight: 600;
            color: white;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .table-header th.align-right {
            text-align: right;
          }

          .table-row-even {
            background-color: white;
          }

          .table-row-odd {
            background-color: #F8F9FA;
          }

          .table-cell {
            padding: 12px;
            font-size: 13px;
            color: #333;
            border-bottom: 1px solid #E0E0E0;
          }

          .table-cell.align-right {
            text-align: right;
            font-weight: 500;
          }

          .table-footer-row {
            background-color: #E3F2FD;
          }

          .table-footer-cell {
            padding: 12px;
            font-size: 14px;
            font-weight: 600;
            color: #1976D2;
          }

          .footer-note {
            margin-top: 40px;
            padding: 16px;
            background-color: #F8F9FA;
            border-radius: 4px;
            font-size: 12px;
            color: #666;
            line-height: 1.6;
          }

          .footer-note p {
            margin: 0;
          }
        `}
      </style>

      {people.data?.map((person, index) => {
        const totalContributions = getTotalContributions(person.id!);
        const fundTotals = getFundTotals(person.id!);
        const donationDetails = getDonationDetails(person.id!);

        return (
          <div key={person.id} className={index < people.data!.length - 1 ? "page-break" : ""}>
            <div className="print-container">
              <div className="header-bar"></div>

              <div className="title-section">
                <h1 className="page-title">{currYear} Annual Giving Statement</h1>
                <p className="subtitle">Period: January 1 - December 31, {currYear}</p>
                <p className="meta-text">Issued: {getDate()}</p>
              </div>

              <div className="gradient-divider"></div>

              <div className="info-section">
                <div className="info-column">
                  <h2 className="section-label">Donor Information</h2>
                  <div className="info-card">
                    <p className="info-name">{person.name?.display}</p>
                    {person.contactInfo?.address1 && <p className="info-detail">{person.contactInfo.address1}</p>}
                    {person.contactInfo?.address2 && <p className="info-detail">{person.contactInfo.address2}</p>}
                    {person.contactInfo?.mobilePhone && <p className="info-detail">{person.contactInfo.mobilePhone}</p>}
                    {person.contactInfo?.email && <p className="info-detail">{person.contactInfo.email}</p>}
                  </div>
                </div>

                <div className="info-column">
                  <h2 className="section-label">Organization</h2>
                  <div className="info-card">
                    <p className="info-name">{context.userChurch?.church?.name}</p>
                    {context.userChurch?.church?.address1 && <p className="info-detail">{context.userChurch.church.address1}</p>}
                    {context.userChurch?.church?.address2 && <p className="info-detail">{context.userChurch.church.address2}</p>}
                    {(context.userChurch?.church?.city || context.userChurch?.church?.country || context.userChurch?.church?.zip) && (
                      <p className="info-detail">
                        {[context.userChurch.church.city, context.userChurch.church.country, context.userChurch.church.zip]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="section-container">
                <h2 className="section-title">Statement Summary</h2>
                <div className="summary-grid">
                  <div className="summary-column">
                    <p className="section-label">Total Contributions</p>
                    <div className="total-box">
                      <div className="total-amount">{CurrencyHelper.formatCurrency(totalContributions)}</div>
                    </div>
                  </div>

                  <div className="summary-column">
                    <p className="section-label">Fund Breakdown</p>
                    <table className="data-table">
                      <thead className="table-header">
                        <tr>
                          <th>Fund</th>
                          <th className="align-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fundTotals.map((ft, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? "table-row-even" : "table-row-odd"}>
                            <td className="table-cell">{ft.fund}</td>
                            <td className="table-cell align-right">{CurrencyHelper.formatCurrency(ft.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="section-container">
                <h2 className="section-title">Contribution Details</h2>
                <table className="data-table">
                  <thead className="table-header">
                    <tr>
                      <th>Date</th>
                      <th>Method</th>
                      <th>Fund</th>
                      <th className="align-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donationDetails.map((detail, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? "table-row-even" : "table-row-odd"}>
                        <td className="table-cell">
                          {DateHelper.prettyDate(new Date(detail.date.split("T")[0] + "T00:00:00")).toString()}
                        </td>
                        <td className="table-cell">{detail.method}</td>
                        <td className="table-cell">{detail.fund}</td>
                        <td className="table-cell align-right">{CurrencyHelper.formatCurrency(detail.amount)}</td>
                      </tr>
                    ))}
                    <tr className="table-footer-row">
                      <td colSpan={2} className="table-footer-cell"></td>
                      <td className="table-footer-cell" style={{ textAlign: "right" }}>Total Contributions:</td>
                      <td className="table-footer-cell" style={{ textAlign: "right" }}>{CurrencyHelper.formatCurrency(totalContributions)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="footer-note">
                <p>
                  <strong>Note:</strong> This statement summarizes contributions made to {context.userChurch?.church?.name} during the calendar year {currYear}.
                  Please retain this document for your tax records. For questions regarding this statement, please contact the church office.
                </p>
                <p style={{ fontSize: "10px", marginTop: "4px" }}>
                  No goods or services were provided by {context.userChurch?.church?.name} for this donation. {context.userChurch?.church?.name} is a non-profit organization.
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};
