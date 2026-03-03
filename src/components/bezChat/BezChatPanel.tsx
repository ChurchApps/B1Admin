import React from "react";
import { Box, TextField, IconButton, Typography, CircularProgress, AppBar, Toolbar } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";
import { ApiHelper } from "@churchapps/apphelper";
import { BezChatMessage } from "./BezChatMessage";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  onClose: () => void;
}

export const BezChatPanel: React.FC<Props> = ({ onClose }) => {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: question };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await ApiHelper.post("/docChat/ask", { question, conversationHistory: messages, mode: "bez" }, "AskApi");
      setMessages([...updatedMessages, { role: "assistant", content: response.answer || "I'm sorry, I couldn't find an answer." }]);
    } catch {
      setMessages([...updatedMessages, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <AppBar position="static" elevation={0} sx={{ backgroundColor: "#F5A623" }}>
        <Toolbar variant="dense">
          <Box
            component="img"
            src="/images/bez-icon.png"
            alt="Bez"
            sx={{ width: 28, height: 28, borderRadius: "50%", mr: 1 }}
          />
          <Typography variant="h6" sx={{ flexGrow: 1, fontSize: "1rem", color: "#fff" }}>Ask Bez</Typography>
          <IconButton sx={{ color: "#fff" }} onClick={onClose} edge="end"><CloseIcon /></IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ flexGrow: 1, overflow: "auto", p: 2 }}>
        {messages.length === 0 && (
          <Box sx={{ textAlign: "center", mt: 4 }}>
            <Box
              component="img"
              src="/images/bez-icon.png"
              alt="Bez"
              sx={{ width: 80, height: 80, borderRadius: "50%", mb: 2 }}
            />
            <Typography color="text.secondary">
              Hi, I'm Bez! I can help you navigate B1 Admin. Try asking me:
              <br /><br />
              "How do I set up online giving?"
              <br />
              "How do I import members from a CSV?"
              <br />
              "How do I create a new group?"
            </Typography>
          </Box>
        )}
        {messages.map((msg, index) => (
          <BezChatMessage key={index} message={msg} />
        ))}
        {isLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
            <CircularProgress size={24} sx={{ color: "#F5A623" }} />
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Ask Bez a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            multiline
            maxRows={3}
          />
          <IconButton sx={{ color: "#F5A623" }} onClick={handleSend} disabled={isLoading || !input.trim()}>
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};
