import React from "react";
import { type ChurchInterface } from "@churchapps/helpers";
import { ApiHelper, InputBox, ErrorMessages, UserHelper, Permissions, Locale } from "@churchapps/apphelper";
import { GivingSettingsEdit } from "./GivingSettingsEdit";
import { TextField, Grid, Typography, Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import BusinessIcon from "@mui/icons-material/Business";
import TuneIcon from "@mui/icons-material/Tune";
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism";
import LanguageIcon from "@mui/icons-material/Language";
import { DomainSettingsEdit } from "./DomainSettingsEdit";
import { DirectoryApproveSettingsEdit } from "./DirectoryApproveSettingsEdit";
import { SupportContactSettingsEdit } from "./SupportContactSettingsEdit";
import { VisbilityPrefSettingsEdit } from "./VisibilityPrefSettingsEdit";
import { SettingsSectionHeader } from "./SettingsSectionHeader";

interface Props {
  church: ChurchInterface;
  updatedFunction: () => void;
}

export const ChurchSettingsEdit: React.FC<Props> = (props) => {
  const [church, setChurch] = React.useState({} as ChurchInterface);
  const [errors, setErrors] = React.useState([]);
  const [saveTrigger, setSaveTrigger] = React.useState<Date | null>(null);
  const childErrorsRef = React.useRef<string[]>([]);
  const [expanded, setExpanded] = React.useState<string | false>("church-info");

  const handleAccordionChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  // Shared accordion styles for a warm, approachable look
  const accordionStyles = {
    mb: 1.5,
    borderRadius: "12px !important",
    boxShadow: "none",
    border: "1px solid",
    borderColor: "divider",
    "&:before": { display: "none" },
    "&.Mui-expanded": {
      margin: "0 0 12px 0",
    },
    transition: "all 0.2s ease-in-out",
    "&:hover": {
      borderColor: "primary.light",
    },
  };

  const accordionSummaryStyles = {
    borderRadius: "12px",
    minHeight: 64,
    "&.Mui-expanded": {
      minHeight: 64,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
    "& .MuiAccordionSummary-content": {
      alignItems: "center",
      gap: 2,
    },
  };

  const handleSave = async () => {
    if (validate()) {
      setErrors([]);
      childErrorsRef.current = [];
      setSaveTrigger(new Date());
      await new Promise(resolve => setTimeout(resolve, 500));
      if (childErrorsRef.current.length > 0) return;
      const resp = await ApiHelper.post("/churches", [church], "MembershipApi");
      if (resp.errors !== undefined) setErrors(resp.errors);
      else props.updatedFunction();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<any>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };

  const validate = () => {
    const errors = [];
    if (!church.name?.trim()) errors.push(Locale.label("settings.churchSettingsEdit.noNameMsg"));
    if (!church.subDomain?.trim()) errors.push(Locale.label("settings.churchSettingsEdit.noSubMsg"));
    setErrors(errors);
    return errors.length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrors([]);
    const c = { ...church };
    const { name, value } = e.target;

    switch (name) {
      case "churchName":
        c.name = value;
        break;
      case "address1":
        c.address1 = value;
        break;
      case "address2":
        c.address2 = value;
        break;
      case "city":
        c.city = value;
        break;
      case "state":
        c.state = value;
        break;
      case "zip":
        c.zip = value;
        break;
      case "country":
        c.country = value;
        break;
      case "subDomain":
        c.subDomain = value;
        break;
    }
    setChurch(c);
  };

  const handleGivingError = (givingErrors: string[]) => {
    childErrorsRef.current = givingErrors;
    setErrors(givingErrors);
  };

  const giveSection = () => {
    if (!UserHelper.checkAccess(Permissions.givingApi.settings.edit)) return null;
    return <GivingSettingsEdit churchId={church?.id || ""} saveTrigger={saveTrigger} onError={handleGivingError} />;
  };

  React.useEffect(() => setChurch(props.church), [props.church]);

  if (!church || !church.id) return null;

  return (
    <InputBox id="churchSettingsBox" cancelFunction={props.updatedFunction} saveFunction={handleSave} headerText={Locale.label("settings.churchSettingsEdit.churchSettings")} headerIcon="business">
      <ErrorMessages errors={errors} />

      {/* Church Information Accordion */}
      <Accordion
        expanded={expanded === "church-info"}
        onChange={handleAccordionChange("church-info")}
        sx={accordionStyles}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummaryStyles}>
          <SettingsSectionHeader
            icon={<BusinessIcon />}
            color="primary"
            title={Locale.label("settings.churchSettingsEdit.churchInfo")}
            subtitle={church?.name || Locale.label("settings.churchSettingsEdit.churchInfoSubtitle")}
          />
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                name="churchName"
                label={Locale.label("settings.churchSettingsEdit.churchName")}
                value={church?.name || ""}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                data-testid="church-name-input"
                aria-label="Church name"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                name="subDomain"
                label={Locale.label("settings.churchSettingsEdit.subdom")}
                value={church?.subDomain || ""}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                data-testid="subdomain-input"
                aria-label="Subdomain"
                helperText={Locale.label("settings.church.subdomainHelper")}
              />
            </Grid>
          </Grid>

          <Typography variant="subtitle2" sx={{ mt: 3, mb: 2, fontWeight: 600, color: "text.secondary" }}>
            {Locale.label("person.address")}
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                name="address1"
                label={Locale.label("settings.churchSettingsEdit.address1")}
                value={church?.address1 || ""}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                data-testid="address1-input"
                aria-label="Address line 1"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth name="address2" label={Locale.label("settings.churchSettingsEdit.address2")} value={church?.address2 || ""} onChange={handleChange} onKeyDown={handleKeyDown} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth name="city" label={Locale.label("person.city")} value={church?.city || ""} onChange={handleChange} onKeyDown={handleKeyDown} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth name="state" label={Locale.label("person.state")} value={church?.state || ""} onChange={handleChange} onKeyDown={handleKeyDown} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth name="zip" label={Locale.label("person.zip")} value={church?.zip || ""} onChange={handleChange} onKeyDown={handleKeyDown} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth name="country" label={Locale.label("person.country")} value={church?.country || ""} onChange={handleChange} onKeyDown={handleKeyDown} />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* General Settings Accordion */}
      <Accordion
        expanded={expanded === "general"}
        onChange={handleAccordionChange("general")}
        sx={accordionStyles}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummaryStyles}>
          <SettingsSectionHeader
            icon={<TuneIcon />}
            color="secondary"
            title={Locale.label("settings.churchSettingsEdit.general")}
            subtitle={Locale.label("settings.churchSettingsEdit.generalSubtitle")}
          />
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 1 }}>
          <SupportContactSettingsEdit churchId={church?.id || ""} saveTrigger={saveTrigger} />
          <DirectoryApproveSettingsEdit churchId={church?.id || ""} saveTrigger={saveTrigger} />
          <VisbilityPrefSettingsEdit churchId={church?.id || ""} saveTrigger={saveTrigger} />
        </AccordionDetails>
      </Accordion>

      {/* Giving Settings Accordion */}
      {UserHelper.checkAccess(Permissions.givingApi.settings.edit) && (
        <Accordion
          expanded={expanded === "giving"}
          onChange={handleAccordionChange("giving")}
          sx={accordionStyles}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummaryStyles}>
            <SettingsSectionHeader
              icon={<VolunteerActivismIcon />}
              color="success"
              title={Locale.label("settings.givingSettingsEdit.giving")}
              subtitle={Locale.label("settings.churchSettingsEdit.givingSubtitle")}
            />
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 2 }}>
            {giveSection()}
          </AccordionDetails>
        </Accordion>
      )}

      {/* Domains Accordion */}
      <Accordion
        expanded={expanded === "domains"}
        onChange={handleAccordionChange("domains")}
        sx={accordionStyles}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummaryStyles}>
          <SettingsSectionHeader
            icon={<LanguageIcon />}
            color="info"
            title={Locale.label("settings.domainSettingsEdit.domains")}
            subtitle={Locale.label("settings.churchSettingsEdit.domainsSubtitle")}
          />
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 2 }}>
          <DomainSettingsEdit churchId={church?.id || ""} saveTrigger={saveTrigger} />
        </AccordionDetails>
      </Accordion>
    </InputBox>
  );
};
