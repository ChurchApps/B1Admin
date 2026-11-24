import { ApiHelper, ArrayHelper, DateHelper, type PersonInterface, Locale, Loading, SmallButton } from "@churchapps/apphelper";
import { Box, Checkbox, FormControlLabel, Grid } from "@mui/material";
import React, { useContext, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { type ArrangementInterface, type ArrangementKeyInterface, type PlanItemInterface, type PlanItemTimeInterface, type SongDetailInterface } from "../../helpers";
import { ChordProHelper } from "../../helpers/ChordProHelper";
import { formatClockTime } from "../components/PlanUtils";
import { type AssignmentInterface, type PlanInterface, type PositionInterface, type TimeInterface } from "@churchapps/helpers";
import { OlfPrintPreview } from "../components/print/OlfPrintPreview";
import { type FeedVenueInterface, type FeedSectionInterface, type FeedActionInterface } from "../../helpers";
import { getProvider, type InstructionItem, type Instructions } from "@churchapps/content-providers";
import { getProviderInstructions, filterFeedByPlanItems, buildPositionLabels, isSongType } from "../components/planItemUtils";
import UserContext from "../../UserContext";
import { PrintChurchHeader, usePrintLogo } from "../../components/PrintChurchHeader";

const PRINT_FAINT = "#999";
const PRINT_INK = "#000";
const PRINT_MUTED = "#555";

interface ChordChart { planItemId: string; title: string; artist: string; keySignature: string; sequence: string; html: string }

const flattenPlanItems = (items: PlanItemInterface[]): PlanItemInterface[] =>
  items.flatMap((item) => [item, ...(item.children ? flattenPlanItems(item.children) : [])]);

// One chart per song item, in plan order, transposed from the song's written key into the key chosen on the plan.
const loadChordCharts = async (planItems: PlanItemInterface[]): Promise<ChordChart[]> => {
  const songItems = flattenPlanItems(planItems).filter((pi) => isSongType(pi.itemType) && pi.relatedId);
  const cache = new Map<string, Promise<unknown>>();
  function get<T>(path: string): Promise<T | null> {
    if (!cache.has(path)) cache.set(path, ApiHelper.get(path, "ContentApi").catch(() => null));
    return cache.get(path) as Promise<T | null>;
  }
  const charts = await Promise.all(songItems.map(async (pi): Promise<ChordChart | null> => {
    const key = await get<ArrangementKeyInterface>("/arrangementKeys/" + pi.relatedId);
    if (!key?.arrangementId) return null;
    const arrangement = await get<ArrangementInterface>("/arrangements/" + key.arrangementId);
    if (!arrangement?.lyrics?.trim()) return null;
    const detail = arrangement.songDetailId ? await get<SongDetailInterface>("/songDetails/" + arrangement.songDetailId) : null;
    const transposition = ChordProHelper.getTransposition(detail?.keySignature, key.keySignature);
    return {
      planItemId: pi.id || pi.relatedId || "",
      title: detail?.title || pi.label || "",
      artist: detail?.artist || "",
      keySignature: key.keySignature || "",
      sequence: arrangement.sequence || "",
      html: ChordProHelper.formatLyrics(arrangement.lyrics, transposition?.offset || 0, transposition?.useFlats)
    };
  }));
  return charts.filter((c): c is ChordChart => !!c);
};

export const PrintPlan = () => {
  const params = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoprint = searchParams.get("autoprint") === "1";
  const hasPrinted = React.useRef(false);
  const church = useContext(UserContext)?.userChurch?.church;
  const churchName = church?.name || "";
  const printLogo = usePrintLogo(church?.id);
  const [showHeading, setShowHeading] = React.useState(() => localStorage.getItem("printPlan.showHeading") !== "false");
  const [includeCharts, setIncludeCharts] = React.useState(() => localStorage.getItem("printPlan.includeCharts") === "true");
  const [charts, setCharts] = React.useState<ChordChart[] | null>(null);
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
    try {
      await fetchPrintData();
    } catch (error) {
      console.error("Failed to load print plan:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPrintData = async () => {
    const promises = [
      ApiHelper.get("/plans/" + params.id, "DoingApi"),
      ApiHelper.get("/positions/plan/" + params.id, "DoingApi"),
      ApiHelper.get("/planItems/plan/" + params.id?.toString(), "DoingApi"),
      ApiHelper.get("/times/plan/" + params.id, "DoingApi"),
      // Per-service exclusions are optional; a failed lookup should not blank the printout.
      ApiHelper.get("/planItemTimes/plan/" + params.id, "DoingApi").catch((error: unknown) => { console.error("Failed to load plan item exclusions:", error); return []; }),
      ApiHelper.get("/assignments/plan/" + params.id, "DoingApi")
    ];

    const [planData, positionsData, planItemsData, timesData, exclusionsData, assignmentsData] = await Promise.all(promises);

    setPlan(planData);
    setPositions(positionsData);
    setPlanItems(planItemsData);

    const services = (timesData || []).filter((t: TimeInterface) => (t.serviceTimeType ?? "service") === "service");
    services.sort((a: TimeInterface, b: TimeInterface) => new Date(a.startTime || 0).getTime() - new Date(b.startTime || 0).getTime());
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
  };

  useEffect(() => {
    loadData();
  }, []);

  const hasSongs = React.useMemo(() => flattenPlanItems(planItems).some((pi) => isSongType(pi.itemType) && pi.relatedId), [planItems]);

  useEffect(() => {
    if (!includeCharts || isLoading || charts) return;
    loadChordCharts(planItems).then(setCharts).catch((error: unknown) => { console.error("Failed to load chord charts:", error); setCharts([]); });
  }, [includeCharts, isLoading, planItems, charts]);

  const chartsReady = !includeCharts || !hasSongs || !!charts;

  useEffect(() => {
    if (autoprint && !isLoading && !feed && printLogo.ready && chartsReady && !hasPrinted.current) {
      hasPrinted.current = true;
      window.print();
    }
  }, [autoprint, isLoading, feed, printLogo.ready, chartsReady]);

  useEffect(() => {
    const handleAfterPrint = () => navigate("/serving/plans/" + params.id);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, [navigate, params.id]);

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
        people.forEach((person) => {
          if (assignments.some((a) => a.positionId === p.id && a.personId === person.id)) names.push(person?.name?.display || "");
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

  // An item can point at a different position per service time, so the printed sheet shows every
  // distinct name it resolves to across the services it appears in (ChurchAppsSupport#1045).
  const getPositionText = (pi: PlanItemInterface): string => {
    if (!plan?.showVolunteerNames) return "";
    const texts: string[] = [];
    const add = (positionId?: string) => {
      const text = positionId ? positionLabels[positionId]?.text : "";
      if (text && !texts.includes(text)) texts.push(text);
    };
    if (serviceTimes.length === 0) add(pi.positionId);
    else {
      serviceTimes.forEach((st) => {
        if (isExcluded(pi.id || "", st.id || "")) return;
        const override = exclusions.find((ex) => ex.planItemId === pi.id && ex.timeId === st.id);
        add(override?.positionId || pi.positionId);
      });
    }
    return texts.join(" / ");
  };

  // Empty columns and the empty team box are left off the printout (ChurchAppsSupport#1409).
  const hasLengths = React.useMemo(() => {
    const walk = (items: PlanItemInterface[]): boolean =>
      items.some((pi) => (pi.itemType !== "header" && (pi.seconds || 0) > 0) || (pi.children ? walk(pi.children) : false));
    return walk(planItems);
  }, [planItems]);
  const showClock = serviceTimes.length > 0 || hasLengths;
  const timeColumnCount = serviceTimes.length || (showClock ? 1 : 0);
  const hasAssignments = assignments.some((a) => a.personId && positions.some((p) => p.id === a.positionId));

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
            if (showClock) timeCells.push(<td key="t0" style={Styles.tableCell}>{formatTime(accumulators[0])}</td>);
            accumulators[0] += pi.seconds || 0;
          } else {
            serviceTimes.forEach((st, i) => {
              const excluded = isExcluded(pi.id || "", st.id || "") || (pi.parentId ? isExcluded(pi.parentId, st.id || "") : false);
              if (excluded) {
                timeCells.push(<td key={st.id} style={{ ...Styles.tableCell, color: PRINT_FAINT }}>—</td>);
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
                {getPositionText(pi) && (
                  <span style={{ float: "right", paddingLeft: 10, color: PRINT_MUTED }}>{getPositionText(pi)}</span>
                )}
              </td>
              {hasLengths && <td style={{ ...Styles.tableCell, textAlign: "right" }}>{pi.seconds ? formatTime(pi.seconds) : ""}</td>}
            </tr>
          );
        } else {
          // Section headers span every column so the printed sheet shows where each part of
          // the service begins and who leads it (ChurchAppsSupport#1086).
          const columnCount = timeColumnCount + 1 + (hasLengths ? 1 : 0);
          const positionText = getPositionText(pi);
          rows.push(
            <tr key={pi.id} className="printSectionRow">
              <td colSpan={columnCount} style={{ ...Styles.tableCell, fontWeight: "bold", fontSize: "1.1em", borderTop: `2px solid ${PRINT_INK}`, paddingTop: 8 }}>
                {pi.label}
                {positionText && (
                  <span className="printSectionPosition" style={{ float: "right", paddingLeft: 10, fontWeight: "normal", fontSize: "0.9em", color: PRINT_MUTED }}>{positionText}</span>
                )}
              </td>
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
      if (showClock) cells.push(<td key="t0" style={{ textAlign: "left", paddingLeft: 10 }}>{Locale.label("plans.printPlan.time")}</td>);
    } else {
      serviceTimes.forEach((st) => {
        const label = formatClockTime(st.startTime, 0) || st.displayName || Locale.label("plans.printPlan.time");
        cells.push(<td key={st.id} style={{ textAlign: "left", paddingLeft: 10 }}>{label}</td>);
      });
    }
    cells.push(<td key="item"></td>);
    if (hasLengths) cells.push(<td key="length" style={{ textAlign: "right", paddingRight: 10 }}>{Locale.label("plans.printPlan.length")}</td>);
    return <tr style={Styles.inverseHeader}>{cells}</tr>;
  };

  const Styles: Record<string, React.CSSProperties> = {
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

  const handleShowHeadingChange = (checked: boolean) => {
    setShowHeading(checked);
    localStorage.setItem("printPlan.showHeading", String(checked));
  };

  const handleIncludeChartsChange = (checked: boolean) => {
    setIncludeCharts(checked);
    localStorage.setItem("printPlan.includeCharts", String(checked));
  };

  const renderCharts = () => {
    if (!includeCharts || !hasSongs) return null;
    if (!charts) return <div className="no-print" style={{ padding: 20 }}><Loading /></div>;
    return charts.map((c) => (
      <div key={c.planItemId} className="printChordChart" data-testid="print-plan-chord-chart" style={{ breakBefore: "page", pageBreakBefore: "always", paddingTop: 20, textAlign: "left", color: PRINT_INK }}>
        <div style={{ fontWeight: "bold", fontSize: 20 }}>{c.title}</div>
        <div style={{ color: PRINT_MUTED, marginBottom: 10 }}>
          {[c.artist, c.keySignature && `${Locale.label("songs.details.key")}: ${c.keySignature}`, c.sequence].filter(Boolean).join(" · ")}
        </div>
        <div className="chordPro" style={{ fontFamily: "monospace", lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: c.html }} />
      </div>
    ));
  };

  const renderWorshipOrder = () => (
    <div style={Styles.body} className="printBackgrounds">
      <Box className="print-toolbar no-print" sx={{ px: 1, pb: 1, textAlign: "left" }}>
        <FormControlLabel
          control={<Checkbox checked={showHeading} onChange={(e) => handleShowHeadingChange(e.target.checked)} data-testid="print-plan-show-heading" />}
          label={Locale.label("plans.printPlan.showHeading")}
        />
        {hasSongs && (
          <FormControlLabel
            control={<Checkbox checked={includeCharts} onChange={(e) => handleIncludeChartsChange(e.target.checked)} data-testid="print-plan-include-charts" />}
            label={Locale.label("plans.printPlan.includeCharts", "Include chord charts")}
          />
        )}
      </Box>
      {(churchName || printLogo.logoUrl || plan?.name) && (
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <PrintChurchHeader churchName={churchName} logoUrl={printLogo.logoUrl} style={{ margin: "0 auto 4px" }}>
            {churchName && <div style={{ fontWeight: "bold", fontSize: 18 }}>{churchName}</div>}
          </PrintChurchHeader>
          {plan?.name && <div style={{ fontSize: 14 }}>{plan.name}</div>}
        </div>
      )}
      {showHeading ? (
        <Grid container>
          <Grid size={{ xs: 4 }} style={Styles.inverseHeader}>
            {Locale.label("plans.printPlan.serviceOrder")}
          </Grid>
          <Grid size={{ xs: 4 }} style={{ ...Styles.header, borderTop: `5px solid ${PRINT_INK}` }}>
            {plan && DateHelper.prettyDate(DateHelper.toDate(plan.serviceDate))}
          </Grid>
          <Grid size={{ xs: 4 }} style={Styles.inverseHeader}>
            {Locale.label("plans.printPlan.serviceOrder")}
          </Grid>
        </Grid>
      ) : (
        <Grid container>
          <Grid size={{ xs: 12 }} style={{ ...Styles.header, borderTop: `5px solid ${PRINT_INK}` }}>
            {plan && DateHelper.prettyDate(DateHelper.toDate(plan.serviceDate))}
          </Grid>
        </Grid>
      )}
      <div style={Styles.divider}>&nbsp;</div>
      <Grid container>
        {hasAssignments && (
          <Grid size={{ xs: 4 }} style={{ padding: 5 }}>
            <div className="printTeamBox" style={{ border: `2px solid ${PRINT_INK}`, textAlign: "left", padding: 10 }}>{getPositionCategories()}</div>
          </Grid>
        )}
        <Grid size={{ xs: hasAssignments ? 8 : 12 }} style={{ padding: 5 }} className="printOrderColumn">
          <div style={{ border: `5px solid ${PRINT_INK}` }}>
            <table style={{ width: "100%", margin: 0 }} cellSpacing={0}>
              <tbody>
                {renderHeaderRow()}
                {renderRows()}
              </tbody>
            </table>
          </div>
        </Grid>
      </Grid>
      {renderCharts()}
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

  return (
    <>
      <style>{"@media print { .print-toolbar { display: none !important; } }"}</style>
      <Box className="print-toolbar" sx={{ display: "flex", justifyContent: "flex-end", gap: 1, p: 2 }}>
        <SmallButton icon="print" ariaLabel={Locale.label("common.print")} text={Locale.label("common.print")} onClick={() => window.print()} />
        <SmallButton icon="close" ariaLabel={Locale.label("common.close")} text={Locale.label("common.close")} onClick={() => navigate("/serving/plans/" + params.id)} />
      </Box>
      {renderWorshipOrder()}
    </>
  );
};
