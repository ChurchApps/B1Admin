import { Grid, Icon, TextField, Typography, InputAdornment, Box, Alert, FormControlLabel, Switch, ButtonBase, Stack, Button } from "@mui/material";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiHelper, UserHelper, Locale } from "@churchapps/apphelper";
import { LinkedAccounts } from "./components/LinkedAccounts";
import { DarkMode, LightMode } from "@mui/icons-material";
import { LoadingButton } from "../components";
import { AppIconButton } from "../components/ui/AppIconButton";
import { FormCard } from "../components/ui/FormCard";
import { BackVerb, PageContainer, RecordHeading, RecordLayout, TextAction, useRecordView, RecordActions } from "../components/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type TaskInterface } from "@churchapps/helpers";
import { useThemeMode } from "../ThemeContext";
import { themeCatalog, type ThemeId } from "../helpers/Themes";
import { useConfirmDelete } from "../hooks";

export const ProfilePage = () => {
  const navigate = useNavigate();
  const { view, setView } = useRecordView("view", { replace: ["edit"] });
  const editing = view === "edit";
  const isDemo = process.env.REACT_APP_STAGE === "demo";
  const { mode, toggleTheme, themeId, setTheme } = useThemeMode();

  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [passwordVerify, setPasswordVerify] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [errors, setErrors] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const { confirm, ConfirmDialogElement } = useConfirmDelete();
  const queryClient = useQueryClient();
  const churchId = UserHelper.currentUserChurch?.church?.id || "";
  const [deletionRequested, setDeletionRequested] = useState(false);

  // Churches with a directory approval group review account deletions instead of the login vanishing on click.
  const publicSettings = useQuery<any>({ queryKey: ["/settings/public/" + churchId, "MembershipApi"], enabled: !!churchId });
  const requiresApproval = !!publicSettings.data?.directoryApprovalGroupId;
  const myTasks = useQuery<TaskInterface[]>({ queryKey: ["/tasks", "DoingApi"], placeholderData: [] });
  const pendingDeletion = deletionRequested || !!myTasks.data?.find((t) => t.taskType === "accountDeletion" && t.status === "Open");

  React.useEffect(() => {
    const { email, firstName, lastName } = UserHelper.user;
    setFirstName(firstName || "");
    setLastName(lastName || "");
    setEmail(email || "");
  }, []);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (password.length >= 8) {
        await ApiHelper.post("/users/updatePassword", { currentPassword, newPassword: password }, "MembershipApi");
      }

      if (areNamesChanged()) {
        await ApiHelper.post("/users/setDisplayName", { firstName, lastName }, "MembershipApi");
        UserHelper.user.firstName = firstName;
        UserHelper.user.lastName = lastName;
      }

      if (email !== UserHelper.user.email) {
        await ApiHelper.post("/users/updateEmail", { email }, "MembershipApi");
        UserHelper.user.email = email;
      }
    },
    onSuccess: () => {
      setSaveMessage(Locale.label("profile.profilePage.saveChange"));
      setView("");
      setCurrentPassword("");
      setPassword("");
      setPasswordVerify("");
    },
    onError: (error) => {
      console.error("Error saving profile:", error);
      setSaveMessage(Locale.label("profile.profilePage.saveError"));
    }
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      // Re-read the setting on the write path so a stale or failed query can never turn a review church into a direct delete.
      const settings = churchId ? await ApiHelper.get("/settings/public/" + churchId, "MembershipApi") : null;
      if (settings?.directoryApprovalGroupId) {
        await ApiHelper.post("/tasks?type=accountDeletion", [{ title: "Account deletion request" }], "DoingApi");
        return "requested";
      }
      await ApiHelper.delete("/users", "MembershipApi");
      return "deleted";
    },
    onSuccess: (result) => {
      if (result === "requested") {
        setDeletionRequested(true);
        queryClient.invalidateQueries({ queryKey: ["/tasks", "DoingApi"] });
      } else navigate("/logout", { replace: true });
    }
  });

  const handleSave = () => {
    if (validate()) {
      setSaveMessage("");
      updateProfileMutation.mutate();
    }
  };

  const areNamesChanged = () => {
    const { firstName: first, lastName: last } = UserHelper.user;
    return firstName !== first || lastName !== last;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.currentTarget.value;
    switch (e.currentTarget.name) {
      case "firstName": setFirstName(val); break;
      case "lastName": setLastName(val); break;
      case "email": setEmail(val); break;
      case "currentPassword": setCurrentPassword(val); break;
      case "password": setPassword(val); break;
      case "passwordVerify": setPasswordVerify(val); break;
    }
  };

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validate = () => {
    const validationRules = [
      { condition: !firstName, message: Locale.label("profile.profilePage.firstMsg") },
      { condition: !lastName, message: Locale.label("profile.profilePage.lastMsg") },
      { condition: email === "", message: Locale.label("profile.profilePage.emailMsg") },
      { condition: email !== "" && !validateEmail(email), message: Locale.label("profile.profilePage.valEmail") },
      { condition: password !== "" && !currentPassword, message: Locale.label("profile.profilePage.passCurrentMsg", "Please enter your current password.") },
      { condition: password !== passwordVerify, message: Locale.label("profile.profilePage.passMatch") },
      { condition: password !== "" && password.length < 8, message: Locale.label("profile.profilePage.passLong") }
    ];

    const errors = validationRules.filter((rule) => rule.condition).map((rule) => rule.message);

    setErrors(errors);
    return errors.length === 0;
  };

  const handleAccountDelete = async () => {
    const message = requiresApproval ? Locale.label("profile.profilePage.confirmRequestMsg", "Send a request to your church to delete your account? Nothing is removed until they approve it.") : Locale.label("profile.profilePage.confirmMsg");
    const options = requiresApproval ? { confirmLabel: Locale.label("profile.profilePage.sendRequest", "Send request"), destructive: false } : undefined;
    if (await confirm(message, options)) {
      deleteAccountMutation.mutate();
    }
  };

  const passwordAdornment = (
    <InputAdornment position="end">
      <AppIconButton label={Locale.label("profile.profilePage.togglePasswordVisibility")} icon={showPassword ? <Icon>visibility</Icon> : <Icon>visibility_off</Icon>} onClick={() => setShowPassword(!showPassword)} disabled={isDemo} />
    </InputAdornment>
  );

  const displayName = [UserHelper.user?.firstName, UserHelper.user?.lastName].filter(Boolean).join(" ") || Locale.label("profile.profilePage.profEdit");

  const identity = (
    <Box component="aside" data-testid="profile-identity">
      <Typography id="page-header-title" variant="h1" component="h1" sx={{ overflowWrap: "anywhere" }}>{displayName}</Typography>
      {UserHelper.user?.email && <Typography color="text.secondary" sx={{ mt: 0.5, overflowWrap: "anywhere" }}>{UserHelper.user.email}</Typography>}
      <RecordActions sx={{ mt: 2 }} buttons={!editing && <Button variant="contained" onClick={() => { setSaveMessage(""); setView("edit"); }} data-testid="profile-edit-button">{Locale.label("common.edit")}</Button>}>
        <TextAction small to="/profile/devices" component={Link} data-testid="profile-devices-link">{Locale.label("profile.devices.title", "Devices")}</TextAction>
      </RecordActions>

      <Box sx={{ mt: 4 }}>
        <RecordHeading label={Locale.label("profile.profilePage.themePreferences")} />
        <Stack direction="row" spacing={1.5} role="group" aria-label={Locale.label("profile.profilePage.colorTheme", "Color theme")} sx={{ mt: 0.5 }}>
          {themeCatalog.map((choice) => {
            const selected = themeId === choice.id;
            const label = choice.id === "warm"
              ? Locale.label("profile.profilePage.themeWarm", "Warm")
              : Locale.label("profile.profilePage.themeSoft", "Soft Blue");
            return (
              <ButtonBase
                key={choice.id}
                onClick={() => setTheme(choice.id as ThemeId)}
                aria-pressed={selected}
                data-testid={`theme-${choice.id}`}
                sx={{
                  width: 148,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "stretch",
                  textAlign: "left",
                  borderRadius: "var(--b1-radius-panel)",
                  border: "2px solid",
                  borderColor: selected ? "primary.main" : "divider",
                  overflow: "hidden"
                }}>
                <Box sx={{ height: 36, bgcolor: choice.header, display: "flex", alignItems: "center", gap: 0.75, px: 1.25 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: choice.primary }} />
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: choice.accent }} />
                </Box>
                <Box sx={{ px: 1.25, py: 1, bgcolor: choice.canvas }}>
                  <Typography variant="body2" sx={{ fontWeight: 650, color: choice.ink }}>{label}</Typography>
                </Box>
              </ButtonBase>
            );
          })}
        </Stack>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 2 }}>
          <LightMode color={mode === "light" ? "primary" : "disabled"} />
          <FormControlLabel
            sx={{ mr: 0 }}
            control={<Switch checked={mode === "dark"} onChange={toggleTheme} data-testid="theme-toggle" />}
            label={mode === "dark" ? Locale.label("profile.profilePage.darkMode") : Locale.label("profile.profilePage.lightMode")}
          />
          <DarkMode color={mode === "dark" ? "primary" : "disabled"} />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{Locale.label("profile.profilePage.themePreferencesHelper")}</Typography>
      </Box>

      <Box sx={{ mt: 4 }}>
        <RecordHeading label={Locale.label("profile.profilePage.accDel")} />
        <Typography variant="body2" color="text.secondary">
          {requiresApproval ? Locale.label("profile.profilePage.reviewWarn", "Your church reviews account deletion requests before anything is removed.") : Locale.label("profile.profilePage.permWarn")}
        </Typography>
        {pendingDeletion && (
          <Alert severity="info" sx={{ mt: 2 }} data-testid="account-deletion-pending">
            {Locale.label("profile.profilePage.deletionPending", "Your account deletion request is awaiting review by your church. Nothing will be removed until it is approved.")}
          </Alert>
        )}
        {deleteAccountMutation.error && <Alert severity="error" sx={{ mt: 2 }}>{deleteAccountMutation.error.message || Locale.label("profile.profilePage.deleteError")}</Alert>}
        <Box sx={{ mt: 2 }}>
          <LoadingButton variant="outlined" color="error" loading={deleteAccountMutation.isPending} disabled={isDemo || pendingDeletion} onClick={handleAccountDelete} data-testid="delete-account-button">
            {Locale.label("profile.profilePage.delAcc")}
          </LoadingButton>
        </Box>
      </Box>
    </Box>
  );

  const editSlice = (
    <>
      <Box><BackVerb name={displayName} onClick={() => setView("")} data-testid="profile-record-back" /></Box>
      {isDemo && <Alert severity="info">{Locale.label("profile.profilePage.demoModeAlert")}</Alert>}
      {errors.length > 0 && (
        <Alert severity="error">
          <ul style={{ margin: 0, paddingLeft: "20px" }}>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}
      {updateProfileMutation.error && <Alert severity="error">{updateProfileMutation.error.message || Locale.label("profile.profilePage.saveError")}</Alert>}
      {saveMessage && <Alert severity={updateProfileMutation.isError ? "error" : "success"}>{saveMessage}</Alert>}
      <FormCard title={Locale.label("profile.profilePage.profEdit")} onSave={handleSave} onCancel={() => setView("")} saveText={Locale.label("profile.profilePage.saveChanges")} isSubmitting={updateProfileMutation.isPending} disabled={isDemo}>
        <Grid container spacing={2} sx={{ maxWidth: 640 }}>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth type="email" name="email" label={Locale.label("person.email")} value={email} onChange={handleChange} disabled={isDemo} placeholder={Locale.label("placeholders.person.simpleEmail")} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth name="firstName" label={Locale.label("person.firstName")} value={firstName} onChange={handleChange} disabled={isDemo} placeholder={Locale.label("placeholders.person.firstName")} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth name="lastName" label={Locale.label("person.lastName")} value={lastName} onChange={handleChange} disabled={isDemo} placeholder={Locale.label("placeholders.person.lastName")} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField type={showPassword ? "text" : "password"} fullWidth name="currentPassword" label={Locale.label("profile.profilePage.passCurrent", "Current password")} value={currentPassword} onChange={handleChange} disabled={isDemo} InputProps={{ endAdornment: passwordAdornment }} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              type={showPassword ? "text" : "password"}
              fullWidth
              name="password"
              label={Locale.label("profile.profilePage.passNew")}
              value={password}
              onChange={handleChange}
              disabled={isDemo}
              helperText={isDemo ? Locale.label("profile.profilePage.demoPasswordHelper") : Locale.label("profile.profilePage.passwordHelper")}
              InputProps={{ endAdornment: passwordAdornment }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField type={showPassword ? "text" : "password"} fullWidth name="passwordVerify" label={Locale.label("profile.profilePage.passVer")} value={passwordVerify} onChange={handleChange} disabled={isDemo} InputProps={{ endAdornment: passwordAdornment }} />
          </Grid>
        </Grid>
      </FormCard>
    </>
  );

  return (
    <>
      {ConfirmDialogElement}
      <PageContainer>
        <RecordLayout identity={identity} spacing={3} data-testid="profile-record">
          {editing ? editSlice : (
            <>
              {saveMessage && <Alert severity={updateProfileMutation.isError ? "error" : "success"}>{saveMessage}</Alert>}
              <LinkedAccounts />
            </>
          )}
        </RecordLayout>
      </PageContainer>
    </>
  );
};
