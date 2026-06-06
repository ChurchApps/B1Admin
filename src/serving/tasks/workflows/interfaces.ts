// Shim: these live in @churchapps/helpers but the installed 1.5.0 predates them.
// Delete this file and import from the package once it's republished (>1.5.0).
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

// trigger: onEnter | onComplete. kind: outcome | personMatch | always.
export interface WorkflowStepRouteInterface {
  id?: string;
  churchId?: string;
  workflowId?: string;
  stepId?: string;
  sort?: number;
  trigger?: string;
  kind?: string;
  label?: string;
  targetStepId?: string;
}

export interface FormWorkflowTriggerInterface {
  id?: string;
  churchId?: string;
  formId?: string;
  workflowId?: string;
  active?: boolean;
}

export interface WorkflowCardInterface extends TaskInterface {
  workflowId?: string;
  stepId?: string;
  dueDate?: Date;
  snoozedUntil?: Date;
  sort?: number;
  pinnedAssignment?: boolean;
}

export interface WorkflowBoardInterface {
  workflow: WorkflowInterface;
  steps: WorkflowStepInterface[];
  cards: WorkflowCardInterface[];
  routes: WorkflowStepRouteInterface[];
}
