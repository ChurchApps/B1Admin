import {
  MenuItem, Select, type SelectChangeEvent, Card, CardContent, Typography, Stack, Box, Button, FormControl, InputLabel 
} from "@mui/material";
import React from "react";
import { ErrorMessages, type ConjunctionInterface, ApiHelper, Locale } from "@churchapps/apphelper";
import { Merge as ConjunctionIcon, Save as SaveIcon, Cancel as CancelIcon } from "@mui/icons-material";

interface Props {
  conjunction: ConjunctionInterface;
  onCancel: () => void;
  onSave: (conjunction: ConjunctionInterface) => void;
}

export const ConjunctionEdit = (props: Props) => {
  const [conjunction, setConjunction] = React.useState<ConjunctionInterface>(null);
  const [errors, setErrors] = React.useState([]);

  const init = () => {
    setConjunction(props.conjunction);
  };

  React.useEffect(init, [props.conjunction]);

  const validate = () => {
    const result: string[] = [];
    setErrors(result);
    return result.length === 0;
  };

  const handleSave = async () => {
    if (validate()) {
      ApiHelper.post("/conjunctions", [conjunction], "DoingApi").then((d) => {
        props.onSave(d[0]);
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    const val = e.target.value;
    const c = { ...conjunction };
    switch (e.target.name) {
      case "groupType":
        c.groupType = val;
        break;
    }
    setConjunction(c);
  };

  if (!conjunction) return <></>;
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
              <ConjunctionIcon sx={{ color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
                {Locale.label("tasks.conjunctionEdit.conjEdit")}
              </Typography>
            </Stack>
          </Box>

          {/* Error Messages */}
          {errors.length > 0 && <ErrorMessages errors={errors} />}

          {/* Form Fields */}
          <FormControl fullWidth variant="outlined">
            <InputLabel>{Locale.label("tasks.conjunctionEdit.conjType")}</InputLabel>
            <Select
              label={Locale.label("tasks.conjunctionEdit.conjType")}
              value={conjunction?.groupType || "and"}
              name="groupType"
              onChange={handleChange}
              data-testid="conjunction-type-select"
              aria-label="Conjunction type">
              <MenuItem value="and">{Locale.label("tasks.conjunctionEdit.and")}</MenuItem>
              <MenuItem value="or">{Locale.label("tasks.conjunctionEdit.or")}</MenuItem>
            </Select>
          </FormControl>

          {/* Action Buttons */}
          <Stack direction="row" spacing={2} justifyContent="flex-end">
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
