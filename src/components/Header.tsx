import { ApiHelper, Locale, NavItem, NotificationService, Permissions, PersonHelper, SupportModal, UserHelper, UserMenu } from "@churchapps/apphelper";
import React, { useEffect, useMemo } from "react";
import { AppBar, Box, Button, ClickAwayListener, Grow, Icon, IconButton, Menu, Paper, Popper, Toolbar } from "@mui/material";
import { SecondaryMenuHelper } from "../helpers/SecondaryMenuHelper";
import { hasPlansEditAccess } from "../helpers";
import UserContext from "../UserContext";
import { useNavigate } from "react-router-dom";
import { openCommandPalette } from "../omarchy";
import "../omarchy/omarchy.css";

export const Header: React.FC = () => {
  const context = React.useContext(UserContext);
  const navigate = useNavigate();
  const formPermission = UserHelper.checkAccess(Permissions.membershipApi.forms.admin) || UserHelper.checkAccess(Permissions.membershipApi.forms.edit);
  const [donationError, setDonationError] = React.useState<boolean>(false);
  const [isFormMember, setIsFormMember] = React.useState<boolean>(false);
  const [isMinistryMember, setIsMinistryMember] = React.useState<boolean>(false);
  const [supportOpen, setSupportOpen] = React.useState(false);

  useEffect(() => {
    if (UserHelper.checkAccess(Permissions.givingApi.donations.viewSummary)) {
      ApiHelper.get("/eventLog/type/failed/", "GivingApi").then((data: any) => {
        if (data?.length > 0 && data.find((error: any) => !error.resolved)) setDonationError(true);
      });
    }

    if (!formPermission && context?.person?.id) {
      ApiHelper.get("/memberpermissions/member/" + context.person?.id, "MembershipApi").then((data: any) => setIsFormMember(data?.length > 0));
    }

    if (!hasPlansEditAccess()) {
      ApiHelper.get("/groups/my/ministry", "MembershipApi").then((data: any) => setIsMinistryMember(data?.length > 0));
    }
  }, [formPermission, context?.person?.id]);

  const primaryMenu = useMemo(() => {
    const donationIcon = donationError ? "error" : "volunteer_activism";
    const menuItems: { url: string; icon: string; label: string }[] = [];
    menuItems.push({ url: "/", icon: "home", label: Locale.label("components.wrapper.dash") });
    if (UserHelper.checkAccess(Permissions.membershipApi.people.view)) menuItems.push({ url: "/people", icon: "person", label: Locale.label("components.wrapper.ppl") });
    else if (formPermission || isFormMember) menuItems.push({ url: "/forms", icon: "person", label: Locale.label("components.wrapper.ppl") });
    if (UserHelper.checkAccess(Permissions.givingApi.donations.viewSummary)) menuItems.push({ url: "/donations", label: Locale.label("components.wrapper.don"), icon: donationIcon });

    const canViewPlans = hasPlansEditAccess() || isMinistryMember;
    if (canViewPlans) menuItems.push({ url: "/serving", label: Locale.label("components.wrapper.serving"), icon: "assignment" });
    else menuItems.push({ url: "/serving/tasks", label: Locale.label("components.wrapper.serving"), icon: "assignment" });

    if (UserHelper.checkAccess(Permissions.contentApi.streamingServices.edit)) menuItems.push({ url: "/sermons", label: Locale.label("common.sermons"), icon: "live_tv" });
    if (UserHelper.checkAccess(Permissions.contentApi.content.edit)) menuItems.push({ url: "/site/pages", label: Locale.label("common.website"), icon: "language" });
    if (UserHelper.checkAccess(Permissions.contentApi.content.edit)) menuItems.push({ url: "/calendars", label: Locale.label("helpers.secondaryMenuHelper.calendars"), icon: "calendar_month" });
    if (UserHelper.checkAccess(Permissions.contentApi.content.edit) || UserHelper.checkAccess(Permissions.membershipApi.settings.edit)) menuItems.push({ url: "/mobile", label: Locale.label("common.mobile"), icon: "phone_iphone" });
    if (UserHelper.checkAccess(Permissions.membershipApi.settings.edit)) menuItems.push({ url: "/settings", label: Locale.label("components.wrapper.set"), icon: "settings" });
    else if (UserHelper.checkAccess(Permissions.membershipApi.roles.view)) menuItems.push({ url: "/settings/roles", label: Locale.label("components.wrapper.set"), icon: "settings" });
    return menuItems;
  }, [donationError, formPermission, isFormMember, isMinistryMember]);

  const getPrimaryLabel = () => {
    const path = window.location.pathname;
    let result = Locale.label("dashboard.dashboardPage.dash");
    if (path.startsWith("/people")) result = Locale.label("components.wrapper.ppl");
    else if (path.startsWith("/attendance")) result = Locale.label("components.wrapper.ppl");
    else if (path.startsWith("/groups")) result = Locale.label("components.wrapper.ppl");
    else if (path.startsWith("/forms")) result = Locale.label("components.wrapper.ppl");
    else if (path.startsWith("/donations")) result = Locale.label("components.wrapper.don");
    else if (path.startsWith("/serving") || window.location.search.indexOf("tag=") > -1) result = Locale.label("components.wrapper.serving");
    else if (path.startsWith("/sermons")) result = Locale.label("common.sermons");
    else if (path.startsWith("/calendars") || path.startsWith("/registrations")) result = Locale.label("helpers.secondaryMenuHelper.calendars");
    else if (path.startsWith("/site")) result = Locale.label("common.website");
    else if (path.startsWith("/mobile")) result = Locale.label("common.mobile");
    else if (path.startsWith("/reports")) result = Locale.label("reports.reportsPage.reports");
    else if (path.startsWith("/settings") || path.startsWith("/admin")) result = Locale.label("components.wrapper.set");
    else if (path.startsWith("/dashboard")) result = Locale.label("dashboard.dashboardPage.dash");
    return result;
  };

  const secondaryMenu = SecondaryMenuHelper.getSecondaryMenu(window.location.pathname, { formPermission, search: window.location.search, isMinistryMember });

  const handleNavigate = (url: string) => {
    navigate(url);
  };

  useEffect(() => {
    if (context?.person?.id && context?.userChurch?.church?.id) {
      NotificationService.getInstance().initialize(context).catch(() => undefined);
    }
  }, [context?.person?.id, context?.userChurch?.church?.id]);

  useEffect(() => {
    const addTestIds = () => {
      const urlToTestId: Record<string, string> = {
        "/": "nav-item-quick-actions",
        "/dashboard": "nav-item-dashboard",
        "/people": "nav-item-people",
        "/groups": "nav-item-groups",
        "/donations": "nav-item-donations",
        "/serving": "nav-item-serving",
        "/serving/tasks": "nav-item-tasks",
        "/site": "nav-item-site",
        "/settings": "nav-item-settings",
        "/settings/roles": "nav-item-roles",
        "/attendance": "nav-item-attendance",
        "/forms": "nav-item-forms",
        "/admin": "nav-item-admin",
        "/donations/batches": "nav-item-batches",
        "/donations/funds": "nav-item-funds",
        "/serving/songs": "nav-item-songs",
        "/profile": "nav-item-profile",
        "/profile/devices": "nav-item-devices",
        "/mobile": "nav-item-mobile",
        "/site/pages": "nav-item-website",
        "/calendars": "nav-item-calendars",
        "/sermons": "nav-item-sermons"
      };

      const scopes = document.querySelectorAll("header, .MuiDrawer-root, #site-header");
      const navLinks = Array.from(scopes).flatMap((scope) => Array.from(scope.querySelectorAll('a[href^="/"], button[role="menuitem"], .MuiListItemButton-root')));
      navLinks.forEach((link) => {
        const href = link.getAttribute("href");
        if (href && urlToTestId[href]) {
          link.setAttribute("data-testid", urlToTestId[href]);
        }

        const text = link.textContent?.toLowerCase();
        if (text) {
          const textToTestId: Record<string, string> = {
            dashboard: "nav-item-dashboard",
            people: "nav-item-people",
            groups: "nav-item-groups",
            donations: "nav-item-donations",
            plans: "nav-item-plans",
            tasks: "nav-item-tasks",
            roles: "nav-item-roles",
            settings: "nav-item-settings",
            attendance: "nav-item-attendance",
            forms: "nav-item-forms",
            "server admin": "nav-item-admin",
            batches: "nav-item-batches",
            funds: "nav-item-funds",
            songs: "nav-item-songs",
            profile: "nav-item-profile",
            devices: "nav-item-devices",
            mobile: "nav-item-mobile",
            website: "nav-item-website",
            sermons: "nav-item-sermons"
          };

          for (const [key, testId] of Object.entries(textToTestId)) {
            if (text.includes(key)) {
              link.setAttribute("data-testid", testId);
              break;
            }
          }
        }
      });
    };

    const timer = setTimeout(addTestIds, 100);
    const observer = new MutationObserver(addTestIds);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [primaryMenu, secondaryMenu]);

  const churchName = UserHelper.currentUserChurch?.church?.name || "B1";
  const userName = context?.user ? `${context.user.firstName} ${context.user.lastName}` : "";
  const profilePicture = context?.person ? PersonHelper.getPhotoUrl(context.person) : "";

  return (
    <div id="site-header">
      <AppBar
        id="site-app-bar"
        position="absolute"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: "var(--c1d3)",
          boxShadow: "none",
          fontFamily: "Roboto, Helvetica, Arial, sans-serif",
          "& .MuiIcon-root": { color: "#FFFFFF" }
        }}
      >
        <Toolbar id="site-toolbar" sx={{ pr: "24px", backgroundColor: "var(--c1d3)", minHeight: "56px !important", gap: 1, color: "#fff" }}>
          <Box
            component="a"
            href="/"
            onClick={(e: React.MouseEvent) => { e.preventDefault(); handleNavigate("/"); }}
            sx={{
              color: "inherit",
              textDecoration: "none",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              whiteSpace: "nowrap",
              mr: 1,
              fontFamily: "Roboto, Helvetica, Arial, sans-serif"
            }}
          >
            {churchName}
          </Box>
          <PrimaryNav label={getPrimaryLabel()} menuItems={primaryMenu} onNavigate={handleNavigate} />
          <SecondaryNav label={secondaryMenu.label} menuItems={secondaryMenu.menuItems} onNavigate={handleNavigate} />
          <div id="secondary-menu-container" style={{ flex: 1 }}>
            <SecondaryNavAlt label={secondaryMenu.label} menuItems={secondaryMenu.menuItems} onNavigate={handleNavigate} />
          </div>
          <button type="button" className="om-cmd" onClick={openCommandPalette} aria-haspopup="dialog" aria-label="Search or jump">
            <span className="om-wide">Search or jump </span>
            <kbd>Ctrl</kbd>
            <kbd>K</kbd>
          </button>
          {context?.user?.id && (
            <UserMenu
              profilePicture={profilePicture}
              userName={userName}
              context={context!}
              appName={"B1Admin"}
              loadCounts={() => NotificationService.getInstance().refresh()}
              notificationCounts={{ notificationCount: 0, pmCount: 0 }}
              onNavigate={handleNavigate}
            />
          )}
          <IconButton color="inherit" aria-label="Support" onClick={() => setSupportOpen(true)} size="small">
            <Icon>help_outline</Icon>
          </IconButton>
        </Toolbar>
      </AppBar>
      <div id="app-bar-spacer" style={{ height: "56px" }} />
      {supportOpen && <SupportModal appName="B1Admin" onClose={() => setSupportOpen(false)} />}
    </div>
  );
};

