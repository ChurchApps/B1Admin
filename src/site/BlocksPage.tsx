import { useEffect, useState, useCallback } from "react";
import type { JSX } from "react";
import { ApiHelper, Loading, PageHeader, UserHelper, Permissions, Locale } from "@churchapps/apphelper";
import type { BlockInterface } from "../helpers";
import {
  TableRow, TableCell, Table, TableBody, TableHead, Box, Typography, Stack, Button, Card, Icon
} from "@mui/material";
import { SmartButton as BlockIcon, Add as AddIcon, Edit as EditIcon } from "@mui/icons-material";
import { Navigate, Link } from "react-router-dom";
import { BlockEdit } from "./components";

export const BlocksPage = () => {
  const [blocks, setBlocks] = useState<BlockInterface[]>([]);
  const [editBlock, setEditBlock] = useState<BlockInterface>(null);
  const [loading, setLoading] = useState(true);
  const [redirectUrl, setRedirectUrl] = useState<string>("");

  const checkAccess = useCallback(() => {
    if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) setRedirectUrl("/");
  }, []);

  useEffect(checkAccess, [checkAccess]);

  const loadData = () => {
    setLoading(true);
    ApiHelper.get("/blocks", "ContentApi").then((blocksData: any[]) => {
      const filtered = blocksData.filter((block: BlockInterface) => block.blockType !== "footerBlock");
      setBlocks(filtered || []);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

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
          <TableCell colSpan={3} sx={{ textAlign: "center", py: 6 }}>
            <Stack spacing={2} alignItems="center">
              <BlockIcon sx={{ fontSize: 48, color: "text.secondary" }} />
              <Typography variant="h6" color="text.secondary">
                {Locale.label("site.blocksPage.noBlocksFound")}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {Locale.label("site.blocksPage.getStarted")}
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditBlock({ blockType: "elementBlock" })} sx={{ mt: 2 }}>{Locale.label("site.blocksPage.createFirstBlock")}</Button>
            </Stack>
          </TableCell>
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
                  color: "var(--primary-main, #1976d2)",
                  fontWeight: 500
                }}
              >
                {block.name}
              </Link>
            </Stack>
          </TableCell>
          <TableCell>
            <Stack direction="row" spacing={1} alignItems="center">
              <Icon sx={{ color: "text.secondary", fontSize: 16 }}>
                {block.blockType === "elementBlock" ? "widgets" : "view_module"}
              </Icon>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {block.blockType === "elementBlock" ? Locale.label("site.blocksPage.elements") : Locale.label("site.blocksPage.sections")}
              </Typography>
            </Stack>
          </TableCell>
          <TableCell align="right">
            <Button size="small" variant="outlined" component={Link} to={`/site/blocks/${block.id}`} startIcon={<EditIcon />} data-testid={`edit-block-${block.id}-button`} sx={{ textTransform: "none", minWidth: "auto" }}>{Locale.label("common.edit")}</Button>
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
        <TableHead sx={{ backgroundColor: "var(--bg-card)", "& .MuiTableCell-root": { borderBottom: "2px solid", borderBottomColor: "divider" } }}>
          {getTableHeader()}
        </TableHead>
        <TableBody>{getRows()}</TableBody>
      </Table>
    );
  };

  if (redirectUrl !== "") return <Navigate to={redirectUrl}></Navigate>;

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
        <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setEditBlock({ blockType: "elementBlock" })} data-testid="add-block-button" sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.5)", "&:hover": { borderColor: "#FFF", backgroundColor: "rgba(255,255,255,0.1)" } }}>{Locale.label("site.blocksPage.addBlock")}</Button>
      </PageHeader>

      {/* Main Content */}
      <Box sx={{ p: 3 }}>
        {/* Edit Block Modal/Form */}
        {editBlock && (
          <Box sx={{ mb: 3 }}>
            <BlockEdit block={editBlock} updatedCallback={() => { setEditBlock(null); loadData(); }} />
          </Box>
        )}

        {/* Main Table Card */}
        <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "var(--border-light)" }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1} alignItems="center">
                <BlockIcon />
                <Typography variant="h6">{Locale.label("site.blocksPage.blocks")}</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {stats.totalBlocks} {stats.totalBlocks === 1 ? Locale.label("site.blocksPage.block") : Locale.label("site.blocksPage.blocks")}
              </Typography>
            </Stack>
          </Box>
          <Box>{getTable()}</Box>
        </Card>
      </Box>
    </>
  );
};
