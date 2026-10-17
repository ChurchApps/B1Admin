import React, { useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { ApiHelper, Loading, UserHelper } from "@churchapps/apphelper";
import { type ConversationInterface } from "@churchapps/helpers";
import UserContext from "../UserContext";
import { PersonNotes } from "../people/components/PersonNotes";

interface Props {
  contentType: "groupNote" | "eventNote";
  contentId: string;
  title: string;
}

export const useContentConversation = (contentType: string, contentId?: string) => {
  const churchId = UserHelper.currentUserChurch?.church?.id;
  return useQuery<ConversationInterface[]>({
    queryKey: [`/conversations/${churchId}/${contentType}/${contentId}`, "MessagingApi"],
    enabled: !!churchId && !!contentId
  });
};

// Staff notes thread on a group or event: the person-notes UI pointed at a conversation keyed by content.
export const ContentNotes: React.FC<Props> = ({ contentType, contentId, title }) => {
  const context = useContext(UserContext);
  const conversations = useContentConversation(contentType, contentId);
  const conversationId = conversations.data?.[0]?.id || "";

  const createConversation = async () => {
    const conv: ConversationInterface = { allowAnonymousPosts: false, contentType, contentId, title, visibility: "hidden" };
    const result: ConversationInterface[] = await ApiHelper.post("/conversations", [conv], "MessagingApi");
    await conversations.refetch();
    return result[0].id || "";
  };

  if (conversations.isLoading) return <Loading />;
  return <PersonNotes key={conversationId || "new"} context={context} conversationId={conversationId} createConversation={createConversation} />;
};
