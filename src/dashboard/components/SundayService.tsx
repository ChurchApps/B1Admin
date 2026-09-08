import React from "react";
import { Link } from "react-router-dom";
import { Locale } from "@churchapps/apphelper";
import { useSunday } from "../useSunday";
import { hasPlansEditAccess } from "../../helpers";
import "../../omarchy/omarchy.css";

const clock = (start: Date | null | undefined, extraSeconds: number) => {
  if (!start || Number.isNaN(start.getTime())) return "";
  const d = new Date(start);
  d.setSeconds(d.getSeconds() + extraSeconds);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const prettyWhen = (date?: Date | string | null, start?: Date | null) => {
  const d = date ? new Date(date) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  const weekday = d.toLocaleDateString(undefined, { weekday: "long" });
  const rest = d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
  const time = start && !Number.isNaN(start.getTime()) ? clock(start, 0) : "";
  return [weekday, rest, time].filter(Boolean).join(" · ");
};

export const SundayService: React.FC = () => {
  const sunday = useSunday();
  const data = sunday.data;
  const plan = data?.plan;
  const hasAnything = !!(plan || (data?.inRoom || 0) > 0 || (data?.serving.length || 0) > 0 || (data?.guests.length || 0) > 0 || (data?.rooms.length || 0) > 0);
  const canPlans = hasPlansEditAccess();

  const title = plan?.name || Locale.label("plans.planPage.servicePlan", "This week");
  const series = [plan?.providerPlanName, plan?.notes].filter(Boolean).join(" · ");

  return (
    <div className="om-sunday">
      <section className="om-bulletin">
        <p className="om-eyebrow">{prettyWhen(plan?.serviceDate, data?.planStart) || Locale.label("components.wrapper.dash", "Sunday")}</p>
        <h1 className="om-sermon">{hasAnything ? title : Locale.label("components.wrapper.dash", "Sunday")}</h1>
        {series
          ? <p className="om-series">{series}</p>
          : !hasAnything && <p className="om-series">This week's service will live here.</p>}
        {data?.order && data.order.length > 0
          ? (
            <ol className="om-order">
              {data.order.map((item, i) => (
                <li key={i} className={item.now ? "now" : undefined}>
                  <span className="om-mm">{clock(data.planStart, item.startSeconds) || "—"}</span>
                  <span className="om-what">{item.label}</span>
                </li>
              ))}
            </ol>
          )
          : (
            <p className="om-quiet">
              {hasAnything
                ? "No order of service on this plan."
                : "No service planned this week."}
              {canPlans && (
                <>
                  {" "}
                  <Link to="/serving/plans">{Locale.label("components.wrapper.plans", "Plans")}</Link>
                </>
              )}
            </p>
          )}
      </section>

      <section className="om-live">
        {(data?.inRoom || 0) > 0 && (
          <div>
            {data?.live && <div className="om-pulse"><i /> Live</div>}
            <div className="om-hero-stats">
              <div className="om-in-room">{data?.inRoom}<span>in the room</span></div>
              {data?.split && <p className="om-split">{data.split}</p>}
            </div>
          </div>
        )}

        {(data?.serving.length || 0) > 0 && (
          <div>
            <h3>Serving this hour</h3>
            <div className="om-people">
              {data!.serving.map((p) => (
                <div className="om-person" key={p.personId + p.role}>
                  <Link to={"/people/" + p.personId}>{p.name}</Link>
                  <span className="om-role">{p.role}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(data?.guests.length || 0) > 0 && (
          <div>
            <h3>First time</h3>
            <div className="om-guests">
              {data!.guests.map((g) => (
                g.href
                  ? <Link key={g.key} className={"om-chip" + (g.first ? " first" : "")} to={g.href}>{g.label}</Link>
                  : <span key={g.key} className={"om-chip" + (g.first ? " first" : "")}>{g.label}</span>
              ))}
            </div>
          </div>
        )}

        {(data?.rooms.length || 0) > 0 && (
          <div>
            <h3>Rooms</h3>
            <div className="om-rooms">
              {data!.rooms.map((r) => {
                const cap = r.capacity && r.capacity > 0 ? r.capacity : undefined;
                const pct = cap ? Math.min(100, Math.round((r.count / cap) * 100)) : 0;
                return (
                  <div className="om-room" key={r.groupId}>
                    <span>{r.name}</span>
                    <span>{cap ? `${r.count} / ${cap}` : r.count}</span>
                    {cap && <div className="om-bar"><i style={{ width: pct + "%" }} /></div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!sunday.isLoading && (data?.inRoom || 0) === 0 && (data?.serving.length || 0) === 0 && (data?.guests.length || 0) === 0 && (data?.rooms.length || 0) === 0 && (
          <p className="om-quiet">Who is in the room, who is serving, and who just walked in will show here when check-in and serving are in use.</p>
        )}
      </section>
    </div>
  );
};
