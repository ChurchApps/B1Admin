import React from "react";
import { ApiHelper, DateHelper, Locale } from "@churchapps/apphelper";
import { Box, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from "@mui/material";
import { Refresh as RefreshIcon, Replay as RetryIcon, Pause as PauseIcon, PlayArrow as ResumeIcon } from "@mui/icons-material";
import { AppIconButton } from "../../../../components/ui/AppIconButton";
import { type WorkflowTriggerInterface } from "./TriggerEditDialog";

export interface AutomationExecutionInterface {
  id?: string;
  triggerId?: string;
  workflowId?: string;
  subjectType?: string;
  subjectId?: string;
  subjectLabel?: string;
  eventType?: string;
  status?: string;
  attemptCount?: number;
  nextAttemptAt?: string;
  lastError?: string;
  dateCreated?: string;
  dateCompleted?: string;
}

interface Props {
  workflowId: string;
  triggers: WorkflowTriggerInterface[];
  canManage?: boolean;
  refreshKey?: number;
}

const STATUS_COLORS: Record<string, "success" | "warning" | "error" | "default"> = { success: "success", pending: "warning", failed: "error", paused: "default" };

export const TriggerExecutionsPanel: React.FC<Props> = (props) => {
  const [executions, setExecutions] = React.useState<AutomationExecutionInterface[]>([]);

  const load = React.useCallback(async () => {
    const data = await ApiHelper.get("/workflowTriggers/executions/workflow/" + props.workflowId, "DoingApi");
    setExecutions(data || []);
  }, [props.workflowId]);

  React.useEffect(() => { load(); }, [load, props.refreshKey]);

  const triggerName = (id?: string) => props.triggers.find((t) => t.id === id)?.name || Locale.label("tasks.executions.deletedTrigger");

  const act = async (execution: AutomationExecutionInterface, action: "retry" | "pause" | "resume") => {
    await ApiHelper.post("/workflowTriggers/executions/" + execution.id + "/" + action, [], "DoingApi");
    load();
  };

  const statusChip = (e: AutomationExecutionInterface) => {
    const chip = <Chip size="small" label={Locale.label("tasks.executions.status_" + e.status) || e.status} color={STATUS_COLORS[e.status ?? ""] || "default"} data-testid={"execution-status-" + e.id} />;
    return e.lastError ? <Tooltip title={e.lastError}>{chip}</Tooltip> : chip;
  };

  return (
    <Box sx={{ mt: 3 }} data-testid="trigger-executions-panel">
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle2">{Locale.label("tasks.executions.title")}</Typography>
        <AppIconButton label={Locale.label("tasks.executions.refresh")} icon={<RefreshIcon />} data-testid="refresh-executions" onClick={load} />
      </Stack>
      {executions.length === 0 ? (
        <Typography variant="body2" color="text.secondary">{Locale.label("tasks.executions.noExecutions")}</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{Locale.label("tasks.executions.when")}</TableCell>
              <TableCell>{Locale.label("tasks.executions.trigger")}</TableCell>
              <TableCell>{Locale.label("tasks.executions.subject")}</TableCell>
              <TableCell>{Locale.label("tasks.executions.statusHeader")}</TableCell>
              <TableCell align="right">{Locale.label("tasks.executions.attempts")}</TableCell>
              {props.canManage && <TableCell align="right"></TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {executions.map((e) => (
              <TableRow key={e.id} data-testid={"execution-row-" + e.id}>
                <TableCell>{DateHelper.prettyDateTime(DateHelper.toDate(e.dateCreated))}</TableCell>
                <TableCell>{triggerName(e.triggerId)}</TableCell>
                <TableCell>{e.subjectLabel || e.subjectId}</TableCell>
                <TableCell>{statusChip(e)}</TableCell>
                <TableCell align="right">{e.attemptCount ?? 0}</TableCell>
                {props.canManage && (
                  <TableCell align="right" className="rowActions">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      {(e.status === "failed" || e.status === "paused") && <AppIconButton label={Locale.label("tasks.executions.retry")} icon={<RetryIcon />} data-testid={"retry-execution-" + e.id} onClick={() => act(e, "retry")} />}
                      {e.status === "pending" && <AppIconButton label={Locale.label("tasks.executions.pause")} icon={<PauseIcon />} data-testid={"pause-execution-" + e.id} onClick={() => act(e, "pause")} />}
                      {e.status === "paused" && <AppIconButton label={Locale.label("tasks.executions.resume")} icon={<ResumeIcon />} data-testid={"resume-execution-" + e.id} onClick={() => act(e, "resume")} />}
                    </Stack>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
};
