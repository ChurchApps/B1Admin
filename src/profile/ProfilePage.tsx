import { Grid, Icon, TextField, Typography, InputAdornment, Box, Alert, FormControlLabel, Switch } from "@mui/material";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiHelper, UserHelper, Locale } from "@churchapps/apphelper";
import { LinkedAccounts } from "./components/LinkedAccounts";
import { DarkMode, LightMode } from "@mui/icons-material";
import { LoadingButton } from "../components";
import { AppIconButton } from "../components/ui/AppIconButton";
import { useMutation } from "@tanstack/react-query";
import { useThemeMode } from "../ThemeContext";
import { useConfirmDelete } from "../hooks";
import { PlatedRecord, SectionLabel, Verb } from "./components/plate";

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
  const [slice, setSlice] = useState<"plate" | "edit">("plate");
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

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
    mutationFn: () => ApiHelper.delete("/users", "MembershipApi"),
    onSuccess: () => {
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
    if (await confirm(Locale.label("profile.profilePage.confirmMsg"))) {
      deleteAccountMutation.mutate();
    }
  };

  const displayName = [firstName, lastName].filter(Boolean).join(" ") || Locale.label("profile.profilePage.profEdit");

  const identity = (
    <>
      <Typography id="page-header-title" component="h1" sx={{ fontSize: { xs: "1.8rem", sm: "2.4rem" }, fontWeight: 500, letterSpacing: "-0.01em", lineHeight: 1.1 }}>
        {displayName}
      </Typography>
      <Typography
        id="page-header-subtitle"
        component="a"
        href={"mailto:" + email}
        sx={{ display: "block", color: "primary.main", textDecoration: "none", mt: 1, mb: 2, fontSize: "1.05rem" }}>
        {email}
      </Typography>
      <Box sx={{ display: "flex", gap: 1.75, flexWrap: "wrap", mb: 1 }}>
        <Verb onClick={() => setSlice("edit")}>{Locale.label("common.edit")}</Verb>
        <Verb to="/profile/devices">{Locale.label("helpers.secondaryMenuHelper.devices")}</Verb>
      </Box>
      <SectionLabel>{Locale.label("profile.profilePage.themePreferences")}</SectionLabel>
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
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {Locale.label("profile.profilePage.themePreferencesHelper")}
      </Typography>
      <SectionLabel>{Locale.label("profile.profilePage.accDel")}</SectionLabel>
      <Typography color="text.secondary" variant="body2">{Locale.label("profile.profilePage.permWarn")}</Typography>
      <Box sx={{ mt: 1 }}>
        <LoadingButton variant="outlined" loading={deleteAccountMutation.isPending} disabled={isDemo} onClick={handleAccountDelete} data-testid="delete-account-button">
          {Locale.label("profile.profilePage.delAcc")}
        </LoadingButton>
      </Box>
    </>
  );

  const editSlice = (
    <>
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
      <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
        <Verb onClick={() => setSlice("plate")}>{Locale.label("common.cancel")}</Verb>
        <LoadingButton variant="contained" loading={updateProfileMutation.isPending} disabled={isDemo} onClick={handleSave}>
          {Locale.label("profile.profilePage.saveChanges")}
        </LoadingButton>
      </Box>

    </>
  );

  return (
    <>
      {ConfirmDialogElement}
      <PlatedRecord
        identity={identity}
        slice={slice === "edit" ? editSlice : (
          <>
            <LinkedAccounts />
            <Box sx={{ mt: 2 }}>
              <Verb onClick={() => setSlice("edit")}>{Locale.label("common.edit")}</Verb>
            </Box>
          </>
        )}
      />
    </>
  );
};
