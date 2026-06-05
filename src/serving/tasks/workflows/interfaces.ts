// Local shim for the Workflow interfaces until @churchapps/helpers republishes
// with WorkflowInterface/WorkflowStepInterface/etc and the extended TaskInterface.
// FOLLOW-UP: once @churchapps/helpers ships these, delete this file and import
// the interfaces directly from "@churchapps/helpers".
import { type TaskInterface } from "@churchapps/helpers";

export interface WorkflowInterface {
  id?: string;
  churchId?: string;
  name?: string;
  categoryId?: string;
  active?: boolean;
  sort?: number;
}

export interface WorkflowStepInterface {
  id?: string;
  churchId?: string;
  workflowId?: string;
  name?: string;
  sort?: number;
  defaultAssignToType?: string;
  defaultAssignToId?: string;
  defaultAssignToLabel?: string;
  expectedResponseDays?: number;
}

export interface WorkflowCategoryInterface {
  id?: string;
  churchId?: string;
  name?: string;
  sort?: number;
}

export interface FormWorkflowTriggerInterface {
  id?: string;
  churchId?: string;
  formId?: string;
  workflowId?: string;
  active?: boolean;
}

// A "card" is a Task carrying workflow fields. The published TaskInterface does
// not yet declare these, so extend it locally.
export interface WorkflowCardInterface extends TaskInterface {
  workflowId?: string;
  stepId?: string;
  dueDate?: Date;
  snoozedUntil?: Date;
  sort?: number;
}

// Board payload returned by GET /doing/tasks/board/:workflowId
export interface WorkflowBoardInterface {
  workflow: WorkflowInterface;
  steps: WorkflowStepInterface[];
  cards: WorkflowCardInterface[];
}
