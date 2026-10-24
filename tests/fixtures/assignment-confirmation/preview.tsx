/** Synthetic preview of the real product components. No account, API, or providers. */
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Box, Button, Container, CssBaseline, Paper, Stack, ThemeProvider, Typography, createTheme } from "@mui/material";
import { ApiHelper, Locale, UserHelper } from "@churchapps/apphelper";
import { queryClient } from "../../../src/queryClient";
import { UserProvider } from "../../../src/UserContext";
import { PlanEdit } from "../../../src/serving/components/PlanEdit";
import { PlanValidation } from "../../../src/serving/components/PlanValidation";
import { WorkflowStepActions } from "../../../src/serving/tasks/workflows/components/WorkflowStepActions";
import { WorkflowCardDrawer } from "../../../src/serving/tasks/workflows/components/WorkflowCardDrawer";
import { type PlanInterface } from "../../../src/helpers";

const plan: PlanInterface = { id: "plan1", name: "Sample Sunday Service", ministryId: "ministry1", planTypeId: "type1", serviceDate: new Date("2030-04-07T12:00:00Z"), confirmationWorkflowId: "wf1", prepared: false };
const workflow = { id: "wf1", name: "Serving Assignment Confirmation", active: true, workflowType: "assignmentConfirmation" };
const actions = [
  { id: "email", stepId: "step1", sort: 1, actionType: "sendAssignmentRequest", config: JSON.stringify({ channel: "email", message: "Please accept or decline your serving request." }) },
  { id: "sms", stepId: "step1", sort: 2, actionType: "sendAssignmentRequest", config: JSON.stringify({ channel: "sms" }) },
  { id: "wait", stepId: "step1", sort: 3, actionType: "delay", config: JSON.stringify({ days: 2 }) }
];
const calls: { method: string; path: string; body?: unknown }[] = [];
(window as any).confirmationPreview = { calls };
(UserHelper as any).checkAccess = () => true;
(UserHelper as any).currentUserChurch = { church: { id: "c1", subDomain: "example", name: "Sample Church" }, person: { id: "leader1" } };
(ApiHelper as any).get = async (path: string) => {
  if (path.startsWith("/plans/confirmationWorkflows")) return [workflow];
  if (path.startsWith("/workflowStepActions/step/")) return actions;
  if (path === "/texting/providers" || path === "/emailTemplates") return [];
  if (path.endsWith("/contact")) return { email: "volunteer@example.test", mobilePhone: "+15555550123" };
  if (path.startsWith("/plans/")) return plan;
  return [];
};
(ApiHelper as any).post = async (path: string, body: any) => {
  calls.push({ method: "POST", path, body });
  if (path.endsWith("/issueRequests")) return { issued: 1 };
  if (path === "/workflowStepActions") return body.map((a: any) => ({ ...a, id: a.id || "newAction" }));
  return body;
};
(ApiHelper as any).delete = async (path: string) => { calls.push({ method: "DELETE", path }); return {}; };

function Preview() {
  const [tab, setTab] = React.useState("actions");
  const [drawer, setDrawer] = React.useState(false);
  const [issued, setIssued] = React.useState(false);
  const actionsSaveRef = React.useRef<() => Promise<void>>(null);
  const card = { id: "card1", title: "Sample Volunteer · Greeter · Sample Sunday Service", churchId: "c1", taskType: "card", status: "Open", workflowId: "wf1", stepId: "call", assignmentId: "a1", associatedWithType: "person", associatedWithId: "p1", associatedWithLabel: "Sample Volunteer", assignedToType: "person", assignedToId: "leader1", assignedToLabel: "Sample Coordinator", dueDate: new Date("2030-04-05"), data: JSON.stringify({ assignment: { planId: "plan1", planName: plan.name, positionName: "Greeter", serviceDate: "2030-04-07" }, history: [{ date: "2030-04-01", message: "Serving request issued" }, { date: "2030-04-01", message: "Email: sent" }, { date: "2030-04-01", message: "Text: blocked (no_provider)" }, { date: "2030-04-01", message: "Waiting 2 day(s)" }] }) };
  return <Container maxWidth="md" sx={{ py: 4 }}>
    <Typography variant="overline">Synthetic local preview · no messages are sent</Typography>
    <Typography variant="h4" component="h1" sx={{ mb: 2 }}>Serving assignment confirmation</Typography>
    <Stack direction="row" gap={1} sx={{ mb: 3 }}>
      <Button onClick={() => setTab("plan")} data-testid="preview-plan">Plan settings</Button>
      <Button onClick={() => setTab("actions")} data-testid="preview-actions">Workflow actions</Button>
      <Button onClick={() => setTab("issue")} data-testid="preview-issue">Issue request</Button>
      <Button onClick={() => setDrawer(true)} data-testid="preview-card">Follow-up card</Button>
    </Stack>
    <Paper variant="outlined" sx={{ p: 3 }}>
      {tab === "plan" && <PlanEdit plan={plan} plans={[]} updatedFunction={() => {}} />}
      {tab === "actions" && <><Typography variant="h6" sx={{ mb: 2 }}>Request and wait for response</Typography><WorkflowStepActions saveRef={actionsSaveRef} stepId="step1" workflows={[workflow]} assignmentConfirmation /><Button variant="contained" data-testid="preview-actions-save" onClick={() => actionsSaveRef.current?.()}>Save</Button></>}
      {tab === "issue" && <><PlanValidation plan={plan} positions={[{ id: "pos1", name: "Greeter", count: 1, planId: "plan1" }]} assignments={[{ id: "a1", personId: "p1", positionId: "pos1", status: "Unconfirmed" }]} people={[{ id: "p1", name: { first: "Sample", last: "Volunteer", display: "Sample Volunteer" }, contactInfo: {} }]} times={[]} blockoutDates={[]} canEdit onUpdate={() => setIssued(true)} />{issued && <Typography role="status" data-testid="preview-issued">One synthetic request issued.</Typography>}</>}
    </Paper>
    {drawer && <WorkflowCardDrawer card={card} steps={[{ id: "call", name: "Call volunteer about unanswered request" }]} onClose={() => setDrawer(false)} onChanged={() => {}} />}
    <Box sx={{ mt: 2 }}><Typography variant="body2" color="text.secondary">The default workflow sends an email and an eligible text, waits two days, follows up by email, then waits one day before a human call. Acceptance or decline closes that assignment's case. Expiry creates a coordinator review task.</Typography></Box>
  </Container>;
}
await Locale.init(["/locales/{{lng}}.json", "/apphelper/locales/{{lng}}.json"]);
createRoot(document.getElementById("root")!).render(<ThemeProvider theme={createTheme()}><CssBaseline /><BrowserRouter><QueryClientProvider client={queryClient}><UserProvider><Preview /></UserProvider></QueryClientProvider></BrowserRouter></ThemeProvider>);
