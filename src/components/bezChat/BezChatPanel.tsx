import React from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import { Locale } from "@churchapps/apphelper";
import { ChatPanel } from "../chatShared/ChatPanel";
import { ChatMessageBubble } from "../chatShared/ChatMessageBubble";

interface Props {
  onClose: () => void;
}

export const BezChatPanel: React.FC<Props> = ({ onClose }) => (
  <ChatPanel
    onClose={onClose}
    labelPrefix="components.bezChat"
    mode="bez"
    title={Locale.label("components.bezChat.title")}
    headerSx={{ backgroundColor: "warning.main" }}
    titleSx={{ color: "#fff" }}
    headerIcon={<Box component="img" src="/images/bez-icon.png" alt="Bez" sx={{ width: 28, height: 28, borderRadius: "50%", mr: 1 }} />}
    renderIntro={() => (
      <Box sx={{ textAlign: "center", mt: 4 }}>
        <Box component="img" src="/images/bez-icon.png" alt="Bez" sx={{ width: 80, height: 80, borderRadius: "50%", mb: 2 }} />
        <Typography color="text.secondary">
          {Locale.label("components.bezChat.intro")}
          <br /><br />
          {Locale.label("components.bezChat.sampleGiving")}
          <br />
          {Locale.label("components.bezChat.sampleCsv")}
          <br />
          {Locale.label("components.bezChat.sampleGroup")}
        </Typography>
      </Box>
    )}
    renderLoading={() => (
      <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
        <CircularProgress size={24} sx={{ color: "warning.main" }} />
      </Box>
    )}
    renderMessage={(message, index) => (
      <ChatMessageBubble
        key={index}
        message={message}
        assistantBg="var(--bg-sub)"
        assistantAvatar={<Box component="img" src="/images/bez-icon.png" alt="Bez" sx={{ width: 24, height: 24, borderRadius: "50%", mt: 1 }} />}
      />
    )}
  />
);
