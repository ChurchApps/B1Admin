import { useState } from "react";
import type { JSX } from "react";
import { Loading, Permissions, Locale } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import type { BlockInterface } from "../helpers";
import { TableRow, TableCell, Table, TableBody, TableHead, Box, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { BlockEdit, SiteSwitcher, SitesDialog, useSiteSelection } from "./components";
import { hoverRowSx } from "../components/ui";
import { useRequirePermission } from "../hooks";
import { Plate, h1Sx, ledeSx, verbSx, addBarSx } from "./plated";

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

  const getRows = () => {
    const result: JSX.Element[] = [];

    if (blocks.length === 0) {
      result.push(
        <TableRow key="empty">
          <TableCell colSpan={3}>
            <Typography variant="body2" color="text.secondary">{Locale.label("site.blocksPage.noBlocksFound")}</Typography>
          </TableCell>
        </TableRow>
      );
      return result;
    }

    blocks.forEach((block) => {
      result.push(
        <TableRow key={block.id} sx={hoverRowSx}>
          <TableCell>
            <Link to={`/site/blocks/${block.id}`} style={{ textDecoration: "none", color: "var(--link)", fontWeight: 500 }}>
              {block.name}
            </Link>
          </TableCell>
          <TableCell>
            <Typography variant="body2">
              {block.blockType === "elementBlock" ? Locale.label("site.blocksPage.elements") : Locale.label("site.blocksPage.sections")}
            </Typography>
          </TableCell>
          <TableCell align="right" className="rowActions">
            <Box sx={{ display: "flex", gap: 1.75, justifyContent: "flex-end" }}>
              <Box component={Link} to={`/site/blocks/${block.id}`} sx={verbSx}>{Locale.label("common.edit")}</Box>
              <Box component="button" type="button" onClick={() => setEditBlock(block)} data-testid={`rename-block-${block.id}-button`} sx={verbSx}>{Locale.label("site.blocksPage.rename")}</Box>
            </Box>
          </TableCell>
        </TableRow>
      );
    });

    return result;
  };

  if (denied) return denied;

  return (
    <Plate directory>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2, flexWrap: "wrap" }}>
        <Box>
          <Box component="h1" sx={h1Sx}>{Locale.label("site.blocksPage.reusableBlocks")}</Box>
          <Box sx={ledeSx}>{Locale.label("site.blocksPage.subtitle")}</Box>
        </Box>
        <SiteSwitcher siteId={siteId} onChange={setSiteId} sites={sites} onManage={() => setShowSites(true)} />
      </Box>
      {showSites && (
        <SitesDialog open={showSites} onClose={() => setShowSites(false)} sites={sites} siteId={siteId} onChanged={reloadSites} onSelectSite={setSiteId} />
      )}
      {editBlock && (
        <Box sx={{ mb: 3 }}>
          <BlockEdit block={editBlock} updatedCallback={() => { setEditBlock(null); blocksQuery.refetch(); }} />
        </Box>
      )}
      {loading ? <Loading /> : (
        <Table>
          {blocks.length > 0 && (
            <TableHead>
              <TableRow>
                <TableCell>{Locale.label("common.name")}</TableCell>
                <TableCell>{Locale.label("site.blocksPage.type")}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
          )}
          <TableBody>{getRows()}</TableBody>
        </Table>
      )}
      <Box sx={addBarSx}>
        <Box component="button" type="button" onClick={() => setEditBlock({ blockType: "elementBlock", siteId })} data-testid="add-block-button" sx={verbSx}>
          {Locale.label("site.blocksPage.addBlock")}
        </Box>
      </Box>
    </Plate>
  );
};
