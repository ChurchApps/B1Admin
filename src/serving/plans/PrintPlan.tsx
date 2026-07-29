import { ApiHelper, ArrayHelper, DateHelper, type PersonInterface, Locale, Loading } from "@churchapps/apphelper";
import { Grid } from "@mui/material";
import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { type PlanItemInterface } from "../../helpers";
import { formatClockTime } from "../components/PlanUtils";
import { type PlanItemTimeInterface, type AssignmentInterface, type PlanInterface, type PositionInterface, type TimeInterface } from "@churchapps/helpers";
import { OlfPrintPreview } from "../components/print/OlfPrintPreview";
import { type FeedVenueInterface, type FeedSectionInterface, type FeedActionInterface } from "../../helpers";

export const PrintPlan = () => {
  const params = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = React.useState<PlanInterface | null>(null);
  const [positions, setPositions] = React.useState<PositionInterface[]>([]);
  const [assignments, setAssignments] = React.useState<AssignmentInterface[]>([]);
  const [people, setPeople] = React.useState<PersonInterface[]>([]);
  const [planItems, setPlanItems] = React.useState<PlanItemInterface[]>([]);
  const [serviceTimes, setServiceTimes] = React.useState<TimeInterface[]>([]);
  const [exclusions, setExclusions] = React.useState<PlanItemTimeInterface[]>([]);
  const [feed, setFeed] = React.useState<any | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return minutes + ":" + (secs < 10 ? "0" : "") + secs;
  };

  const buildFeedFromPlanItems = (items: PlanItemInterface[], currentPlan: PlanInterface | null): FeedVenueInterface => {
    const sections: FeedSectionInterface[] = [];

    items.forEach(pi => {
      if (pi.itemType === "header" || pi.itemType === "providerSection") {
        const actions: FeedActionInterface[] = [];
        if (pi.children) {
          pi.children.forEach(child => {
            actions.push({
              actionType: child.itemType === "providerPresentation" || child.itemType === "action" ? "play" : "note",
              content: child.label || child.description || "",
              files: child.thumbnailUrl ? [{
                url: child.link || "",
                thumbnail: child.thumbnailUrl || ""
              }] : []
            });
          });
        }
        console.log(actions, '--actions')
        sections.push({
          name: pi.label || "",
          materials: pi.description || "",
          actions
        });
      }
    });

    return {
      id: currentPlan?.id || "",
      name: currentPlan?.name || "",
      lessonId: currentPlan?.providerPlanId || "",
      lessonName: currentPlan?.providerPlanName || currentPlan?.name || "",
      lessonImage: items.find(i => i.thumbnailUrl)?.thumbnailUrl || "",
      lessonDescription: currentPlan?.notes || "",
      studyName: currentPlan?.providerPlanName || currentPlan?.name || "",
      sections
    };
  };

  const loadData = async () => {
    setIsLoading(true);

    const promises = [
      ApiHelper.get("/plans/" + params.id, "DoingApi"),
      ApiHelper.get("/positions/plan/" + params.id, "DoingApi"),
      ApiHelper.get("/planItems/plan/" + params.id?.toString(), "DoingApi"),
      ApiHelper.get("/times/plan/" + params.id, "DoingApi"),
      ApiHelper.get("/planItemTimes/plan/" + params.id, "DoingApi"),
      ApiHelper.get("/assignments/plan/" + params.id, "DoingApi")
    ];

    const [planData, positionsData, planItemsData, timesData, exclusionsData, assignmentsData] = await Promise.all(promises);

    setPlan(planData);
    setPositions(positionsData);
    setPlanItems(planItemsData);

    const services = (timesData || []).filter((t: any) => (t.serviceTimeType ?? "service") === "service");
    services.sort((a: any, b: any) => new Date(a.startTime || 0).getTime() - new Date(b.startTime || 0).getTime());
    setServiceTimes(services);

    setExclusions(exclusionsData || []);
    setAssignments(assignmentsData);

    const peopleIds = ArrayHelper.getUniqueValues(assignmentsData, "personId");
    if (peopleIds.length > 0) {
      const peopleData = await ApiHelper.get("/people/ids?ids=" + peopleIds.join(","), "MembershipApi");
      setPeople(peopleData);
    }

    let currentFeed = null;
    if (planData?.providerId) {
      currentFeed = buildFeedFromPlanItems(planItemsData, planData);
      setFeed(currentFeed);
    } else if (planData?.contentId && (planData?.contentType === "venue" || planData?.contentType === "lesson")) {
      try {
        currentFeed = await ApiHelper.get("/venues/public/feed/" + planData.contentId, "LessonsApi");
        setFeed(currentFeed);
      } catch (error) {
        console.error("Failed to load lesson feed:", error);
      }
    }

    if (!currentFeed) {
      setTimeout(() => {
        window.print();
      }, 1000);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const isExcluded = (planItemId: string, timeId: string): boolean =>
    exclusions.some((ex) => ex.planItemId === planItemId && ex.timeId === timeId && ex.excluded);

  const getPositionCategories = () => {
    const cats: string[] = [];
    positions.forEach((p) => {
      const categoryName = p.categoryName || "";
      if (!cats.includes(categoryName)) cats.push(categoryName);
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
            names.push(person?.name?.display || "");
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
            accumulators[0] += pi.seconds || 0;
          } else {
            serviceTimes.forEach((st, i) => {
              const excluded = isExcluded(pi.id || "", st.id || "");
              if (excluded) {
                timeCells.push(<td key={st.id} style={{ ...Styles.tableCell, color: "#999" }}>—</td>);
              } else {
                timeCells.push(<td key={st.id} style={Styles.tableCell}>{formatClockTime(st.startTime, accumulators[i])}</td>);
                accumulators[i] += pi.seconds || 0;
              }
            });
          }
          rows.push(
            <tr key={pi.id}>
              {timeCells}
              <td style={Styles.tableCell}>
                <b>{pi.label}:</b> {pi.description}
              </td>
              <td style={{ ...Styles.tableCell, textAlign: "right" }}>{formatTime(pi.seconds || 0)}</td>
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

  const renderWorshipOrder = () => (
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
  );

  if (isLoading) {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}><Loading /></div>;
  }

  if (feed) {
    return (
      <OlfPrintPreview
        feed={feed}
        onClose={() => navigate("/serving/plans/" + params.id)}
        worshipOrderRender={renderWorshipOrder}
      />
    );
  }

  return renderWorshipOrder();
};
