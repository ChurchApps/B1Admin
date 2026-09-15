import React from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "@mui/material";
import { CreatePerson } from "../CreatePerson";
import "./CommandPalette.css";

interface PaletteItem { n: string; a?: string[]; t: "do" | "person" | "group" | "plan" | "fund" | "jump"; u: string }

const GROUP: Record<PaletteItem["t"], string> = { do: "Do", person: "People", group: "Groups", plan: "Plans", fund: "Funds", jump: "Jump" };
const ORDER: PaletteItem["t"][] = ["do", "person", "group", "plan", "fund", "jump"];
const MAX = 12;

export const matches = (item: PaletteItem, q: string) => (item.n + " " + (item.a || []).join(" ")).toLowerCase().includes(q);

export const filterItems = (items: PaletteItem[], query: string) => {
  const q = query.trim().toLowerCase();
  const hits = q ? items.filter((i) => matches(i, q)) : items.filter((i) => i.t === "do" || i.t === "jump");
  return ORDER.flatMap((t) => hits.filter((i) => i.t === t)).slice(0, MAX);
};

const isTypingTarget = (el: EventTarget | null) => el instanceof HTMLElement && (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable);

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

export const CommandPalette: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const [addPerson, setAddPerson] = React.useState(false);
  const [slot, setSlot] = React.useState<HTMLElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const catalog = useQuery<{ items: PaletteItem[] }>({ queryKey: ["/palette", "MembershipApi"], enabled: open, staleTime: 30_000 });

  // ponytail: SiteHeader (apphelper) has no slot yet; portal into its flex spacer. Replace with a prop once apphelper exposes one.
  React.useEffect(() => { setSlot(document.getElementById("secondary-menu-container")); }, []);

  const close = React.useCallback(() => { setOpen(false); setQuery(""); setActive(0); }, []);
  const openPalette = React.useCallback(() => { setOpen(true); setQuery(""); setActive(0); }, []);

  React.useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const slash = e.key === "/" && !open && !e.metaKey && !e.ctrlKey && !e.altKey && !isTypingTarget(e.target);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) close(); else openPalette();
      } else if (slash) {
        e.preventDefault();
        openPalette();
      } else if (e.key === "Escape" && open) {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close, openPalette]);

  const shown = React.useMemo(() => filterItems(catalog.data?.items || [], query), [catalog.data, query]);

  const run = React.useCallback((item: PaletteItem) => {
    close();
    if (item.u === "#addPerson") setAddPerson(true);
    else navigate(item.u);
  }, [close, navigate]);

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(shown.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && shown[active]) {
      e.preventDefault();
      run(shown[active]);
    }
  };

  const field = slot && createPortal(
    <button type="button" className="om-search" onClick={openPalette} data-testid="command-palette-open" aria-label="Search or jump">
      <Icon fontSize="small">search</Icon>
      <span>Search or jump…</span>
      <kbd>{isMac ? "⌘" : "Ctrl"} K</kbd>
    </button>,
    slot
  );

  const palette = open && createPortal(
    <div className="om-overlay" role="dialog" aria-modal="true" aria-label="Command palette" data-testid="command-palette" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="om-palette">
        <input ref={inputRef} value={query} onChange={(e) => { setQuery(e.target.value); setActive(0); }} onKeyDown={onInputKey} placeholder="Add a person, find a family, jump…" autoComplete="off" aria-label="Search or jump" />
        <div className="om-palette-results">
          {shown.length === 0 && <div className="om-group-label">{catalog.isLoading ? "Loading…" : "Nothing for that."}</div>}
          {shown.map((item, idx) => (
            <React.Fragment key={item.t + item.u}>
              {item.t !== shown[idx - 1]?.t && <div className="om-group-label">{GROUP[item.t]}</div>}
              <button type="button" className={"om-hit" + (idx === active ? " active" : "")} onMouseEnter={() => setActive(idx)} onClick={() => run(item)}>
                <span>{item.n}</span>
                <small>{item.t === "do" ? "" : item.u}</small>
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <>
      {field}
      {palette}
      {addPerson && (
        <CreatePerson showInModal onClose={() => setAddPerson(false)} onCreate={(person) => { setAddPerson(false); navigate(person?.id ? "/people/" + person.id : "/people"); }} />
      )}
    </>
  );
};
