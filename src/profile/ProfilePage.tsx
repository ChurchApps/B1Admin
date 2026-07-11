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
import { useMutation } from "@tanstack/react-query";
import { useThemeMode } from "../ThemeContext";
import { useConfirmDelete } from "../hooks";

export const ProfilePage = () => {
  const navigate = useNavigate();
  const isDemo = process.env.REACT_APP_STAGE === "demo";
  const { mode, toggleTheme } = useThemeMode();

  const [password, setPassword] = useState<string>("");
  const [passwordVerify, setPasswordVerify] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [errors, setErrors] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  React.useEffect(() => {
    const { email, firstName, lastName } = UserHelper.user;
    setFirstName(firstName || "");
    setLastName(lastName || "");
    setEmail(email || "");
  }, []);

  const sendEventToReactNative = (eventName: string, data?: any) => {
    if ((window as any).ReactNativeWebView) {
      (window as any).ReactNativeWebView.postMessage(JSON.stringify({ event: eventName, data }));
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const promises: Promise<any>[] = [];

      if (password.length >= 8) {
        promises.push(ApiHelper.post("/users/updatePassword", { newPassword: password }, "MembershipApi"));
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
      setPassword("");
      setPasswordVerify("");
      sendEventToReactNative("profile_updated");
    },
    onError: (error) => {
      console.error("Error saving profile:", error);
      setSaveMessage(Locale.label("profile.profilePage.saveError"));
    }
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => ApiHelper.delete("/users", "MembershipApi"),
    onSuccess: () => {
      sendEventToReactNative("profile_deleted");
      navigate("/logout", { replace: true });
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
      { condition: password !== passwordVerify, message: Locale.label("profile.profilePage.passMatch") },
      { condition: password !== "" && password.length < 8, message: Locale.label("profile.profilePage.passLong") }
    ];

    const errors = validationRules.filter((rule) => rule.condition).map((rule) => rule.message);

    setErrors(errors);
    return errors.length === 0;
  };

  const handleAccountDelete = async () => {
    if (await confirm(Locale.label("profile.profilePage.confirmMsg"))) {
      deleteAccountMutation.mutate();
    }
  };

  if (isDemo) {
    return (
      <>
        <PageHeader icon={<PersonIcon />} title={Locale.label("profile.profilePage.profEdit")} subtitle={Locale.label("profile.profilePage.subtitle")} />
        <Box sx={{ p: 3 }}>
          <Alert severity="info">{Locale.label("profile.profilePage.demoModeAlert")}</Alert>
        </Box>
      </>
    );
  }

  return (
    <>
      {ConfirmDialogElement}
      <PageHeader icon={<PersonIcon />} title={Locale.label("profile.profilePage.profEdit")} subtitle={Locale.label("profile.profilePage.subtitle")} />

      <Box sx={{ p: 3 }}>
        <Stack spacing={3}>
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

          <FormCard title={Locale.label("profile.profilePage.profEdit")} icon="person" onSave={handleSave} saveText={Locale.label("profile.profilePage.saveChanges")} isSubmitting={updateProfileMutation.isPending}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth type="email" name="email" label={Locale.label("person.email")} value={email} onChange={handleChange} disabled={isDemo} placeholder={Locale.label("placeholders.person.simpleEmail")} />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth name="firstName" label={Locale.label("person.firstName")} value={firstName} onChange={handleChange} placeholder={Locale.label("placeholders.person.firstName")} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth name="lastName" label={Locale.label("person.lastName")} value={lastName} onChange={handleChange} placeholder={Locale.label("placeholders.person.lastName")} />
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
                <Typography color="text.secondary">{Locale.label("profile.profilePage.permWarn")}</Typography>
                <Box>
                  <LoadingButton variant="outlined" loading={deleteAccountMutation.isPending} onClick={handleAccountDelete} data-testid="delete-account-button">
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
