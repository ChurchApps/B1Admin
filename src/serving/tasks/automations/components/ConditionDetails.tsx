import {
  Menu, MenuItem, Box, Typography, Stack, Button, IconButton, List, ListItem, ListItemIcon, ListItemText, Chip 
} from "@mui/material";
import React from "react";
import { type AutomationInterface, type ConditionInterface, type ConjunctionInterface, Locale } from "@churchapps/apphelper";
import { ArrayHelper } from "@churchapps/apphelper";
import { Add as AddIcon, Edit as EditIcon, Done as ConditionIcon, AccountTree as ConjunctionIcon } from "@mui/icons-material";

interface Props {
  automation: AutomationInterface;
  conjunctions: ConjunctionInterface[];
  conditions: ConditionInterface[];
  setEditConjunction: (conjunction: ConjunctionInterface) => void;
  setEditCondition: (condition: ConditionInterface) => void;
}

export const ConditionDetails = (props: Props) => {
  const [menuAnchor, setMenuAnchor] = React.useState<null | any>(null);
  const [parentId, setParentId] = React.useState<string>(null);

  const buildTree = (parentId: string) => {
    if (!props.conjunctions) return [];
    const conjunctions: ConjunctionInterface[] = ArrayHelper.getAll(props.conjunctions, "parentId", parentId);
    for (const c of conjunctions) {
      c.conjunctions = buildTree(c.id);
      c.conditions = props.conditions ? ArrayHelper.getAll(props.conditions, "conjunctionId", c.id) : [];
    }
    return conjunctions;
  };

  const tree = buildTree(null);

  const getConditionMenu = () => (
    <Menu
      id="addMenu"
      anchorEl={menuAnchor}
      open={Boolean(menuAnchor)}
      onClose={() => {
        setMenuAnchor(null);
      }}
      MenuListProps={{ "aria-labelledby": "addMenuButton" }}>
      <MenuItem
        onClick={() => {
          props.setEditConjunction({ automationId: props.automation.id, groupType: "and", parentId: parentId });
          setMenuAnchor(null);
        }}>
        <ListItemIcon>
          <ConjunctionIcon />
        </ListItemIcon>
        <ListItemText>{Locale.label("tasks.conditionDetails.addConj")}</ListItemText>
      </MenuItem>
      <MenuItem
        onClick={() => {
          props.setEditCondition({ conjunctionId: parentId, field: "dayOfWeek" });
          setMenuAnchor(null);
        }}>
        <ListItemIcon>
          <ConditionIcon />
        </ListItemIcon>
        <ListItemText>{Locale.label("tasks.conditionDetails.addCon")}</ListItemText>
      </MenuItem>
    </Menu>
  );

  const getLevel = (conjunctions: ConjunctionInterface[], conditions: ConditionInterface[], level: number) => {
    const result: JSX.Element[] = [];

    // Render conditions
    conditions?.forEach((condition) => {
      result.push(
        <ListItem
          key={condition.id}
          sx={{
            pl: level * 3,
            py: 1,
            borderRadius: 1,
            "&:hover": { backgroundColor: "action.hover" },
          }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <ConditionIcon sx={{ fontSize: 20, color: "success.main" }} />
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {condition.label}
              </Typography>
            }
          />
          <IconButton size="small" onClick={() => props.setEditCondition(condition)} data-testid={`edit-condition-button-${condition.id}`} aria-label="Edit condition">
            <EditIcon fontSize="small" />
          </IconButton>
        </ListItem>
      );
    });

    // Render conjunctions
    conjunctions?.forEach((conjunction) => {
      const isOr = conjunction.groupType === "or";

      result.push(
        <Box key={conjunction.id}>
          <ListItem
            sx={{
              pl: level * 3,
              py: 1,
              borderRadius: 1,
              backgroundColor: "grey.50",
              mb: 1,
              "&:hover": { backgroundColor: "grey.100" },
            }}>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <ConjunctionIcon sx={{ fontSize: 20, color: "primary.main" }} />
            </ListItemIcon>
            <ListItemText
              primary={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Chip label={isOr ? Locale.label("tasks.conditionDetails.or") : Locale.label("tasks.conditionDetails.and")} color={isOr ? "warning" : "primary"} size="small" sx={{ fontWeight: 600 }} />
                  <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                    {isOr
                      ? `${Locale.label("tasks.conditionDetails.any")} ${Locale.label("tasks.conditionDetails.trueCon")}`
                      : `${Locale.label("tasks.conditionDetails.all")} ${Locale.label("tasks.conditionDetails.trueCon")}`}
                  </Typography>
                </Stack>
              }
              slotProps={{ primary: { component: 'div' } }}
            />
            <Stack direction="row" spacing={0.5}>
              <IconButton
                size="small"
                onClick={(e) => {
                  setMenuAnchor(e.currentTarget);
                  setParentId(conjunction.id);
                }}
                data-testid={`add-conjunction-button-${conjunction.id}`}
                aria-label="Add conjunction">
                <AddIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => props.setEditConjunction(conjunction)} data-testid={`edit-conjunction-button-${conjunction.id}`} aria-label="Edit conjunction">
                <EditIcon fontSize="small" />
              </IconButton>
            </Stack>
          </ListItem>
          {getConditionMenu()}
          {getLevel(conjunction.conjunctions, conjunction.conditions, level + 1)}
        </Box>
      );
    });

    if (result.length === 0) return null;

    return <>{result}</>;
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {Locale.label("tasks.conditionDetails.con")}:
        </Typography>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => props.setEditConjunction({ automationId: props.automation.id, groupType: "and" })}
          data-testid="add-automation-condition-button"
          aria-label="Add condition"
          sx={{ textTransform: "none" }}>
          {Locale.label("tasks.conditionDetails.addCondition")}
        </Button>
      </Stack>

      {tree.length === 0 && (!props.conditions || props.conditions.length === 0) ? (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic", textAlign: "center", py: 2 }}>
          {Locale.label("tasks.conditionDetails.noCond")}
        </Typography>
      ) : (
        <List sx={{ p: 0 }}>{getLevel(tree, [], 0)}</List>
      )}
    </Box>
  );
};
