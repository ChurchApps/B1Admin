import { ApiHelper, Locale, NotificationService, Permissions, PersonHelper, SupportModal, UserHelper, UserMenu } from "@churchapps/apphelper";
import React, { useEffect, useMemo } from "react";
import { Icon } from "@mui/material";
import { SecondaryMenuHelper } from "../helpers/SecondaryMenuHelper";
import { hasPlansEditAccess } from "../helpers";
import UserContext from "../UserContext";
import { useLocation, useNavigate } from "react-router-dom";
import { openCommandPalette } from "../omarchy";
import { ThemeSelect } from "../ThemeContext";
import "../omarchy/omarchy.css";

const NAV_TEST_IDS: Record<string, string> = {
  "/": "nav-item-quick-actions",
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

export const Header: React.FC = () => {
  const context = React.useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();
  const formPermission = UserHelper.checkAccess(Permissions.membershipApi.forms.admin) || UserHelper.checkAccess(Permissions.membershipApi.forms.edit);
  const [isMinistryMember, setIsMinistryMember] = React.useState(false);
  const [supportOpen, setSupportOpen] = React.useState(false);

  useEffect(() => {
    if (!hasPlansEditAccess()) {
      ApiHelper.get("/groups/my/ministry", "MembershipApi").then((data: { length?: number }[]) => setIsMinistryMember(data?.length > 0));
    }
  }, []);

  const secondaryMenu = useMemo(
    () => SecondaryMenuHelper.getSecondaryMenu(location.pathname, { formPermission, search: location.search, isMinistryMember }),
    [location.pathname, location.search, formPermission, isMinistryMember]
  );

  const homeLinks = useMemo(() => {
    const items: { url: string; label: string }[] = [{ url: "/", label: Locale.label("components.wrapper.dash", "Sunday") }];
    if (UserHelper.checkAccess(Permissions.membershipApi.people.view)) items.push({ url: "/people", label: Locale.label("components.wrapper.ppl", "People") });
    if (UserHelper.checkAccess(Permissions.givingApi.donations.viewSummary)) items.push({ url: "/donations", label: Locale.label("components.wrapper.don", "Giving") });
    items.push({ url: "/serving", label: Locale.label("components.wrapper.serving", "Serving") });
    if (UserHelper.checkAccess(Permissions.contentApi.content.edit)) items.push({ url: "/site/pages", label: Locale.label("common.website", "Site") });
    if (UserHelper.checkAccess(Permissions.membershipApi.settings.edit) || UserHelper.checkAccess(Permissions.membershipApi.roles.view)) {
      items.push({ url: "/settings", label: Locale.label("components.wrapper.set", "Settings") });
    }
    return items;
  }, []);

  const navItems = secondaryMenu.menuItems.length > 1 ? secondaryMenu.menuItems : homeLinks;

  const handleNavigate = (url: string) => navigate(url);

  useEffect(() => {
    if (context?.person?.id && context?.userChurch?.church?.id) {
      NotificationService.getInstance().initialize(context).catch(() => undefined);
    }
  }, [context?.person?.id, context?.userChurch?.church?.id]);

  const churchName = UserHelper.currentUserChurch?.church?.name || "B1";
  const userName = context?.user ? `${context.user.firstName} ${context.user.lastName}` : "";
  const profilePicture = context?.person ? PersonHelper.getPhotoUrl(context.person) : "";
  const path = location.pathname;

  return (
    <header id="site-header" className="om-chrome">
      <div className="om-chrome-bar">
        <a
          className="om-brand"
          href="/"
          data-testid="nav-item-quick-actions"
          onClick={(e) => { e.preventDefault(); handleNavigate("/"); }}
        >
          {churchName}
        </a>
        <nav className="om-siblings" aria-label={secondaryMenu.label || Locale.label("components.wrapper.dash")}>
          {navItems.map((item) => {
            const on = path === item.url || (item.url !== "/" && (path === item.url || path.startsWith(item.url + "/")));
            return (
              <a
                key={item.url}
                href={item.url}
                className={on ? "on" : undefined}
                data-testid={NAV_TEST_IDS[item.url]}
                onClick={(e) => { e.preventDefault(); handleNavigate(item.url); }}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
        <div className="om-chrome-end">
          <button type="button" className="om-cmd" onClick={openCommandPalette} aria-haspopup="dialog" aria-label="Search or jump">
            <span className="om-wide">Search or jump </span>
            <kbd>Ctrl</kbd>
            <kbd>K</kbd>
          </button>
          <ThemeSelect />
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
          <button type="button" className="om-help" aria-label="Support" onClick={() => setSupportOpen(true)}>
            <Icon fontSize="small">help_outline</Icon>
          </button>
        </div>
      </div>
      {supportOpen && <SupportModal appName="B1Admin" onClose={() => setSupportOpen(false)} />}
    </header>
  );
};
