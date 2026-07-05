import React, { useEffect, useState } from "react";
import { Box, Button, Card, Chip, Grid, Icon, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Add as AddIcon,
  Article as ArticleIcon,
  ChevronRight as ChevronRightIcon,
  Description as DescriptionIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  AutoAwesomeMosaic as AutoAwesomeMosaicIcon,
  Public as PublicIcon,
  Transform as TransformIcon,
  Visibility as VisibilityIcon,
  Web as WebIcon
} from "@mui/icons-material";
import { ApiHelper, ErrorMessages, PageHeader, UserHelper, Locale, Permissions } from "@churchapps/apphelper";
import { useWindowWidth } from "@react-hook/window-size";
import { useNavigate } from "react-router-dom";
import { AddPageModal, NavLinkEdit, GenerateSiteModal, SiteSwitcher, SitesDialog, useSiteSelection } from "./components";
import { SiteTemplatePicker } from "./admin/templates/SiteTemplatePicker";
import { PageHelper, EnvironmentHelper } from "../helpers";
import type { PageLink } from "../helpers";
import type { GenericSettingInterface, LinkInterface } from "@churchapps/helpers";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { SiteNavigation } from "../components/SiteNavigation";
import { AppIconButton } from "../components/ui/AppIconButton";
import { CountChip, HeaderPrimaryButton, HeaderSecondaryButton, hoverRowSx } from "../components/ui";
import { useConfirmDelete, useRequirePermission } from "../hooks";

