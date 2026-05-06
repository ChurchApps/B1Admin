import { ApiHelper, ArrayHelper, type AssignmentInterface, DateHelper, type PersonInterface, type PlanInterface, type PositionInterface, type TimeInterface, Locale } from "@churchapps/apphelper";
import { Grid } from "@mui/material";
import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { type PlanItemInterface } from "../../helpers";
import { formatClockTime } from "../components/PlanUtils";
import { type PlanItemTimeInterface } from "@churchapps/helpers";

export const PrintPlan = () => {
  const params = useParams();
  const [plan, setPlan] = React.useState<PlanInterface>(null);
  const [positions, setPositions] = React.useState<PositionInterface[]>([]);
  const [assignments, setAssignments] = React.useState<AssignmentInterface[]>([]);
  const [people, setPeople] = React.useState<PersonInterface[]>([]);
  const [planItems, setPlanItems] = React.useState<PlanItemInterface[]>([]);
  const [serviceTimes, setServiceTimes] = React.useState<TimeInterface[]>([]);
  const [exclusions, setExclusions] = React.useState<PlanItemTimeInterface[]>([]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return minutes + ":" + (secs < 10 ? "0" : "") + secs;
  };

  const loadData = async () => {
    ApiHelper.get("/plans/" + params.id, "DoingApi").then((data) => {
      setPlan(data);
    });
    ApiHelper.get("/positions/plan/" + params.id, "DoingApi").then((data) => {
      setPositions(data);
    });
    ApiHelper.get("/planItems/plan/" + params.id.toString(), "DoingApi").then((d) => {
      setPlanItems(d);
    });
    ApiHelper.get("/times/plan/" + params.id, "DoingApi").then((d: TimeInterface[]) => {
      const services = (d || []).filter((t) => (t.serviceTimeType ?? "service") === "service");
      services.sort((a, b) => new Date(a.startTime || 0).getTime() - new Date(b.startTime || 0).getTime());
      setServiceTimes(services);
    });
    ApiHelper.get("/planItemTimes/plan/" + params.id, "DoingApi").then((d: PlanItemTimeInterface[]) => {
      setExclusions(d || []);
    });

    const d = await ApiHelper.get("/assignments/plan/" + params.id, "DoingApi");
    setAssignments(d);
    const peopleIds = ArrayHelper.getUniqueValues(d, "personId");
    if (peopleIds.length > 0) {
      ApiHelper.get("/people/ids?ids=" + peopleIds.join(","), "MembershipApi").then((data: PersonInterface[]) => {
        setPeople(data);
      });
    }

    setTimeout(() => {
      window.print();
    }, 1000);
  };

  useEffect(() => {
    loadData();
  }, []);

  const isExcluded = (planItemId: string, timeId: string): boolean =>
    exclusions.some((ex) => ex.planItemId === planItemId && ex.timeId === timeId && ex.excluded);

  const getPositionCategories = () => {
    const cats: string[] = [];
    positions.forEach((p) => {
      if (!cats.includes(p.categoryName)) cats.push(p.categoryName);
    });
    const result: JSX.Element[] = [];
    cats.forEach((c) => {
      result.push(
        <div key={c}>
          <h3 style={{ marginTop: 15, marginBottom: 5 }}>{c}</h3>
          {getPositions(c)}
        </div>
      );
    });
    return result;
  };

  const getPositions = (categoryName: string) => {
    const result: JSX.Element[] = [];
    positions
      .filter((p) => p.categoryName === categoryName)
      .forEach((p) => {
        const names: string[] = [];
        assignments
          .filter((a) => a.positionId === p.id)
          .forEach((a) => {
            const person = people.find((p) => p.id === a.personId);
            names.push(person?.name?.display);
          });

        result.push(
          <div key={p.id}>
            <b>{p.name}:</b> {names.join(", ")}
          </div>
        );
      });
    return result;
  };

  // Per-column accumulators are mutated as the recursive renderer walks the tree.
  // Single-column fallback uses index 0; multi-column uses one entry per service time.
  const renderRows = () => {
    const accumulators: number[] = serviceTimes.length > 0
      ? serviceTimes.map(() => 0)
      : [0];

    const walk = (items: PlanItemInterface[]): JSX.Element[] => {
      let rows: JSX.Element[] = [];
      items.forEach((pi) => {
        if (pi.itemType !== "header") {
          const timeCells: JSX.Element[] = [];
          if (serviceTimes.length === 0) {
            timeCells.push(<td key="t0" style={Styles.tableCell}>{formatTime(accumulators[0])}</td>);
            accumulators[0] += pi.seconds;
          } else {
            serviceTimes.forEach((st, i) => {
              const excluded = isExcluded(pi.id || "", st.id || "");
              if (excluded) {
                timeCells.push(<td key={st.id} style={{ ...Styles.tableCell, color: "#999" }}>—</td>);
              } else {
                timeCells.push(<td key={st.id} style={Styles.tableCell}>{formatClockTime(st.startTime, accumulators[i])}</td>);
                accumulators[i] += pi.seconds;
              }
            });
          }
          rows.push(
            <tr key={pi.id}>
              {timeCells}
              <td style={Styles.tableCell}>
                <b>{pi.label}:</b> {pi.description}
              </td>
              <td style={{ ...Styles.tableCell, textAlign: "right" }}>{formatTime(pi.seconds)}</td>
            </tr>
          );
        }
        if (pi.children) rows = rows.concat(walk(pi.children));
      });
      return rows;
    };

    return walk(planItems);
  };

  const renderHeaderRow = () => {
    const cells: JSX.Element[] = [];
    if (serviceTimes.length === 0) {
      cells.push(<td key="t0" style={{ textAlign: "left", paddingLeft: 10 }}>{Locale.label("plans.printPlan.time")}</td>);
    } else {
      serviceTimes.forEach((st) => {
        const label = formatClockTime(st.startTime, 0) || st.displayName || Locale.label("plans.printPlan.time");
        cells.push(<td key={st.id} style={{ textAlign: "left", paddingLeft: 10 }}>{label}</td>);
      });
    }
    cells.push(<td key="item"></td>);
    cells.push(<td key="length" style={{ textAlign: "right", paddingRight: 10 }}>{Locale.label("plans.printPlan.length")}</td>);
    return <tr style={Styles.inverseHeader}>{cells}</tr>;
  };

  const Styles: any = {
    body: {
      padding: "20px",
      backgroundColor: "#FFF",
      color: "#000",
      minHeight: "100vh"
    },
    header: { fontWeight: "bold", textAlign: "center", padding: 5 },
    inverseHeader: {
      backgroundColor: "#000",
      color: "#FFF",
      textAlign: "center",
      padding: 5,
      fontWeight: "bold"
    },
    divider: { borderBottom: "20px solid #000" },
    tableCell: { verticalAlign: "top", padding: 5, textAlign: "left" }
  };

  return (
    <>
      <div style={Styles.body} className="printBackgrounds">
        <Grid container>
          <Grid size={{ xs: 4 }} style={Styles.inverseHeader}>
            {Locale.label("plans.printPlan.serviceOrder")}
          </Grid>
          <Grid size={{ xs: 4 }} style={{ ...Styles.header, borderTop: "5px solid #000" }}>
            {plan && DateHelper.prettyDate(DateHelper.toDate(plan.serviceDate))}
          </Grid>
          <Grid size={{ xs: 4 }} style={Styles.inverseHeader}>
            {Locale.label("plans.printPlan.serviceOrder")}
          </Grid>
        </Grid>
        <div style={Styles.divider}>&nbsp;</div>
        <Grid container>
          <Grid size={{ xs: 4 }} style={{ padding: 5 }}>
            <div style={{ border: "2px solid #000", textAlign: "left", padding: 10 }}>{getPositionCategories()}</div>
          </Grid>
          <Grid size={{ xs: 8 }} style={{ padding: 5 }}>
            <div style={{ border: "5px solid #000" }}>
              <table style={{ width: "100%", margin: 0 }} cellSpacing={0}>
                {renderHeaderRow()}
                {renderRows()}
              </table>
            </div>
          </Grid>
        </Grid>
      </div>
    </>
  );
};
