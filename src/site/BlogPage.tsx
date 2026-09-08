import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Box, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { Delete as DeleteIcon, Edit as EditIcon, OpenInNew as OpenInNewIcon } from "@mui/icons-material";
import { ApiHelper, Locale, Permissions, UserHelper } from "@churchapps/apphelper";
import { BlogPostEdit } from "./components";
import { clearSiteCache } from "./siteCache";
import { AppIconButton } from "../components/ui/AppIconButton";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { formatDateSafe } from "../helpers/DateFormatHelper";
import { EnvironmentHelper } from "../helpers/EnvironmentHelper";
import { useRequirePermission } from "../hooks";
import type { PostInterface } from "../helpers/Interfaces";
import { Plate, h1Sx, ledeSx, verbSx, addBarSx } from "./plated";

const postState = (p: PostInterface): "draft" | "scheduled" | "published" => {
  if (!p.publishDate) return "draft";
  return new Date(p.publishDate) > new Date() ? "scheduled" : "published";
};

export const BlogPage = () => {
  const [posts, setPosts] = useState<PostInterface[]>([]);
  const [editPost, setEditPost] = useState<PostInterface | null>(null);
  const [deletePost, setDeletePost] = useState<PostInterface | null>(null);

  const loadData = () => {
    ApiHelper.get("/posts", "ContentApi").then((data: PostInterface[]) => setPosts(data || []));
  };

  useEffect(loadData, []);

  const handleDelete = () => {
    const p = deletePost;
    if (!p?.id) return;
    ApiHelper.delete("/posts/" + p.id, "ContentApi").then(() => { setDeletePost(null); clearSiteCache(); loadData(); });
  };

  const denied = useRequirePermission(Permissions.contentApi.content.edit);
  if (denied) return denied;

  return (
    <>
      {editPost && <BlogPostEdit post={editPost} categories={[...new Set(posts.map((p) => p.category).filter(Boolean))].sort() as string[]} existingSlugs={posts.filter((p) => p.id !== editPost.id).map((p) => p.slug || "")} updatedCallback={() => { setEditPost(null); clearSiteCache(); loadData(); }} onDone={() => setEditPost(null)} />}
      <ConfirmDialog
        open={!!deletePost}
        title={Locale.label("site.blog.deleteTitle")}
        message={Locale.label("site.blog.confirmDelete")}
        confirmLabel={Locale.label("common.delete")}
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeletePost(null)}
      />
      <Plate directory>
        <Box component="h1" sx={h1Sx}>{Locale.label("site.blog.title")}</Box>
        <Box sx={ledeSx}>{Locale.label("site.blog.subtitle")}</Box>
        <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
          {Locale.label("site.blog.navHint")} <Link to="/site/pages">{Locale.label("helpers.secondaryMenuHelper.pages")}</Link>
        </Typography>
        {posts.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>{Locale.label("site.blog.noPosts")}</Typography>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 120 }}>{Locale.label("site.pagesPage.actions")}</TableCell>
                <TableCell>{Locale.label("common.title")}</TableCell>
                <TableCell>{Locale.label("site.blog.state")}</TableCell>
                <TableCell>{Locale.label("site.blog.date")}</TableCell>
                <TableCell>{Locale.label("site.blogEdit.category")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {posts.map((post) => (
                <TableRow key={post.id} sx={{ "&:hover": { backgroundColor: "action.hover" } }}>
                  <TableCell className="rowActions">
                    <Stack direction="row">
                      <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon />} onClick={() => setEditPost(post)} data-testid="edit-post-button" />
                      <AppIconButton label={Locale.label("common.delete")} icon={<DeleteIcon />} intent="remove" onClick={() => setDeletePost(post)} data-testid="delete-post-button" />
                      {postState(post) === "published" && (
                        <AppIconButton label={Locale.label("site.blog.view")} icon={<OpenInNewIcon />} onClick={() => window.open(EnvironmentHelper.B1Url.replace("{subdomain}", UserHelper.currentUserChurch?.church?.subDomain || "") + "/blog/" + post.slug, "_blank")} data-testid="view-post-button" />
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell><Typography variant="body2">{post.title}</Typography></TableCell>
                  <TableCell>
                    <Chip size="small" label={Locale.label("site.blog." + postState(post))} color={{ draft: "default", scheduled: "warning", published: "success" }[postState(post)] as any} sx={{ fontSize: "0.7rem", height: 20 }} />
                  </TableCell>
                  <TableCell><Typography variant="body2">{formatDateSafe(post.publishDate)}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{post.category}</Typography></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Box sx={addBarSx}>
          <Box component="button" type="button" onClick={() => setEditPost({})} data-testid="add-post-button" sx={verbSx}>
            {Locale.label("site.blog.addPost")}
          </Box>
        </Box>
      </Plate>
    </>
  );
};
