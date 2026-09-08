import type { ReactNode } from "react";

export interface YearLedgerYear {
  y: number;
  n: number;
  t?: string;
}

interface Props {
  title: string;
  years: YearLedgerYear[];
  year: number;
  onYear: (y: number) => void;
  big: string | number;
  muted?: string;
  backLabel: string;
  onBack: () => void;
  actions?: ReactNode;
  children: ReactNode;
}

export const YearLedger = (props: Props) => (
  <>
    <button className="back" type="button" onClick={props.onBack}>{props.backLabel}</button>
    <div className="ledger-head">
      <div>
        <h3 style={{ marginTop: 8 }}>{props.title}</h3>
        {props.big !== "" && props.big !== undefined && <div className="big">{props.big}</div>}
        {props.muted && <p className="muted">{props.muted}</p>}
      </div>
      {props.actions}
    </div>
    {props.years.length > 0 && (
      <div className="years">
        {props.years.map((r) => (
          <button key={r.y} type="button" className={r.y === props.year ? "on" : ""} onClick={() => props.onYear(r.y)}>
            {r.y}
          </button>
        ))}
      </div>
    )}
    {props.children}
  </>
);
