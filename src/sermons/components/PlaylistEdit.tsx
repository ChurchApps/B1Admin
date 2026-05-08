import React from "react";
import {
  TextField,
  Grid,
  Typography,
  Box,
  Stack,
  Divider,
  Button,
  Card,
  CardContent
} from "@mui/material";
import {
  PhotoCamera as PhotoCameraIcon,
  CalendarMonth as CalendarIcon,
  Title as TitleIcon,
  Description as DescriptionIcon
} from "@mui/icons-material";
import { InputBox, Locale } from "@churchapps/apphelper";
import { ApiHelper } from "@churchapps/apphelper";
import { DateHelper } from "@churchapps/apphelper";
import { UniqueIdHelper } from "@churchapps/apphelper";
import { UserHelper } from "@churchapps/apphelper";
import { Permissions } from "@churchapps/helpers";
import type { PlaylistInterface } from "@churchapps/helpers";
import { useForm, Controller } from "react-hook-form";

interface Props {
  currentPlaylist: PlaylistInterface,
  updatedFunction?: () => void,
  showPhotoEditor: (photoType: string, url: string) => void,
  updatedPhoto: string
}

type AnyRecord = Record<string, any>;

export const PlaylistEdit: React.FC<Props> = (props) => {
  const thumbnailRef = React.useRef<string>(null);
  const [thumbnailDisplay, setThumbnailDisplay] = React.useState<string>(null);

  const { control, register, handleSubmit, reset, watch } = useForm<AnyRecord>({ defaultValues: { title: "", description: "", publishDate: "" } });
  const watchedId = watch("id");

  React.useEffect(() => {
    if (props.currentPlaylist) {
      thumbnailRef.current = props.currentPlaylist.thumbnail ?? null;
      setThumbnailDisplay(props.currentPlaylist.thumbnail ?? null);
      reset({
        ...props.currentPlaylist,
        publishDate: props.currentPlaylist.publishDate ? DateHelper.formatHtml5Date(DateHelper.toDate(props.currentPlaylist.publishDate)) : ""
      });
    }
  }, [props.currentPlaylist, reset]);

  React.useEffect(() => {
    if (props.updatedPhoto !== null && props.updatedPhoto !== thumbnailRef.current) {
      thumbnailRef.current = props.updatedPhoto;
      setThumbnailDisplay(props.updatedPhoto);
      props.showPhotoEditor("", null);
    }
  }, [props.updatedPhoto]);

  const checkDelete = () => { if (!UniqueIdHelper.isMissing(watchedId)) return handleDelete; else return null; };
  const handleCancel = () => { props.updatedFunction(); };

  const handleDelete = () => {
    const errs: string[] = [];
    if (!UserHelper.checkAccess(Permissions.contentApi.streamingServices.edit)) errs.push(Locale.label("sermons.playlists.playlistEdit.unauthorizedDelete"));
    if (errs.length > 0) return;

    if (window.confirm(Locale.label("sermons.playlists.playlistEdit.deleteConfirm"))) {
      ApiHelper.delete("/playlists/" + watchedId, "ContentApi").then(() => { props.updatedFunction(); });
    }
  };

  const onValid = (values: AnyRecord) => {
    const errs: string[] = [];
    if (!UserHelper.checkAccess(Permissions.contentApi.streamingServices.edit)) errs.push(Locale.label("sermons.playlists.playlistEdit.unauthorized"));
    if (errs.length > 0) return;

    const p: PlaylistInterface = { ...props.currentPlaylist, ...values, thumbnail: thumbnailRef.current };
    p.publishDate = values.publishDate ? DateHelper.toDate(values.publishDate) : null;
    ApiHelper.post("/playlists", [p], "ContentApi").then(props.updatedFunction);
  };

  return (
    <>
      <InputBox
        headerIcon="calendar_month"
        headerText={UniqueIdHelper.isMissing(watchedId) ? Locale.label("sermons.playlists.playlistEdit.createNew") : Locale.label("sermons.playlists.playlistEdit.editPlaylist")}
        saveFunction={handleSubmit(onValid)}
        cancelFunction={handleCancel}
        deleteFunction={checkDelete()}
        help="docs/b1-admin/sermons/playlists"
        data-testid="edit-playlist-inputbox"
      >
        <Grid container spacing={3}>
          {/* Basic Information Section */}
          <Grid size={12}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <TitleIcon sx={{ color: "primary.main", fontSize: 20 }} />
              <Typography variant="h6" sx={{ color: "primary.main" }}>
                {Locale.label("sermons.playlists.playlistEdit.basicInformation")}
              </Typography>
            </Stack>

            <Grid container spacing={2}>
              <Grid size={12}>
                <TextField fullWidth label={Locale.label("sermons.playlists.playlistEdit.playlistTitle")} data-testid="playlist-title-input" variant="outlined" placeholder={Locale.label("sermons.playlists.playlistEdit.enterTitle")} sx={{ mb: 2 }} {...register("title")} />
              </Grid>

              <Grid size={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label={Locale.label("sermons.playlists.playlistEdit.description")}
                  data-testid="playlist-description-input"
                  variant="outlined"
                  placeholder={Locale.label("sermons.playlists.playlistEdit.describePlaylist")}
                  InputProps={{
                    startAdornment: (
                      <DescriptionIcon sx={{ color: "text.secondary", mr: 1, mt: 1 }} />
                    )
                  }}
                  {...register("description")}
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Publishing & Schedule Section */}
          <Grid size={12}>
            <Divider sx={{ my: 2 }} />

            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <CalendarIcon sx={{ color: "primary.main", fontSize: 20 }} />
              <Typography variant="h6" sx={{ color: "primary.main" }}>
                {Locale.label("sermons.playlists.playlistEdit.publishingSchedule")}
              </Typography>
            </Stack>

            <Controller name="publishDate" control={control} render={({ field }) => (
              <TextField fullWidth type="date" label={Locale.label("sermons.playlists.playlistEdit.publishDate")} data-testid="playlist-publish-date-input" variant="outlined" InputLabelProps={{ shrink: true }} helperText={Locale.label("sermons.playlists.playlistEdit.publishHelp")} value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} inputRef={field.ref} name="publishDate" />
            )} />
          </Grid>

          {/* Thumbnail Section */}
          <Grid size={12}>
            <Divider sx={{ my: 2 }} />

            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <PhotoCameraIcon sx={{ color: "primary.main", fontSize: 20 }} />
              <Typography variant="h6" sx={{ color: "primary.main" }}>
                {Locale.label("sermons.playlists.playlistEdit.thumbnailImage")}
              </Typography>
            </Stack>

            <Card
              sx={{
                borderRadius: 2,
                border: "1px solid",
                borderColor: "grey.200",
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  borderColor: "primary.main",
                  boxShadow: 2
                }
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Stack spacing={2}>
                  <Box
                    sx={{
                      position: "relative",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      minHeight: 200,
                      backgroundColor: "grey.50",
                      borderRadius: 1,
                      border: "2px dashed",
                      borderColor: "grey.300",
                      overflow: "hidden"
                    }}
                  >
                    <img
                      src={thumbnailDisplay || "/images/no-image.png"}
                      alt={Locale.label("sermons.playlists.playlistEdit.thumbnailAlt")}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "200px",
                        objectFit: "contain",
                        borderRadius: "4px"
                      }}
                    />
                  </Box>

                  <Button
                    variant="outlined"
                    startIcon={<PhotoCameraIcon />}
                    onClick={(e) => {
                      e.preventDefault();
                      props.showPhotoEditor("playlist", thumbnailDisplay || "");
                    }}
                    sx={{
                      textTransform: "none",
                      borderColor: "primary.main",
                      color: "primary.main",
                      "&:hover": {
                        backgroundColor: "primary.main",
                        color: "white"
                      }
                    }}
                  >
                    {thumbnailDisplay ? Locale.label("sermons.playlists.playlistEdit.changeThumbnail") : Locale.label("sermons.playlists.playlistEdit.addThumbnail")}
                  </Button>

                  <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
                    {Locale.label("sermons.playlists.playlistEdit.recommendedSize")}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </InputBox>
    </>
  );
};