export const PagesPage = () => {
  const theme = useTheme();
  const windowWidth = useWindowWidth();
  const navigate = useNavigate();
  const [pageTree, setPageTree] = useState<PageLink[]>([]);
  const [addMode, setAddMode] = useState<string>("");
  const [requestedSlug, setRequestedSlug] = useState<string>("");
  const [links, setLinks] = useState<LinkInterface[]>([]);
  const [editLink, setEditLink] = useState<LinkInterface | null>(null);
  const [showLogin, setShowLogin] = useState<GenericSettingInterface>();
  const [showSiteTemplates, setShowSiteTemplates] = useState(false);
  const [showGenerateSite, setShowGenerateSite] = useState(false);
  const [showSites, setShowSites] = useState(false);
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
        <TableRow key={item.url || item.pageId || item.title} sx={hoverRowSx}>
          <TableCell className="rowActions" sx={{ width: 120 }}>
            {item.custom ? (
              <AppIconButton
                label={Locale.label("common.edit")}
                icon={<EditIcon />}
                onClick={() => {
                  navigate("/site/pages/preview/" + item.pageId);
                }}
                data-testid="edit-page-button"
              />
            ) : (
              <Button
                variant="outlined"
                size="small"
                startIcon={<TransformIcon />}
                onClick={async () => {
                  if (await confirm(Locale.label("site.pagesPage.confirmConvert"), { destructive: false, confirmLabel: Locale.label("common.confirm", "Confirm") })) {
                    setRequestedSlug(item.url);
                    setAddMode("unlinked");
                  }
                }}
                color="secondary"
                data-testid="convert-page-button"
                sx={{ textTransform: "none", minWidth: "auto", fontSize: "0.75rem" }}>
                {Locale.label("site.pages.convert")}
              </Button>
            )}
          </TableCell>
          <TableCell>
            <Stack direction="row" alignItems="center" spacing={1}>
              {getExpandControl(item, level)}
              <Typography
                variant="body2"
                sx={{ fontFamily: "monospace", cursor: "pointer", color: "var(--link)", fontWeight: 500, "&:hover": { textDecoration: "underline" } }}
                onClick={() => window.open(EnvironmentHelper.B1Url.replace("{subdomain}", selectedSite?.subDomain || UserHelper.currentUserChurch.church.subDomain) + item.url, "_blank")}>
                {item.url}
              </Typography>
              <AppIconButton
                label={Locale.label("site.pagesPage.previewPage")}
                icon={<VisibilityIcon sx={{ fontSize: 16 }} />}
                onClick={() => window.open(EnvironmentHelper.B1Url.replace("{subdomain}", selectedSite?.subDomain || UserHelper.currentUserChurch.church.subDomain) + item.url, "_blank")}
                sx={{ p: 0.5 }}
              />
              {!item.custom && <Chip label={Locale.label("site.pagesPage.generated")} size="small" color="default" sx={{ fontSize: "0.7rem", height: 18 }} />}
            </Stack>
          </TableCell>
          <TableCell>
            <Typography variant="body2">{item.title}</Typography>
          </TableCell>
        </TableRow>
      );
      if (item.expanded && item.children) result.push(...getTreeLevel(item.children, level + 1));
    });
    return result;
  };

  const loadData = () => {
    PageHelper.loadPageTree(siteId).then((data) => {
      setPageTree(data);
    });
    ApiHelper.get("/links?category=website" + (siteId ? "&siteId=" + siteId : ""), "ContentApi").then((data: any) => {
      setLinks(data);
    });
    ApiHelper.get("/settings", "ContentApi").then((data: GenericSettingInterface[]) => {
      const loginSetting = data.filter((d: any) => d.keyName === "showLogin");
      if (loginSetting) setShowLogin(loginSetting[0]);
    });
  };

  const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const setting: GenericSettingInterface = showLogin ? { ...showLogin, value: `${e.target.checked}` } : { keyName: "showLogin", value: `${e.target.checked}`, public: 1 };
    ApiHelper.post("/settings", [setting], "ContentApi").then((data: any) => {
      setShowLogin(data[0]);
    });
  };

  const handleDrop = (index: number, parentId: string, link: LinkInterface) => {
    if (parentId === "") parentId = null;
    if (parentId === "unlinked") {
      if (link) {
        ApiHelper.delete("/links/" + link.id, "ContentApi").then(() => {
          loadData();
        });
      }
    } else {
      if (link) {
        link.parentId = parentId;
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
          parentId: parentId,
          siteId: siteId
        };
        ApiHelper.post("/links", [newLink], "ContentApi").then(() => {
          loadData();
        });
      }
    }
  };

  const addLinkCallback = () => {
    loadData();
    setEditLink(null);
  };

  const getPageStats = () => {
    const countPages = (items: PageLink[]): { custom: number; auto: number; total: number } => {
      let custom = 0;
      let auto = 0;

      items.forEach((item) => {
        if (item.custom) custom++;
        else auto++;

        if (item.children) {
          const childStats = countPages(item.children);
          custom += childStats.custom;
          auto += childStats.auto;
        }
      });

      return { custom, auto, total: custom + auto };
    };

    return countPages(pageTree);
  };

  useEffect(() => {
    loadData();
  }, [siteId]);

  const pageStats = getPageStats();
  const checked = showLogin?.value === "true" ? true : false;

  if (denied) return denied;

  if (windowWidth < 882) {
    return <ErrorMessages errors={[Locale.label("site.pagesPage.desktopOnly")]} />;
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
      <PageHeader
        icon={<WebIcon />}
        title={Locale.label("site.pagesPage.websitePages")}
        subtitle={Locale.label("site.pagesPage.subtitle")}
        statistics={[
          { icon: <DescriptionIcon />, value: pageStats.total.toString(), label: Locale.label("site.pagesPage.totalPages") },
          { icon: <EditIcon />, value: pageStats.custom.toString(), label: Locale.label("site.pagesPage.customPages") },
          { icon: <PublicIcon />, value: pageStats.auto.toString(), label: Locale.label("site.pagesPage.autoGenerated") }
        ]}>
        <SiteSwitcher siteId={siteId} onChange={setSiteId} sites={sites} onManage={() => setShowSites(true)} />
        <HeaderSecondaryButton
          startIcon={<AutoAwesomeMosaicIcon />}
          onClick={() => {
            setShowSiteTemplates(true);
          }}
          data-testid="start-from-template-button">
          {Locale.label("site.pagesPage.startFromTemplate")}
        </HeaderSecondaryButton>
        {/* ponytail: AI website builder temporarily disabled — restore this button to re-enable
        <HeaderSecondaryButton
          startIcon={<AutoAwesomeIcon />}
          onClick={() => {
            setShowGenerateSite(true);
          }}
          data-testid="generate-site-button">
          {Locale.label("site.generateSite.button")}
        </HeaderSecondaryButton>
        */}
        <HeaderPrimaryButton
          startIcon={<AddIcon />}
          onClick={() => {
            setAddMode("unlinked");
          }}
          data-testid="add-page-button">
          {Locale.label("site.pagesPage.addPage")}
        </HeaderPrimaryButton>
      </PageHeader>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 2 }} style={{ backgroundColor: theme.palette.background.paper, paddingLeft: 40, paddingTop: 24, position: "relative", zIndex: 1 }}>
          <DndProvider backend={HTML5Backend}>
            <h2 style={{ marginTop: 0 }}>{Locale.label("site.pagesPage.pages")}</h2>
            <div>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Typography sx={{ fontSize: "13.5px", fontStyle: "italic" }}>{Locale.label("site.pagesPage.showLogin")}</Typography>
                  <Tooltip title={Locale.label("site.pagesPage.showLoginTooltip")} arrow>
                    <Icon color="primary" sx={{ fontSize: 18, cursor: "pointer" }}>
                      info
                    </Icon>
                  </Tooltip>
                </Stack>
                <Switch
                  onChange={handleSwitchChange}
                  checked={showLogin ? checked : true}
                  slotProps={{ input: { "aria-label": Locale.label("site.pagesPage.toggleLoginVisibility") } }}
                  data-testid="show-login-switch"
                />
              </Stack>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, minHeight: 36 }}>
              <h3 style={{ margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1, minWidth: 0 }}>{Locale.label("site.pagesPage.mainNavigation")}</h3>
              <div style={{ flexShrink: 0, marginLeft: 8 }}>
                <AppIconButton label={Locale.label("common.add")} icon={<AddIcon />} intent="add" onClick={() => setEditLink({ churchId: UserHelper.currentUserChurch.church.id, category: "website", linkType: "url", sort: 99, linkData: "", icon: "", siteId } as LinkInterface)} data-testid="add-navigation-link" />
              </div>
            </div>
            <SiteNavigation links={links} refresh={loadData} select={() => {}} handleDrop={handleDrop} siteId={siteId} />
          </DndProvider>
        </Grid>
        <Grid size={{ xs: 12, md: 10 }} style={{ position: "relative", zIndex: 1 }}>
          <Box sx={{ p: 3 }}>
            <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "grey.200" }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: "var(--border-light)" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <ArticleIcon sx={{ color: "primary.main", fontSize: 20 }} />
                    <Typography variant="h6">
                      {Locale.label("site.pagesPage.pages")}
                    </Typography>
                    {pageStats.total > 0 && <CountChip count={pageStats.total} />}
                  </Stack>
                </Stack>
              </Box>
              <Box sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {Locale.label("site.pagesPage.description")}
                </Typography>

                {pageTree.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 8 }}>
                    <ArticleIcon sx={{ fontSize: 64, color: "grey.400", mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      {Locale.label("site.pagesPage.noPagesFound")}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      {Locale.label("site.pagesPage.getStarted")}
                    </Typography>
                    <Stack direction="row" spacing={2} justifyContent="center">
                      <Button
                        variant="contained"
                        startIcon={<AutoAwesomeMosaicIcon />}
                        onClick={() => {
                          setShowSiteTemplates(true);
                        }}>
                        {Locale.label("site.pagesPage.startFromTemplate")}
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => {
                          setAddMode("unlinked");
                        }}>
                        {Locale.label("site.pagesPage.addFirstPage")}
                      </Button>
                    </Stack>
                  </Box>
                ) : (
                  <Table sx={{ minWidth: 650 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {Locale.label("site.pagesPage.actions")}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {Locale.label("site.pagesPage.path")}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {Locale.label("common.title")}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>{getTreeLevel(pageTree, 0)}</TableBody>
                  </Table>
                )}
              </Box>
            </Card>
          </Box>
        </Grid>
      </Grid>
    </>
  );
};
