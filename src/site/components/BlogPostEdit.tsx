import { useEffect, useState } from "react";
import { Alert, Box, Button, Dialog, FormControlLabel, Grid, Icon, Stack, Switch, TextField, Typography } from "@mui/material";
import { ApiHelper, UserHelper, Locale } from "@churchapps/apphelper";
import { MarkdownEditor } from "@churchapps/apphelper/markdown";
import { Permissions } from "@churchapps/helpers";
import { FormCard } from "../../components/ui";
import { GalleryModal } from "../../components/gallery";
import type { PostInterface } from "../../helpers/Interfaces";

type Props = {
  post: PostInterface;
  updatedCallback: () => void;
  onDone: () => void;
};

const kebab = (value: string): string => (value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export function BlogPostEdit(props: Props) {
  const [post, setPost] = useState<PostInterface>({ ...props.post });
  const [slugTouched, setSlugTouched] = useState<boolean>(!!props.post.id);
  const [published, setPublished] = useState<boolean>(!!props.post.publishDate);
  const [showGallery, setShowGallery] = useState<boolean>(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    setPost({ ...props.post });
    setSlugTouched(!!props.post.id);
    setPublished(!!props.post.publishDate);
  }, [props.post]);

  const handleTitleChange = (value: string) => {
    setPost((p) => ({ ...p, title: value, slug: slugTouched ? p.slug : kebab(value) }));
  };

  const dateInputValue = (): string => {
    if (!published) return "";
    const d = post.publishDate ? new Date(post.publishDate) : new Date();
    if (isNaN(d.getTime())) return "";
    return d.toISOString().substring(0, 10);
  };

  const validate = (): string[] => {
    const e: string[] = [];
    if (!post.title || !post.title.trim()) e.push(Locale.label("site.blogEdit.errTitle"));
    if (!post.slug || !post.slug.trim()) e.push(Locale.label("site.blogEdit.errSlug"));
    if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) e.push(Locale.label("site.addPageModal.unauthorizedCreate"));
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    setErrors(e);
    if (e.length > 0) return;
    setIsSubmitting(true);
    try {
      const slug = kebab(post.slug || "");
      const toSave: PostInterface = {
        ...post,
        slug,
        publishDate: published ? (post.publishDate || new Date()) : null
      };
      await ApiHelper.post("/posts", [toSave], "ContentApi");
      props.updatedCallback();
    } catch (err: any) {
      setErrors([err?.message || Locale.label("site.blogEdit.errSave")]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onClose={props.onDone} className="dialogForm" maxWidth="md" fullWidth>
      <FormCard id="blogPostEdit" title={props.post.id ? Locale.label("site.blogEdit.editPost") : Locale.label("site.blogEdit.newPost")} icon="rss_feed" onSave={handleSave} onCancel={props.onDone} isSubmitting={isSubmitting} elevation={0} data-testid="blog-post-edit">
        {errors.length > 0 && <Alert severity="error" sx={{ mb: 2 }}>{errors.map((m) => <div key={m}>{m}</div>)}</Alert>}
        <Grid container spacing={2} style={{ minWidth: 500 }}>
          <Grid size={{ xs: 12 }}>
            <TextField size="small" fullWidth label={Locale.label("site.blogEdit.title")} value={post.title || ""} onChange={(ev) => handleTitleChange(ev.target.value)} data-testid="blog-title-input" />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField size="small" fullWidth label={Locale.label("site.blogEdit.slugLabel")} value={post.slug || ""} onChange={(ev) => { setSlugTouched(true); setPost((p) => ({ ...p, slug: ev.target.value })); }} onBlur={() => setPost((p) => ({ ...p, slug: kebab(p.slug || "") }))} helperText={Locale.label("site.blogEdit.slugHelper") + " /blog/" + (kebab(post.slug || "") || "…")} data-testid="blog-slug-input" />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField size="small" fullWidth multiline minRows={2} label={Locale.label("site.blogEdit.excerpt")} value={post.excerpt || ""} onChange={(ev) => setPost((p) => ({ ...p, excerpt: ev.target.value }))} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" sx={{ mb: 0.5 }}>{Locale.label("site.blogEdit.content")}</Typography>
            <MarkdownEditor value={post.content || ""} onChange={(val) => setPost((p) => ({ ...p, content: val }))} style={{ maxHeight: 300, overflowY: "scroll" }} />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField size="small" fullWidth label={Locale.label("site.blogEdit.category")} value={post.category || ""} onChange={(ev) => setPost((p) => ({ ...p, category: ev.target.value }))} />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField size="small" fullWidth label={Locale.label("site.blogEdit.tags")} value={post.tags || ""} onChange={(ev) => setPost((p) => ({ ...p, tags: ev.target.value }))} helperText={Locale.label("site.blogEdit.tagsHelper")} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" sx={{ mb: 0.5 }}>{Locale.label("site.blogEdit.image")}</Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              {post.photoUrl && <Box component="img" src={post.photoUrl} alt="" sx={{ height: 48, borderRadius: 1 }} />}
              <Button size="small" variant="outlined" startIcon={<Icon>image</Icon>} onClick={() => setShowGallery(true)}>{Locale.label("site.blogEdit.selectImage")}</Button>
              {post.photoUrl && <Button size="small" color="error" onClick={() => setPost((p) => ({ ...p, photoUrl: "" }))}>{Locale.label("common.remove")}</Button>}
            </Stack>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <FormControlLabel control={<Switch checked={published} onChange={(ev) => setPublished(ev.target.checked)} data-testid="blog-published-switch" />} label={published ? Locale.label("site.blogEdit.published") : Locale.label("site.blogEdit.draft")} />
              {published && (
                <TextField size="small" type="date" label={Locale.label("site.blogEdit.publishDate")} value={dateInputValue()} onChange={(ev) => setPost((p) => ({ ...p, publishDate: ev.target.value ? new Date(ev.target.value) : new Date() }))} InputLabelProps={{ shrink: true }} />
              )}
            </Stack>
          </Grid>
        </Grid>
      </FormCard>
      {showGallery && <GalleryModal aspectRatio={0} onClose={() => setShowGallery(false)} onSelect={(img) => { setPost((p) => ({ ...p, photoUrl: img })); setShowGallery(false); }} />}
    </Dialog>
  );
}
