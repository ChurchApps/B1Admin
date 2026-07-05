import { useEffect, useState } from "react";
import type { JSX } from "react";
import { ApiHelper, Loading, PageHeader, UserHelper, Permissions, Locale } from "@churchapps/apphelper";
import type { BlockInterface } from "../helpers";
import { TableRow, TableCell, Table, TableBody, TableHead, Box, Typography, Stack, Button, Card, Icon, IconButton, Tooltip } from "@mui/material";
import { SmartButton as BlockIcon, Add as AddIcon, Edit as EditIcon, Settings as SettingsIcon } from "@mui/icons-material";
import { Link } from "react-router-dom";
import { BlockEdit, SiteSwitcher, SitesDialog, useSiteSelection } from "./components";
import { PermissionDenied } from "../components";
import { CountChip, EmptyState, HeaderPrimaryButton } from "../components/ui";

export const BlocksPage = () => {
  const [blocks, setBlocks] = useState<BlockInterface[]>([]);
  const [editBlock, setEditBlock] = useState<BlockInterface>(null);
  const [loading, setLoading] = useState(true);
  const [showSites, setShowSites] = useState(false);
  const { siteId, setSiteId, sites, reloadSites } = useSiteSelection();

  const loadData = () => {
    setLoading(true);
    ApiHelper.get("/blocks" + (siteId ? "?siteId=" + siteId : ""), "ContentApi").then((blocksData: any[]) => {
      const filtered = blocksData.filter((block: BlockInterface) => block.blockType !== "footerBlock");
      setBlocks(filtered || []);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, [siteId]);

  const [stats, setStats] = useState({ totalBlocks: 0 });

  useEffect(() => {
    if (blocks) {
      const totalBlocks = blocks.length;
      setStats({ totalBlocks });
    }
  }, [blocks]);

  const getRows = () => {
    const result: JSX.Element[] = [];

    if (blocks.length === 0) {
      result.push(
        <TableRow key="empty">
          <EmptyState
            variant="table"
            colSpan={3}
            icon={<BlockIcon />}
            title={Locale.label("site.blocksPage.noBlocksFound")}
            description={Locale.label("site.blocksPage.getStarted")}
            action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditBlock({ blockType: "elementBlock", siteId })}>{Locale.label("site.blocksPage.createFirstBlock")}</Button>} />
        </TableRow>
      );
      return result;
    }

    blocks.forEach((block) => {
      result.push(
        <TableRow key={block.id} sx={{ "&:hover": { backgroundColor: "action.hover" }, transition: "background-color 0.2s ease" }}>
          <TableCell>
            <Stack direction="row" spacing={1} alignItems="center">
              <BlockIcon sx={{ color: "primary.main", fontSize: 20 }} />
              <Link
                to={`/site/blocks/${block.id}`}
                style={{
                  textDecoration: "none",
                  color: "var(--link)",
                  fontWeight: 500
                }}
              >
                {block.name}
              </Link>
            </Stack>
          </TableCell>
          <TableCell>
            <Stack direction="row" spacing={1} alignItems="center">
              <Icon sx={{ color: "text.secondary", fontSize: 18 }}>
                {block.blockType === "elementBlock" ? "widgets" : "view_module"}
              </Icon>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {block.blockType === "elementBlock" ? Locale.label("site.blocksPage.elements") : Locale.label("site.blocksPage.sections")}
              </Typography>
            </Stack>
          </TableCell>
          <TableCell align="right" className="rowActions">
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Tooltip title={Locale.label("common.edit")}>
                <IconButton size="small" aria-label={Locale.label("common.edit")} component={Link} to={`/site/blocks/${block.id}`}><EditIcon fontSize="small" /></IconButton>
              </Tooltip>
              <Button size="small" variant="outlined" startIcon={<SettingsIcon />} onClick={() => setEditBlock(block)} data-testid={`rename-block-${block.id}-button`} sx={{ textTransform: "none", minWidth: "auto" }}>{Locale.label("site.blocksPage.rename")}</Button>
            </Stack>
          </TableCell>
        </TableRow>
      );
    });

    return result;
  };

  const getTableHeader = () => {
    if (blocks.length === 0) return [];

    return [
      <TableRow key="header">
        <TableCell sx={{ fontWeight: 600 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {Locale.label("common.name")}
          </Typography>
        </TableCell>
        <TableCell sx={{ fontWeight: 600 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {Locale.label("site.blocksPage.type")}
          </Typography>
        </TableCell>
        <TableCell sx={{ fontWeight: 600 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {Locale.label("site.blocksPage.actions")}
          </Typography>
        </TableCell>
      </TableRow>
    ];
  };

  const getTable = () => {
    if (loading) return <Loading />;

    return (
      <Table sx={{ minWidth: 650 }}>
        <TableHead>
          {getTableHeader()}
        </TableHead>
        <TableBody>{getRows()}</TableBody>
      </Table>
    );
  };

  if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) return <PermissionDenied permissions={[Permissions.contentApi.content.edit]} />;

  if (loading) {
    return (
      <>
        <PageHeader
          icon={<BlockIcon />}
          title={Locale.label("site.blocksPage.reusableBlocks")}
          subtitle={Locale.label("site.blocksPage.subtitle")}
        />
        <Box sx={{ p: 3 }}>
          <Loading />
        </Box>
      </>
    );
  }

  return (
    <>
      <PageHeader icon={<BlockIcon />} title={Locale.label("site.blocksPage.reusableBlocks")} subtitle={Locale.label("site.blocksPage.subtitle")} statistics={[{ icon: <BlockIcon />, value: stats.totalBlocks.toString(), label: Locale.label("site.blocksPage.totalBlocks") }]}>
        <SiteSwitcher siteId={siteId} onChange={setSiteId} sites={sites} onManage={() => setShowSites(true)} />
        <HeaderPrimaryButton startIcon={<AddIcon />} onClick={() => setEditBlock({ blockType: "elementBlock", siteId })} data-testid="add-block-button">{Locale.label("site.blocksPage.addBlock")}</HeaderPrimaryButton>
      </PageHeader>
      {showSites && (
        <SitesDialog open={showSites} onClose={() => setShowSites(false)} sites={sites} siteId={siteId} onChanged={reloadSites} onSelectSite={setSiteId} />
      )}

      <Box sx={{ p: 3 }}>
        {editBlock && (
          <Box sx={{ mb: 3 }}>
            <BlockEdit block={editBlock} updatedCallback={() => { setEditBlock(null); loadData(); }} />
          </Box>
        )}

        <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "var(--border-light)" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1} alignItems="center">
                <BlockIcon sx={{ color: "primary.main", fontSize: 20 }} />
                <Typography variant="h6">{Locale.label("site.blocksPage.blocks")}</Typography>
                {stats.totalBlocks > 0 && <CountChip count={stats.totalBlocks} />}
              </Stack>
            </Stack>
          </Box>
          <Box>{getTable()}</Box>
        </Card>
      </Box>
    </>
  );
};