const PrimaryNav: React.FC<{ label: string; menuItems: { url: string; icon: string; label: string }[]; onNavigate: (url: string) => void }> = (props) => {
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLButtonElement>(null);

  return (
    <>
      <Button ref={anchorRef} onClick={() => setOpen((v) => !v)} color="inherit" endIcon={<Icon>expand_more</Icon>} id="primaryNavButton" sx={{ textTransform: "none" }}>
        <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 500 }}>{props.label}</h2>
      </Button>
      <Popper open={open} anchorEl={anchorRef.current} placement="bottom-start" transition disablePortal style={{ zIndex: 1300, color: "#FFF" }}>
        {({ TransitionProps }) => (
          <Grow {...TransitionProps}>
            <Paper elevation={3} sx={{ backgroundColor: "var(--c1)", color: "#FFF", minWidth: 300, paddingY: "10px" }}>
              <ClickAwayListener onClickAway={() => setOpen(false)}>
                <Box sx={{ "& a": { color: "#FFF", textDecoration: "none" }, "& a:hover": { color: "rgba(255,255,255,0.75)" } }}>
                  {props.menuItems.map((item) => (
                    <NavItem
                      url={item.url}
                      label={item.label.toUpperCase()}
                      icon={item.icon}
                      key={item.url}
                      onNavigate={(url) => { setOpen(false); props.onNavigate(url); }}
                    />
                  ))}
                </Box>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </>
  );
};

