import React from "react";
import { Locale } from "@churchapps/apphelper";
import { ChatWidgetShell } from "../chatShared/ChatWidgetShell";
import { ChatImageTrigger } from "../chatShared/ChatImageTrigger";
import { SuperBeeChatPanel } from "./SuperBeeChatPanel";

export const SuperBeeChatWidget: React.FC = () => (
  <ChatWidgetShell
    renderTrigger={(open) => (
      <ChatImageTrigger
        onClick={open}
        src="/images/superbee-icon.png"
        alt="SuperBee"
        ariaLabel={Locale.label("components.superBeeChat.ariaOpen")}
        boxShadow="0 3px 10px rgba(21,101,192,0.4)"
      />
    )}
    renderPanel={(close) => <SuperBeeChatPanel onClose={close} />}
  />
);
