import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Box, Link as MuiLink, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { ApiHelper, Locale, Permissions, UserHelper } from "@churchapps/apphelper";
import { BlogPostEdit } from "./components";
import { clearSiteCache } from "./siteCache";
import { AddBar, PageContainer, PageHeader, StatusBadge, Surface, TextAction, VerbRow, tableScrollSx } from "../components/ui";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { formatDateSafe } from "../helpers/DateFormatHelper";
import { EnvironmentHelper } from "../helpers/EnvironmentHelper";
import { useRequirePermission } from "../hooks";
import type { PostInterface } from "../helpers/Interfaces";

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
      <PageHeader title={Locale.label("site.blog.title")} subtitle={Locale.label("site.blog.subtitle")} />
      <PageContainer>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {Locale.label("site.blog.navHint")} <MuiLink component={Link} to="/site/pages">{Locale.label("helpers.secondaryMenuHelper.pages")}</MuiLink>
        </Typography>
        <Surface disablePadding>
          {posts.length === 0 ? (
            <Box sx={{ p: 3 }}>
              <Typography variant="body2" color="text.secondary">{Locale.label("site.blog.noPosts")}</Typography>
            </Box>
          ) : (
            <Box sx={tableScrollSx} role="region" aria-label={Locale.label("site.blog.title")} tabIndex={0}>
              <Table sx={{ minWidth: 640 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>{Locale.label("common.title")}</TableCell>
                    <TableCell>{Locale.label("site.blog.state")}</TableCell>
                    <TableCell>{Locale.label("site.blog.date")}</TableCell>
                    <TableCell>{Locale.label("site.blogEdit.category")}</TableCell>
                    <TableCell align="right">{Locale.label("site.pagesPage.actions")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{post.title}</Typography></TableCell>
                      <TableCell>
                        <StatusBadge tone={{ draft: "neutral", scheduled: "warning", published: "success" }[postState(post)] as "neutral" | "warning" | "success"}>{Locale.label("site.blog." + postState(post))}</StatusBadge>
                      </TableCell>
                      <TableCell><Typography variant="body2">{formatDateSafe(post.publishDate)}</Typography></TableCell>
                      <TableCell><Typography variant="body2">{post.category}</Typography></TableCell>
                      <TableCell align="right">
                        <VerbRow sx={{ justifyContent: "flex-end", flexWrap: "nowrap" }}>
                          <TextAction small onClick={() => setEditPost(post)} data-testid="edit-post-button">{Locale.label("common.edit")}</TextAction>
                          {postState(post) === "published" && (
                            <MuiLink href={EnvironmentHelper.B1Url.replace("{subdomain}", UserHelper.currentUserChurch?.church?.subDomain || "") + "/blog/" + post.slug} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ typography: "body2", fontWeight: 600 }} data-testid="view-post-button">{Locale.label("site.blog.view")}</MuiLink>
                          )}
                          <TextAction small onClick={() => setDeletePost(post)} data-testid="delete-post-button">{Locale.label("common.delete")}</TextAction>
                        </VerbRow>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Surface>
        <AddBar>
          <TextAction onClick={() => setEditPost({})} data-testid="add-post-button">{Locale.label("site.blog.addPost")}</TextAction>
        </AddBar>
      </PageContainer>
    </>
  );
};
