import React, { useEffect, useState } from "react";
import { Box, Button, Chip, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from "@mui/material";
import {
  Add as AddIcon,
  ChevronRight as ChevronRightIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  Transform as TransformIcon,
  Visibility as VisibilityIcon
} from "@mui/icons-material";
import { ApiHelper, UserHelper, Locale, Permissions } from "@churchapps/apphelper";
import { useNavigate } from "react-router-dom";
import { AddPageModal, NavLinkEdit, GenerateSiteModal, PageLinkEdit, SiteSwitcher, SitesDialog, useSiteSelection } from "./components";
import { SiteTemplatePicker } from "./admin/templates/SiteTemplatePicker";
import { PageHelper, EnvironmentHelper } from "../helpers";
import type { PageLink } from "../helpers";
import type { GenericSettingInterface, LinkInterface } from "@churchapps/helpers";
import type { PageInterface } from "../helpers/Interfaces";
import { SiteNavigation } from "../components/SiteNavigation";
import { AppIconButton } from "../components/ui/AppIconButton";
import { hoverRowSx } from "../components/ui";
import { useConfirmDelete, useRequirePermission } from "../hooks";
import { Plate, h1Sx, ledeSx, verbSx, addBarSx, SectionLabel } from "./plated";

export const PagesPage = () => {
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
        <TableRow key={item.url || item.pageId || item.title} sx={hoverRowSx}>
          <TableCell className="rowActions" sx={{ width: 120 }}>
            {item.custom ? (
              <Stack direction="row" spacing={0.5}>
                <AppIconButton
                  label={Locale.label("site.pagePreview.editContent")}
                  icon={<EditIcon />}
                  onClick={() => {
                    navigate("/site/pages/" + item.pageId);
                  }}
                  data-testid="edit-content-button"
                />
                <AppIconButton
                  label={Locale.label("site.pagePreview.pageSettings")}
                  icon={<SettingsIcon />}
                  onClick={() => openSettings(item.pageId!)}
                  data-testid="page-settings-button"
                />
              </Stack>
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
                onClick={() => window.open(EnvironmentHelper.B1Url.replace("{subdomain}", selectedSite?.subDomain || UserHelper.currentUserChurch.church.subDomain || "") + item.url, "_blank")}>
                {item.url}
              </Typography>
              <AppIconButton
                label={Locale.label("site.pagesPage.viewLivePage")}
                icon={<VisibilityIcon sx={{ fontSize: 16 }} />}
                onClick={() => window.open(EnvironmentHelper.B1Url.replace("{subdomain}", selectedSite?.subDomain || UserHelper.currentUserChurch.church.subDomain || "") + item.url, "_blank")}
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

  const openSettings = (pageId: string) => {
    ApiHelper.get("/pages/" + pageId, "ContentApi").then((data: PageInterface) => setSettingsPage(data));
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

  const addLinkCallback = () => {
    loadData();
    setEditLink(null);
  };

  useEffect(() => {
    loadData();
  }, [siteId]);

  const checked = showLogin?.value === "true" ? true : false;

  if (denied) return denied;

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
      <Plate directory>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2, flexWrap: "wrap", mb: 1 }}>
          <Box>
            <Box component="h1" sx={h1Sx}>{Locale.label("site.pagesPage.websitePages")}</Box>
            <Box sx={ledeSx}>{Locale.label("site.pagesPage.subtitle")}</Box>
          </Box>
          <SiteSwitcher siteId={siteId} onChange={setSiteId} sites={sites} onManage={() => setShowSites(true)} />
        </Box>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
          <Box component="button" type="button" onClick={() => setShowSiteTemplates(true)} data-testid="start-from-template-button" sx={verbSx}>
            {Locale.label("site.pagesPage.startFromTemplate")}
          </Box>
          <Box component="button" type="button" onClick={() => setAddMode("unlinked")} data-testid="add-page-button" sx={verbSx}>
            {Locale.label("site.pagesPage.addPage")}
          </Box>
        </Box>

        {pageTree.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
            {Locale.label("site.pagesPage.noPagesFound")}
          </Typography>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{Locale.label("site.pagesPage.actions")}</TableCell>
                <TableCell>{Locale.label("site.pagesPage.path")}</TableCell>
                <TableCell>{Locale.label("common.title")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>{getTreeLevel(pageTree, 0)}</TableBody>
          </Table>
        )}

        <Box sx={addBarSx}>
          <Box component="button" type="button" onClick={() => setAddMode("unlinked")} sx={verbSx}>
            {Locale.label("site.pagesPage.addPage")}
          </Box>
        </Box>

        <SectionLabel>{Locale.label("site.pagesPage.mainNavigation")}</SectionLabel>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>{Locale.label("site.pagesPage.showLogin")}</Typography>
            <Tooltip title={Locale.label("site.pagesPage.showLoginTooltip")} arrow>
              <Typography component="span" sx={{ fontSize: 14, cursor: "pointer", color: "text.secondary" }}>ⓘ</Typography>
            </Tooltip>
          </Stack>
          <Switch
            onChange={handleSwitchChange}
            checked={showLogin ? checked : true}
            slotProps={{ input: { "aria-label": Locale.label("site.pagesPage.toggleLoginVisibility") } }}
            data-testid="show-login-switch"
          />
        </Stack>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <AppIconButton label={Locale.label("common.add")} icon={<AddIcon />} intent="add" onClick={() => setEditLink({ churchId: UserHelper.currentUserChurch.church.id, category: "website", linkType: "url", sort: 99, linkData: "", icon: "", siteId } as LinkInterface)} data-testid="add-navigation-link" />
        </Box>
        <SiteNavigation links={links} refresh={loadData} handleDrop={handleDrop} siteId={siteId} />
      </Plate>
    </>
  );
};
