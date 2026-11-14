import { ApiHelper, ArrayHelper } from "@churchapps/apphelper";
import { type TaskInterface } from "@churchapps/helpers";

// Tells a task's assignee (or every member of an assigned group) about the task.
export const notifyAssignee = async (task: TaskInterface, message: string) => {
  const data: any = {
    peopleIds: [task.assignedToId],
    contentType: "task",
    contentId: task.id,
    message
  };

  if (task.assignedToType === "group") {
    const groupMembers = await ApiHelper.get("/groupmembers?groupId=" + task.assignedToId?.toString(), "MembershipApi");
    data.peopleIds = ArrayHelper.getIds(groupMembers, "personId");
  }

  await ApiHelper.post("/notifications/create", data, "MessagingApi");
};
