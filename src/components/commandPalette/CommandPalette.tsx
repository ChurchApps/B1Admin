import React from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "@mui/material";
import { CreatePerson } from "../CreatePerson";
import { QuickSetupModal, type WizardType } from "../../dashboard/components/QuickSetupModal";
import "./CommandPalette.css";

interface PaletteItem { n: string; a?: string[]; t: "nav" | "do" | "person" | "group" | "plan" | "fund" | "jump"; u: string; i?: string; k?: PaletteItem[] }
export interface PaletteMenuItem { url: string; icon?: string; label: string; children?: PaletteMenuItem[] }

const GROUP: Record<PaletteItem["t"], string> = { nav: "Menu", do: "Do", person: "People", group: "Groups", plan: "Plans", fund: "Funds", jump: "Jump" };
const ORDER: PaletteItem["t"][] = ["nav", "do", "person", "group", "plan", "fund", "jump"];
const MAX = 12;

export const matches = (item: PaletteItem, q: string) => (item.n + " " + (item.a || []).join(" ")).toLowerCase().includes(q);

export const filterItems = (items: PaletteItem[], query: string) => {
  const q = query.trim().toLowerCase();
  const hits = q ? items.filter((i) => matches(i, q)) : items.filter((i) => i.t === "nav");
  const sorted = ORDER.flatMap((t) => hits.filter((i) => i.t === t));
  return q ? sorted.slice(0, MAX) : sorted;
};

const isTypingTarget = (el: EventTarget | null) => el instanceof HTMLElement && (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable);

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

export const CommandPalette: React.FC<{ menu: PaletteMenuItem[] }> = ({ menu }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [section, setSection] = React.useState<PaletteItem | null>(null);
  const [active, setActive] = React.useState(0);
  const [addPerson, setAddPerson] = React.useState(false);
  const [wizard, setWizard] = React.useState<WizardType | null>(null);
  const [slot, setSlot] = React.useState<HTMLElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const catalog = useQuery<{ items: PaletteItem[] }>({ queryKey: ["/palette", "MembershipApi"], enabled: open, staleTime: 30_000 });

  // ponytail: SiteHeader (apphelper) has no slot yet; portal into its flex spacer. Replace with a prop once apphelper exposes one.
  React.useEffect(() => { setSlot(document.getElementById("secondary-menu-container")); }, []);

  const items = React.useMemo(() => {
    const server = catalog.data?.items || [];
    const nav = menu.map((m): PaletteItem => {
      const dup = server.find((s) => s.u === m.url);
      const k = m.children && m.children.length > 1 ? m.children.map((c): PaletteItem => ({ n: c.label, t: "jump", u: c.url, i: c.icon })) : undefined;
      return { n: m.label, a: dup ? [dup.n, ...(dup.a || [])] : undefined, t: "nav", u: m.url, i: m.icon, k };
    });
    const create = server.filter((s) => s.t === "do");
    if (create.length) nav.push({ n: "Create", a: ["add", "new", "set up"], t: "nav", u: "#create", i: "add", k: create });
    return [...nav, ...server.filter((s) => !menu.some((m) => m.url === s.u))];
  }, [catalog.data, menu]);

  const current = React.useMemo(() => {
    const path = location.pathname;
    const hit = (u: string) => (u === "/" ? path === "/" : path === u || path.startsWith(u + "/"));
    let best = 0, len = -1;
    items.forEach((it, idx) => {
      if (it.t !== "nav" || it.u.startsWith("#")) return;
      // >= so a later section beats Dashboard when both list the same page (My Work).
      [it.u, ...(it.k || []).map((c) => c.u)].forEach((u) => { if (hit(u) && u.length >= len) { best = idx; len = u.length; } });
    });
    return best;
  }, [items, location.pathname]);

  const close = React.useCallback(() => { setOpen(false); setQuery(""); setActive(0); setSection(null); }, []);
  const openPalette = React.useCallback(() => { setOpen(true); setQuery(""); setActive(current); setSection(null); }, [current]);
  const enter = (next: PaletteItem | null) => { setSection(next); setQuery(""); setActive(Math.max(0, next ? (next.k || []).findIndex((c) => c.u === location.pathname) : items.indexOf(section!))); };

  React.useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, section]);

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

  const shown = React.useMemo(() => {
    if (!section) return filterItems(items, query);
    const q = query.trim().toLowerCase();
    return (section.k || []).filter((i) => !q || matches(i, q));
  }, [items, query, section]);

  const run = React.useCallback((item: PaletteItem) => {
    if (item.k) { enter(item); return; }
    close();
    if (item.u === "#addPerson") setAddPerson(true);
    else if (item.u.startsWith("#wizard:")) setWizard(item.u.slice(8) as WizardType);
    else navigate(item.u);
  }, [close, navigate]);

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(shown.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if ((e.key === "Enter" || (e.key === "ArrowRight" && shown[active]?.k)) && shown[active]) {
      e.preventDefault();
      run(shown[active]);
    } else if (section && !query && (e.key === "Backspace" || e.key === "ArrowLeft")) {
      e.preventDefault();
      enter(null);
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
        {section && <button type="button" className="om-crumb" onClick={() => enter(null)} aria-label="Back to menu"><Icon fontSize="small">chevron_left</Icon>{section.n}</button>}
        <input ref={inputRef} value={query} onChange={(e) => { setQuery(e.target.value); setActive(0); }} onKeyDown={onInputKey} placeholder={section ? "Filter " + section.n.toLowerCase() + "…" : "Add a person, find a family, jump…"} autoComplete="off" aria-label="Search or jump" />
        <div className="om-palette-results">
          {shown.length === 0 && <div className="om-group-label">{catalog.isLoading ? "Loading…" : "Nothing for that."}</div>}
          {shown.map((item, idx) => (
            <React.Fragment key={item.t + item.u}>
              {!section && query && item.t !== shown[idx - 1]?.t && <div className="om-group-label">{GROUP[item.t]}</div>}
              <button type="button" className={"om-hit" + (idx === active ? " active" : "")} onMouseEnter={() => setActive(idx)} onClick={() => run(item)}>
                <span>{item.i && <Icon fontSize="small">{item.i}</Icon>}{item.n}</span>
                <small>{item.k ? <Icon fontSize="small">chevron_right</Icon> : item.t === "do" || item.t === "nav" || section ? "" : item.u}</small>
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
      {wizard && <QuickSetupModal wizardType={wizard} open onClose={() => setWizard(null)} onComplete={(url) => { setWizard(null); navigate(url); }} />}
    </>
  );
};
