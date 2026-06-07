// Local types for action steps until @churchapps/helpers publishes them.
// Module augmentation adds the new fields onto the published interfaces so the
// existing WorkflowStepInterface / WorkflowBoardInterface usages pick them up.

export interface WorkflowStepActionInterface {
  id?: string;
  churchId?: string;
  stepId?: string;
  sort?: number;
  actionType?: string;
  config?: string;
}

declare module "@churchapps/helpers" {
  interface WorkflowStepInterface {
    stepType?: string; // "human" (default) | "action"
  }
  interface WorkflowBoardInterface {
    actions?: WorkflowStepActionInterface[];
  }
}

export const ACTION_TYPES = ["delay", "sendEmail", "addToGroup", "addToWorkflow", "addNote", "setField", "webhook"] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

// Allow-listed person fields a setField action may write (mirrors the API gateway).
export const SETTABLE_PERSON_FIELDS = ["membershipStatus", "maritalStatus", "gender", "city", "state", "zip"];
