import { Locale, UserHelper, Permissions } from "@churchapps/apphelper";

interface MenuItem {
  url: string;
  label: string;
  icon?: string;
}

export class SecondaryMenuHelper {
  static getSecondaryMenu = (path: string, data: any) => {
    let result: { menuItems: MenuItem[]; label: string } = { menuItems: [], label: "" };

    if (path.startsWith("/people") || path.startsWith("/groups") || path.startsWith("/attendance") || path.startsWith("/forms")) result = this.getPeopleMenu(path, data);
    else if (path.startsWith("/mobile")) result = this.getMobileMenu(path);
    else if (path.startsWith("/settings") || path.startsWith("/admin")) result = this.getSettingsMenu(path);
    else if (path.startsWith("/serving")) result = this.getServingMenu(path, data);
    else if (path.startsWith("/donations")) result = this.getDonationsMenu(path);
    else if (path.startsWith("/site") || path.startsWith("/calendars") || path.startsWith("/registrations")) result = this.getSiteMenu(path);
    else if (path.startsWith("/sermons")) result = this.getSermonsMenu(path);
    else if (path.startsWith("/profile")) result = this.getProfileMenu(path);
    else if (path === "/" || path.startsWith("/dashboard")) result = this.getDashboardMenu(path);
    return result;
  };

  static getPeopleMenu = (path: string, data: any) => {
    const menuItems: MenuItem[] = [];
    let label: string = "";
    menuItems.push({ url: "/people", label: Locale.label("components.wrapper.ppl"), icon: "person" });
    menuItems.push({ url: "/groups", label: Locale.label("components.wrapper.groups"), icon: "groups" });
    if (UserHelper.checkAccess(Permissions.attendanceApi.attendance.viewSummary)) menuItems.push({ url: "/attendance", label: Locale.label("components.wrapper.att"), icon: "calendar_month" });
    if (data?.formPermission) menuItems.push({ url: "/forms", label: Locale.label("components.wrapper.forms"), icon: "description" });

    if (path.startsWith("/groups") && data?.search?.includes("tag=team")) label = Locale.label("components.wrapper.teams");
    else if (path.startsWith("/groups")) label = Locale.label("components.wrapper.groups");
    else if (path.startsWith("/people/demographics")) label = Locale.label("people.demographics.title");
    else if (path.startsWith("/people")) label = Locale.label("components.wrapper.ppl");
    else if (path.startsWith("/attendance")) label = Locale.label("components.wrapper.att");
    else if (path.startsWith("/forms")) label = Locale.label("components.wrapper.forms");

    return { menuItems, label };
  };

  static getSettingsMenu = (path: string) => {
    const menuItems: MenuItem[] = [];
    let label: string = "";
    if (UserHelper.checkAccess(Permissions.membershipApi.settings.edit)) menuItems.push({ url: "/settings", label: Locale.label("components.wrapper.set"), icon: "settings" });
    if (UserHelper.checkAccess(Permissions.membershipApi.roles.view)) menuItems.push({ url: "/settings/roles", label: Locale.label("settings.roles.roles"), icon: "lock" });
    if (UserHelper.checkAccess(Permissions.membershipApi.server.admin)) menuItems.push({ url: "/admin", label: Locale.label("components.wrapper.servAdmin"), icon: "admin_panel_settings" });

    if (path.startsWith("/settings/roles") || path.startsWith("/settings/role")) label = Locale.label("settings.roles.roles");
    else if (path.startsWith("/settings/campuses")) label = Locale.label("settings.campuses.campuses");
    else if (path.startsWith("/settings")) label = Locale.label("components.wrapper.set");
    else if (path.startsWith("/admin")) label = Locale.label("components.wrapper.servAdmin");

    return { menuItems, label };
  };

