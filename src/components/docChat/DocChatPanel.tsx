import React from "react";
import { Typography } from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import { Locale } from "@churchapps/apphelper";
import { ChatPanel } from "../chatShared/ChatPanel";
import { ChatMessageBubble } from "../chatShared/ChatMessageBubble";
import { DocChatLoading } from "./DocChatLoading";

interface Props {
  onClose: () => void;
}

export const DocChatPanel: React.FC<Props> = ({ onClose }) => (
  <ChatPanel
    onClose={onClose}
    labelPrefix="components.docChat"
    title={Locale.label("components.docChat.title")}
    headerColor="primary"
    renderIntro={() => (
      <Typography color="text.secondary" sx={{ textAlign: "center", mt: 4 }}>
        {Locale.label("components.docChat.intro")}
        <br /><br />
        {Locale.label("components.docChat.sampleGiving")}
        <br />
        {Locale.label("components.docChat.sampleCsv")}
        <br />
        {Locale.label("components.docChat.sampleGroup")}
      </Typography>
    )}
    renderLoading={() => <DocChatLoading />}
    renderMessage={(message, index) => (
      <ChatMessageBubble
        key={index}
        message={message}
        assistantBg="background.paper"
        assistantAvatar={<SmartToyIcon sx={{ mt: 1, color: "primary.main", fontSize: 20 }} />}
      />
    )}
  />
);
