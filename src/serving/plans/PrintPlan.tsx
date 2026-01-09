import {
  ApiHelper, ArrayHelper, type AssignmentInterface, DateHelper, type PersonInterface, type PlanInterface, type PositionInterface, Locale 
} from "@churchapps/apphelper";
import { Grid } from "@mui/material";
import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { type PlanItemInterface } from "../../helpers";

export const PrintPlan = () => {
  const params = useParams();
  const [plan, setPlan] = React.useState<PlanInterface>(null);
  const [positions, setPositions] = React.useState<PositionInterface[]>([]);
  const [assignments, setAssignments] = React.useState<AssignmentInterface[]>([]);
  const [people, setPeople] = React.useState<PersonInterface[]>([]);
  const [planItems, setPlanItems] = React.useState<PlanItemInterface[]>([]);

  let totalSeconds = 0;

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const getPlanItems = (items: PlanItemInterface[]) => {
    let result: JSX.Element[] = [];
    items.forEach((pi) => {
      if (pi.itemType !== "header") {
        result.push(
          <tr key={pi.id}>
            <td style={Styles.tableCell}>{formatTime(totalSeconds)}</td>
            <td style={Styles.tableCell}>
              <b>{pi.label}:</b> {pi.description}
            </td>
            <td style={{ ...Styles.tableCell, textAlign: "right" }}>{formatTime(pi.seconds)}</td>
          </tr>
        );
        totalSeconds += pi.seconds;
      }
      if (pi.children) result = result.concat(getPlanItems(pi.children));
    });
    return result;
  };

  const Styles: any = {
    body: {
      padding: "20px",
      backgroundColor: "#FFF",
      color: "#000",
      minHeight: "100vh",
    },
    header: { fontWeight: "bold", textAlign: "center", padding: 5 },
    inverseHeader: {
      backgroundColor: "#000",
      color: "#FFF",
      textAlign: "center",
      padding: 5,
      fontWeight: "bold",
    },
    divider: { borderBottom: "20px solid #000" },
    tableCell: { verticalAlign: "top", padding: 5, textAlign: "left" },
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
                <tr style={Styles.inverseHeader}>
                  <td style={{ textAlign: "left", paddingLeft: 10 }}>{Locale.label("plans.printPlan.time")}</td>
                  <td></td>
                  <td style={{ textAlign: "right", paddingRight: 10 }}>{Locale.label("plans.printPlan.length")}</td>
                </tr>
                {getPlanItems(planItems)}
              </table>
            </div>
          </Grid>
        </Grid>
      </div>
    </>
  );
};