  static getMobileMenu = (path: string) => {
    const menuItems: MenuItem[] = [];
    let label: string = Locale.label("common.mobile");
    if (UserHelper.checkAccess(Permissions.membershipApi.settings.edit)) {
      menuItems.push({ url: "/mobile/navigation", label: Locale.label("common.navigation"), icon: "menu" });
      menuItems.push({ url: "/mobile/theme", label: Locale.label("common.appTheme"), icon: "palette" });
      menuItems.push({ url: "/mobile/b1-mobile", label: Locale.label("common.b1Mobile"), icon: "phone_android" });
      menuItems.push({ url: "/mobile/checkin", label: Locale.label("common.b1CheckIn"), icon: "qr_code" });
    }

    if (path.startsWith("/mobile/theme")) label = Locale.label("common.appTheme");
    else if (path.startsWith("/mobile/b1-mobile")) label = Locale.label("common.b1Mobile");
    else if (path.startsWith("/mobile/checkin")) label = Locale.label("common.b1CheckIn");
    else if (path.startsWith("/mobile")) label = Locale.label("common.navigation");

    return { menuItems, label };
  };

  static getProfileMenu = (path:string) => {
    const menuItems: MenuItem[] = [];
    let label: string = "";
    if (path.startsWith("/profile")) label = Locale.label("helpers.secondaryMenuHelper.profile");
    menuItems.push({ url: "/profile", label: Locale.label("helpers.secondaryMenuHelper.profile"), icon: "person" });
    menuItems.push({ url: "/profile/devices", label: Locale.label("helpers.secondaryMenuHelper.devices"), icon: "devices" });
    return { menuItems, label };
  };

  static getServingMenu = (path: string, data?: any) => {
    const menuItems: MenuItem[] = [];
    let label: string = "";
    const canViewPlans = UserHelper.checkAccess(Permissions.membershipApi.plans.edit) || data?.isMinistryMember;
    if (canViewPlans) {
      menuItems.push({ url: "/serving", label: Locale.label("components.wrapper.plans"), icon: "assignment" });
      menuItems.push({ url: "/serving/songs", label: Locale.label("components.wrapper.songs"), icon: "music_note" });
    }
    menuItems.push({ url: "/serving/tasks", label: Locale.label("components.wrapper.tasks"), icon: "list_alt" });
    menuItems.push({ url: "/serving/tasks/workflows", label: Locale.label("components.wrapper.workflows"), icon: "view_kanban" });
    menuItems.push({ url: "/serving/tasks/automations", label: Locale.label("components.wrapper.automations"), icon: "settings_suggest" });

    if (path.startsWith("/serving/songs")) label = Locale.label("components.wrapper.songs");
    else if (path.startsWith("/serving/tasks/automations")) label = Locale.label("components.wrapper.automations");
    else if (path.startsWith("/serving/tasks/workflows")) label = Locale.label("components.wrapper.workflows");
    else if (path.startsWith("/serving/tasks")) label = Locale.label("components.wrapper.tasks");
    else if (path.startsWith("/serving")) label = Locale.label("components.wrapper.plans");

    return { menuItems, label };
  };

  static getDonationsMenu = (path: string) => {
    const menuItems: MenuItem[] = [];
    let label: string = "";
    if (UserHelper.checkAccess(Permissions.givingApi.donations.viewSummary)) menuItems.push({ url: "/donations", label: Locale.label("donations.donations.summary"), icon: "volunteer_activism" });
    if (UserHelper.checkAccess(Permissions.givingApi.donations.viewSummary)) menuItems.push({ url: "/donations/batches", label: Locale.label("donations.donations.batches"), icon: "folder" });
    if (UserHelper.checkAccess(Permissions.givingApi.donations.viewSummary)) menuItems.push({ url: "/donations/funds", label: Locale.label("donations.donations.funds"), icon: "account_balance" });
    if (UserHelper.checkAccess(Permissions.givingApi.donations.viewSummary)) menuItems.push({ url: "/donations/statements", label: Locale.label("donations.donations.statements") || "Giving Statements", icon: "description" });

    if (path.startsWith("/donations/stripe-import")) label = Locale.label("helpers.secondaryMenuHelper.stripeImport");
    else if (path.startsWith("/donations/statements")) label = Locale.label("donations.donations.statements") || "Giving Statements";
    else if (path.startsWith("/donations/funds")) label = Locale.label("donations.donations.funds");
    else if (path.startsWith("/donations/batches")) label = Locale.label("donations.donations.batches");
    else if (path.startsWith("/donations")) label = Locale.label("donations.donations.summary");

    return { menuItems, label };
  };

