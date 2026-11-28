import React, { useContext } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { ApiHelper, Loading, Locale, Notes } from "@churchapps/apphelper";
import { type ConversationInterface, type EventInterface, type UserContextInterface } from "@churchapps/helpers";
import UserContext from "../../UserContext";
import { useContentConversation } from "../../components/ContentNotes";

interface Props {
  eventId: string;
  // The page passes these when the request is on screen; a notification link may open one that is not.
  eventTitle?: string;
  requesterName?: string;
  onClose: () => void;
}

// ChurchAppsSupport#1676: staff and the requester talk about an event request without deciding it.
// The thread is its own conversation type, so the event's staff notes never reach the requester.
export const RequestDiscussionDialog: React.FC<Props> = ({ eventId, eventTitle, requesterName, onClose }) => {
  const context = useContext(UserContext);
  const conversations = useContentConversation("eventRequest", eventId);
  const conversationId = conversations.data?.[0]?.id || "";
  const event = useQuery<EventInterface>({ queryKey: ["/events/" + eventId, "ContentApi"], enabled: !eventTitle });
  const title = eventTitle || event.data?.title || "";

  const createConversation = async () => {
    const conv: ConversationInterface = { allowAnonymousPosts: false, contentType: "eventRequest", contentId: eventId, title: title || "Event request", visibility: "hidden" };
    const result: ConversationInterface[] = await ApiHelper.post("/conversations", [conv], "MessagingApi");
    await conversations.refetch();
    return result[0].id || "";
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" data-testid="request-discussion-dialog">
      <DialogTitle>
        {Locale.label("calendars.approvals.discussTitle")}
        {(title || requesterName) && (
          <Typography component="span" variant="body2" color="text.secondary" sx={{ display: "block" }} data-testid="request-discussion-subject">
            {[title, requesterName].filter(Boolean).join(" · ")}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{Locale.label("calendars.approvals.discussHelp")}</Typography>
        {conversations.isLoading
          ? <Loading />
          : (
            <Box data-testid="request-discussion-thread">
              <Notes key={conversationId || "new"} context={context as UserContextInterface} conversationId={conversationId} createConversation={createConversation} noDisplayBox />
            </Box>
          )}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose} data-testid="request-discussion-close">{Locale.label("common.close")}</Button>
      </DialogActions>
    </Dialog>
  );
};
