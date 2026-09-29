import React, { memo } from "react";
import { DisplayBox, Notes } from "@churchapps/apphelper";
import { Box } from "@mui/material";

interface Props {
  context: any;
  conversationId: string;
  createConversation: () => Promise<string>;
  title?: string;
}

export const PersonNotes: React.FC<Props> = memo((props) => {
  return (
    <Box
      sx={{
        "& .note": {
          margin: "16px 0",
          padding: "16px",
          borderBottom: "1px solid",
          borderColor: "divider",
          backgroundColor: "var(--b1-canvas)",
          borderRadius: "var(--b1-radius-panel)",
          "&:last-child": { borderBottom: "none" }
        },
        "& .note .postedBy": {
          color: "text.secondary",
          marginBottom: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        },
        "& .note .postedBy img": {
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          marginRight: "12px",
          objectFit: "cover"
        },
        "& .note-contents": {
          lineHeight: 1.5,
          color: "text.primary"
        },
        "& .note-contents p": {
          margin: "0 0 8px 0",
          "&:first-of-type": { marginTop: 0 },
          "&:last-child": { marginBottom: 0 }
        },
        "& .addNote": {
          marginTop: "16px",
          padding: "16px",
          backgroundColor: "var(--b1-canvas)",
          borderRadius: "var(--b1-radius-panel)"
        },
        "& .addNote textarea": {
          width: "100%",
          minHeight: "80px",
          padding: "12px",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: "var(--b1-radius-control)",
          fontFamily: "inherit",
          resize: "vertical",
          "&:focus": {
            outline: "none",
            borderColor: "primary.main",
            boxShadow: "0 0 0 2px var(--b1-focus)"
          }
        },
        "& .btn": {
          backgroundColor: "primary.main",
          color: "primary.contrastText",
          border: "none",
          padding: "8px 16px",
          borderRadius: "var(--b1-radius-control)",
          cursor: "pointer",
          marginTop: "8px",
          "&:hover": { backgroundColor: "primary.dark" }
        }
      }}>
      {props.title
        ? <DisplayBox headerText={props.title} headerIcon="lock" data-testid="confidential-notes-box">
          <Notes context={props.context} conversationId={props.conversationId} createConversation={props.createConversation} noDisplayBox />
        </DisplayBox>
        : <Notes context={props.context} conversationId={props.conversationId} createConversation={props.createConversation} />}
    </Box>
  );
});
