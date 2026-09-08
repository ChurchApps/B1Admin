import type { ReactNode } from "react";

interface Props {
  who: ReactNode;
  rest: ReactNode;
}

export const PlatedRecord = (props: Props) => (
  <div className="plated">
    <section className="who-col">{props.who}</section>
    <section className="rest-col">{props.rest}</section>
  </div>
);
