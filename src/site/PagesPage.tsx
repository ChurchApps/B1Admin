import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Icon, Link as MuiLink, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from "@mui/material";
import { ChevronRight as ChevronRightIcon, ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import { ApiHelper, UserHelper, Locale, Permissions } from "@churchapps/apphelper";
import { useWindowWidth } from "@react-hook/window-size";
import { Link, useNavigate } from "react-router-dom";
import { AddPageModal, NavLinkEdit, GenerateSiteModal, PageLinkEdit, SiteSwitcher, SitesDialog, useSiteSelection } from "./components";
import { SiteTemplatePicker } from "./admin/templates/SiteTemplatePicker";
import { PageHelper, EnvironmentHelper } from "../helpers";
import type { PageLink } from "../helpers";
import type { GenericSettingInterface, LinkInterface } from "@churchapps/helpers";
import type { PageInterface } from "../helpers/Interfaces";
import { SiteNavigation } from "../components/SiteNavigation";
import { AppIconButton } from "../components/ui/AppIconButton";
import { AddBar, PageContainer, PageHeader, RecordHeading, StatusBadge, Surface, TextAction, VerbRow, tableScrollSx } from "../components/ui";
import { clearSiteCache } from "./siteCache";
import { useConfirmDelete, useRequirePermission } from "../hooks";

export const PagesPage = () => {
  const windowWidth = useWindowWidth();
  const navigate = useNavigate();
  const [pageTree, setPageTree] = useState<PageLink[]>([]);
  const [addMode, setAddMode] = useState<string>("");
  const [requestedSlug, setRequestedSlug] = useState<string>("");
  const [links, setLinks] = useState<LinkInterface[]>([]);
  const [editLink, setEditLink] = useState<LinkInterface | null>(null);
  const [showLogin, setShowLogin] = useState<GenericSettingInterface>();
  const [hidePublicSite, setHidePublicSite] = useState<GenericSettingInterface>();
  const [showSiteTemplates, setShowSiteTemplates] = useState(false);
  const [showGenerateSite, setShowGenerateSite] = useState(false);
  const [showSites, setShowSites] = useState(false);
  const [settingsPage, setSettingsPage] = useState<PageInterface | null>(null);
  const { siteId, setSiteId, sites, selectedSite, reloadSites } = useSiteSelection();
  const denied = useRequirePermission(Permissions.contentApi.content.edit);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const getExpandControl = (item: PageLink, level: number) => {
    if (item.children && item.children.length > 0) {
      return (
        <Box sx={{ display: "flex", alignItems: "center", ml: level * 2 }}>
          <AppIconButton
            label={item.expanded ? Locale.label("common.collapse", "Collapse") : Locale.label("common.expand", "Expand")}
            icon={item.expanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
            onClick={() => {
              item.expanded = !item.expanded;
              setPageTree([...pageTree]);
            }}
            sx={{ p: 0.5 }}
          />
        </Box>
      );
    } else return <Box sx={{ width: 32, ml: level * 2 }}></Box>;
  };

  const getTreeLevel = (items: PageLink[], level: number) => {
    const result: React.ReactElement[] = [];
    items.forEach((item) => {
      result.push(
        <TableRow key={item.url || item.pageId || item.title}>
          <TableCell>
            <Stack direction="row" alignItems="center" spacing={1}>
              {getExpandControl(item, level)}
              <MuiLink href={liveUrl(item.url)} target="_blank" rel="noopener noreferrer" underline="hover" title={Locale.label("site.pagesPage.viewLivePage")} sx={{ typography: "body2", fontWeight: 600 }}>
                {item.url}
              </MuiLink>
              {!item.custom && <StatusBadge>{Locale.label("site.pagesPage.generated")}</StatusBadge>}
            </Stack>
          </TableCell>
          <TableCell>
            <Typography variant="body2">{item.title}</Typography>
          </TableCell>
          <TableCell align="right">
            {item.custom ? (
              <VerbRow sx={{ justifyContent: "flex-end", flexWrap: "nowrap" }}>
                <TextAction small to={"/site/pages/" + item.pageId} component={Link} data-testid="edit-content-button">{Locale.label("site.pagePreview.editContent")}</TextAction>
                <TextAction small onClick={() => openSettings(item.pageId!)} data-testid="page-settings-button">{Locale.label("site.pagePreview.pageSettings")}</TextAction>
              </VerbRow>
            ) : (
              <TextAction
                small
                onClick={async () => {
                  if (await confirm(Locale.label("site.pagesPage.confirmConvert"), { destructive: false, confirmLabel: Locale.label("common.confirm", "Confirm") })) {
                    setRequestedSlug(item.url);
                    setAddMode("unlinked");
                  }
                }}
                data-testid="convert-page-button">
                {Locale.label("site.pages.convert")}
              </TextAction>
            )}
          </TableCell>
        </TableRow>
      );
      if (item.expanded && item.children) result.push(...getTreeLevel(item.children, level + 1));
    });
    return result;
  };

  const liveUrl = (path: string) => EnvironmentHelper.B1Url.replace("{subdomain}", selectedSite?.subDomain || UserHelper.currentUserChurch.church.subDomain || "") + path;

  const openSettings = (pageId: string) => {
    ApiHelper.get("/pages/" + pageId, "ContentApi").then((data: PageInterface) => setSettingsPage(data));
  };

  const loadPageTree = (hidden: boolean) => {
    PageHelper.loadPageTree(siteId, hidden).then((data) => {
      setPageTree(data);
    });
  };

  const loadData = () => {
    ApiHelper.get("/links?category=website" + (siteId ? "&siteId=" + siteId : ""), "ContentApi").then((data: any) => {
      setLinks(data);
    });
    ApiHelper.get("/settings", "ContentApi").then((data: GenericSettingInterface[]) => {
      const loginSetting = data.filter((d: any) => d.keyName === "showLogin");
      if (loginSetting) setShowLogin(loginSetting[0]);
      const hideSetting = data.find((d: any) => d.keyName === "hidePublicSite");
      setHidePublicSite(hideSetting);
      loadPageTree(hideSetting?.value === "true");
    });
  };

  const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const setting: GenericSettingInterface = showLogin ? { ...showLogin, value: `${e.target.checked}` } : { keyName: "showLogin", value: `${e.target.checked}`, public: 1 };
    ApiHelper.post("/settings", [setting], "ContentApi").then((data: any) => {
      setShowLogin(data[0]);
    });
  };

  const handleHidePublicSiteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const setting: GenericSettingInterface = hidePublicSite ? { ...hidePublicSite, value: `${e.target.checked}` } : { keyName: "hidePublicSite", value: `${e.target.checked}`, public: 1 };
    ApiHelper.post("/settings", [setting], "ContentApi").then((data: any) => {
      setHidePublicSite(data[0]);
      loadPageTree(data[0]?.value === "true");
      // Per-church setting, so bust the church's own subdomain even while editing a secondary site.
      clearSiteCache(UserHelper.currentUserChurch?.church?.subDomain);
    });
  };

  const handleDrop = (index: number, parentIdArg: string, link: LinkInterface) => {
    let parentId: string | null = parentIdArg;
    if (parentId === "") parentId = null;
    const linkParentId: string | undefined = parentId === null ? undefined : parentId;
    if (parentId === "unlinked") {
      if (link) {
        ApiHelper.delete("/links/" + link.id, "ContentApi").then(() => {
          loadData();
        });
      }
    } else {
      if (link) {
        link.parentId = linkParentId;
        link.sort = index;
        ApiHelper.post("/links", [link], "ContentApi").then(() => {
          loadData();
        });
      } else {
        const newLink: LinkInterface & { siteId?: string } = {
          id: "",
          churchId: UserHelper.currentUserChurch.church.id,
          category: "website",
          url: "/new-page",
          linkType: "url",
          linkData: "",
          icon: "",
          text: "New Link",
          sort: index,
          parentId: linkParentId,
          siteId: siteId
        };
        ApiHelper.post("/links", [newLink], "ContentApi").then(() => {
          loadData();
        });
      }
    }
  };

  const newNavLink = () => ({ churchId: UserHelper.currentUserChurch.church.id, category: "website", linkType: "url", sort: 99, linkData: "", icon: "", siteId } as LinkInterface);

  const addLinkCallback = () => {
    loadData();
    setEditLink(null);
  };

  useEffect(() => {
    loadData();
  }, [siteId]);

  const checked = showLogin?.value === "true" ? true : false;
  const publicSiteHidden = hidePublicSite?.value === "true";

  if (denied) return denied;

  if (windowWidth < 882) {
    return (
      <Box data-testid="pages-small-screen" sx={{ minHeight: "calc(100vh - 64px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", px: 3, gap: 1.5 }}>
        <Icon sx={{ fontSize: 48, color: "text.secondary" }}>devices</Icon>
        <Typography variant="h3" component="h1">{Locale.label("site.contentEditor.smallScreenTitle")}</Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 360 }}>{Locale.label("site.pagesPage.desktopOnly")}</Typography>
        <Button variant="contained" onClick={() => navigate("/")} sx={{ mt: 1 }}>
          {Locale.label("common.back")}
        </Button>
      </Box>
    );
  }

  return (
    <>
      {ConfirmDialogElement}
      <SiteTemplatePicker
        open={showSiteTemplates}
        siteId={siteId}
        onClose={() => setShowSiteTemplates(false)}
        updatedCallback={(firstCreatedPageId) => {
          setShowSiteTemplates(false);
          loadData();
          if (firstCreatedPageId) navigate("/site/pages/preview/" + firstCreatedPageId);
        }}
      />
      {showSites && (
        <SitesDialog
          open={showSites}
          onClose={() => setShowSites(false)}
          sites={sites}
          siteId={siteId}
          onChanged={reloadSites}
          onSelectSite={setSiteId}
        />
      )}
      {showGenerateSite && (
        <GenerateSiteModal
          onDone={() => setShowGenerateSite(false)}
          updatedCallback={loadData}
          siteId={siteId}
        />
      )}
      {addMode !== "" && (
        <AddPageModal
          updatedCallback={() => {
            loadData();
            setAddMode("");
            setRequestedSlug("");
          }}
          onDone={() => {
            setAddMode("");
            setRequestedSlug("");
          }}
          mode={addMode}
          requestedSlug={requestedSlug}
          siteId={siteId}
        />
      )}
      {settingsPage && (
        <PageLinkEdit
          page={settingsPage}
          updatedCallback={() => {
            setSettingsPage(null);
            loadData();
          }}
          onDone={() => setSettingsPage(null)}
        />
      )}
      {editLink && (
        <NavLinkEdit
          updatedCallback={addLinkCallback}
          onDone={() => {
            setEditLink(null);
          }}
          link={editLink}
          siteId={siteId}
        />
      )}
      <PageHeader title={Locale.label("site.pagesPage.websitePages")} subtitle={Locale.label("site.pagesPage.subtitle")}>
        <SiteSwitcher siteId={siteId} onChange={setSiteId} sites={sites} onManage={() => setShowSites(true)} />
      </PageHeader>
      <PageContainer>
        <VerbRow sx={{ mb: 3 }}>
          <TextAction onClick={() => setShowSiteTemplates(true)} data-testid="start-from-template-button">{Locale.label("site.pagesPage.startFromTemplate")}</TextAction>
          {/* ponytail: AI website builder temporarily disabled — restore this verb to re-enable
          <TextAction onClick={() => setShowGenerateSite(true)} data-testid="generate-site-button">{Locale.label("site.generateSite.button")}</TextAction>
          */}
        </VerbRow>

        <Surface disablePadding>
          {pageTree.length === 0 ? (
            <Box sx={{ p: 3 }}>
              <Typography variant="body2" color="text.secondary">
                {Locale.label("site.pagesPage.noPagesFound")} {Locale.label("site.pagesPage.getStarted")}
              </Typography>
            </Box>
          ) : (
            <Box sx={tableScrollSx} role="region" aria-label={Locale.label("site.pagesPage.pages")} tabIndex={0}>
              <Table sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>{Locale.label("site.pagesPage.path")}</TableCell>
                    <TableCell>{Locale.label("common.title")}</TableCell>
                    <TableCell align="right">{Locale.label("site.pagesPage.actions")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>{getTreeLevel(pageTree, 0)}</TableBody>
              </Table>
            </Box>
          )}
        </Surface>

        <AddBar>
          <TextAction onClick={() => setAddMode("unlinked")} data-testid="add-page-button">{Locale.label("site.pagesPage.addPage")}</TextAction>
        </AddBar>

        <Box component="section" aria-labelledby="pages-main-navigation" sx={{ mt: 6 }}>
          <RecordHeading id="pages-main-navigation" label={Locale.label("site.pagesPage.mainNavigation")}>
            <TextAction small onClick={() => setEditLink(newNavLink())} aria-label={Locale.label("common.add")} data-testid="add-navigation-link">{Locale.label("common.add")}</TextAction>
          </RecordHeading>
          <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) minmax(260px, 360px)" }, alignItems: "start" }}>
            <Surface>
              <SiteNavigation links={links} refresh={loadData} handleDrop={handleDrop} siteId={siteId} />
            </Surface>
            <Stack spacing={1}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Typography variant="body2">{Locale.label("site.pagesPage.showLogin")}</Typography>
                  <Tooltip title={Locale.label("site.pagesPage.showLoginTooltip")} arrow>
                    <Icon sx={{ fontSize: 18, cursor: "pointer", color: "text.secondary" }}>info</Icon>
                  </Tooltip>
                </Stack>
                <Switch
                  onChange={handleSwitchChange}
                  checked={showLogin ? checked : true}
                  slotProps={{ input: { "aria-label": Locale.label("site.pagesPage.toggleLoginVisibility") } }}
                  data-testid="show-login-switch"
                />
              </Stack>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Typography variant="body2">{Locale.label("site.pagesPage.hidePublicSite")}</Typography>
                  <Tooltip title={Locale.label("site.pagesPage.hidePublicSiteTooltip")} arrow>
                    <Icon sx={{ fontSize: 18, cursor: "pointer", color: "text.secondary" }}>info</Icon>
                  </Tooltip>
                </Stack>
                <Switch
                  onChange={handleHidePublicSiteChange}
                  checked={publicSiteHidden}
                  slotProps={{ input: { "aria-label": Locale.label("site.pagesPage.hidePublicSite") } }}
                  data-testid="hide-public-site-switch"
                />
              </Stack>
              {publicSiteHidden && (
                <Alert severity="warning" data-testid="hide-public-site-warning">
                  {Locale.label("site.pagesPage.hidePublicSiteWarning")}
                </Alert>
              )}
            </Stack>
          </Box>
        </Box>
      </PageContainer>
    </>
  );
};
