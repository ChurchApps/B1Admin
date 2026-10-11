import { useState } from "react";
import type { JSX } from "react";
import { Loading, Permissions, Locale } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import type { BlockInterface } from "../helpers";
import { TableRow, TableCell, Table, TableBody, TableHead, Box, Stack, Typography } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { Link } from "react-router-dom";
import { BlockEdit, SiteSwitcher, SitesDialog, useSiteSelection } from "./components";
import { HeaderPrimaryButton, PageContainer, PageHeader, ResultsBar, Surface, TextAction, VerbRow, tableScrollSx } from "../components/ui";
import { useRequirePermission } from "../hooks";

export const BlocksPage = () => {
  const [editBlock, setEditBlock] = useState<BlockInterface | null>(null);
  const [showSites, setShowSites] = useState(false);
  const { siteId, setSiteId, sites, reloadSites } = useSiteSelection();
  const denied = useRequirePermission(Permissions.contentApi.content.edit);

  const blocksQuery = useQuery<BlockInterface[]>({
    queryKey: ["/blocks" + (siteId ? "?siteId=" + siteId : ""), "ContentApi"],
    placeholderData: [],
    select: (data) => (data || []).filter((block: BlockInterface) => block.blockType !== "footerBlock")
  });
  const blocks = blocksQuery.data || [];
  const loading = blocksQuery.isLoading;

  const openBlock = (block: BlockInterface) => {
    setEditBlock(block);
    setTimeout(() => document.getElementById("edit-block-bar")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const getRows = () => {
    const result: JSX.Element[] = [];
    blocks.forEach((block) => {
      result.push(
        <TableRow key={block.id}>
          <TableCell>
            <Typography component={Link} to={`/site/blocks/${block.id}`} variant="body2" sx={{ color: "primary.main", fontWeight: 600, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
              {block.name}
            </Typography>
          </TableCell>
          <TableCell>
            <Typography variant="body2" color="text.secondary">
              {block.blockType === "elementBlock" ? Locale.label("site.blocksPage.elements") : Locale.label("site.blocksPage.sections")}
            </Typography>
          </TableCell>
          <TableCell align="right">
            <VerbRow sx={{ justifyContent: "flex-end" }}>
              <TextAction small to={`/site/blocks/${block.id}`} component={Link} aria-label={Locale.label("common.edit")}>{Locale.label("common.edit")}</TextAction>
              <TextAction small onClick={() => openBlock(block)} data-testid={`rename-block-${block.id}-button`}>{Locale.label("site.blocksPage.rename")}</TextAction>
            </VerbRow>
          </TableCell>
        </TableRow>
      );
    });
    return result;
  };

  const getTable = () => {
    if (loading) return <Loading />;
    if (blocks.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">{Locale.label("site.blocksPage.noBlocksFound")} {Locale.label("site.blocksPage.getStarted")}</Typography>
      );
    }
    return (
      <Box sx={tableScrollSx} role="region" aria-label={Locale.label("site.blocksPage.blocks")} tabIndex={0}>
        <Table sx={{ minWidth: 560 }}>
          <TableHead>
            <TableRow>
              <TableCell>{Locale.label("common.name")}</TableCell>
              <TableCell>{Locale.label("site.blocksPage.type")}</TableCell>
              <TableCell align="right">{Locale.label("site.blocksPage.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>{getRows()}</TableBody>
        </Table>
      </Box>
    );
  };

  if (denied) return denied;

  return (
    <>
      <PageHeader title={Locale.label("site.blocksPage.reusableBlocks")} subtitle={Locale.label("site.blocksPage.subtitle")}>
        <SiteSwitcher siteId={siteId} onChange={setSiteId} sites={sites} onManage={() => setShowSites(true)} />
        <HeaderPrimaryButton startIcon={<AddIcon />} onClick={() => openBlock({ blockType: "elementBlock", siteId })} data-testid="add-block-button">{Locale.label("site.blocksPage.addBlock")}</HeaderPrimaryButton>
      </PageHeader>
      {showSites && (
        <SitesDialog open={showSites} onClose={() => setShowSites(false)} sites={sites} siteId={siteId} onChanged={reloadSites} onSelectSite={setSiteId} />
      )}

      <PageContainer>
        <Surface>
          <Stack spacing={3}>
            {!loading && blocks.length > 0 && (
              <ResultsBar>
                <Typography variant="body2" color="text.secondary">{Locale.label("site.blocksPage.blockCount", "{count} blocks").replace("{count}", blocks.length.toString())}</Typography>
              </ResultsBar>
            )}
            {getTable()}
          </Stack>
          {editBlock && (
            <Box id="edit-block-bar" sx={{ borderTop: 1, borderColor: "divider", pt: 3, mt: 3 }}>
              <BlockEdit block={editBlock} updatedCallback={() => { setEditBlock(null); blocksQuery.refetch(); }} />
            </Box>
          )}
        </Surface>
      </PageContainer>
    </>
  );
};
