import type { ReactNode } from "react";

interface Props {
  title?: string;
  count?: number;
  muted?: string;
  backLabel: string;
  onBack: () => void;
  children: ReactNode;
  composer?: ReactNode;
}

export const NoteThread = (props: Props) => (
  <>
    <button className="back" type="button" onClick={props.onBack}>{props.backLabel}</button>
    <div className="ledger-head">
      <div>
        <h3 style={{ marginTop: 8 }}>{props.title || "Notes"}</h3>
        {props.count !== undefined && <div className="big">{props.count}</div>}
        <p className="muted">{props.muted || "Newest first · long notes stay on the page"}</p>
      </div>
    </div>
    <div className="thread">{props.children}</div>
    {props.composer}
  </>
);
