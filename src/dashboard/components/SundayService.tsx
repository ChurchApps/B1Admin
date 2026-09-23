import React from "react";
import { Link } from "react-router-dom";
import { Locale } from "@churchapps/apphelper";
import { useSunday } from "../useSunday";
import { hasPlansEditAccess } from "../../helpers";
import "../sunday.css";

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
  const hasLive = (data?.inRoom || 0) > 0 || (data?.serving.length || 0) > 0 || (data?.guests.length || 0) > 0 || (data?.rooms.length || 0) > 0;
  const canPlans = hasPlansEditAccess();
  const title = plan?.name || Locale.label("dashboard.sunday.thisSunday", "This Sunday");
  const series = [plan?.providerPlanName, plan?.notes].filter(Boolean).join(" · ");
  const recap = !!data?.recap;
  const live = !!data?.live;
  const servingLabel = live ? Locale.label("dashboard.sunday.servingThisHour", "Serving this hour") : Locale.label("dashboard.sunday.servingSunday", "Serving Sunday");
  const guestLabel = recap ? Locale.label("dashboard.sunday.firstTimeLastSunday", "First time last Sunday") : Locale.label("dashboard.sunday.firstTime", "First time");

  return (
    <div className={"om-sunday" + (hasLive ? " has-live" : "")} data-testid="sunday-home">
      <section className="om-bulletin">
        <p className="om-eyebrow">{prettyWhen(data?.focusDate, data?.planStart) || Locale.label("components.wrapper.dash", "Sunday")}</p>
        <h1 className="om-sermon">
          {plan?.id
            ? <Link to={"/serving/plans/" + plan.id}>{title}</Link>
            : title}
        </h1>
        {series
          ? <p className="om-series">{series}</p>
          : !hasAnything && <p className="om-series">{Locale.label("dashboard.sunday.thisWeeksService", "This week's service will live here.")}</p>}
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
                ? Locale.label("dashboard.sunday.noOrder", "No order of service on this plan.")
                : Locale.label("dashboard.sunday.noPlan", "No service planned this week.")}
              {canPlans && (
                <>
                  {" "}
                  <Link to="/serving/plans">{Locale.label("components.wrapper.plans", "Plans")}</Link>
                </>
              )}
            </p>
          )}
      </section>

      {hasLive && (
        <section className="om-live">
          {(data?.inRoom || 0) > 0 && (
            <div>
              {live && <div className="om-pulse"><i /> {Locale.label("dashboard.sunday.live", "Live")}</div>}
              {recap && <p className="om-eyebrow">{Locale.label("dashboard.sunday.lastSunday", "Last Sunday")}</p>}
              <div className="om-in-room">{data?.inRoom}<span>{Locale.label("dashboard.sunday.inTheRoom", "in the room")}</span></div>
              {data?.split && <p className="om-split">{data.split}</p>}
            </div>
          )}

          {(data?.serving.length || 0) > 0 && (
            <div>
              <h3>{servingLabel}</h3>
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
              <h3>{guestLabel}</h3>
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
              <h3>{Locale.label("dashboard.sunday.rooms", "Rooms")}</h3>
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
        </section>
      )}
    </div>
  );
};