const SecondaryNav: React.FC<{ label: string; menuItems: { url: string; label: string }[]; onNavigate: (url: string) => void }> = (props) => (
  <div id="secondaryMenu">
    {props.menuItems.map((item) => (
      item.label === props.label
        ? <Box key={item.url} component="span" sx={{ backgroundColor: "rgba(255,255,255,0.16)", color: "#FFF", fontSize: 15, px: 1.25, py: 0.4, borderRadius: 10, mr: 1, cursor: "pointer" }} onClick={() => props.onNavigate(item.url)}>{item.label}</Box>
        : <a key={item.url} href={item.url} onClick={(e) => { e.preventDefault(); props.onNavigate(item.url); }} style={{ color: "rgba(255,255,255,0.75)", textDecoration: "none", marginLeft: 10, marginRight: 10 }}>{item.label}</a>
    ))}
  </div>
);

const SecondaryNavAlt: React.FC<{ label: string; menuItems: { url: string; label: string }[]; onNavigate: (url: string) => void }> = (props) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  return (
    <div id="secondaryMenuAlt">
      <Button
        onClick={(e) => setAnchorEl(e.currentTarget)}
        color="inherit"
        endIcon={<Icon>expand_more</Icon>}
        id="secondaryMenuButton"
        sx={{ textTransform: "none" }}
      >
        <h3 style={{ lineHeight: 1, margin: 0 }}>{props.label}</h3>
      </Button>
      <Menu anchorEl={anchorEl} open={anchorEl !== null} onClose={() => setAnchorEl(null)} transformOrigin={{ horizontal: "right", vertical: "top" }} anchorOrigin={{ horizontal: "right", vertical: "bottom" }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          {props.menuItems.map((item) => (
            <NavItem key={item.url} url={item.url} label={item.label} icon="people" onNavigate={(url) => { setAnchorEl(null); props.onNavigate(url); }} />
          ))}
        </Box>
      </Menu>
    </div>
  );
};
