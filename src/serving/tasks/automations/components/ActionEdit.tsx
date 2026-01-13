import {
  MenuItem, Select, TextField, type SelectChangeEvent, Card, CardContent, Typography, Stack, Box, Button, FormControl, InputLabel, InputAdornment, FormHelperText 
} from "@mui/material";
import React from "react";
import { type ActionInterface } from "@churchapps/helpers";
import { ErrorMessages, ApiHelper, Locale } from "@churchapps/apphelper";
import { ContentPicker } from "../../components/ContentPicker";
import { Task as TaskIcon, Search as SearchIcon, Save as SaveIcon, Cancel as CancelIcon, Assignment as ActionIcon } from "@mui/icons-material";

interface Props {
  action: ActionInterface;
  onCancel: () => void;
  onSave: (action: ActionInterface) => void;
}

export const ActionEdit = (props: Props) => {
  const [action, setAction] = React.useState<ActionInterface>(null);
  const [errors, setErrors] = React.useState([]);
  const [taskDetails, setTaskDetails] = React.useState<any>({});
  const [modalField, setModalField] = React.useState("");

  const init = () => {
    setAction(props.action);
    if (props.action.actionData) {
      const details = JSON.parse(props.action.actionData);
      setTaskDetails(details);
    }
  };

  React.useEffect(init, [props.action]);

  const validate = () => {
    const result: string[] = [];
    setErrors(result);
    return result.length === 0;
  };

  const handleSave = async () => {
    if (validate()) {
      ApiHelper.post("/actions", [action], "DoingApi").then((d) => {
        props.onSave(d[0]);
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    const val = e.target.value;
    const a = { ...action };
    switch (e.target.name) {
      case "actionType":
        a.actionType = val;
        break;
    }
    setAction(a);
  };

  const handleDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    const val = e.target.value;
    const d = { ...taskDetails };
    switch (e.target.name) {
      case "title":
        d.title = val;
        break;
      case "note":
        d.note = val;
        break;
    }
    setTaskDetails(d);
    updateActionData(d);
  };

  const updateActionData = (d: any) => {
    const a = { ...action };
    a.actionData = JSON.stringify(d);
    setAction(a);
  };

  const handleContentPicked = (contentType: string, contentId: string, label: string) => {
    const d = { ...taskDetails };
    switch (modalField) {
      case "assignedTo":
        d.assignedToType = contentType;
        d.assignedToId = contentId;
        d.assignedToLabel = label;
        break;
    }
    setTaskDetails(d);
    updateActionData(d);
    setModalField("");
  };

  const handleModalClose = () => {
    setModalField("");
  };

  if (!action) return <></>;
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
              <ActionIcon sx={{ color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
                {Locale.label("tasks.actionEdit.editAct")}
              </Typography>
            </Stack>
          </Box>

          {/* Error Messages */}
          {errors.length > 0 && <ErrorMessages errors={errors} />}

          {/* Form Fields */}
          <Stack spacing={2}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>{Locale.label("tasks.actionEdit.actType")}</InputLabel>
              <Select
                label={Locale.label("tasks.actionEdit.actType")}
                value={action?.actionType || "task"}
                name="actionType"
                onChange={handleChange}
                data-testid="action-type-select"
                aria-label="Action type"
                startAdornment={<TaskIcon sx={{ color: "action.active", ml: 1, mr: 0.5 }} />}>
                <MenuItem value="task">{Locale.label("tasks.actionEdit.taskAssign")}</MenuItem>
              </Select>
              <FormHelperText>{Locale.label("tasks.actionEdit.actTypeHelp")}</FormHelperText>
            </FormControl>

            <TextField
              fullWidth
              label={Locale.label("tasks.actionEdit.assignTo")}
              value={taskDetails.assignedToLabel || ""}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <SearchIcon sx={{ color: "action.active" }} />
                  </InputAdornment>
                ),
                sx: { "& .MuiInputBase-input": { cursor: "pointer" } },
              }}
              onFocus={(e) => {
                e.target.blur();
                setModalField("assignedTo");
              }}
              data-testid="action-assign-to-input"
              aria-label="Assign to"
              variant="outlined"
              sx={{ "& .MuiOutlinedInput-root": { "&:hover fieldset": { borderColor: "primary.main" } } }}
            />

            <TextField
              fullWidth
              label={Locale.label("tasks.actionEdit.taskTitle")}
              value={taskDetails?.title || ""}
              name="title"
              onChange={handleDetailsChange}
              data-testid="action-task-title-input"
              aria-label="Task title"
              variant="outlined"
              sx={{ "& .MuiOutlinedInput-root": { "&:hover fieldset": { borderColor: "primary.main" } } }}
            />

            <TextField
              fullWidth
              label={Locale.label("tasks.actionEdit.taskNote")}
              value={taskDetails?.note || ""}
              name="note"
              onChange={handleDetailsChange}
              multiline
              rows={4}
              data-testid="action-task-note-input"
              aria-label="Task note"
              variant="outlined"
              sx={{ "& .MuiOutlinedInput-root": { "&:hover fieldset": { borderColor: "primary.main" } } }}
            />
          </Stack>

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

      {/* Modal */}
      {modalField !== "" && <ContentPicker onClose={handleModalClose} onSelect={handleContentPicked} />}
    </Card>
  );
};
