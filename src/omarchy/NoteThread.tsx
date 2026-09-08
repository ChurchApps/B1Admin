import React from "react";
import "./omarchy.css";

export interface NoteItem {
  id?: string;
  by: string;
  body: string;
  at?: Date | string;
}

interface Props {
  notes: NoteItem[];
  onAdd?: (text: string) => void | Promise<void>;
  placeholder?: string;
  title?: string;
  summary?: React.ReactNode;
  back?: React.ReactNode;
}

const timeValue = (at?: Date | string) => {
  if (!at) return 0;
  const t = at instanceof Date ? at.getTime() : new Date(at).getTime();
  return Number.isNaN(t) ? 0 : t;
};

export const NoteThread: React.FC<Props> = ({
  notes,
  onAdd,
  placeholder = "Add a note",
  title = "Notes",
  summary,
  back
}) => {
  const [draft, setDraft] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const ordered = React.useMemo(() => {
    const copy = [...notes];
    const dated = copy.some((n) => n.at);
    if (dated) copy.sort((a, b) => timeValue(b.at) - timeValue(a.at));
    return copy;
  }, [notes]);

  const submit = async () => {
    const text = draft.trim();
    if (!text || !onAdd || saving) return;
    setSaving(true);
    try {
      await onAdd(text);
      setDraft("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {back}
      <div className="om-ledger-head">
        <div>
          <h3 style={{ marginTop: back ? 8 : 0 }}>{title}</h3>
          <div className="om-big">{ordered.length}</div>
          <p className="om-quiet" style={{ margin: "6px 0 0" }}>{summary ?? "Newest first · long notes stay on the page"}</p>
        </div>
      </div>
      <div className="om-thread">
        {ordered.map((note, i) => (
          <article className="om-note" key={note.id || `${note.by}-${i}`}>
            <div className="om-by">{note.by}</div>
            <p className="om-note-body">{note.body}</p>
          </article>
        ))}
      </div>
      {onAdd && (
        <textarea
          className="om-add-note"
          placeholder={placeholder}
          aria-label={placeholder}
          value={draft}
          rows={2}
          disabled={saving}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
      )}
    </div>
  );
};
