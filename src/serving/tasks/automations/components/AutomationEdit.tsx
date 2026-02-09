import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  type SelectChangeEvent,
  Card,
  CardContent,
  Typography,
  Stack,
  Box,
  Button,
  FormHelperText,
  Switch,
  FormControlLabel,
} from "@mui/material";
import React from "react";
import { ErrorMessages, type AutomationInterface, ApiHelper, Locale } from "@churchapps/apphelper";
import { SettingsSuggest as AutomationsIcon, Save as SaveIcon, Cancel as CancelIcon, Delete as DeleteIcon, Repeat as RepeatIcon } from "@mui/icons-material";

interface Props {
  automation: AutomationInterface;
  onCancel: () => void;
  onSave: (automation: AutomationInterface) => void;
  onDelete?: () => void;
}

export const AutomationEdit = (props: Props) => {
  const [automation, setAutomation] = React.useState<AutomationInterface>(null);
  const [errors, setErrors] = React.useState([]);

  const init = () => {
    setAutomation(props.automation);
  };

  React.useEffect(init, [props.automation]);

  const validate = () => {
    const result: string[] = [];
    setErrors(result);
    return result.length === 0;
  };

  const handleSave = async () => {
    if (validate()) {
      ApiHelper.post("/automations", [automation], "DoingApi").then((d) => {
        props.onSave(d[0]);
      });
    }
  };
  const handleDelete = () => {
    ApiHelper.delete("/automations/" + automation.id, "DoingApi").then(() => {
      props.onDelete();
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    const val = e.target.value;
    const a = { ...automation };
    switch (e.target.name) {
      case "title":
        a.title = val;
        break;
      case "recurs":
        a.recurs = val;
        break;
    }
    setAutomation(a);
  };

  const handleActiveToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = { ...automation };
    a.active = e.target.checked;
    setAutomation(a);
  };

  return (
    <Card
      sx={{
        borderRadius: 2,
        border: "1px solid",
        borderColor: "grey.200",
        transition: "all 0.2s ease-in-out",
        "&:hover": { boxShadow: 2 },
      }}>
      <CardContent>
        <Stack spacing={3}>
          {/* Header */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <AutomationsIcon sx={{ color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
                {Locale.label("tasks.automationEdit.autoEdit")}
              </Typography>
            </Stack>
          </Box>

          {/* Error Messages */}
          {errors.length > 0 && <ErrorMessages errors={errors} />}

          {/* Form Fields */}
          <Stack spacing={2}>
            <TextField
              fullWidth
              label={Locale.label("common.title")}
              value={automation?.title || ""}
              name="title"
              onChange={handleChange}
              data-testid="automation-title-input"
              aria-label="Automation title"
              variant="outlined"
              sx={{ "& .MuiOutlinedInput-root": { "&:hover fieldset": { borderColor: "primary.main" } } }}
            />

            <FormControl fullWidth variant="outlined">
              <InputLabel>{Locale.label("tasks.automationEdit.rep")}</InputLabel>
              <Select
                label={Locale.label("tasks.automationEdit.rep")}
                value={automation?.recurs || "never"}
                name="recurs"
                onChange={handleChange}
                data-testid="recurs-select"
                aria-label="Recurrence"
                startAdornment={<RepeatIcon sx={{ color: "action.active", ml: 1, mr: 0.5 }} />}>
                <MenuItem value="never">{Locale.label("tasks.automationEdit.never")}</MenuItem>
                <MenuItem value="yearly">{Locale.label("tasks.automationEdit.yearly")}</MenuItem>
                <MenuItem value="monthly">{Locale.label("tasks.automationEdit.monthly")}</MenuItem>
                <MenuItem value="weekly">{Locale.label("tasks.automationEdit.weekly")}</MenuItem>
              </Select>
              <FormHelperText>{Locale.label("tasks.automationEdit.recurHelp")}</FormHelperText>
            </FormControl>

            <FormControlLabel
              control={<Switch checked={automation?.active || false} onChange={handleActiveToggle} color="primary" />}
              label={
                <Typography variant="body1" sx={{ fontWeight: automation?.active ? 600 : 400 }}>
                  {automation?.active ? Locale.label("tasks.automationEdit.active") : Locale.label("tasks.automationEdit.inactive")}
                </Typography>
              }
            />
          </Stack>

          {/* Action Buttons */}
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            {automation?.id && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDelete}
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 600,
                }}>
                {Locale.label("common.delete")}
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={props.onCancel}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
              }}>
              {Locale.label("common.cancel")}
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
              }}>
              {Locale.label("common.save")}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};
