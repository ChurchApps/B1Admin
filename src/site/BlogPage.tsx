import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Box, Button, Card, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { Add as AddIcon, Article as ArticleIcon, Delete as DeleteIcon, Edit as EditIcon, OpenInNew as OpenInNewIcon, RssFeed as RssFeedIcon } from "@mui/icons-material";
import { ApiHelper, PageHeader, Locale, Permissions, UserHelper } from "@churchapps/apphelper";
import { BlogPostEdit } from "./components";
import { clearSiteCache } from "./siteCache";
import { AppIconButton } from "../components/ui/AppIconButton";
import { HeaderPrimaryButton } from "../components/ui";
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
      <PageHeader icon={<ArticleIcon />} title={Locale.label("site.blog.title")} subtitle={Locale.label("site.blog.subtitle")} statistics={[{ icon: <RssFeedIcon />, value: posts.length.toString(), label: Locale.label("site.blog.posts") }]}>
        <HeaderPrimaryButton startIcon={<AddIcon />} onClick={() => setEditPost({})} data-testid="add-post-button">
          {Locale.label("site.blog.addPost")}
        </HeaderPrimaryButton>
      </PageHeader>
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          {Locale.label("site.blog.navHint")} <Link to="/site/pages">{Locale.label("helpers.secondaryMenuHelper.pages")}</Link>
        </Alert>
        <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "grey.200" }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "var(--border-light)" }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <RssFeedIcon sx={{ color: "primary.main", fontSize: 20 }} />
              <Typography variant="h6">{Locale.label("site.blog.title")}</Typography>
            </Stack>
          </Box>
          <Box sx={{ p: 2 }}>
            {posts.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 8 }}>
                <ArticleIcon sx={{ fontSize: 64, color: "grey.400", mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>{Locale.label("site.blog.noPosts")}</Typography>
                <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setEditPost({})}>{Locale.label("site.blog.addPost")}</Button>
              </Box>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 120 }}><Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{Locale.label("site.pagesPage.actions")}</Typography></TableCell>
                    <TableCell><Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{Locale.label("common.title")}</Typography></TableCell>
                    <TableCell><Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{Locale.label("site.blog.state")}</Typography></TableCell>
                    <TableCell><Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{Locale.label("site.blog.date")}</Typography></TableCell>
                    <TableCell><Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{Locale.label("site.blogEdit.category")}</Typography></TableCell>
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
          </Box>
        </Card>
      </Box>
    </>
  );
};
