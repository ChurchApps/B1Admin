import React from "react";
import { TextField } from "@mui/material";
import { MarkdownPreviewLight } from "@churchapps/apphelper/markdown";

interface Props {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  "data-testid"?: string;
}

/** Click-to-edit text: renders as markdown until clicked, then a plain text field until blur/Enter. */
export const InlineEditableText: React.FC<Props> = (props) => {
  const [editing, setEditing] = React.useState(false);
  const [text, setText] = React.useState(props.value);

  React.useEffect(() => { if (!editing) setText(props.value); }, [props.value, editing]);

  const save = () => {
    setEditing(false);
    if (text !== props.value) props.onSave(text);
  };

  if (editing) {
    return (
      <TextField
        fullWidth
        multiline
        autoFocus
        size="small"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); }
          if (e.key === "Escape") { setText(props.value); setEditing(false); }
        }}
        onClick={(e) => e.stopPropagation()}
        data-testid={props["data-testid"]}
      />
    );
  }

  return (
    <div
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      style={{ cursor: "text", minHeight: "1.5em" }}
      data-testid={props["data-testid"]}
    >
      {props.value ? <MarkdownPreviewLight value={props.value} /> : <span style={{ opacity: 0.5 }}>{props.placeholder}</span>}
    </div>
  );
};
