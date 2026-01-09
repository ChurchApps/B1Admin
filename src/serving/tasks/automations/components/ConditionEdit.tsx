import {
  FormControl, InputLabel, ListSubheader, MenuItem, Select, type SelectChangeEvent, Card, CardContent, Typography, Stack, Box, Button, Divider 
} from "@mui/material";
import React from "react";
import { ErrorMessages, ApiHelper, type ConditionInterface, Locale } from "@churchapps/apphelper";
import { ConditionAttendance } from "./ConditionAttendance";
import { ConditionDate } from "./ConditionDate";
import { ConditionSelect } from "./ConditionSelect";
import { ConditionText } from "./ConditionText";
import { Rule as ConditionIcon, Save as SaveIcon, Cancel as CancelIcon, Delete as DeleteIcon } from "@mui/icons-material";

interface Props {
  condition: ConditionInterface;
  onCancel: () => void;
  onSave: (condition: ConditionInterface) => void;
}

export const ConditionEdit = (props: Props) => {
  const [condition, setCondition] = React.useState<ConditionInterface>(null);
  const [errors, setErrors] = React.useState([]);

  const init = () => {
    setCondition(props.condition);
  };

  React.useEffect(init, [props.condition]);

  const validate = () => {
    const result: string[] = [];
    setErrors(result);
    return result.length === 0;
  };

  const handleSave = async () => {
    if (validate()) {
      ApiHelper.post("/conditions", [condition], "DoingApi").then((d) => {
        props.onSave(d[0]);
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    const val = e.target.value;
    const c = { ...condition };
    switch (e.target.name) {
      case "field":
        c.field = val;
        c.value = "";
        c.fieldData = "";
        break;
    }
    setCondition(c);
  };

  const getQuestionDetails = () => {
    let result = <ConditionText condition={condition} onChange={(c) => setCondition(c)} />;
    switch (condition?.field) {
      case "today":
      case "birthDate":
      case "anniversary":
        result = <ConditionDate condition={condition} onChange={(c) => setCondition(c)} />;
        break;
      case "attended":
        result = <ConditionAttendance condition={condition} onChange={(c) => setCondition(c)} />;
        break;
      case "membershipStatus":
      case "maritalStatus":
      case "gender":
        result = <ConditionSelect condition={condition} onChange={(c) => setCondition(c)} />;
    }
    return result;
  };

  const handleDelete = async () => {
    const conf = window.confirm(Locale.label("tasks.conditionEdit.confirmMsg"));
    if (!conf) return;
    await ApiHelper.delete("/conditions/" + condition.id, "DoingApi");
    props.onSave(null);
  };

  if (!condition) return <></>;
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
              <ConditionIcon sx={{ color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
                {Locale.label("tasks.conditionEdit.conEdit")}
              </Typography>
            </Stack>
          </Box>

          {/* Error Messages */}
          {errors.length > 0 && <ErrorMessages errors={errors} />}

          {/* Form Fields */}
          <Stack spacing={2}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>{Locale.label("tasks.conditionEdit.conType")}</InputLabel>
              <Select
                label={Locale.label("tasks.conditionEdit.conType")}
                value={condition.field || ""}
                name="field"
                onChange={handleChange}
                data-testid="condition-type-select"
                aria-label="Condition type"
                sx={{
                  "& .MuiListSubheader-root": {
                    backgroundColor: "grey.100",
                    fontWeight: 600,
                    color: "text.primary",
                    lineHeight: "36px",
                  },
                }}>
                <ListSubheader>{Locale.label("tasks.conditionEdit.gen")}</ListSubheader>
                <MenuItem value="today">{Locale.label("tasks.conditionEdit.today")}</MenuItem>

                <ListSubheader>{Locale.label("common.name")}</ListSubheader>
                <MenuItem value="displayName">{Locale.label("person.displayName")}</MenuItem>
                <MenuItem value="firstName">{Locale.label("person.firstName")}</MenuItem>
                <MenuItem value="lastName">{Locale.label("person.lastName")}</MenuItem>
                <MenuItem value="middleName">{Locale.label("person.middleName")}</MenuItem>
                <MenuItem value="nickName">{Locale.label("person.nickName")}</MenuItem>

                <ListSubheader>{Locale.label("tasks.conditionEdit.persAtt")}</ListSubheader>
                <MenuItem value="birthDate">{Locale.label("person.birthDate")}</MenuItem>
                <MenuItem value="gender">{Locale.label("person.gender")}</MenuItem>
                <MenuItem value="maritalStatus">{Locale.label("person.maritalStatus")}</MenuItem>
                <MenuItem value="anniversary">{Locale.label("person.anniversary")}</MenuItem>
                <MenuItem value="membershipStatus">{Locale.label("person.membershipStatus")}</MenuItem>

                <ListSubheader>{Locale.label("tasks.conditionEdit.conInfo")}</ListSubheader>
                <MenuItem value="phone">{Locale.label("person.phone")}</MenuItem>
                <MenuItem value="email">{Locale.label("person.email")}</MenuItem>
                <MenuItem value="address">{Locale.label("person.address")}</MenuItem>
                <MenuItem value="city">{Locale.label("person.city")}</MenuItem>
                <MenuItem value="state">{Locale.label("person.state")}</MenuItem>
                <MenuItem value="zip">{Locale.label("person.zip")}</MenuItem>
              </Select>
            </FormControl>

            <Divider />

            {/* Condition Details */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: "text.secondary" }}>
                {Locale.label("tasks.conditionEdit.conDetails")}
              </Typography>
              {getQuestionDetails()}
            </Box>
          </Stack>

          {/* Action Buttons */}
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            {condition?.id && (
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
/*
<ListSubheader>Coming Soon</ListSubheader>
          <MenuItem value="attended">Attended...</MenuItem>
          <MenuItem value="gave">Gave to...</MenuItem>
*/
