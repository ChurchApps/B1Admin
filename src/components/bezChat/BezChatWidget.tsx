import React from "react";
import { Locale } from "@churchapps/apphelper";
import { ChatWidgetShell } from "../chatShared/ChatWidgetShell";
import { ChatImageTrigger } from "../chatShared/ChatImageTrigger";
import { BezChatPanel } from "./BezChatPanel";

export const BezChatWidget: React.FC = () => (
  <ChatWidgetShell
    renderTrigger={(open) => (
      <ChatImageTrigger
        onClick={open}
        src="/images/bez-icon.png"
        alt="Ask Bez"
        ariaLabel={Locale.label("components.bezChat.ariaOpen")}
        boxShadow="0 3px 10px rgba(0,0,0,0.2)"
      />
    )}
    renderPanel={(close) => <BezChatPanel onClose={close} />}
  />
);
