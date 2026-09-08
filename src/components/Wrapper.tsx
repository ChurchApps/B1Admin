import React from "react";
import { Box } from "@mui/material";
import { Header } from "./Header";
import { DocChatWidget } from "./docChat";
import { BezChatWidget } from "./bezChat";
import { SuperBeeChatWidget } from "./superBeeChat";
import { CommandPalette } from "../omarchy";

interface Props {
  pageTitle?: string;
  children: React.ReactNode;
}

export const Wrapper: React.FC<Props> = (props) => {
  const params = new URLSearchParams(window.location.search);

  const showHeader = params.get("hideHeader") !== "true";

  return (
    <>
      {showHeader && <Header />}

      <Box sx={{ width: "100%" }}>
        {showHeader && <div id="appBarSpacer" style={{ height: 0 }}></div>}
        {props.children}
      </Box>
      {showHeader && <CommandPalette />}
      {showHeader && (
        process.env.REACT_APP_CHAT_MODE === "superbee" ? <SuperBeeChatWidget />
          : process.env.REACT_APP_CHAT_MODE === "bez" ? <BezChatWidget />
            : process.env.REACT_APP_CHAT_MODE === "standard" ? <DocChatWidget />
              : null
      )}
    </>
  );
};
