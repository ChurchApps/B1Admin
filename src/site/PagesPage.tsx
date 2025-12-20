import React, { useEffect, useState } from "react";
import { Box, Button, Card, Chip, Grid, Icon, IconButton, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Add as AddIcon,
  Article as ArticleIcon,
  ChevronRight as ChevronRightIcon,
  Description as DescriptionIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  Public as PublicIcon,
  Transform as TransformIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import { ApiHelper, ErrorMessages, PageHeader, SmallButton, UserHelper, Locale } from "@churchapps/apphelper";
import { useWindowWidth } from "@react-hook/window-size";
import { useNavigate } from "react-router-dom";
import { AddPageModal, NavLinkEdit } from "./components";
import { PageHelper, EnvironmentHelper } from "../helpers";
import type { PageLink } from "../helpers";
import type { GenericSettingInterface, LinkInterface } from "@churchapps/helpers";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { SiteNavigation } from "../components/SiteNavigation";

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

  console.log("=== Theme ===");

  console.log("Theme in PagesPage:", theme);
  console.log(theme.palette.mode);

  const getExpandControl = (item: PageLink, level: number) => {
    if (item.children && item.children.length > 0) {
      return (
        <Box sx={{ display: "flex", alignItems: "center", ml: level * 2 }}>
          <IconButton
            size="small"
            onClick={() => {
              item.expanded = !item.expanded;
              setPageTree([...pageTree]);
            }}
            sx={{ p: 0.5 }}>
            {item.expanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
          </IconButton>
        </Box>
      );
    } else return <Box sx={{ width: 32, ml: level * 2 }}></Box>;
  };

  const getTreeLevel = (items: PageLink[], level: number) => {
    const result: React.ReactElement[] = [];
    items.forEach((item) => {
      result.push(
        <TableRow key={item.url} sx={{ "&:hover": { backgroundColor: "action.hover" }, transition: "background-color 0.2s ease" }}>
          <TableCell sx={{ width: 120 }}>
            {item.custom ? (
              <Button
                variant="outlined"
                size="small"
                startIcon={<EditIcon />}
                onClick={() => {
                  navigate("/site/pages/preview/" + item.pageId);
                }}
                data-testid="edit-page-button"
                sx={{ textTransform: "none", minWidth: "auto", fontSize: "0.75rem" }}>
                {Locale.label("common.edit")}
              </Button>
            ) : (
              <Button
                variant="outlined"
                size="small"
                startIcon={<TransformIcon />}
                onClick={() => {
                  if (confirm(Locale.label("site.pagesPage.confirmConvert"))) {
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
                sx={{ fontFamily: "monospace", cursor: "pointer", color: "primary.main", "&:hover": { textDecoration: "underline" } }}
                onClick={() => window.open(EnvironmentHelper.B1Url.replace("{subdomain}", UserHelper.currentUserChurch.church.subDomain) + item.url, "_blank")}>
                {item.url}
              </Typography>
              <Tooltip title={Locale.label("site.pagesPage.previewPage")}>
                <IconButton
                  size="small"
                  onClick={() => window.open(EnvironmentHelper.B1Url.replace("{subdomain}", UserHelper.currentUserChurch.church.subDomain) + item.url, "_blank")}
                  sx={{ p: 0.5 }}>
                  <VisibilityIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
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
    PageHelper.loadPageTree().then((data) => {
      setPageTree(data);
    });
    ApiHelper.get("/links?category=website", "ContentApi").then((data: any) => {
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
      if (link)
        ApiHelper.delete("/links/" + link.id, "ContentApi").then(() => {
          loadData();
        });
    } else {
      if (link) {
        link.parentId = parentId;
        link.sort = index;
        ApiHelper.post("/links", [link], "ContentApi").then(() => {
          loadData();
        });
      } else {
        const newLink: LinkInterface = {
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
  }, []);

  const pageStats = getPageStats();
  const checked = showLogin?.value === "true" ? true : false;

  if (windowWidth < 882) {
    return <ErrorMessages errors={[Locale.label("site.pagesPage.desktopOnly")]} />;
  }

  return (
    <>
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
        />
      )}
      {editLink && (
        <NavLinkEdit
          updatedCallback={addLinkCallback}
          onDone={() => {
            setEditLink(null);
          }}
          link={editLink}
        />
      )}
      <PageHeader
        icon={<ArticleIcon />}
        title={Locale.label("site.pagesPage.websitePages")}
        subtitle={Locale.label("site.pagesPage.subtitle")}
        statistics={[
          { icon: <DescriptionIcon />, value: pageStats.total.toString(), label: Locale.label("site.pagesPage.totalPages") },
          { icon: <EditIcon />, value: pageStats.custom.toString(), label: Locale.label("site.pagesPage.customPages") },
          { icon: <PublicIcon />, value: pageStats.auto.toString(), label: Locale.label("site.pagesPage.autoGenerated") },
        ]}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => {
            setAddMode("unlinked");
          }}
          data-testid="add-page-button"
          sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.5)", "&:hover": { borderColor: "#FFF", backgroundColor: "rgba(255,255,255,0.1)" } }}>
          {Locale.label("site.pagesPage.addPage")}
        </Button>
      </PageHeader>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 2 }} style={{ backgroundColor: theme.palette.mode === "light" ? "#FFF" : "#292929", paddingLeft: 40, paddingTop: 24, position: "relative", zIndex: 1 }}>
          <DndProvider backend={HTML5Backend}>
            <h2 style={{ marginTop: 0 }}>{Locale.label("site.pagesPage.pages")}</h2>
            <div>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Typography sx={{ fontSize: "13.5px", fontStyle: "italic" }}>{Locale.label("site.pagesPage.showLogin")}</Typography>
                  <Tooltip title={Locale.label("site.pagesPage.showLoginTooltip")} arrow>
                    <Icon color="primary" sx={{ fontSize: "18px !important", cursor: "pointer" }}>
                      info
                    </Icon>
                  </Tooltip>
                </Stack>
                <Switch
                  onChange={handleSwitchChange}
                  checked={showLogin ? checked : true}
                  inputProps={{ "aria-label": Locale.label("site.pagesPage.toggleLoginVisibility") }}
                  data-testid="show-login-switch"
                />
              </Stack>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, minHeight: 36 }}>
              <h3 style={{ margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1, minWidth: 0 }}>{Locale.label("site.pagesPage.mainNavigation")}</h3>
              <div style={{ flexShrink: 0, marginLeft: 8 }}>
                <SmallButton
                  icon="add"
                  onClick={() => {
                    setEditLink({
                      churchId: UserHelper.currentUserChurch.church.id,
                      category: "website",
                      linkType: "url",
                      sort: 99,
                      linkData: "",
                      icon: "",
                    });
                  }}
                  data-testid="add-navigation-link"
                />
              </div>
            </div>
            <SiteNavigation links={links} refresh={loadData} select={() => {}} handleDrop={handleDrop} />
          </DndProvider>
        </Grid>
        <Grid size={{ xs: 12, md: 10 }} style={{ position: "relative", zIndex: 1 }}>
          <Box sx={{ p: 3 }}>
            <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "grey.200" }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <ArticleIcon sx={{ color: "primary.main" }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
                      {Locale.label("site.pagesPage.pages")}
                    </Typography>
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
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => {
                        setAddMode("unlinked");
                      }}>
                      {Locale.label("site.pagesPage.addFirstPage")}
                    </Button>
                  </Box>
                ) : (
                  <Table sx={{ minWidth: 650 }}>
                    <TableHead sx={{ backgroundColor: "grey.50", "& .MuiTableCell-root": { borderBottom: "2px solid", borderBottomColor: "divider" } }}>
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
