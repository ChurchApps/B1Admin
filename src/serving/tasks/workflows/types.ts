export interface WorkflowStepActionInterface {
  id?: string;
  churchId?: string;
  stepId?: string;
  sort?: number;
  actionType?: string;
  config?: string;
}

declare module "@churchapps/helpers" {
  interface WorkflowBoardInterface {
    actions?: WorkflowStepActionInterface[];
  }
}

export const ACTION_TYPES = [
  "delay", "sendEmail", "addToGroup", "removeFromGroup", "addToWorkflow", "addNote", "setField", "webhook", "createTask"
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const SETTABLE_PERSON_FIELDS = ["membershipStatus", "maritalStatus", "gender", "city", "state", "zip"];