  static getDashboardMenu = (path: string) => {
    const menuItems: MenuItem[] = [];
    let label: string = "";
    menuItems.push({ url: "/", label: Locale.label("helpers.secondaryMenuHelper.quickActions"), icon: "flash_on" });
    menuItems.push({ url: "/dashboard", label: Locale.label("components.wrapper.dash"), icon: "dashboard" });

    if (path === "/") label = Locale.label("helpers.secondaryMenuHelper.quickActions");
    else if (path.startsWith("/dashboard")) label = Locale.label("components.wrapper.dash");

    return { menuItems, label };
  };

  static getSiteMenu = (path: string) => {
    const menuItems: MenuItem[] = [];
    let label: string = Locale.label("helpers.secondaryMenuHelper.website");

    if (UserHelper.checkAccess(Permissions.contentApi.content.edit)) {
      menuItems.push({ url: "/site/pages", label: Locale.label("helpers.secondaryMenuHelper.pages"), icon: "article" });
      menuItems.push({ url: "/site/blocks", label: Locale.label("helpers.secondaryMenuHelper.blocks"), icon: "widgets" });
      menuItems.push({ url: "/site/appearance", label: Locale.label("helpers.secondaryMenuHelper.appearance"), icon: "palette" });
      menuItems.push({ url: "/site/files", label: Locale.label("helpers.secondaryMenuHelper.files"), icon: "folder_open" });
      menuItems.push({ url: "/calendars", label: Locale.label("helpers.secondaryMenuHelper.calendars"), icon: "calendar_month" });
      menuItems.push({ url: "/registrations", label: Locale.label("helpers.secondaryMenuHelper.registrations"), icon: "how_to_reg" });
    }

    if (path.startsWith("/registrations")) label = Locale.label("helpers.secondaryMenuHelper.registrations");
    else if (path.startsWith("/site/pages")) label = Locale.label("helpers.secondaryMenuHelper.pages");
    else if (path.startsWith("/site/blocks")) label = Locale.label("helpers.secondaryMenuHelper.blocks");
    else if (path.startsWith("/site/appearance")) label = Locale.label("helpers.secondaryMenuHelper.appearance");
    else if (path.startsWith("/site/files")) label = Locale.label("helpers.secondaryMenuHelper.files");
    else if (path.startsWith("/calendars")) label = Locale.label("helpers.secondaryMenuHelper.calendars");
    else if (path.startsWith("/site")) label = Locale.label("helpers.secondaryMenuHelper.website");

    return { menuItems, label };
  };

  static getSermonsMenu = (path: string) => {
    const menuItems: MenuItem[] = [];
    let label: string = "";
    if (UserHelper.checkAccess(Permissions.contentApi.streamingServices.edit)) {
      menuItems.push({ url: "/sermons", label: Locale.label("helpers.secondaryMenuHelper.sermons"), icon: "live_tv" });
      menuItems.push({ url: "/sermons/times", label: Locale.label("helpers.secondaryMenuHelper.liveStreamTimes"), icon: "schedule" });
    }

    if (path.startsWith("/sermons/bulk")) label = Locale.label("helpers.secondaryMenuHelper.bulkImport");
    else if (path.startsWith("/sermons/times")) label = Locale.label("helpers.secondaryMenuHelper.liveStreamTimes");
    else if (path.startsWith("/sermons")) label = Locale.label("helpers.secondaryMenuHelper.sermons");

    return { menuItems, label };
  };
}
