import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Button, LinearProgress, Stack, Typography } from "@mui/material";
import { ArrowForward as ArrowForwardIcon } from "@mui/icons-material";
import { ApiHelper, ArrayHelper, Locale } from "@churchapps/apphelper";
import { type PlanInterface, type PlanItemInterface } from "../../../helpers";
import { Pill, RecordHeading, Surface } from "../../../components/ui";
import { formatTime } from "../../components/PlanUtils";
import { estimateSeconds } from "../../components/planItemUtils";
import { PlanValidation } from "../../components/PlanValidation";
import { TimeList } from "../../components/TimeList";
import { usePlanTeam } from "../usePlanTeam";
import { PlanNotes } from "./PlanNotes";

interface Props {
  plan: PlanInterface;
  canEdit: boolean;
  onPlanChanged: () => void;
}

const rowSx = { display: "flex", alignItems: "baseline", gap: 1.5, py: 1, borderTop: 1, borderColor: "divider", typography: "body2" } as const;
const sectionSx = { typography: "overline", lineHeight: 1.6, color: "text.secondary", pt: 1.5, pb: 0.25 } as const;
const PREVIEW_ROWS = 12;

const itemSeconds = (pi: PlanItemInterface): number => estimateSeconds(pi) + (pi.children || []).reduce((s, c) => s + itemSeconds(c), 0);

const StatTile = ({ label, value, sub, children, testId }: { label: string; value: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode; testId?: string }) => (
  <Surface component="div" sx={{ p: { xs: 1.5, md: 2 } }} data-testid={testId}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography sx={{ fontSize: { xs: 22, md: 26 }, fontWeight: 500, lineHeight: 1.3, mt: 0.25 }}>{value}</Typography>
    {sub && <Typography variant="body2" color="text.secondary">{sub}</Typography>}
    {children}
  </Surface>
);

