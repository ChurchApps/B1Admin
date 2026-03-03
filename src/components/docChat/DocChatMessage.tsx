import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PersonIcon from "@mui/icons-material/Person";
import { MarkdownPreviewLight } from "@churchapps/apphelper-markdown";

interface Props {
  message: { role: "user" | "assistant"; content: string };
}

export const DocChatMessage: React.FC<Props> = ({ message }) => {
  const isUser = message.role === "user";

  return (
    <Box sx={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", mb: 1.5, gap: 1 }}>
      {!isUser && <SmartToyIcon sx={{ mt: 1, color: "primary.main", fontSize: 20 }} />}
      <Paper
        elevation={1}
        sx={{
          p: 1.5,
          maxWidth: "80%",
          backgroundColor: isUser ? "primary.main" : "background.paper",
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
