import React, { memo } from "react";
import { Notes } from "@churchapps/apphelper";
import { Box } from "@mui/material";

interface Props {
  context: any;
  conversationId: string;
  createConversation: () => Promise<string>;
}

export const PersonNotes: React.FC<Props> = memo((props) => {
  return (
    <Box
      sx={{
        "& .note": {
          margin: "16px 0",
          padding: "16px",
          borderBottom: "1px solid var(--border-main)",
          backgroundColor: "var(--bg-sub)",
          borderRadius: "8px",
          "&:last-child": { borderBottom: "none" },
        },
        "& .note .postedBy": {
          color: "text.secondary",
          fontSize: "0.875rem",
          marginBottom: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        },
        "& .note .postedBy img": {
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          marginRight: "12px",
          objectFit: "cover",
        },
        "& .note-contents": {
          fontSize: "0.95rem",
          lineHeight: 1.5,
          color: "text.primary",
        },
        "& .note-contents p": {
          margin: "0 0 8px 0",
          "&:first-of-type": { marginTop: 0 },
          "&:last-child": { marginBottom: 0 },
        },
        "& .addNote": {
          marginTop: "16px",
          padding: "16px",
          backgroundColor: "var(--bg-sub)",
          borderRadius: "8px",
        },
        "& .addNote textarea": {
          width: "100%",
          minHeight: "80px",
          padding: "12px",
          border: "1px solid var(--border-main)",
          borderRadius: "4px",
          fontSize: "0.95rem",
          fontFamily: "inherit",
          resize: "vertical",
          "&:focus": {
            outline: "none",
            borderColor: "primary.main",
            boxShadow: "0 0 0 2px rgba(21, 101, 192, 0.1)",
          },
        },
        "& .btn": {
          backgroundColor: "primary.main",
          color: "white",
          border: "none",
          padding: "8px 16px",
          borderRadius: "4px",
          fontSize: "0.875rem",
          cursor: "pointer",
          marginTop: "8px",
          "&:hover": { backgroundColor: "primary.dark" },
        },
      }}>
      <Notes context={props.context} conversationId={props.conversationId} createConversation={props.createConversation} />
    </Box>
  );
});
