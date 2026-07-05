import React from "react";
import { Fab } from "@mui/material";
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswer";
import { Locale } from "@churchapps/apphelper";
import { ChatWidgetShell } from "../chatShared/ChatWidgetShell";
import { DocChatPanel } from "./DocChatPanel";

export const DocChatWidget: React.FC = () => (
  <ChatWidgetShell
    renderTrigger={(open) => (
      <Fab
        color="primary"
        onClick={open}
        sx={{ position: "fixed", bottom: 24, right: 24, zIndex: 1200 }}
        aria-label={Locale.label("components.docChat.ariaOpen")}
      >
        <QuestionAnswerIcon />
      </Fab>
    )}
    renderPanel={(close) => <DocChatPanel onClose={close} />}
  />
);
