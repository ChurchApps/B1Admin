import React from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ApiHelper, Locale, Permissions, UserHelper } from "@churchapps/apphelper";
import type { PersonInterface, SearchCondition } from "@churchapps/helpers";
import { CreatePerson } from "../components/CreatePerson";
import { EnvironmentHelper } from "../helpers/EnvironmentHelper";
import { hasPlansEditAccess } from "../helpers";
import { usePendingApprovalsCount, usePendingJoinRequestsCount } from "../hooks";
import { OMARCHY_SKINS, useThemeMode } from "../ThemeContext";
import "./omarchy.css";

export const OMARCHY_PALETTE_EVENT = "omarchy-palette";

export const openCommandPalette = () => {
  window.dispatchEvent(new CustomEvent(OMARCHY_PALETTE_EVENT, { detail: "open" }));
};

type GroupName = "Do" | "People" | "Jump";

interface PaletteItem {
  group: GroupName;
  title: string;
  subtitle: string;
  action: () => void;
}

const isTypingTarget = (el: EventTarget | null) => {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
};

export const CommandPalette: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const [people, setPeople] = React.useState<PersonInterface[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [addPerson, setAddPerson] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const pendingApprovals = usePendingApprovalsCount();
  const pendingJoinRequests = usePendingJoinRequestsCount();
  const { setSkin } = useThemeMode();

  const close = React.useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
    setPeople([]);
  }, []);

  const openPalette = React.useCallback(() => {
    setOpen(true);
    setQuery("");
    setActive(0);
    setPeople([]);
  }, []);

  React.useEffect(() => {
    const onEvent = () => openPalette();
    window.addEventListener(OMARCHY_PALETTE_EVENT, onEvent);
    return () => window.removeEventListener(OMARCHY_PALETTE_EVENT, onEvent);
  }, [openPalette]);

  React.useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) close();
        else openPalette();
        return;
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !open && !isTypingTarget(e.target)) {
        e.preventDefault();
        openPalette();
        return;
      }
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close, openPalette]);

  const go = React.useCallback((url: string, external = false) => {
    close();
    if (external) window.open(url, "_blank", "noopener,noreferrer");
    else navigate(url);
  }, [close, navigate]);

  const staticItems = React.useMemo<PaletteItem[]>(() => {
    const items: PaletteItem[] = [];
    const canPeople = UserHelper.checkAccess(Permissions.membershipApi.people.view);
    const canPeopleEdit = UserHelper.checkAccess(Permissions.membershipApi.people.edit);
    const canGiving = UserHelper.checkAccess(Permissions.givingApi.donations.viewSummary);
    const canAttendance = UserHelper.checkAccess(Permissions.attendanceApi.attendance.viewSummary);
    const canContent = UserHelper.checkAccess(Permissions.contentApi.content.edit);
    const canSettings = UserHelper.checkAccess(Permissions.membershipApi.settings.edit);
    const canRoles = UserHelper.checkAccess(Permissions.membershipApi.roles.view);
    const canForms = UserHelper.checkAccess(Permissions.membershipApi.forms.admin) || UserHelper.checkAccess(Permissions.membershipApi.forms.edit);
    const canSermons = UserHelper.checkAccess(Permissions.contentApi.streamingServices.edit);
    const canPlans = hasPlansEditAccess();
    const subDomain = UserHelper.currentUserChurch?.church?.subDomain || "";
    const b1Url = EnvironmentHelper.B1Url.replace("{subdomain}", subDomain);

    if (canPeopleEdit) {
      items.push({
        group: "Do",
        title: Locale.label("common.createPerson.addPerson", "Add a person"),
        subtitle: Locale.label("people.peoplePage.addPerson", "New household"),
        action: () => {
          close();
          setAddPerson(true);
        }
      });
    }
    if (canSettings) {
      items.push({ group: "Do", title: "Start check-in", subtitle: Locale.label("common.b1CheckIn", "Kiosk"), action: () => go("/mobile/checkin") });
    }
    items.push({ group: "Do", title: Locale.label("tasks.taskList.addTask", "Add a task"), subtitle: Locale.label("components.wrapper.myWork", "My Work"), action: () => go("/serving/tasks") });
    if (pendingApprovals > 0) {
      items.push({
        group: "Do",
        title: Locale.label("dashboard.needsAttention.approvals", "{count} pending calendar approvals").replace("{count}", String(pendingApprovals)),
        subtitle: Locale.label("helpers.secondaryMenuHelper.approvals", "Approvals"),
        action: () => go("/calendars/approvals")
      });
    }
    if (pendingJoinRequests > 0) {
      items.push({
        group: "Do",
        title: Locale.label("dashboard.needsAttention.joinRequests", "{count} pending group join requests").replace("{count}", String(pendingJoinRequests)),
        subtitle: Locale.label("components.wrapper.groups", "Groups"),
        action: () => go("/groups/pending")
      });
    }

    if (canContent) {
      items.push({ group: "Do", title: Locale.label("dashboard.adminWelcome.addLogoTitle", "Add Your Church Logo"), subtitle: Locale.label("helpers.secondaryMenuHelper.appearance", "Appearance"), action: () => go("/site/appearance#logo") });
      items.push({ group: "Do", title: Locale.label("dashboard.adminWelcome.createWebpageTitle", "Create Your First Webpage"), subtitle: Locale.label("common.website", "Website"), action: () => go("/site/pages") });
    }
    if (canSettings) {
      items.push({ group: "Do", title: Locale.label("dashboard.adminWelcome.onlineGivingTitle", "Set Up Online Giving"), subtitle: Locale.label("components.wrapper.don", "Giving"), action: () => go("/settings#giving") });
    }
    if (canPlans) {
      items.push({ group: "Do", title: Locale.label("dashboard.adminWelcome.freeShowTitle", "Set Up FreeShow Backups"), subtitle: Locale.label("components.wrapper.serving", "Serving"), action: () => go("/serving/plans") });
      items.push({ group: "Do", title: Locale.label("dashboard.adminWelcome.freePlayTitle", "Set Up Your FreePlay Classroom"), subtitle: Locale.label("components.wrapper.serving", "Serving"), action: () => go("/serving/plans") });
    }
    if (canSermons) {
      items.push({ group: "Do", title: Locale.label("dashboard.adminWelcome.uploadSermonTitle", "Upload a Sermon"), subtitle: Locale.label("common.sermons", "Sermons"), action: () => go("/sermons") });
    }
    if (canPeople) {
      items.push({ group: "Do", title: Locale.label("dashboard.adminWelcome.addCongregationTitle", "Add Your Congregation"), subtitle: Locale.label("components.wrapper.ppl", "People"), action: () => go("/people") });
    }
    if (UserHelper.checkAccess(Permissions.membershipApi.groups.edit)) {
      items.push({ group: "Do", title: Locale.label("dashboard.adminWelcome.createGroupTitle", "Create Your First Group"), subtitle: Locale.label("components.wrapper.groups", "Groups"), action: () => go("/groups") });
    }
    if (canRoles) {
      items.push({ group: "Do", title: Locale.label("dashboard.adminWelcome.inviteTeamTitle", "Invite Team Members"), subtitle: Locale.label("settings.roles.roles", "Roles"), action: () => go("/settings/roles") });
    }
    if (b1Url && UserHelper.person?.id) {
      items.push({
        group: "Do",
        title: Locale.label("dashboard.adminWelcome.setAvatarTitle", "Set Your Avatar"),
        subtitle: Locale.label("helpers.secondaryMenuHelper.profile", "Profile"),
        action: () => go(b1Url + "/mobile/community?id=" + UserHelper.person?.id + "#edit", true)
      });
      items.push({ group: "Do", title: Locale.label("dashboard.memberWelcome.joinGroupTitle", "Join a Group"), subtitle: Locale.label("components.wrapper.groups", "Groups"), action: () => go(b1Url + "/groups", true) });
      items.push({ group: "Do", title: Locale.label("dashboard.memberWelcome.onlineGivingTitle", "Set Up Online Giving"), subtitle: Locale.label("components.wrapper.don", "Giving"), action: () => go(b1Url + "/donate", true) });
      items.push({ group: "Do", title: Locale.label("dashboard.memberWelcome.upcomingEventsTitle", "See What's Happening"), subtitle: Locale.label("helpers.secondaryMenuHelper.calendars", "Calendars"), action: () => go(b1Url, true) });
      items.push({ group: "Do", title: Locale.label("dashboard.memberWelcome.downloadAppTitle", "Download the Mobile App"), subtitle: Locale.label("common.mobile", "Mobile"), action: () => go(b1Url + "/mobile/install", true) });
    }

    OMARCHY_SKINS.forEach((s) => {
      items.push({ group: "Do", title: s.label + " theme", subtitle: "Appearance", action: () => { setSkin(s.id); close(); } });
    });

    items.push({ group: "Jump", title: Locale.label("components.wrapper.dash", "Sunday"), subtitle: "/", action: () => go("/") });
    if (canPeople) items.push({ group: "Jump", title: Locale.label("components.wrapper.ppl", "People"), subtitle: "/people", action: () => go("/people") });
    items.push({ group: "Jump", title: Locale.label("components.wrapper.groups", "Groups"), subtitle: "/groups", action: () => go("/groups") });
    if (canGiving) items.push({ group: "Jump", title: Locale.label("components.wrapper.don", "Donations"), subtitle: "/donations", action: () => go("/donations") });
    items.push({ group: "Jump", title: Locale.label("components.wrapper.serving", "Serving"), subtitle: "/serving", action: () => go("/serving") });
    items.push({ group: "Jump", title: Locale.label("components.wrapper.myWork", "My Work"), subtitle: "/serving/tasks", action: () => go("/serving/tasks") });
    if (canAttendance) items.push({ group: "Jump", title: Locale.label("components.wrapper.att", "Attendance"), subtitle: "/attendance", action: () => go("/attendance") });
    if (canContent) items.push({ group: "Jump", title: Locale.label("common.website", "Site"), subtitle: "/site/pages", action: () => go("/site/pages") });
    if (canSettings) items.push({ group: "Jump", title: Locale.label("components.wrapper.set", "Settings"), subtitle: "/settings", action: () => go("/settings") });
    else if (canRoles) items.push({ group: "Jump", title: Locale.label("components.wrapper.set", "Settings"), subtitle: "/settings/roles", action: () => go("/settings/roles") });
    if (canSermons) items.push({ group: "Jump", title: Locale.label("common.sermons", "Sermons"), subtitle: "/sermons", action: () => go("/sermons") });
    if (canContent) items.push({ group: "Jump", title: Locale.label("helpers.secondaryMenuHelper.calendars", "Calendars"), subtitle: "/calendars", action: () => go("/calendars") });
    if (canContent || canSettings) items.push({ group: "Jump", title: Locale.label("common.mobile", "Mobile"), subtitle: "/mobile", action: () => go("/mobile") });
    if (canForms) items.push({ group: "Jump", title: Locale.label("components.wrapper.forms", "Forms"), subtitle: "/forms", action: () => go("/forms") });

    return items;
  }, [go, close, pendingApprovals, pendingJoinRequests, setSkin]);

  React.useEffect(() => {
    if (!open) return;
    const term = query.trim();
    if (term.length < 2 || !UserHelper.checkAccess(Permissions.membershipApi.people.view)) {
      setPeople([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const handle = window.setTimeout(() => {
      const condition: SearchCondition = { field: "displayName", operator: "contains", value: term };
      ApiHelper.post("/people/search", { term }, "MembershipApi")
        .then((data: PersonInterface[]) => {
          if (!cancelled) setPeople((data || []).slice(0, 8));
        })
        .catch(() => {
          if (cancelled) return;
          ApiHelper.post("/people/advancedSearch", [condition], "MembershipApi")
            .then((data: PersonInterface[]) => { if (!cancelled) setPeople((data || []).slice(0, 8)); })
            .catch(() => { if (!cancelled) setPeople([]); });
        })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query, open]);

  const shown = React.useMemo(() => {
    const t = query.trim().toLowerCase();
    const peopleItems: PaletteItem[] = people.map((p) => ({
      group: "People",
      title: p.name?.display || [p.name?.first, p.name?.last].filter(Boolean).join(" ") || "Person",
      subtitle: [p.membershipStatus, p.contactInfo?.city].filter(Boolean).join(" · ") || "Person",
      action: () => go("/people/" + p.id)
    }));
    const filtered = staticItems.filter((i) => !t || (i.title + " " + i.subtitle + " " + i.group).toLowerCase().includes(t));
    const merged = [...filtered.filter((i) => i.group === "Do"), ...peopleItems, ...filtered.filter((i) => i.group === "Jump")];
    return merged;
  }, [people, staticItems, query, go]);

  React.useEffect(() => {
    setActive(0);
  }, [query, people]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(shown.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        shown[active]?.action();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, shown, active]);

  const palette = open
    ? createPortal(
      <div
        className="om-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        data-testid="command-palette"
        onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
      >
        <div className="om-palette">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Add a person, find a family, jump…"
            autoComplete="off"
            aria-label="Search or jump"
          />
          <div className="om-palette-results">
            {shown.length === 0 && (
              <div className="om-group-label">{searching ? (Locale.label("common.searching") || "Searching...") : "Nothing for that. The plate is small on purpose."}</div>
            )}
            {shown.map((item, idx) => {
              const prev = shown[idx - 1];
              return (
                <React.Fragment key={item.group + item.title + idx}>
                  {item.group !== prev?.group && <div className="om-group-label">{item.group}</div>}
                  <button
                    type="button"
                    className={"om-hit" + (idx === active ? " active" : "")}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => item.action()}
                  >
                    <span>
                      {item.title}
                      <br />
                      <small>{item.subtitle}</small>
                    </span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>,
      document.body
    )
    : null;

  return (
    <>
      {palette}
      {addPerson && (
        <CreatePerson
          showInModal
          onClose={() => setAddPerson(false)}
          onCreate={(person) => {
            setAddPerson(false);
            if (person?.id) navigate("/people/" + person.id);
            else navigate("/people");
          }}
        />
      )}
    </>
  );
};
