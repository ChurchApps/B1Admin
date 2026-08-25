import { ApiHelper, ArrayHelper, DateHelper, type PersonInterface, Locale, Loading } from "@churchapps/apphelper";
import { Grid } from "@mui/material";
import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { type PlanItemInterface } from "../../helpers";
import { formatClockTime } from "../components/PlanUtils";
import { type PlanItemTimeInterface, type AssignmentInterface, type PlanInterface, type PositionInterface, type TimeInterface } from "@churchapps/helpers";
import { OlfPrintPreview } from "../components/print/OlfPrintPreview";
import { type FeedVenueInterface, type FeedSectionInterface, type FeedActionInterface } from "../../helpers";
import { getProvider, type InstructionItem, type Instructions } from "@churchapps/content-providers";
import { getProviderInstructions, filterFeedByPlanItems, buildPositionLabels } from "../components/planItemUtils";

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
  const [feed, setFeed] = React.useState<FeedVenueInterface | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return minutes + ":" + (secs < 10 ? "0" : "") + secs;
  };

  const instructionsToFeed = (instructions: Instructions, currentPlan: PlanInterface): FeedVenueInterface => {
    const sections: FeedSectionInterface[] = [];

    const toAction = (item: InstructionItem): FeedActionInterface => {
      const file = item.children?.find(c => c.itemType === "file");
      const url = item.downloadUrl || file?.downloadUrl;
      const thumbnail = item.thumbnail || file?.thumbnail;
      return {
        // relatedId first: expanded plan items store relatedId || id, so the feed must match.
        id: item.relatedId || item.id,
        actionType: item.actionType || "note",
        content: item.content || item.label || "",
        files: url || thumbnail ? [{ name: item.label, url, thumbnail, seconds: item.seconds || file?.seconds }] : []
      };
    };

    const collectActions = (items: InstructionItem[], into: FeedActionInterface[]) => {
      items.forEach(item => {
        if (item.itemType === "action" || !item.children?.length) into.push(toAction(item));
        else collectActions(item.children, into);
      });
    };

    const walk = (items: InstructionItem[]) => {
      items.forEach(item => {
        if (item.itemType === "section") {
          const actions: FeedActionInterface[] = [];
          collectActions(item.children || [], actions);
          sections.push({ id: item.relatedId || item.id, name: item.label || "", actions });
        } else if (item.children?.length) {
          walk(item.children);
        }
      });
    };
    walk(instructions.items || []);

    const findThumb = (items: InstructionItem[]): string => {
      for (const item of items) {
        if (item.thumbnail) return item.thumbnail;
        const found = item.children ? findThumb(item.children) : "";
        if (found) return found;
      }
      return "";
    };

    return {
      id: currentPlan.id || "",
      name: instructions.name || currentPlan.providerPlanName || "",
      lessonId: currentPlan.providerPlanId || "",
      lessonName: currentPlan.providerPlanName || instructions.name || "",
      lessonImage: findThumb(instructions.items || []),
      studyName: currentPlan.name || "",
      sections
    };
  };

  // Saved plan items are lossy (customize strips actions; preview state has none),
  // so provider prints always come from the live provider content.
  const loadProviderFeed = async (planData: PlanInterface): Promise<FeedVenueInterface | null> => {
    if (planData.providerId === "lessonschurch" && planData.contentId) {
      try {
        const venueFeed = await ApiHelper.get("/venues/public/feed/" + planData.contentId, "LessonsApi");
        if (venueFeed?.sections?.length) return venueFeed;
      } catch { /* fall through to provider instructions */ }
    }
    try {
      const provider = planData.providerId ? getProvider(planData.providerId) : null;
      if (!provider || !planData.providerPlanId) return null;
      const instructions = await getProviderInstructions(provider, planData.providerPlanId, planData.ministryId, planData.providerId);
      if (!instructions?.items?.length) return null;
      const result = instructionsToFeed(instructions, planData);
      return result.sections?.length ? result : null;
    } catch (error) {
      console.error("Failed to load provider print feed:", error);
      return null;
    }
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

    const flattenItems = (items: PlanItemInterface[]): PlanItemInterface[] => {
      let result: PlanItemInterface[] = [];
      items.forEach(item => {
        result.push(item);
        if (item.children) result = result.concat(flattenItems(item.children));
      });
      return result;
    };

    const flatPlanItems = flattenItems(planItemsData || []);

    const primaryLessonItem = flatPlanItems.find(pi => pi.providerId && pi.providerPath);
    const activeProviderId = primaryLessonItem?.providerId || planData?.providerId;
    const activeContentId = primaryLessonItem?.providerPath || planData?.contentId;
    const activeContentType = planData?.contentType;

    let currentFeed: FeedVenueInterface | null = null;
    if (activeProviderId) {
      const mockPlanData = {
        ...planData,
        providerId: activeProviderId,
        contentId: activeContentId,
        providerPlanId: primaryLessonItem?.providerPath || planData?.providerPlanId
      } as PlanInterface;
      currentFeed = await loadProviderFeed(mockPlanData);
    } else if (activeContentId && (activeContentType === "venue" || activeContentType === "lesson")) {
      try {
        currentFeed = await ApiHelper.get("/venues/public/feed/" + activeContentId, "LessonsApi");
      } catch (error) {
        console.error("Failed to load lesson feed:", error);
      }
    }

    currentFeed = filterFeedByPlanItems(currentFeed, planItemsData || []);

    setFeed(currentFeed);

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

  const positionLabels = React.useMemo(() => buildPositionLabels(positions, assignments, people), [positions, assignments, people]);

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
          const isFolder = (pi.children?.length || 0) > 0;
          const seconds = isFolder ? 0 : pi.seconds || 0;
          const timeCells: JSX.Element[] = [];
          if (serviceTimes.length === 0) {
            timeCells.push(<td key="t0" style={Styles.tableCell}>{formatTime(accumulators[0])}</td>);
            accumulators[0] += seconds;
          } else {
            serviceTimes.forEach((st, i) => {
              const excluded = isExcluded(pi.id || "", st.id || "");
              if (excluded) {
                timeCells.push(<td key={st.id} style={{ ...Styles.tableCell, color: "#999" }}>—</td>);
              } else {
                timeCells.push(<td key={st.id} style={Styles.tableCell}>{formatClockTime(st.startTime, accumulators[i])}</td>);
                accumulators[i] += seconds;
              }
            });
          }
          rows.push(
            <tr key={pi.id}>
              {timeCells}
              <td style={Styles.tableCell}>
                <b>{pi.label}:</b> {pi.description}
                {plan?.showVolunteerNames && pi.positionId && positionLabels[pi.positionId]?.text && (
                  <span style={{ float: "right", paddingLeft: 10, color: "#555" }}>{positionLabels[pi.positionId].text}</span>
                )}
              </td>
              <td style={{ ...Styles.tableCell, textAlign: "right" }}>{isFolder ? "" : formatTime(seconds)}</td>
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
