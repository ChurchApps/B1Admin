import { Grid, Icon, TextField, Typography, InputAdornment, Box, Card, CardContent, Alert, Stack, FormControlLabel, Switch } from "@mui/material";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiHelper, UserHelper, Locale } from "@churchapps/apphelper";
import { LinkedAccounts } from "./components/LinkedAccounts";
import { DarkMode, LightMode, Person as PersonIcon } from "@mui/icons-material";
import { PageHeader } from "@churchapps/apphelper";
import { LoadingButton } from "../components";
import { AppIconButton } from "../components/ui/AppIconButton";
import { FormCard } from "../components/ui/FormCard";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type TaskInterface } from "@churchapps/helpers";
import { useThemeMode } from "../ThemeContext";
import { useConfirmDelete } from "../hooks";

export const ProfilePage = () => {
  const navigate = useNavigate();
  const isDemo = process.env.REACT_APP_STAGE === "demo";
  const { mode, toggleTheme } = useThemeMode();

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
      const promises: Promise<any>[] = [];

      if (password.length >= 8) {
        promises.push(ApiHelper.post("/users/updatePassword", { currentPassword, newPassword: password }, "MembershipApi"));
      }

      if (areNamesChanged()) {
        promises.push(ApiHelper.post("/users/setDisplayName", { firstName, lastName }, "MembershipApi"));
      }

      if (email !== UserHelper.user.email) {
        promises.push(ApiHelper.post("/users/updateEmail", { email }, "MembershipApi"));
      }

      await Promise.all(promises);
    },
    onSuccess: () => {
      UserHelper.user.firstName = firstName;
      UserHelper.user.lastName = lastName;
      UserHelper.user.email = email;
      setSaveMessage(Locale.label("profile.profilePage.saveChange"));
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

  return (
    <>
      {ConfirmDialogElement}
      <PageHeader icon={<PersonIcon />} title={Locale.label("profile.profilePage.profEdit")} subtitle={Locale.label("profile.profilePage.subtitle")} />

      <Box sx={{ p: 3 }}>
        <Stack spacing={3}>
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

          {deleteAccountMutation.error && <Alert severity="error">{deleteAccountMutation.error.message || Locale.label("profile.profilePage.deleteError")}</Alert>}

          {saveMessage && <Alert severity="success">{saveMessage}</Alert>}

          <FormCard title={Locale.label("profile.profilePage.profEdit")} icon="person" onSave={handleSave} saveText={Locale.label("profile.profilePage.saveChanges")} isSubmitting={updateProfileMutation.isPending} disabled={isDemo}>
            <Grid container spacing={2}>
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
                <TextField
                  type={showPassword ? "text" : "password"}
                  fullWidth
                  name="currentPassword"
                  label={Locale.label("profile.profilePage.passCurrent", "Current password")}
                  value={currentPassword}
                  onChange={handleChange}
                  disabled={isDemo}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <AppIconButton label={Locale.label("profile.profilePage.togglePasswordVisibility")} icon={showPassword ? <Icon>visibility</Icon> : <Icon>visibility_off</Icon>} onClick={() => setShowPassword(!showPassword)} disabled={isDemo} />
                      </InputAdornment>
                    )
                  }}
                />
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
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <AppIconButton label={Locale.label("profile.profilePage.togglePasswordVisibility")} icon={showPassword ? <Icon>visibility</Icon> : <Icon>visibility_off</Icon>} onClick={() => setShowPassword(!showPassword)} disabled={isDemo} />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  type={showPassword ? "text" : "password"}
                  fullWidth
                  name="passwordVerify"
                  label={Locale.label("profile.profilePage.passVer")}
                  value={passwordVerify}
                  onChange={handleChange}
                  disabled={isDemo}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <AppIconButton label={Locale.label("profile.profilePage.togglePasswordVisibility")} icon={showPassword ? <Icon>visibility</Icon> : <Icon>visibility_off</Icon>} onClick={() => setShowPassword(!showPassword)} disabled={isDemo} />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
            </Grid>
          </FormCard>

          <LinkedAccounts />

          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6" gutterBottom>
                  {Locale.label("profile.profilePage.themePreferences")}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <LightMode color={mode === "light" ? "primary" : "disabled"} />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={mode === "dark"}
                        onChange={toggleTheme}
                        data-testid="theme-toggle"
                      />
                    }
                    label={mode === "dark" ? Locale.label("profile.profilePage.darkMode") : Locale.label("profile.profilePage.lightMode")}
                  />
                  <DarkMode color={mode === "dark" ? "primary" : "disabled"} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {Locale.label("profile.profilePage.themePreferencesHelper")}
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6" color="error" gutterBottom>
                  {Locale.label("profile.profilePage.accDel")}
                </Typography>
                <Typography color="text.secondary">{requiresApproval ? Locale.label("profile.profilePage.reviewWarn", "Your church reviews account deletion requests before anything is removed.") : Locale.label("profile.profilePage.permWarn")}</Typography>
                {pendingDeletion && (
                  <Alert severity="info" data-testid="account-deletion-pending">
                    {Locale.label("profile.profilePage.deletionPending", "Your account deletion request is awaiting review by your church. Nothing will be removed until it is approved.")}
                  </Alert>
                )}
                <Box>
                  <LoadingButton variant="outlined" loading={deleteAccountMutation.isPending} disabled={isDemo || pendingDeletion} onClick={handleAccountDelete} data-testid="delete-account-button">
                    {Locale.label("profile.profilePage.delAcc")}
                  </LoadingButton>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Box>
    </>
  );
};