export const PlanOverview = ({ plan, canEdit, onPlanChanged }: Props) => {
  const team = usePlanTeam(plan.id);
  const [planItems, setPlanItems] = React.useState<PlanItemInterface[]>([]);
  const [itemsLoaded, setItemsLoaded] = React.useState(false);

  const hasOrder = !!plan.serviceOrder;

  React.useEffect(() => {
    if (!plan.id || !hasOrder) return;
    ApiHelper.get("/planItems/plan/" + plan.id, "DoingApi")
      .then((data: PlanItemInterface[]) => setPlanItems(data || []))
      .catch(() => setPlanItems([]))
      .finally(() => setItemsLoaded(true));
  }, [plan.id, hasOrder]);

  const basePath = `/serving/plans/${plan.id}`;

  // Order of service: sections (headers) with their items, flattened to rows for a short read-only preview.
  const orderRows = React.useMemo(() => {
    const rows: { key: string; section?: boolean; label: string; seconds: number }[] = [];
    planItems.forEach((pi, i) => {
      if (pi.itemType === "header" || (pi.children && pi.children.length > 0)) {
        rows.push({ key: "s" + (pi.id || i), section: true, label: pi.label || "", seconds: itemSeconds(pi) });
        (pi.children || []).forEach((c, j) => rows.push({ key: "i" + (c.id || `${i}-${j}`), label: c.label || "", seconds: itemSeconds(c) }));
      } else rows.push({ key: "i" + (pi.id || i), label: pi.label || "", seconds: itemSeconds(pi) });
    });
    return rows;
  }, [planItems]);
  const itemCount = orderRows.filter((r) => !r.section).length;
  const sectionCount = orderRows.length - itemCount;
  const totalSeconds = planItems.reduce((s, pi) => s + itemSeconds(pi), 0);
  let shownItems = 0;
  const previewRows = orderRows.filter((r) => (r.section ? shownItems < PREVIEW_ROWS : ++shownItems <= PREVIEW_ROWS));

  // Serving team: filled vs needed, response counts, and positions grouped by team.
  const { positions, assignments, people } = team;
  const totalNeeded = positions.reduce((s, p) => s + (p.count || 0), 0);
  const totalFilled = positions.reduce((s, p) => s + Math.min(assignments.filter((a) => a.positionId === p.id).length, p.count || 0), 0);
  const remaining = Math.max(0, totalNeeded - totalFilled);
  const accepted = assignments.filter((a) => a.status === "Accepted").length;
  const declined = assignments.filter((a) => a.status === "Declined").length;
  const pending = assignments.length - accepted - declined;
  const categories: string[] = ArrayHelper.getUniqueValues(positions, "categoryName");
  const personName = (personId?: string) => ArrayHelper.getOne(people, "id", personId)?.name?.display || "";

  const orderCard = (
    <Surface aria-labelledby="plan-order-heading" data-testid="plan-order-summary">
      <RecordHeading id="plan-order-heading" label={Locale.label("plans.serviceOrder.orderOfService")}>
        {totalSeconds > 0 && <Typography variant="body2" color="text.secondary">{formatTime(totalSeconds)}</Typography>}
      </RecordHeading>
      {!itemsLoaded && <Typography variant="body2" color="text.secondary">{Locale.label("common.loading")}</Typography>}
      {itemsLoaded && orderRows.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
          {plan.providerId ? Locale.label("plans.planPage.lessonLinked", "This plan follows a linked lesson. Open the order of service to see or customize it.") : Locale.label("plans.serviceOrder.noItems")}
        </Typography>
      )}
      {previewRows.map((r) => r.section
        ? <Box key={r.key} sx={sectionSx}>{r.label}</Box>
        : (
          <Box key={r.key} sx={rowSx}>
            <Box component="span" sx={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{r.label}</Box>
            {r.seconds > 0 && <Box component="span" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>{formatTime(r.seconds)}</Box>}
          </Box>
        ))}
      {itemCount > PREVIEW_ROWS && (
        <Box sx={{ ...rowSx, color: "text.secondary" }}>{Locale.label("plans.planPage.moreItems", "+ {count} more items").replace("{count}", String(itemCount - PREVIEW_ROWS))}</Box>
      )}
      <Button component={RouterLink} to={basePath + "/order"} variant="outlined" endIcon={<ArrowForwardIcon />} sx={{ mt: 2, width: { xs: "100%", sm: "auto" } }} data-testid="plan-order-link">
        {canEdit ? Locale.label("plans.planPage.editOrder", "Edit order of service") : Locale.label("plans.planPage.viewOrder", "View order of service")}
      </Button>
    </Surface>
  );

  const teamCard = (
    <Surface aria-labelledby="plan-team-heading" data-testid="plan-team-summary">
      <RecordHeading id="plan-team-heading" label={Locale.label("plans.planPage.servingTeam", "Serving team")}>
        {plan.prepared && <Pill tone="warning" data-testid="penciled-in-chip">{Locale.label("plans.assignment.penciledIn") || "Penciled In"}</Pill>}
        {team.loaded && remaining > 0 && <Pill tone="warning">{remaining + " " + Locale.label("plans.assignment.needed")}</Pill>}
      </RecordHeading>
      {!team.loaded && <Typography variant="body2" color="text.secondary">{Locale.label("common.loading")}</Typography>}
      {team.loaded && positions.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>{Locale.label("plans.planPage.noPositions", "No positions yet.")}</Typography>}
      {categories.map((cat) => {
        const catPositions = positions.filter((p) => p.categoryName === cat);
        const catNeeded = catPositions.reduce((s, p) => s + (p.count || 0), 0);
        const catFilled = catPositions.reduce((s, p) => s + Math.min(assignments.filter((a) => a.positionId === p.id).length, p.count || 0), 0);
        return (
          <Box key={cat}>
            <Box sx={sectionSx}>{cat} · {Locale.label("plans.planPage.filledOf", "{filled} of {total}").replace("{filled}", String(catFilled)).replace("{total}", String(catNeeded))}</Box>
            {catPositions.map((p) => {
              const pa = assignments.filter((a) => a.positionId === p.id);
              const open = Math.max(0, (p.count || 0) - pa.length);
              return (
                <Box key={p.id} sx={{ ...rowSx, alignItems: "flex-start" }}>
                  <Box component="span" sx={{ flex: "0 0 40%", minWidth: 0, color: "text.secondary", overflowWrap: "anywhere" }}>{p.name}</Box>
                  <Box component="span" sx={{ flex: 1, minWidth: 0, textAlign: "right", overflowWrap: "anywhere" }}>
                    {pa.map((a) => personName(a.personId)).filter(Boolean).join(", ")}
                    {open > 0 && <Box component="span" sx={{ color: "var(--b1-warning)", fontWeight: 600 }}>{(pa.length > 0 ? " + " : "") + Locale.label("plans.planPage.openCount", "{count} needed").replace("{count}", String(open))}</Box>}
                  </Box>
                </Box>
              );
            })}
          </Box>
        );
      })}
      {team.loaded && positions.length > 0 && (
        <PlanValidation variant="summary" plan={plan} positions={positions} assignments={assignments} people={people} times={team.times} blockoutDates={team.blockoutDates} canEdit={canEdit} onUpdate={() => { team.reload(); onPlanChanged(); }} />
      )}
      <Button component={RouterLink} to={basePath + "/team"} variant="contained" endIcon={<ArrowForwardIcon />} sx={{ mt: 2, width: "100%" }} data-testid="plan-team-link">
        {canEdit ? Locale.label("plans.planPage.manageTeam", "Manage serving team") : Locale.label("plans.planPage.viewTeam", "View serving team")}
      </Button>
    </Surface>
  );

  return (
    <Stack spacing={{ xs: 2, md: 2.5 }} data-testid="plan-overview">
      <Box component="section" aria-label={Locale.label("plans.planPage.status", "Plan status")} sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: `repeat(${hasOrder ? 3 : 2}, minmax(0, 1fr))` }, gap: { xs: 1.25, md: 2 } }}>
        {hasOrder && <StatTile testId="plan-stat-runtime" label={Locale.label("plans.planPage.runTime", "Run time")} value={itemsLoaded ? (totalSeconds > 0 ? formatTime(totalSeconds) : "–") : "…"}
          sub={itemsLoaded && itemCount > 0 ? Locale.label("plans.planPage.itemsInSections", "{items} items in {sections} sections").replace("{items}", String(itemCount)).replace("{sections}", String(sectionCount)) : undefined} />}
        <StatTile testId="plan-stat-team" label={Locale.label("plans.planPage.servingTeam", "Serving team")}
          value={<>{totalFilled} <Box component="span" sx={{ fontSize: 15, color: "text.secondary" }}>{Locale.label("plans.planPage.ofFilled", "of {total} filled").replace("{total}", String(totalNeeded))}</Box></>}>
          {totalNeeded > 0 && <LinearProgress variant="determinate" value={Math.round((totalFilled / totalNeeded) * 100)} sx={{ mt: 1, height: 6, borderRadius: 3 }} aria-label={Locale.label("plans.planPage.servingTeam", "Serving team")} />}
        </StatTile>
        <Box sx={{ gridColumn: { xs: hasOrder ? "1 / -1" : "auto", md: "auto" } }}>
          <StatTile testId="plan-stat-responses" label={Locale.label("plans.planPage.responses", "Responses")}
            value={<>{accepted} <Box component="span" sx={{ fontSize: 15, color: "text.secondary" }}>{Locale.label("plans.planPage.accepted", "accepted")}</Box></>}
            sub={Locale.label("plans.planPage.pendingDeclined", "{pending} pending · {declined} declined").replace("{pending}", String(pending)).replace("{declined}", String(declined))} />
        </Box>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 7fr) minmax(0, 5fr)" }, gap: { xs: 2, md: 2.5 }, alignItems: "start" }}>
        {hasOrder ? orderCard : teamCard}
        <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ minWidth: 0 }}>
          {hasOrder && teamCard}
          <Surface>
            <TimeList times={team.times} positions={positions} plan={plan} canEdit={canEdit} onUpdate={team.reload} />
          </Surface>
          <PlanNotes plan={plan} canEdit={canEdit} onSaved={onPlanChanged} />
        </Stack>
      </Box>
    </Stack>
  );
};
