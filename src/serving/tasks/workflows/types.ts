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
  interface TaskInterface { assignmentId?: string | null; triggerId?: string | null }

  interface WorkflowBoardInterface {
    actions?: WorkflowStepActionInterface[];
  }

  interface WorkflowStepInterface { instructions?: string | null }
}

export const ACTION_TYPES = [
  "sendAssignmentRequest", "delay", "sendEmail", "sendText", "addToGroup", "removeFromGroup", "recordAttendance", "addToWorkflow", "addNote", "setField", "webhook", "createTask", "notifyPerson"
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const SETTABLE_PERSON_FIELDS = ["membershipStatus", "maritalStatus", "gender", "city", "state", "zip"];
