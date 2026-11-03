import React from "react";
import { Box } from "@mui/material";
import { useLocation } from "react-router-dom";
import { Header } from "./Header";
import { DocChatWidget } from "./docChat";
import { BezChatWidget } from "./bezChat";
import { SuperBeeChatWidget } from "./superBeeChat";

interface Props {
  pageTitle?: string;
  children: React.ReactNode;
}

export const Wrapper: React.FC<Props> = (props) => {
  const params = new URLSearchParams(useLocation().search);

  const showHeader = params.get("hideHeader") !== "true";

  return (
    <>
      {showHeader && <Header />}

      <Box sx={{ width: "100%" }}>
        {showHeader && <div id="appBarSpacer"></div>}
        {props.children}
      </Box>
      {showHeader && (
        process.env.REACT_APP_CHAT_MODE === "superbee" ? <SuperBeeChatWidget />
          : process.env.REACT_APP_CHAT_MODE === "bez" ? <BezChatWidget />
            : process.env.REACT_APP_CHAT_MODE === "standard" ? <DocChatWidget />
              : null
      )}
    </>
  );
};
