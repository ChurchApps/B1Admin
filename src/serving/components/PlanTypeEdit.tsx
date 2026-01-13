import React from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { ApiHelper, ErrorMessages, InputBox, Locale } from "@churchapps/apphelper";
import { type PlanTypeInterface } from "../../helpers";

interface Props {
  planType: PlanTypeInterface | null;
  onClose: () => void;
}

export const PlanTypeEdit: React.FC<Props> = ({ planType, onClose }) => {
  const [current, setCurrent] = React.useState<PlanTypeInterface>({ ...planType } || {});
  const [errors, setErrors] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);

  const handleSave = async () => {
    setLoading(true);
    setErrors([]);

    try {
      const isNew = !current.id;
      const result = isNew 
        ? await ApiHelper.post("/planTypes", [current], "DoingApi")
        : await ApiHelper.post("/planTypes", [current], "DoingApi");
      
      onClose();
    } catch (error: any) {
      setErrors([error.message || Locale.label("plans.planTypeEdit.errorSaving")]);
    }
    
    setLoading(false);
  };

  const handleChange = (field: keyof PlanTypeInterface, value: string) => {
    setCurrent(prev => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    const newErrors: string[] = [];
    if (!current.name?.trim()) newErrors.push(Locale.label("plans.planTypeEdit.nameRequired"));
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  React.useEffect(() => {
    if (current.name) validate();
  }, [current.name]);

  return (
    <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{current.id ? Locale.label("plans.planTypeEdit.edit") : Locale.label("plans.planTypeEdit.add")} {Locale.label("plans.planTypeEdit.planType")}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <ErrorMessages errors={errors} />
          
          <InputBox
            headerIcon="assignment"
            headerText={Locale.label("plans.planType.details")}>
            <TextField
              fullWidth
              label={Locale.label("plans.planTypeEdit.planTypeName")}
              value={current.name || ""}
              onChange={(e) => handleChange("name", e.target.value)}
              required
              margin="normal"
            />
          </InputBox>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {Locale.label("common.cancel")}
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading || !current.name?.trim()}>
          {Locale.label("common.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};