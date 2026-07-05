import React from "react";
import { Box, TextField, Typography, AppBar, Toolbar } from "@mui/material";
import type { AppBarProps, SxProps, Theme } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";
import { Locale } from "@churchapps/apphelper";
import { AppIconButton } from "../ui/AppIconButton";
import { useChat } from "./useChat";
import type { ChatMessage } from "./useChat";

interface Props {
  onClose: () => void;
  labelPrefix: string;
  mode?: string;
  title: string;
  headerColor?: AppBarProps["color"];
  headerSx?: SxProps<Theme>;
  titleSx?: SxProps<Theme>;
  headerIcon?: React.ReactNode;
  renderIntro: () => React.ReactNode;
  renderLoading: () => React.ReactNode;
  renderMessage: (message: ChatMessage, index: number) => React.ReactNode;
}

export const ChatPanel: React.FC<Props> = ({ onClose, labelPrefix, mode, title, headerColor, headerSx, titleSx, headerIcon, renderIntro, renderLoading, renderMessage }) => {
  const { messages, input, setInput, isLoading, handleSend, handleKeyDown, messagesEndRef } = useChat({ labelPrefix, mode });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <AppBar position="static" elevation={0} color={headerColor} sx={headerSx}>
        <Toolbar variant="dense">
          {headerIcon}
          <Typography variant="h6" sx={{ flexGrow: 1, fontSize: "1rem", ...titleSx }}>{title}</Typography>
          <AppIconButton label={Locale.label("common.close")} icon={<CloseIcon />} tone="header" onClick={onClose} edge="end" />
        </Toolbar>
      </AppBar>

      <Box sx={{ flexGrow: 1, overflow: "auto", p: 2 }}>
        {messages.length === 0 && renderIntro()}
        {messages.map((msg, index) => renderMessage(msg, index))}
        {isLoading && renderLoading()}
        <div ref={messagesEndRef} />
      </Box>

      <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder={Locale.label(`${labelPrefix}.placeholderInput`)}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            multiline
            maxRows={3}
          />
          <AppIconButton label={Locale.label(`${labelPrefix}.ariaSend`)} icon={<SendIcon />} tone="card" onClick={handleSend} disabled={isLoading || !input.trim()} />
        </Box>
      </Box>
    </Box>
  );
};
