import { Grid, Icon, TextField, Typography, InputAdornment, IconButton, Box, Card, CardContent, Alert, Stack, FormControlLabel, Switch } from "@mui/material";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiHelper, UserHelper, Locale } from "@churchapps/apphelper";
import { LinkedAccounts } from "./components/LinkedAccounts";
import { Person as PersonIcon, DarkMode, LightMode } from "@mui/icons-material";
import { PageHeader } from "@churchapps/apphelper";
import { LoadingButton } from "../components";
import { useMutation } from "@tanstack/react-query";
import { useThemeMode } from "../ThemeContext";

export const ProfilePage = () => {
  const navigate = useNavigate();
  const isDemo = process.env.REACT_APP_STAGE === "demo";
  const { mode, toggleTheme } = useThemeMode();

  const [password, setPassword] = useState<string>("");
  const [passwordVerify, setPasswordVerify] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [errors, setErrors] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  React.useEffect(() => {
    const { email, firstName, lastName } = UserHelper.user;
    setFirstName(firstName);
    setLastName(lastName);
    setEmail(email);
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

  const validateEmail = (email: string) => /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(.\w{2,3})+$/.test(email);

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

  const handleAccountDelete = () => {
    if (window.confirm(Locale.label("profile.profilePage.confirmMsg"))) {
      deleteAccountMutation.mutate();
    }
  };

  if (isDemo) {
    return (
      <>
        <PageHeader icon={<PersonIcon />} title={Locale.label("profile.profilePage.profEdit")} subtitle={Locale.label("profile.profilePage.subtitle")} />
        <Box sx={{ p: 3 }}>
          <Alert severity="info">Profile editing is disabled in demo mode.</Alert>
        </Box>
      </>
    );
  }

  return (
    <>
      <PageHeader icon={<PersonIcon />} title={Locale.label("profile.profilePage.profEdit")} subtitle={Locale.label("profile.profilePage.subtitle")} />

      <Box sx={{ p: 3 }}>
        <Stack spacing={3}>
          {/* Display validation errors if any */}
          {errors.length > 0 && (
            <Alert severity="error">
              <ul style={{ margin: 0, paddingLeft: "20px" }}>
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </Alert>
          )}

          {/* Display mutation errors if any */}
          {updateProfileMutation.error && <Alert severity="error">{updateProfileMutation.error.message || Locale.label("profile.profilePage.saveError")}</Alert>}

          {deleteAccountMutation.error && <Alert severity="error">{deleteAccountMutation.error.message || Locale.label("profile.profilePage.deleteError")}</Alert>}

          {/* Display success message if any */}
          {saveMessage && <Alert severity="success">{saveMessage}</Alert>}

          {/* Profile Information Card */}
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6" gutterBottom>
                  {Locale.label("profile.profilePage.profEdit")}
                </Typography>

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
                      helperText={isDemo ? "Password changes are disabled in demo mode" : Locale.label("profile.profilePage.passwordHelper")}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton aria-label="toggle password visibility" onClick={() => setShowPassword(!showPassword)} disabled={isDemo}>
                              {showPassword ? <Icon>visibility</Icon> : <Icon>visibility_off</Icon>}
                            </IconButton>
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
                            <IconButton aria-label="toggle password visibility" onClick={() => setShowPassword(!showPassword)} disabled={isDemo}>
                              {showPassword ? <Icon>visibility</Icon> : <Icon>visibility_off</Icon>}
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>
                </Grid>

                <Box sx={{ pt: 2 }}>
                  <LoadingButton variant="contained" color="primary" loading={updateProfileMutation.isPending} onClick={handleSave}>
                    {Locale.label("profile.profilePage.saveChanges")}
                  </LoadingButton>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <LinkedAccounts />

          {/* Theme Preferences Card */}
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6" gutterBottom>
                  Theme Preferences
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
                    label={mode === "dark" ? "Dark Mode" : "Light Mode"}
                  />
                  <DarkMode color={mode === "dark" ? "primary" : "disabled"} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Your theme preference is saved automatically and will be remembered on this device.
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          {/* Account Deletion Card */}
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6" color="error" gutterBottom>
                  {Locale.label("profile.profilePage.accDel")}
                </Typography>
                <Typography color="text.secondary">{Locale.label("profile.profilePage.permWarn")}</Typography>
                <Box>
                  <LoadingButton variant="outlined" color="error" loading={deleteAccountMutation.isPending} onClick={handleAccountDelete} data-testid="delete-account-button">
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
