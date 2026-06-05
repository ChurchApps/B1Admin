import { Box, Typography, Chip, IconButton, Button, Stack } from "@mui/material";
import React from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { Edit as EditIcon, Add as AddIcon } from "@mui/icons-material";
import { DraggableWrapper } from "../../../../components/DraggableWrapper";
import { DroppableWrapper } from "../../../../components/DroppableWrapper";
import { ContentPicker } from "../../components/ContentPicker";
import { WorkflowCard } from "./WorkflowCard";
import { type WorkflowStepInterface, type WorkflowCardInterface } from "../interfaces";

interface Props {
  workflowId: string;
  step: WorkflowStepInterface;
  cards: WorkflowCardInterface[];
  onDropCard: (cardId: string, stepId: string) => void;
  onOpenCard: (card: WorkflowCardInterface) => void;
  onEditStep: (step: WorkflowStepInterface) => void;
  onChanged: () => void;
}

export const WorkflowStepColumn = (props: Props) => {
  const { step, cards } = props;
  const [showPicker, setShowPicker] = React.useState(false);

  const handleAddCard = async (contentType: string, contentId: string, label: string) => {
    setShowPicker(false);
    if (contentType !== "person") return;
    // Drop the card directly on this column's step (not the workflow's first step).
    await ApiHelper.post("/tasks/addToWorkflow", { workflowId: props.workflowId, stepId: step.id, associatedWith: { type: "person", id: contentId, label } }, "DoingApi");
    props.onChanged();
  };

  return (
    <Box data-testid={"workflow-column-" + step.id} sx={{ minWidth: 280, width: 280, flexShrink: 0, backgroundColor: "action.hover", borderRadius: 2, p: 1, mr: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1, px: 0.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{step.name}</Typography>
          <Chip size="small" label={cards.length} data-testid={"step-count-" + step.id} />
        </Stack>
        <IconButton size="small" onClick={() => props.onEditStep(step)} data-testid={"edit-step-" + step.id} aria-label={Locale.label("tasks.workflowStepEdit.editStep")}><EditIcon fontSize="small" /></IconButton>
      </Stack>

      <DroppableWrapper accept="workflowCard" onDrop={(d: any) => props.onDropCard(d.data.id, step.id)}>
        <Box sx={{ minHeight: 60 }}>
          {cards.map((card) => (
            <DraggableWrapper key={card.id} dndType="workflowCard" data={card} onDoubleClick={() => props.onOpenCard(card)}>
              <Box onClick={() => props.onOpenCard(card)}>
                <WorkflowCard card={card} />
              </Box>
            </DraggableWrapper>
          ))}
        </Box>
      </DroppableWrapper>

      <Button fullWidth size="small" startIcon={<AddIcon />} data-testid={"add-card-" + step.id} onClick={() => setShowPicker(true)} sx={{ mt: 1, textTransform: "none" }}>
        {Locale.label("tasks.workflowBoard.addCard")}
      </Button>

      {showPicker && <ContentPicker onClose={() => setShowPicker(false)} onSelect={handleAddCard} />}
    </Box>
  );
};
