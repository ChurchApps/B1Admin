import React from "react";
import { createPortal } from "react-dom";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "@mui/material";
import { CreatePerson } from "../CreatePerson";
import { QuickSetupModal, type WizardType } from "../../dashboard/components/QuickSetupModal";
import { useQuickActions } from "./useQuickActions";
import "./CommandPalette.css";

interface PaletteItem { n: string; a?: string[]; t: "nav" | "do" | "person" | "group" | "plan" | "fund" | "jump"; u: string; i?: string; k?: PaletteItem[]; p?: string }
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

export const CommandPalette: React.FC<{ menu: PaletteMenuItem[]; label: string; page?: string }> = ({ menu, label, page }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [expanded, setExpanded] = React.useState<string[]>([]);
  const [active, setActive] = React.useState(0);
  const [addPerson, setAddPerson] = React.useState(false);
  const [wizard, setWizard] = React.useState<WizardType | null>(null);
  const [slot, setSlot] = React.useState<HTMLElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const resultsRef = React.useRef<HTMLDivElement>(null);

  const catalog = useQuery<{ items: PaletteItem[] }>({ queryKey: ["/palette", "MembershipApi"], enabled: open, staleTime: 30_000 });
  const quickActions = useQuickActions(open);

  // ponytail: SiteHeader (apphelper) has no slot yet, so portal into its toolbar (CSS order puts it first) and hide its primary dropdown in CSS. Replace with a prop once apphelper exposes one.
  React.useEffect(() => { setSlot(document.getElementById("site-toolbar")); }, [location.pathname]);

  const items = React.useMemo(() => {
    const server = catalog.data?.items || [];
    const nav = menu.map((m): PaletteItem => {
      const dup = server.find((s) => s.u === m.url);
      const k = m.children && m.children.length > 1 ? m.children.map((c): PaletteItem => ({ n: c.label, t: "jump", u: c.url, i: c.icon })) : undefined;
      return { n: m.label, a: dup ? [dup.n, ...(dup.a || [])] : undefined, t: "nav", u: m.url, i: m.icon, k };
    });
    if (quickActions.length) {
      const k = quickActions.map((q): PaletteItem => ({ n: q.label, t: "do", u: q.url, i: q.icon }));
      nav.push({ n: "Quick Actions", a: ["create", "add", "new", "set up", "get started"], t: "nav", u: "#quick", i: "bolt", k });
    }
    return [...nav, ...server.filter((s) => !menu.some((m) => m.url === s.u))];
  }, [catalog.data, menu, quickActions]);

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

  const close = React.useCallback(() => { setOpen(false); setQuery(""); setActive(0); setExpanded([]); }, []);
  const openPalette = React.useCallback(() => {
    // Open the full menu with the current section expanded and the current page highlighted; sections come first in items.
    const here = items[current]?.k ? items[current] : null;
    const child = here ? here.k!.findIndex((c) => c.u === location.pathname) : -1;
    setOpen(true);
    setQuery("");
    setExpanded(here ? [here.u] : []);
    setActive(child >= 0 ? current + 1 + child : current);
  }, [current, items, location.pathname]);
  // One section open at a time; with the others collapsed the section's row index equals its index in items.
  const toggle = (u: string) => {
    setExpanded((e) => (e.includes(u) ? [] : [u]));
    setActive(items.findIndex((i) => i.t === "nav" && i.u === u));
  };

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

  const shown = React.useMemo(() => {
    if (query.trim()) return filterItems(items, query);
    const rows: PaletteItem[] = [];
    items.filter((i) => i.t === "nav").forEach((n) => {
      rows.push(n);
      if (n.k && expanded.includes(n.u)) n.k.forEach((c) => rows.push({ ...c, p: n.u }));
    });
    return rows;
  }, [items, query, expanded]);

  // Bring a newly expanded section's pages into view; the active-row effect below then keeps the highlighted row visible.
  React.useEffect(() => { Array.from(resultsRef.current?.querySelectorAll(".om-child") || []).pop()?.scrollIntoView({ block: "nearest" }); }, [expanded]);
  React.useEffect(() => { resultsRef.current?.querySelector(".om-hit.active")?.scrollIntoView({ block: "nearest" }); }, [active, shown]);

  const run = React.useCallback((item: PaletteItem) => {
    if (item.k && !query) { toggle(item.u); return; }
    if (item.k && item.u.startsWith("#")) {
      // Searching "quick" lands on a section with no page of its own: show it expanded in the menu instead.
      setQuery("");
      setExpanded([item.u]);
      setActive(items.indexOf(item));
      return;
    }
    close();
    if (item.u === "#addPerson") setAddPerson(true);
    else if (item.u.startsWith("#wizard:")) setWizard(item.u.slice(8) as WizardType);
    else if (/^https?:/.test(item.u)) window.open(item.u, "_blank", "noopener");
    else navigate(item.u);
  }, [close, navigate, query, items]);

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
    } else if (!query && e.key === "ArrowRight" && shown[active]?.k && !expanded.includes(shown[active].u)) {
      e.preventDefault();
      toggle(shown[active].u);
    } else if (!query && e.key === "ArrowLeft" && shown[active]) {
      const row = shown[active];
      const parent = row.p || (row.k && expanded.includes(row.u) ? row.u : null);
      if (parent) {
        e.preventDefault();
        toggle(parent);
      }
    }
  };

  const field = slot && createPortal(
    <div className="om-nav">
      <RouterLink to="/" className="om-logo" aria-label="Dashboard"><img src="/images/logo-icon.png" alt="" /></RouterLink>
      <button type="button" className="om-search" onClick={openPalette} data-testid="command-palette-open" aria-label={"Search or jump, current section " + label} title={"Search or jump (" + (isMac ? "⌘" : "Ctrl") + " K)"}>
        <Icon fontSize="small">search</Icon>
        <span className="om-search-label">
          <span data-testid="command-palette-section">{label}</span>
          {page && page !== label && <><span className="om-search-sep">›</span><span className="om-search-page" data-testid="command-palette-page">{page}</span></>}
        </span>
        <kbd>{isMac ? "⌘" : "Ctrl"} K</kbd>
      </button>
    </div>,
    slot
  );

  const palette = open && createPortal(
    <div className="om-overlay" role="dialog" aria-modal="true" aria-label="Command palette" data-testid="command-palette" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="om-palette">
        <input ref={inputRef} value={query} onChange={(e) => { setQuery(e.target.value); setActive(0); }} onKeyDown={onInputKey} placeholder="Add a person, find a family, jump…" autoComplete="off" aria-label="Search or jump" />
        <div className="om-palette-results" ref={resultsRef}>
          {shown.length === 0 && <div className="om-group-label">{catalog.isLoading ? "Loading…" : "Nothing for that."}</div>}
          {shown.map((item, idx) => (
            <React.Fragment key={(item.p || "") + item.t + item.u}>
              {query && item.t !== shown[idx - 1]?.t && <div className="om-group-label">{GROUP[item.t]}</div>}
              <button
                type="button"
                className={"om-hit" + (item.p ? " om-child" : "") + (idx === active ? " active" : "")}
                aria-expanded={item.k && !query ? expanded.includes(item.u) : undefined}
                aria-current={item.p && item.u === location.pathname ? "page" : undefined}
                onMouseMove={() => { if (idx !== active) setActive(idx); }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => run(item)}
              >
                <span>{item.i && <Icon fontSize="small">{item.i}</Icon>}<span>{item.n}</span></span>
                <small>{item.k && !query ? <Icon fontSize="small">{expanded.includes(item.u) ? "expand_less" : "expand_more"}</Icon> : item.t === "do" || item.t === "nav" || item.p ? "" : item.u}</small>
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
