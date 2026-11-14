import React from "react";
import { Link, Stack } from "@mui/material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { Phone as PhoneIcon, Email as EmailIcon } from "@mui/icons-material";

interface Props {
  taskId: string;
  associatedWithType?: string;
  associatedWithId?: string;
}

// Phone and email of the person a task is about. The Api only returns them to people who can view the task.
export const TaskContact = ({ taskId, associatedWithType, associatedWithId }: Props) => {
  const [contact, setContact] = React.useState<{ mobilePhone?: string; email?: string }>({});
  const isPerson = associatedWithType?.toLowerCase() === "person" && !!associatedWithId;

  React.useEffect(() => {
    setContact({});
    if (!isPerson || !taskId) return;
    let current = true;
    ApiHelper.get("/tasks/" + taskId + "/contact", "DoingApi")
      .then((data) => { if (current) setContact(data || {}); })
      .catch(() => { if (current) setContact({}); });
    return () => { current = false; };
  }, [taskId, isPerson, associatedWithId]);

  if (!isPerson || (!contact.mobilePhone && !contact.email)) return null;
  return (
    <Stack spacing={0.5} sx={{ mt: 0.5 }} data-testid="task-contact">
      {contact.mobilePhone && (
        <Stack direction="row" spacing={1} alignItems="center">
          <PhoneIcon fontSize="small" color="action" aria-label={Locale.label("tasks.workflowCard.phone")} />
          <Link href={"tel:" + contact.mobilePhone} variant="body2" data-testid="card-contact-phone">{contact.mobilePhone}</Link>
        </Stack>
      )}
      {contact.email && (
        <Stack direction="row" spacing={1} alignItems="center">
          <EmailIcon fontSize="small" color="action" aria-label={Locale.label("tasks.workflowCard.email")} />
          <Link href={"mailto:" + contact.email} variant="body2" data-testid="card-contact-email">{contact.email}</Link>
        </Stack>
      )}
    </Stack>
  );
};
