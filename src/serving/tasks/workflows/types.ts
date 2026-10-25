export interface WorkflowStepActionInterface {
  id?: string;
  churchId?: string;
  stepId?: string;
  sort?: number;
  actionType?: string;
  config?: string;
}

declare module "@churchapps/helpers" {
  interface WorkflowInterface { workflowType?: string | null }
  interface TaskInterface { assignmentId?: string | null }

  interface WorkflowBoardInterface {
    actions?: WorkflowStepActionInterface[];
  }
}

export const ACTION_TYPES = [
  "sendAssignmentRequest", "delay", "sendEmail", "sendText", "addToGroup", "removeFromGroup", "recordAttendance", "addToWorkflow", "addNote", "setField", "webhook", "createTask", "notifyPerson"
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const SETTABLE_PERSON_FIELDS = ["membershipStatus", "maritalStatus", "gender", "city", "state", "zip"];
