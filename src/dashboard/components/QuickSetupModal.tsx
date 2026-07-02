import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack, Typography, Alert } from "@mui/material";
import { ApiHelper, UserHelper, Permissions, Locale } from "@churchapps/apphelper";
import { type GroupInterface, type GroupMemberInterface } from "@churchapps/helpers";
import UserContext from "../../UserContext";
import { hasPlansEditAccess } from "../../helpers";

export type WizardType = "freeshow" | "freeplay" | "webpage" | "group";

interface Props {
  wizardType: WizardType;
  open: boolean;
  onClose: () => void;
  onComplete: (redirectUrl: string) => void;
}

const getWizardConfig = (): Record<WizardType, { title: string; description: string }> => ({
  freeshow: {
    title: Locale.label("dashboard.quickSetupModal.freeShowTitle"),
    description: Locale.label("dashboard.quickSetupModal.freeShowDescription")
  },
  freeplay: {
    title: Locale.label("dashboard.quickSetupModal.freePlayTitle"),
    description: Locale.label("dashboard.quickSetupModal.freePlayDescription")
  },
  webpage: {
    title: Locale.label("dashboard.quickSetupModal.webpageTitle"),
    description: Locale.label("dashboard.quickSetupModal.webpageDescription")
  },
  group: {
    title: Locale.label("dashboard.quickSetupModal.groupTitle"),
    description: Locale.label("dashboard.quickSetupModal.groupDescription")
  }
});

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

  const config = getWizardConfig()[wizardType];

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
      setError(e.message || Locale.label("dashboard.quickSetupModal.errorGeneric"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFreeshowSetup = async () => {
    if (!UserHelper.checkAccess(Permissions.membershipApi.groups.edit)) {
      setError(Locale.label("dashboard.quickSetupModal.errorPermGroups"));
      return;
    }
    if (!ministryName.trim() || !teamName.trim()) {
      setError(Locale.label("dashboard.quickSetupModal.errorBothMinistryTeam"));
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
    if (!UserHelper.checkAccess(Permissions.membershipApi.groups.edit) || !hasPlansEditAccess()) {
      setError(Locale.label("dashboard.quickSetupModal.errorPermFreePlay"));
      return;
    }
    if (!ministryName.trim() || !classroomName.trim()) {
      setError(Locale.label("dashboard.quickSetupModal.errorBothMinistryClassroom"));
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
      setError(Locale.label("dashboard.quickSetupModal.errorPermPages"));
      return;
    }
    if (!pageTitle.trim()) {
      setError(Locale.label("dashboard.quickSetupModal.errorPageTitle"));
      return;
    }

    const churchId = context.userChurch?.church?.id;
    const page = { title: pageTitle.trim(), churchId, layout: "headerFooter" };
    const result = await ApiHelper.post("/pages", [page], "ContentApi");

    onComplete(`/site/pages/${result[0].id}`);
  };

  const handleGroupSetup = async () => {
    if (!UserHelper.checkAccess(Permissions.membershipApi.groups.edit)) {
      setError(Locale.label("dashboard.quickSetupModal.errorPermGroups"));
      return;
    }
    if (!groupName.trim()) {
      setError(Locale.label("dashboard.quickSetupModal.errorGroupName"));
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
            <TextField label={Locale.label("dashboard.quickSetupModal.ministryName")} value={ministryName} onChange={(e) => setMinistryName(e.target.value)} fullWidth autoFocus />
            <TextField label={Locale.label("dashboard.quickSetupModal.teamName")} value={teamName} onChange={(e) => setTeamName(e.target.value)} fullWidth />
          </Stack>
        )}

        {wizardType === "freeplay" && (
          <Stack spacing={2}>
            <TextField label={Locale.label("dashboard.quickSetupModal.ministryName")} value={ministryName} onChange={(e) => setMinistryName(e.target.value)} fullWidth autoFocus />
            <TextField label={Locale.label("dashboard.quickSetupModal.classroomName")} value={classroomName} onChange={(e) => setClassroomName(e.target.value)} fullWidth />
          </Stack>
        )}

        {wizardType === "webpage" && (
          <TextField label={Locale.label("dashboard.quickSetupModal.pageTitle")} value={pageTitle} onChange={(e) => setPageTitle(e.target.value)} fullWidth autoFocus />
        )}

        {wizardType === "group" && (
          <TextField label={Locale.label("dashboard.quickSetupModal.groupName")} value={groupName} onChange={(e) => setGroupName(e.target.value)} fullWidth autoFocus />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{Locale.label("common.cancel")}</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isSubmitting}>
          {isSubmitting ? Locale.label("dashboard.quickSetupModal.creating") : Locale.label("dashboard.quickSetupModal.createContinue")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
