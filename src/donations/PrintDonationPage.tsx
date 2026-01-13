import { ArrayHelper, CurrencyHelper, DateHelper } from "@churchapps/apphelper";
import { type DonationInterface, type FundDonationInterface, type FundInterface, type PersonInterface } from "@churchapps/helpers";
import React, { useContext, useEffect, useMemo } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import UserContext from "../UserContext";

export const PrintDonationPage = () => {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const yearParam = searchParams.get("year");
  const currYear = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
  const context = useContext(UserContext);

  const person = useQuery<PersonInterface>({
    queryKey: ["/people/" + params.personId, "MembershipApi"],
    placeholderData: undefined,
  });

  const funds = useQuery<FundInterface[]>({
    queryKey: ["/funds", "GivingApi"],
    placeholderData: [],
  });

  const allDonations = useQuery<DonationInterface[]>({
    queryKey: ["/donations?personId=" + params.personId, "GivingApi"],
    placeholderData: [],
  });

  const allFundDonations = useQuery<FundDonationInterface[]>({
    queryKey: ["/fundDonations?personId=" + params.personId, "GivingApi"],
    placeholderData: [],
  });

  const donations = useMemo(() => {
    return (
      allDonations.data?.filter((don) => {
        const donationDate = new Date(don.donationDate.split("T")[0] + "T00:00:00");
        return donationDate.getFullYear() === currYear;
      }) || []
    );
  }, [allDonations.data, currYear]);

  const fundDonations = useMemo(() => {
    return allFundDonations.data?.filter((fundDonation) => donations.some((donation) => donation.id === fundDonation.donationId)) || [];
  }, [allFundDonations.data, donations]);

  useEffect(() => {
    if (person.data && funds.data && donations.length >= 0 && fundDonations.length >= 0) {
      setTimeout(() => {
        window.print();
        navigate(-1);
      }, 1500);
    }
  }, [person.data, funds.data, donations, fundDonations, navigate]);

  const getDate = () => {
    const date = DateHelper.prettyDate(new Date());
    const time = DateHelper.prettyTime(new Date());
    const dateTime = `${date} ${time}`;
    return dateTime;
  };

  const getTotalContributions = () => {
    let result = 0;
    fundDonations.forEach((d) => {
      const donation = ArrayHelper.getOne(donations, "id", d.donationId);
      if (donation) {
        result += d.amount;
      }
    });
    return CurrencyHelper.formatCurrency(result);
  };

  const getFundArray = () => {
    const result: any[] = [];
    fundDonations.forEach((fd) => {
      const fund = ArrayHelper.getOne(funds.data || [], "id", fd.fundId);
      const donation = ArrayHelper.getOne(donations, "id", fd.donationId);
      if (donation) {
        result.push({ fund: fund?.name, amount: fd.amount });
      }
    });
    return result;
  };

  const tableFundTotal = () => {
    const fundArray = getFundArray();
    const result: any[] = [];
    fundArray.forEach((fd) => {
      const existing = ArrayHelper.getOne(result, "fund", fd.fund);
      if (existing) {
        existing.total += fd.amount;
      } else {
        result.push({ fund: fd.fund, total: fd.amount });
      }
    });
    const tableValues: React.ReactElement[] = [];

    result.forEach((tv, index) => {
      tableValues.push(
        <tr key={index} className={index % 2 === 0 ? "table-row-even" : "table-row-odd"}>
          <td className="table-cell">{tv.fund}</td>
          <td className="table-cell align-right">{CurrencyHelper.formatCurrency(tv.total)}</td>
        </tr>
      );
    });
    return tableValues;
  };

  const tableDonations = () => {
    const result: React.ReactElement[] = [];
    fundDonations.forEach((fd, index) => {
      const donation = ArrayHelper.getOne(donations, "id", fd.donationId);
      const fund = ArrayHelper.getOne(funds.data || [], "id", fd.fundId);
      if (donation) {
        result.push(
          <tr key={index} className={index % 2 === 0 ? "table-row-even" : "table-row-odd"}>
            <td className="table-cell">
              {DateHelper.prettyDate(new Date(donation?.donationDate.split("T")[0] + "T00:00:00")).toString()}
            </td>
            <td className="table-cell">{donation?.method}</td>
            <td className="table-cell">{fund?.name}</td>
            <td className="table-cell align-right">{CurrencyHelper.formatCurrency(fd.amount)}</td>
          </tr>
        );
      }
    });
    return result;
  };

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
          }

          .print-container {
            margin: 0;
            padding: 40px 60px;
            height: 100%;
            width: 100%;
            background-color: white;
            font-family: Roboto, Helvetica, Arial, sans-serif;
            color: #333;
            box-sizing: border-box;
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
              <p className="info-name">{person.data?.name?.display}</p>
              {person.data?.contactInfo?.address1 && <p className="info-detail">{person.data?.contactInfo?.address1}</p>}
              {person.data?.contactInfo?.address2 && <p className="info-detail">{person.data?.contactInfo?.address2}</p>}
              {person.data?.contactInfo?.mobilePhone && <p className="info-detail">{person.data?.contactInfo?.mobilePhone}</p>}
              {person.data?.contactInfo?.email && <p className="info-detail">{person.data?.contactInfo?.email}</p>}
            </div>
          </div>

          <div className="info-column">
            <h2 className="section-label">Organization</h2>
            <div className="info-card">
              <p className="info-name">{context.userChurch?.church?.name}</p>
              {context.userChurch?.church?.address1 && <p className="info-detail">{context.userChurch?.church?.address1}</p>}
              {context.userChurch?.church?.address2 && <p className="info-detail">{context.userChurch?.church?.address2}</p>}
              {(context.userChurch?.church?.city || context.userChurch?.church?.country || context.userChurch?.church?.zip) && (
                <p className="info-detail">
                  {[context.userChurch?.church?.city, context.userChurch?.church?.country, context.userChurch?.church?.zip]
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
                <div className="total-amount">{getTotalContributions()}</div>
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
                <tbody>{tableFundTotal()}</tbody>
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
              {tableDonations()}
              <tr className="table-footer-row">
                <td colSpan={2} className="table-footer-cell"></td>
                <td className="table-footer-cell" style={{ textAlign: "right" }}>Total Contributions:</td>
                <td className="table-footer-cell" style={{ textAlign: "right" }}>{getTotalContributions()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="footer-note">
          <p>
            <strong>Note:</strong> This statement summarizes contributions made to {context.userChurch?.church?.name} during the calendar year {currYear}.
            Please retain this document for your tax records. For questions regarding this statement, please contact the church office.
          </p>
        </div>
      </div>
    </>
  );
};
