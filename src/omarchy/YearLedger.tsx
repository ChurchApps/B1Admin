import React from "react";
import "./omarchy.css";

export interface YearMeta {
  year: number;
  count?: number;
  total?: React.ReactNode;
}

export interface LedgerRow {
  id: string;
  cells: React.ReactNode[];
}

interface Props {
  title: string;
  years: YearMeta[];
  selectedYear: number;
  onYearChange: (year: number) => void;
  headline?: React.ReactNode;
  summary?: React.ReactNode;
  columns: string[];
  rows: LedgerRow[];
  empty?: React.ReactNode;
  actions?: React.ReactNode;
  back?: React.ReactNode;
}

export const YearLedger: React.FC<Props> = ({
  title,
  years,
  selectedYear,
  onYearChange,
  headline,
  summary,
  columns,
  rows,
  empty,
  actions,
  back
}) => {
  const meta = years.find((y) => y.year === selectedYear);
  const displayHeadline = headline ?? meta?.total ?? meta?.count ?? "";

  return (
    <div>
      {back}
      <div className="om-ledger-head">
        <div>
          <h3 style={{ marginTop: back ? 8 : 0 }}>{title}</h3>
          {displayHeadline !== "" && displayHeadline !== undefined && <div className="om-big">{displayHeadline}</div>}
          {summary && <p className="om-quiet" style={{ margin: "6px 0 0" }}>{summary}</p>}
        </div>
        {actions}
      </div>
      {years.length > 0 && (
        <div className="om-years">
          {years.map((y) => (
            <button
              key={y.year}
              type="button"
              className={y.year === selectedYear ? "on" : ""}
              onClick={() => onYearChange(y.year)}
            >
              {y.year}
            </button>
          ))}
        </div>
      )}
      <table className="om-plain">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0
            ? (
              <tr>
                <td colSpan={Math.max(columns.length, 1)}>{empty ?? `Nothing in ${selectedYear}.`}</td>
              </tr>
            )
            : rows.map((row) => (
              <tr key={row.id}>
                {row.cells.map((cell, i) => (
                  <td key={i}>{cell}</td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
};
