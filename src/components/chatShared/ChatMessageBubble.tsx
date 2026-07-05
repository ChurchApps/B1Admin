import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import { MarkdownPreviewLight } from "@churchapps/apphelper/markdown";
import type { ChatMessage } from "./useChat";

interface Props {
  message: ChatMessage;
  assistantAvatar: React.ReactNode;
  assistantBg: string;
}

export const ChatMessageBubble: React.FC<Props> = ({ message, assistantAvatar, assistantBg }) => {
  const isUser = message.role === "user";

  return (
    <Box sx={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", mb: 1.5, gap: 1 }}>
      {!isUser && assistantAvatar}
      <Paper
        elevation={1}
        sx={{
          p: 1.5,
          maxWidth: "80%",
          backgroundColor: isUser ? "primary.main" : assistantBg,
          color: isUser ? "primary.contrastText" : "text.primary"
        }}
      >
        {isUser
          ? <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{message.content}</Typography>
          : <MarkdownPreviewLight value={message.content} />
        }
      </Paper>
      {isUser && <PersonIcon sx={{ mt: 1, color: "text.secondary", fontSize: 20 }} />}
    </Box>
  );
};
