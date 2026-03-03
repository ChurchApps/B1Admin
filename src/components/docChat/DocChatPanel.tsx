import React from "react";
import { Box, TextField, IconButton, Typography, Paper, AppBar, Toolbar } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import { ApiHelper } from "@churchapps/apphelper";
import { DocChatMessage } from "./DocChatMessage";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  onClose: () => void;
}

export const DocChatPanel: React.FC<Props> = ({ onClose }) => {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [statusText, setStatusText] = React.useState("Searching documentation...");
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  React.useEffect(() => {
    if (isLoading) {
      setStatusText("Searching documentation...");
      const timer = setTimeout(() => setStatusText("Composing answer..."), 2000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: question };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await ApiHelper.post("/docChat/ask", { question, conversationHistory: messages }, "AskApi");
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
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar variant="dense">
          <Typography variant="h6" sx={{ flexGrow: 1, fontSize: "1rem" }}>Help Assistant</Typography>
          <IconButton color="inherit" onClick={onClose} edge="end"><CloseIcon /></IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ flexGrow: 1, overflow: "auto", p: 2 }}>
        {messages.length === 0 && (
          <Typography color="text.secondary" sx={{ textAlign: "center", mt: 4 }}>
            Ask any question about B1 Admin. For example:
            <br /><br />
            "How do I set up online giving?"
            <br />
            "How do I import members from a CSV?"
            <br />
            "How do I create a new group?"
          </Typography>
        )}
        {messages.map((msg, index) => (
          <DocChatMessage key={index} message={msg} />
        ))}
        {isLoading && (
          <Box sx={{ mb: 1.5 }}>
            <Box sx={{ display: "flex", justifyContent: "flex-start", gap: 1 }}>
              <SmartToyIcon sx={{ mt: 1, color: "primary.main", fontSize: 20 }} />
              <Paper elevation={1} sx={{ p: 1.5, backgroundColor: "background.paper" }}>
                <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", height: 20 }}>
                  {[0, 1, 2].map((i) => (
                    <Box key={i} sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: "text.secondary",
                      animation: "docChatBounce 1.4s infinite ease-in-out",
                      animationDelay: `${i * 0.16}s`,
                      "@keyframes docChatBounce": { "0%, 80%, 100%": { transform: "scale(0.6)", opacity: 0.4 }, "40%": { transform: "scale(1)", opacity: 1 } }
                    }} />
                  ))}
                </Box>
              </Paper>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 4.5, mt: 0.5, display: "block" }}>
              {statusText}
            </Typography>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Ask a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            multiline
            maxRows={3}
          />
          <IconButton color="primary" onClick={handleSend} disabled={isLoading || !input.trim()}>
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};
