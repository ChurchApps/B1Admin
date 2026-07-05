import React from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import { Locale } from "@churchapps/apphelper";
import { ChatPanel } from "../chatShared/ChatPanel";
import { ChatMessageBubble } from "../chatShared/ChatMessageBubble";

interface Props {
  onClose: () => void;
}

export const SuperBeeChatPanel: React.FC<Props> = ({ onClose }) => (
  <ChatPanel
    onClose={onClose}
    labelPrefix="components.superBeeChat"
    mode="superbee"
    title={Locale.label("components.superBeeChat.title")}
    headerSx={{ backgroundColor: "primary.main" }}
    titleSx={{ color: "#fff", fontWeight: "bold" }}
    headerIcon={<Box component="img" src="/images/superbee-icon.png" alt="SuperBee" sx={{ width: 28, height: 28, borderRadius: "50%", mr: 1 }} />}
    renderIntro={() => (
      <Box sx={{ textAlign: "center", mt: 4 }}>
        <Box component="img" src="/images/superbee-icon.png" alt="SuperBee" sx={{ width: 80, height: 80, borderRadius: "50%", mb: 2 }} />
        <Typography color="text.secondary">
          {Locale.label("components.superBeeChat.intro")}
          <br /><br />
          {Locale.label("components.superBeeChat.sampleGiving")}
          <br />
          {Locale.label("components.superBeeChat.sampleCsv")}
          <br />
          {Locale.label("components.superBeeChat.sampleGroup")}
        </Typography>
      </Box>
    )}
    renderLoading={() => (
      <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
        <CircularProgress size={24} sx={{ color: "primary.main" }} />
      </Box>
    )}
    renderMessage={(message, index) => (
      <ChatMessageBubble
        key={index}
        message={message}
        assistantBg="var(--bg-sub)"
        assistantAvatar={<Box component="img" src="/images/superbee-icon.png" alt="SuperBee" sx={{ width: 24, height: 24, borderRadius: "50%", mt: 1 }} />}
      />
    )}
  />
);
