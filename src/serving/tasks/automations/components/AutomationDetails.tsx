import React from "react";
import { type ActionInterface, type AutomationInterface, type ConditionInterface, type ConjunctionInterface } from "@churchapps/helpers";
import { Locale } from "@churchapps/apphelper";
import { ApiHelper } from "@churchapps/apphelper";
import { ActionEdit } from "./ActionEdit";
import { AutomationEdit } from "./AutomationEdit";
import { ConditionDetails } from "./ConditionDetails";
import { ConjunctionEdit } from "./ConjunctionEdit";
import { ConditionEdit } from "./ConditionEdit";
import {
  Card, CardContent, Typography, Stack, Box, Button, IconButton, Divider, List, ListItem, Chip 
} from "@mui/material";
import {
  SettingsSuggest as AutomationsIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Task as TaskIcon,
  Person as PersonIcon,
  Repeat as RepeatIcon,
  CheckCircle as ActiveIcon,
  PauseCircle as InactiveIcon,
} from "@mui/icons-material";

interface Props {
  automation: AutomationInterface;
  onChange: () => void;
  onDelete?: () => void;
}

export const AutomationDetails = (props: Props) => {
  const [automation, setAutomation] = React.useState<AutomationInterface>(null);
  const [editDetails, setEditDetails] = React.useState(false);
  const [editAction, setEditAction] = React.useState<ActionInterface>(null);
  const [actions, setActions] = React.useState<ActionInterface[]>([]);
  const [conjunctions, setConjunctions] = React.useState<ConjunctionInterface[]>(null);
  const [editConjunction, setEditConjunction] = React.useState<ConjunctionInterface>(null);
  const [conditions, setConditions] = React.useState<ConditionInterface[]>(null);
  const [editCondition, setEditCondition] = React.useState<ConditionInterface>(null);

  const loadData = () => {
    ApiHelper.get("/actions/automation/" + props.automation.id, "DoingApi").then((a) => setActions(a));
    ApiHelper.get("/conjunctions/automation/" + props.automation.id, "DoingApi").then((conj) => setConjunctions(conj));
    ApiHelper.get("/conditions/automation/" + props.automation.id, "DoingApi").then((cond) => setConditions(cond));
  };

  const init = () => {
    setAutomation(props.automation);
    loadData();
  };

  const getActions = () => {
    if (actions.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic", textAlign: "center", py: 2 }}>
          {Locale.label("tasks.automationDetails.noAct")}
        </Typography>
      );
    }

    return (
      <List sx={{ p: 0 }}>
        {actions.map((action) => {
          if (action.actionType === "task") {
            const data: any = JSON.parse(action.actionData);
            return (
              <ListItem
                key={action.id}
                sx={{
                  px: 0,
                  py: 1,
                  border: "1px solid",
                  borderColor: "grey.200",
                  borderRadius: 1,
                  mb: 1,
                  "&:last-child": { mb: 0 },
                }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1 }}>
                  <TaskIcon sx={{ color: "primary.main", fontSize: 20 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {data.title}
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <PersonIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                      <Typography variant="caption" color="text.secondary">
                        {data.assignedToLabel}
                      </Typography>
                    </Stack>
                  </Box>
                  <IconButton size="small" onClick={() => setEditAction(action)} sx={{ flexShrink: 0 }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </ListItem>
            );
          }
          return null;
        })}
      </List>
    );
  };

  React.useEffect(init, [props.automation]); // eslint-disable-line react-hooks/exhaustive-deps

  if (editDetails) {
    return (
      <AutomationEdit
        automation={automation}
        onDelete={() => {
          setEditDetails(false);
          props.onDelete();
        }}
        onCancel={() => {
          setEditDetails(false);
        }}
        onSave={(a: AutomationInterface) => {
          setEditDetails(false);
          setAutomation(a);
          props.onChange();
        }}
      />
    );
  } else if (editAction) {
    return (
      <ActionEdit
        action={editAction}
        onCancel={() => setEditAction(null)}
        onSave={() => {
          setEditAction(null);
          loadData();
        }}
      />
    );
  } else if (editConjunction) {
    return (
      <ConjunctionEdit
        conjunction={editConjunction}
        onCancel={() => setEditConjunction(null)}
        onSave={() => {
          setEditConjunction(null);
          loadData();
        }}
      />
    );
  } else if (editCondition) {
    return (
      <ConditionEdit
        condition={editCondition}
        onCancel={() => setEditCondition(null)}
        onSave={() => {
          setEditCondition(null);
          loadData();
        }}
      />
    );
  } else {
    return (
      <Card
        sx={{
          borderRadius: 2,
          border: "1px solid",
          borderColor: "grey.200",
        }}>
        <CardContent>
          <Stack spacing={3}>
            {/* Header */}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <AutomationsIcon sx={{ color: "primary.main" }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
                  {Locale.label("tasks.automationDetails.auto")}
                </Typography>
              </Stack>
              <IconButton size="small" onClick={() => setEditDetails(true)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Box>

            <Divider />

            {/* Automation Info */}
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  {Locale.label("common.name")}:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {automation?.title}
                </Typography>
              </Box>

              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Chip
                  icon={automation?.active ? <ActiveIcon /> : <InactiveIcon />}
                  label={automation?.active ? Locale.label("tasks.automationDetails.active") : Locale.label("tasks.automationDetails.inactive")}
                  color={automation?.active ? "success" : "default"}
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
                <Chip icon={<RepeatIcon />} label={`${Locale.label("tasks.automationDetails.recurs")}: ${automation?.recurs}`} variant="outlined" size="small" />
              </Stack>
            </Stack>

            <Divider />

            {/* Actions Section */}
            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {Locale.label("tasks.automationDetails.acts")}:
                </Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={() => setEditAction({ automationId: automation.id, actionType: "task" })} sx={{ textTransform: "none" }}>
                  {Locale.label("tasks.automationDetails.addAct")}
                </Button>
              </Stack>
              {getActions()}
            </Box>

            <Divider />

            {/* Conditions Section */}
            <ConditionDetails automation={automation} conjunctions={conjunctions} conditions={conditions} setEditConjunction={setEditConjunction} setEditCondition={setEditCondition} />
          </Stack>
        </CardContent>
      </Card>
    );
  }
};
