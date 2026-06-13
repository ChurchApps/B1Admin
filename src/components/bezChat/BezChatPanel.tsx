import React from "react";
import { Box, TextField, Typography, CircularProgress, AppBar, Toolbar } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { AppIconButton } from "../ui/AppIconButton";
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
      setMessages([...updatedMessages, { role: "assistant", content: response.answer || Locale.label("components.bezChat.errorAnswer") }]);
    } catch {
      setMessages([...updatedMessages, { role: "assistant", content: Locale.label("components.bezChat.errorGeneric") }]);
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
      <AppBar position="static" elevation={0} sx={{ backgroundColor: "warning.main" }}>
        <Toolbar variant="dense">
          <Box
            component="img"
            src="/images/bez-icon.png"
            alt="Bez"
            sx={{ width: 28, height: 28, borderRadius: "50%", mr: 1 }}
          />
          <Typography variant="h6" sx={{ flexGrow: 1, fontSize: "1rem", color: "#fff" }}>{Locale.label("components.bezChat.title")}</Typography>
          <AppIconButton label={Locale.label("common.close")} icon={<CloseIcon />} tone="header" onClick={onClose} edge="end" />
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
        {messages.map((msg, index) => (
          <BezChatMessage key={index} message={msg} />
        ))}
        {isLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
            <CircularProgress size={24} sx={{ color: "warning.main" }} />
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder={Locale.label("components.bezChat.placeholderInput")}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            multiline
            maxRows={3}
          />
          <AppIconButton label={Locale.label("components.bezChat.ariaSend")} icon={<SendIcon />} tone="card" onClick={handleSend} disabled={isLoading || !input.trim()} />
        </Box>
      </Box>
    </Box>
  );
};
