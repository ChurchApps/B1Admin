import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack, Typography, Alert } from "@mui/material";
import { ApiHelper, UserHelper, Permissions } from "@churchapps/apphelper";
import { type GroupInterface, type GroupMemberInterface } from "@churchapps/helpers";
import UserContext from "../../UserContext";

export type WizardType = "freeshow" | "freeplay" | "webpage" | "group";

interface Props {
  wizardType: WizardType;
  open: boolean;
  onClose: () => void;
  onComplete: (redirectUrl: string) => void;
}

const wizardConfig: Record<WizardType, { title: string; description: string }> = {
  freeshow: {
    title: "Set Up FreeShow Backups",
    description: "To back up your FreeShow data, we need to create a ministry and a team. You'll then be redirected to add team members."
  },
  freeplay: {
    title: "Set Up Your FreePlay Classroom",
    description: "To get started with FreePlay, we need to create a ministry and a classroom. You'll then be redirected to pair a content provider."
  },
  webpage: {
    title: "Create Your First Webpage",
    description: "Enter a title for your first page. You'll be redirected to the page editor to add content."
  },
  group: {
    title: "Create Your First Group",
    description: "Enter a name for your group. You'll be redirected to the group page to configure it and add members."
  }
};

export const QuickSetupModal: React.FC<Props> = ({ wizardType, open, onClose, onComplete }) => {
  const context = React.useContext(UserContext);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");

  // FreeShow fields
  const [ministryName, setMinistryName] = React.useState("Worship");
  const [teamName, setTeamName] = React.useState("Worship Team");

  // Webpage field
  const [pageTitle, setPageTitle] = React.useState("Home");

  // FreePlay fields
  const [classroomName, setClassroomName] = React.useState("");

  // Group field
  const [groupName, setGroupName] = React.useState("");

  const config = wizardConfig[wizardType];

  const handleSubmit = async () => {
    setError("");
    setIsSubmitting(true);
    try {
      switch (wizardType) {
        case "freeshow":
          await handleFreeshowSetup();
          break;
        case "freeplay":
          await handleFreeplaySetup();
          break;
        case "webpage":
          await handleWebpageSetup();
          break;
        case "group":
          await handleGroupSetup();
          break;
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFreeshowSetup = async () => {
    if (!UserHelper.checkAccess(Permissions.membershipApi.groups.edit)) {
      setError("You don't have permission to perform this action. Required: MembershipApi - Groups - Edit");
      return;
    }
    if (!ministryName.trim() || !teamName.trim()) {
      setError("Please enter both a ministry name and a team name.");
      return;
    }

    // Create ministry
    const ministry: GroupInterface = { name: ministryName.trim(), tags: "ministry", categoryName: "Ministry" };
    const ministryResult = await ApiHelper.post("/groups", [ministry], "MembershipApi");
    const ministryId = ministryResult[0].id;

    // Auto-add creator as ministry member
    if (context?.person?.id) {
      const member: GroupMemberInterface = { groupId: ministryId, personId: context.person.id };
      await ApiHelper.post("/groupMembers", [member], "MembershipApi");
    }

    // Create team under ministry
    const team: GroupInterface = { name: teamName.trim(), tags: "team", categoryName: ministryId };
    const teamResult = await ApiHelper.post("/groups", [team], "MembershipApi");

    // Auto-add creator as team leader
    if (context?.person?.id) {
      const teamMember: GroupMemberInterface = { groupId: teamResult[0].id, personId: context.person.id, leader: true };
      await ApiHelper.post("/groupMembers", [teamMember], "MembershipApi");
    }

    onComplete(`/groups/${teamResult[0].id}`);
  };

  const handleFreeplaySetup = async () => {
    if (!UserHelper.checkAccess(Permissions.membershipApi.groups.edit) || !UserHelper.checkAccess(Permissions.membershipApi.plans.edit)) {
      setError("You don't have permission to perform this action. Required: MembershipApi - Groups - Edit, MembershipApi - Plans - Edit");
      return;
    }
    if (!ministryName.trim() || !classroomName.trim()) {
      setError("Please enter both a ministry name and a classroom name.");
      return;
    }

    // Create ministry
    const ministry: GroupInterface = { name: ministryName.trim(), tags: "ministry", categoryName: "Ministry" };
    const ministryResult = await ApiHelper.post("/groups", [ministry], "MembershipApi");
    const ministryId = ministryResult[0].id;

    // Auto-add creator as ministry member
    if (context?.person?.id) {
      const member: GroupMemberInterface = { groupId: ministryId, personId: context.person.id };
      await ApiHelper.post("/groupMembers", [member], "MembershipApi");
    }

    // Create planType (classroom) under ministry
    const planType = { name: classroomName.trim(), ministryId };
    await ApiHelper.post("/planTypes", [planType], "DoingApi");

    onComplete("/serving");
  };

  const handleWebpageSetup = async () => {
    if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) {
      setError("You don't have permission to perform this action. Required: ContentApi - Content - Edit");
      return;
    }
    if (!pageTitle.trim()) {
      setError("Please enter a page title.");
      return;
    }

    const churchId = context.userChurch?.church?.id;
    const page = { title: pageTitle.trim(), churchId, layout: "headerFooter" };
    const result = await ApiHelper.post("/pages", [page], "ContentApi");

    onComplete(`/site/pages/${result[0].id}`);
  };

  const handleGroupSetup = async () => {
    if (!UserHelper.checkAccess(Permissions.membershipApi.groups.edit)) {
      setError("You don't have permission to perform this action. Required: MembershipApi - Groups - Edit");
      return;
    }
    if (!groupName.trim()) {
      setError("Please enter a group name.");
      return;
    }

    const group: GroupInterface = { name: groupName.trim(), tags: "standard", categoryName: "General" };
    const result = await ApiHelper.post("/groups", [group], "MembershipApi");

    onComplete(`/groups/${result[0].id}`);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{config.title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {config.description}
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {wizardType === "freeshow" && (
          <Stack spacing={2}>
            <TextField label="Ministry Name" value={ministryName} onChange={(e) => setMinistryName(e.target.value)} fullWidth autoFocus />
            <TextField label="Team Name" value={teamName} onChange={(e) => setTeamName(e.target.value)} fullWidth />
          </Stack>
        )}

        {wizardType === "freeplay" && (
          <Stack spacing={2}>
            <TextField label="Ministry Name" value={ministryName} onChange={(e) => setMinistryName(e.target.value)} fullWidth autoFocus />
            <TextField label="Classroom Name" value={classroomName} onChange={(e) => setClassroomName(e.target.value)} fullWidth />
          </Stack>
        )}

        {wizardType === "webpage" && (
          <TextField label="Page Title" value={pageTitle} onChange={(e) => setPageTitle(e.target.value)} fullWidth autoFocus />
        )}

        {wizardType === "group" && (
          <TextField label="Group Name" value={groupName} onChange={(e) => setGroupName(e.target.value)} fullWidth autoFocus />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create & Continue"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
