import React from "react";
import { useForm } from "react-hook-form";
import { type ChurchInterface } from "@churchapps/helpers";
import { ApiHelper, InputBox, UserHelper, Permissions, Locale } from "@churchapps/apphelper";
import { GivingSettingsEdit } from "./GivingSettingsEdit";
import { Alert, TextField, Grid, Typography, Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import BusinessIcon from "@mui/icons-material/Business";
import TuneIcon from "@mui/icons-material/Tune";
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism";
import SmsIcon from "@mui/icons-material/Sms";
import LanguageIcon from "@mui/icons-material/Language";
import { DomainSettingsEdit } from "./DomainSettingsEdit";
import { TextingSettingsEdit } from "./TextingSettingsEdit";
import { SupportContactSettingsEdit } from "./SupportContactSettingsEdit";
import { SettingsSectionHeader } from "./SettingsSectionHeader";

// ChurchInterface has typed fields; RHF nested paths require looser typing
type AnyRecord = Record<string, any>;

interface Props {
  church: ChurchInterface;
  updatedFunction: () => void;
  initialSection?: string;
}

export const ChurchSettingsEdit: React.FC<Props> = (props) => {
  const [errors, setErrors] = React.useState<string[]>([]);
  const [saveTrigger, setSaveTrigger] = React.useState<Date | null>(null);
  const childErrorsRef = React.useRef<string[]>([]);
  const [expanded, setExpanded] = React.useState<string | false>(props.initialSection || "church-info");

  const { control, register, handleSubmit, reset, formState } = useForm<AnyRecord>({ defaultValues: { ...(props.church || {}), churchName: props.church?.name || "" } });

  const fe = formState.errors as any;

  const summaryErrors: string[] = [...errors];
  if (fe.churchName?.message) summaryErrors.push(fe.churchName.message);
  if (fe.subDomain?.message) summaryErrors.push(fe.subDomain.message);

  React.useEffect(() => {
    if (props.church) reset({ ...props.church, churchName: props.church.name || "" });
  }, [props.church, reset]);

  const handleAccordionChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  // Shared accordion styles for a warm, approachable look
  const accordionStyles = {
    mb: 1.5,
    "&&": { borderRadius: "12px" },
    boxShadow: "none",
    border: "1px solid",
    borderColor: "divider",
    "&:before": { display: "none" },
    "&.Mui-expanded": { margin: "0 0 12px 0" },
    transition: "all 0.2s ease-in-out",
    "&:hover": { borderColor: "primary.light" }
  };

  const accordionSummaryStyles = {
    borderRadius: "12px",
    minHeight: 64,
    "&.Mui-expanded": {
      minHeight: 64,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0
    },
    "& .MuiAccordionSummary-content": {
      alignItems: "center",
      gap: 2
    }
  };

  const onValid = async (values: AnyRecord) => {
    setErrors([]);
    childErrorsRef.current = [];
    setSaveTrigger(new Date());
    await new Promise(resolve => setTimeout(resolve, 500));
    if (childErrorsRef.current.length > 0) return;
    const { churchName, ...rest } = values;
    const church: ChurchInterface = { ...props.church, ...rest, name: churchName };
    const resp = await ApiHelper.post("/churches", [church], "MembershipApi");
    if (resp.errors !== undefined) setErrors(resp.errors);
    else props.updatedFunction();
  };

  const handleGivingError = (givingErrors: string[]) => {
    childErrorsRef.current = givingErrors;
    setErrors(givingErrors);
  };

  const handleTextingError = (textingErrors: string[]) => {
    childErrorsRef.current = textingErrors;
    setErrors(textingErrors);
  };

  const giveSection = () => {
    if (!UserHelper.checkAccess(Permissions.givingApi.settings.edit)) return null;
    return <GivingSettingsEdit churchId={props.church?.id || ""} saveTrigger={saveTrigger} onError={handleGivingError} />;
  };

  if (!props.church || !props.church.id) return null;

  return (
    <InputBox id="churchSettingsBox" cancelFunction={props.updatedFunction} saveFunction={handleSubmit(onValid)} headerText={Locale.label("settings.churchSettingsEdit.churchSettings")} headerIcon="business">
      {summaryErrors.length > 0 && <Alert severity="error" sx={{ mb: 2 }}>{summaryErrors.map((msg) => <div key={msg}>{msg}</div>)}</Alert>}

      {/* Church Information Accordion */}
      <Accordion expanded={expanded === "church-info"} onChange={handleAccordionChange("church-info")} sx={accordionStyles}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummaryStyles}>
          <SettingsSectionHeader icon={<BusinessIcon />} color="primary" title={Locale.label("settings.churchSettingsEdit.churchInfo")} subtitle={props.church?.name || Locale.label("settings.churchSettingsEdit.churchInfoSubtitle")} />
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label={Locale.label("settings.churchSettingsEdit.churchName")} id="churchName" placeholder={Locale.label("placeholders.church.name")} data-testid="church-name-input" aria-label={Locale.label("settings.churchSettingsEdit.churchNameAria")} error={!!fe.churchName} helperText={fe.churchName?.message} {...register("churchName", { required: Locale.label("settings.churchSettingsEdit.noNameMsg") })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label={Locale.label("settings.churchSettingsEdit.subdom")} id="subDomain" placeholder={Locale.label("placeholders.church.subdomain")} data-testid="subdomain-input" aria-label={Locale.label("settings.churchSettingsEdit.subdomainAria")} helperText={fe.subDomain?.message || Locale.label("settings.church.subdomainHelper")} error={!!fe.subDomain} {...register("subDomain", { required: Locale.label("settings.churchSettingsEdit.noSubMsg") })} />
            </Grid>
          </Grid>

          <Typography variant="subtitle2" sx={{ mt: 3, mb: 2, fontWeight: 600, color: "text.secondary" }}>
            {Locale.label("person.address")}
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label={Locale.label("settings.churchSettingsEdit.address1")} id="address1" placeholder={Locale.label("placeholders.church.address1")} data-testid="address1-input" aria-label={Locale.label("settings.churchSettingsEdit.addressLine1Aria")} {...register("address1")} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label={Locale.label("settings.churchSettingsEdit.address2")} id="address2" placeholder={Locale.label("placeholders.church.address2")} {...register("address2")} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label={Locale.label("person.city")} id="city" placeholder={Locale.label("placeholders.church.city")} {...register("city")} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth label={Locale.label("person.state")} id="state" placeholder={Locale.label("placeholders.church.state")} {...register("state")} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth label={Locale.label("person.zip")} id="zip" placeholder={Locale.label("placeholders.church.zip")} {...register("zip")} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label={Locale.label("person.country")} id="country" placeholder={Locale.label("placeholders.church.country")} {...register("country")} />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* General Settings Accordion */}
      <Accordion expanded={expanded === "general"} onChange={handleAccordionChange("general")} sx={accordionStyles}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummaryStyles}>
          <SettingsSectionHeader icon={<TuneIcon />} color="secondary" title={Locale.label("settings.churchSettingsEdit.general")} subtitle={Locale.label("settings.churchSettingsEdit.generalSubtitle")} />
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 1 }}>
          <SupportContactSettingsEdit churchId={props.church?.id || ""} saveTrigger={saveTrigger} />
        </AccordionDetails>
      </Accordion>

      {/* Giving Settings Accordion */}
      {UserHelper.checkAccess(Permissions.givingApi.settings.edit) && (
        <Accordion expanded={expanded === "giving"} onChange={handleAccordionChange("giving")} sx={accordionStyles}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummaryStyles}>
            <SettingsSectionHeader icon={<VolunteerActivismIcon />} color="success" title={Locale.label("settings.givingSettingsEdit.giving")} subtitle={Locale.label("settings.churchSettingsEdit.givingSubtitle")} />
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 2 }}>
            {giveSection()}
          </AccordionDetails>
        </Accordion>
      )}

      {/* Texting Settings Accordion */}
      {UserHelper.checkAccess(Permissions.membershipApi.settings.edit) && (
        <Accordion expanded={expanded === "texting"} onChange={handleAccordionChange("texting")} sx={accordionStyles}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummaryStyles}>
            <SettingsSectionHeader icon={<SmsIcon />} color="warning" title={Locale.label("settings.churchSettingsEdit.textingTitle")} subtitle={Locale.label("settings.churchSettingsEdit.textingSubtitle")} />
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 2 }}>
            <TextingSettingsEdit churchId={props.church?.id || ""} saveTrigger={saveTrigger} onError={handleTextingError} />
          </AccordionDetails>
        </Accordion>
      )}

      {/* Domains Accordion */}
      <Accordion expanded={expanded === "domains"} onChange={handleAccordionChange("domains")} sx={accordionStyles}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummaryStyles}>
          <SettingsSectionHeader icon={<LanguageIcon />} color="info" title={Locale.label("settings.domainSettingsEdit.domains")} subtitle={Locale.label("settings.churchSettingsEdit.domainsSubtitle")} />
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 2 }}>
          <DomainSettingsEdit churchId={props.church?.id || ""} saveTrigger={saveTrigger} />
        </AccordionDetails>
      </Accordion>
    </InputBox>
  );
};
