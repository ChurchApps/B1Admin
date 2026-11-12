import { type TaskInterface } from "@churchapps/helpers";

// The Api returns tasks oldest first and cards soonest due first; My Work shows what just arrived on top.
export const newestFirst = (a: TaskInterface, b: TaskInterface) => (new Date(b.dateCreated || 0).getTime() - new Date(a.dateCreated || 0).getTime()) || ((b.taskNumber || 0) - (a.taskNumber || 0));

// A card entering a step gets the step's highest sort, so the latest arrival heads its column.
export const latestArrivalFirst = (a: TaskInterface, b: TaskInterface) => ((b.sort || 0) - (a.sort || 0)) || ((b.taskNumber || 0) - (a.taskNumber || 0));
