import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import { MarkdownPreviewLight } from "@churchapps/apphelper-markdown";

interface Props {
  message: { role: "user" | "assistant"; content: string };
}

export const SuperBeeChatMessage: React.FC<Props> = ({ message }) => {
  const isUser = message.role === "user";

  return (
    <Box sx={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", mb: 1.5, gap: 1 }}>
      {!isUser && (
        <Box
          component="img"
          src="/images/superbee-icon.png"
          alt="SuperBee"
          sx={{ width: 24, height: 24, borderRadius: "50%", mt: 1 }}
        />
      )}
      <Paper
        elevation={1}
        sx={{
          p: 1.5,
          maxWidth: "80%",
          backgroundColor: isUser ? "primary.main" : "#E8F0FE",
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
