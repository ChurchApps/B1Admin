import React from "react";
import { useForm, Controller } from "react-hook-form";
import { Grid, InputLabel, MenuItem, Select, TextField, FormControl, Button, Box } from "@mui/material";
import { Loading, Locale } from "@churchapps/apphelper";
import { ErrorMessages } from "@churchapps/apphelper";
import { ApiHelper } from "@churchapps/apphelper";
import { UniqueIdHelper } from "@churchapps/apphelper";
import { DateHelper } from "@churchapps/apphelper";
import { UserHelper } from "@churchapps/apphelper";
import { ImageEditor } from "@churchapps/apphelper";
import { Permissions } from "@churchapps/helpers";
import type { SermonInterface, PlaylistInterface } from "@churchapps/helpers";
import { Duration } from "./Duration";
import { FormCard } from "../../components/ui";

interface Props {
  currentSermon: SermonInterface,
  updatedFunction?: () => void
}

type AnyRecord = Record<string, any>;

export const SermonEdit: React.FC<Props> = (props) => {
  const [errors, setErrors] = React.useState<string[]>([]);
  const [playlists, setPlaylists] = React.useState<PlaylistInterface[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showImageEditor, setShowImageEditor] = React.useState(false);
  const [showOption, setShowOption] = React.useState(false);
  const [additionalPlaylistId, setAdditionalPlaylistId] = React.useState("");
  const [thumbnail, setThumbnail] = React.useState<string>(props.currentSermon?.thumbnail ?? "");
  const [duration, setDuration] = React.useState<number>(props.currentSermon?.duration ?? 0);

  const { control, register, handleSubmit, watch, setValue, reset } = useForm<AnyRecord>({
    defaultValues: {
      playlistId: props.currentSermon?.playlistId ?? "",
      videoType: props.currentSermon?.videoType ?? "",
      videoData: props.currentSermon?.videoData ?? "",
      publishDate: props.currentSermon?.publishDate ? DateHelper.formatHtml5Date(DateHelper.toDate(props.currentSermon.publishDate)) : "",
      title: props.currentSermon?.title ?? "",
      description: props.currentSermon?.description ?? ""
    }
  });

  const loadData = () => {
    ApiHelper.get("/playlists", "ContentApi").then((data: any) => {
      setPlaylists(data);
      setIsLoading(false);
    });
  };

  const checkDelete = () => { if (!UniqueIdHelper.isMissing(props.currentSermon?.id)) return handleDelete; else return undefined; };
  const handleCancel = () => { props.updatedFunction(); };

  const handlePhotoUpdated = (dataUrl: string) => {
    setThumbnail(dataUrl);
    setShowImageEditor(false);
  };

  const handleDelete = () => {
    const errs = [];
    if (!UserHelper.checkAccess(Permissions.contentApi.streamingServices.edit)) errs.push(Locale.label("sermons.sermonEdit.unauthorizedDelete"));
    if (errs.length > 0) { setErrors(errs); return; }
    if (window.confirm(Locale.label("sermons.sermonEdit.deleteConfirm"))) {
      ApiHelper.delete("/sermons/" + props.currentSermon.id, "ContentApi").then(() => { props.updatedFunction(); });
    }
  };

  //auto fix common bad formats.
  const getVimeoKey = (input: string) => {
    let result = input.split("&")[0];
    result = result.replace("https://vimeo.com/", "").replace("https://player.vimeo.com/video/", "");
    return result;
  };

  //auto fix common bad formats.
  const getFacebookKey = (input: string) => {
    let result = input.split("&")[0];
    result = result.replace("https://facebook.com/video.php?v=", "");
    return result;
  };

  //auto fix common bad formats.
  const getYouTubeKey = (input: string) => {
    let result = input.split("&")[0];
    result = result
      .replace("https://www.youtube.com/watch?v=", "")
      .replace("https://youtube.com/watch?v=", "")
      .replace("https://youtu.be/", "")
      .replace("https://www.youtube.com/embed/", "")
      .replace("https://studio.youtube.com/video/", "")
      .replace("/edit", "");
    return result;
  };

  const buildVideoUrl = (videoType: string, videoData: string): string => {
    switch (videoType) {
      case "youtube_channel": return "https://www.youtube.com/embed/live_stream?channel=" + videoData;
      case "youtube": return "https://www.youtube.com/embed/" + videoData + "?autoplay=1&controls=0&showinfo=0&rel=0&modestbranding=1&disablekb=1";
      case "vimeo": return "https://player.vimeo.com/video/" + videoData + "?autoplay=1";
      case "facebook": return "https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Fvideo.php%3Fv%3D" + videoData + "&show_text=0&autoplay=1&allowFullScreen=1";
      default: return videoData;
    }
  };

  const onValid = (values: AnyRecord) => {
    const errs: string[] = [];
    if (!UserHelper.checkAccess(Permissions.contentApi.streamingServices.edit)) errs.push(Locale.label("sermons.sermonEdit.unauthorized"));
    if (errs.length > 0) { setErrors(errs); return; }

    const sermon: SermonInterface = {
      ...props.currentSermon,
      playlistId: values.playlistId,
      videoType: values.videoType,
      videoData: values.videoData,
      publishDate: values.publishDate ? DateHelper.toDate(values.publishDate) : undefined,
      title: values.title,
      description: values.description,
      thumbnail,
      duration,
      videoUrl: buildVideoUrl(values.videoType, values.videoData)
    };
    ApiHelper.post("/sermons", [sermon], "ContentApi").then(props.updatedFunction);
  };

  const handleAdd = (values: AnyRecord) => {
    const errs: string[] = [];
    if (!UserHelper.checkAccess(Permissions.contentApi.streamingServices.edit)) errs.push(Locale.label("sermons.sermonEdit.unauthorized"));
    if (errs.length > 0) { setErrors(errs); return; }

    const sermon: SermonInterface = {
      ...props.currentSermon,
      playlistId: additionalPlaylistId,
      videoType: values.videoType,
      videoData: values.videoData,
      publishDate: values.publishDate ? DateHelper.toDate(values.publishDate) : undefined,
      title: values.title,
      description: values.description,
      thumbnail,
      duration,
      videoUrl: buildVideoUrl(values.videoType, values.videoData),
      id: null
    };
    ApiHelper.post("/sermons", [sermon], "ContentApi").then(() => { setShowOption(false); props.updatedFunction(); });
  };

  const watchedVideoType = watch("videoType");

  const fetchVideo = (videoType: "youtube" | "vimeo") => {
    const videoData = watch("videoData");
    ApiHelper.getAnonymous(`/sermons/lookup?videoType=${videoType}&videoData=${videoData}`, "ContentApi").then((d: any) => {
      setValue("title", d.title);
      setValue("description", d.description);
      setValue("publishDate", d.publishDate ? DateHelper.formatHtml5Date(DateHelper.toDate(d.publishDate)) : "");
      setThumbnail(d.thumbnail);
      setDuration(d.duration);
    });
  };

  const handleVideoDataChange = (e: React.ChangeEvent<HTMLInputElement>, videoType: string) => {
    let val = e.target.value;
    if (videoType === "youtube") val = getYouTubeKey(val);
    else if (videoType === "facebook") val = getFacebookKey(val);
    else if (videoType === "vimeo") val = getVimeoKey(val);
    setValue("videoData", val);
  };

  const getPlaylists = () => {
    const result: React.ReactElement[] = [];
    playlists.forEach((playlist: any) => {
      result.push(<MenuItem key={playlist.id} value={playlist.id} data-testid={`playlist-option-${playlist.id}`} aria-label={playlist.title}>{playlist.title}</MenuItem>);
    });
    return result;
  };

  const getAdditionalPlaylists = () => {
    const currentPlaylistId = watch("playlistId");
    const result: React.ReactElement[] = [];
    playlists.forEach((playlist: any) => {
      if (playlist.id !== currentPlaylistId) result.push(<MenuItem key={playlist.id} value={playlist.id} data-testid={`additional-playlist-option-${playlist.id}`} aria-label={playlist.title}>{playlist.title}</MenuItem>);
    });
    return result;
  };

  React.useEffect(() => {
    reset({
      playlistId: props.currentSermon?.playlistId ?? "",
      videoType: props.currentSermon?.videoType ?? "",
      videoData: props.currentSermon?.videoData ?? "",
      publishDate: props.currentSermon?.publishDate ? DateHelper.formatHtml5Date(DateHelper.toDate(props.currentSermon.publishDate)) : "",
      title: props.currentSermon?.title ?? "",
      description: props.currentSermon?.description ?? ""
    });
    setThumbnail(props.currentSermon?.thumbnail ?? "");
    setDuration(props.currentSermon?.duration ?? 0);
    loadData();
  }, [props.currentSermon]);

  let keyLabel: React.ReactNode = <>{Locale.label("sermons.sermonEdit.sermonEmbedUrl")}</>;
  let keyPlaceholder = "https://yourprovider.com/yoururl/";
  let endAdornment = <></>;

  switch (watchedVideoType) {
    case "youtube_channel":
      keyLabel = <>{Locale.label("sermons.sermonEdit.youtubeChannelId")} <span className="description" style={{ float: "right", marginTop: 3, paddingLeft: 5 }}><a target="blank" rel="noreferrer noopener" href="https://support.churchapps.org/docs/b1-admin/sermons/live-streaming">{Locale.label("sermons.sermonEdit.getYourChannelId")}</a></span></>;
      keyPlaceholder = Locale.label("sermons.sermonEdit.youtubeChannelIdHelpPlaceholder");
      break;
    case "youtube":
      keyLabel = <>{Locale.label("sermons.sermonEdit.youtubeId")} <span className="description" style={{ float: "right", marginTop: 3, paddingLeft: 5 }}>https://youtube.com/watch?v=<b style={{ color: "var(--link)" }}>abcd1234</b></span></>;
      keyPlaceholder = "abcd1234";
      endAdornment = <Button variant="contained" onClick={() => fetchVideo("youtube")} data-testid="fetch-youtube-button" aria-label={Locale.label("sermons.sermonEdit.fetchYouTubeAria")}>{Locale.label("sermons.sermonEdit.fetch")}</Button>;
      break;
    case "vimeo":
      keyLabel = <>{Locale.label("sermons.sermonEdit.vimeoId")} <span className="description" style={{ float: "right", marginTop: 3, paddingLeft: 5 }}>https://vimeo.com/<b style={{ color: "var(--link)" }}>123456789</b></span></>;
      keyPlaceholder = "123456789";
      endAdornment = <Button variant="contained" onClick={() => fetchVideo("vimeo")} data-testid="fetch-vimeo-button" aria-label={Locale.label("sermons.sermonEdit.fetchVimeoAria")}>{Locale.label("sermons.sermonEdit.fetch")}</Button>;
      break;
    case "facebook":
      keyLabel = <>{Locale.label("sermons.sermonEdit.sermonId")} <span className="description" style={{ float: "right", marginTop: 3, paddingLeft: 5 }}>https://facebook.com/video.php?v=<b>123456789</b></span></>;
      keyPlaceholder = "123456789";
      break;
  }

  if (isLoading) return <Loading data-testid="sermon-edit-loading" />;
  else {
    return (
      <>
        {showImageEditor && <ImageEditor aspectRatio={16 / 9} outputWidth={640} outputHeight={360} photoUrl={thumbnail || ""} onCancel={() => setShowImageEditor(false)} onUpdate={handlePhotoUpdated} />}
        <FormCard icon="calendar_month" title={(props.currentSermon?.permanentUrl) ? Locale.label("sermons.sermonEdit.editPermanentLiveUrl") : Locale.label("sermons.sermonEdit.editSermon")} onSave={handleSubmit(onValid)} onCancel={handleCancel} onDelete={checkDelete()} help="docs/b1-admin/sermons/" data-testid="sermon-edit-box">
          <ErrorMessages errors={errors} data-testid="sermon-errors" />
          <>
            {!props.currentSermon?.permanentUrl && (
              <FormControl fullWidth>
                <InputLabel>{Locale.label("sermons.playlist")}</InputLabel>
                <Controller name="playlistId" control={control} render={({ field }) => (
                  <Select {...field} value={field.value ?? ""} label={Locale.label("sermons.playlist")} data-testid="sermon-playlist-select" aria-label={Locale.label("sermons.sermonEdit.selectPlaylistAria")}>
                    <MenuItem value="">{Locale.label("sermons.sermonEdit.none")}</MenuItem>
                    {getPlaylists()}
                  </Select>
                )} />
              </FormControl>
            )}

            <Grid container spacing={3}>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>{Locale.label("sermons.sermonEdit.videoProvider")}</InputLabel>
                  <Controller name="videoType" control={control} render={({ field }) => (
                    <Select {...field} value={field.value ?? ""} label={Locale.label("sermons.sermonEdit.videoProvider")} data-testid="video-provider-select" aria-label={Locale.label("sermons.sermonEdit.selectVideoProviderAria")}>
                      {props.currentSermon?.permanentUrl && (<MenuItem value="youtube_channel">{Locale.label("sermons.sermonEdit.currentYouTubeLiveStream")}</MenuItem>)}
                      <MenuItem value="youtube">{Locale.label("sermons.sermonEdit.youtube")}</MenuItem>
                      <MenuItem value="vimeo">{Locale.label("sermons.sermonEdit.vimeo")}</MenuItem>
                      <MenuItem value="facebook">{Locale.label("sermons.sermonEdit.facebook")}</MenuItem>
                      <MenuItem value="custom">{Locale.label("sermons.sermonEdit.customEmbedUrl")}</MenuItem>
                    </Select>
                  )} />
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField fullWidth label={keyLabel} name="videoData" value={watch("videoData") ?? ""} onChange={(e) => handleVideoDataChange(e as React.ChangeEvent<HTMLInputElement>, watchedVideoType)} placeholder={keyPlaceholder}
                  InputProps={{ endAdornment: endAdornment }}
                  data-testid="video-data-input"
                  aria-label={Locale.label("sermons.sermonEdit.videoIdOrUrlAria")}
                />
              </Grid>
            </Grid>
            <Grid container spacing={3}>
              {!props.currentSermon?.permanentUrl && (
                <Grid size={{ xs: 6 }}>
                  <label style={{ width: "100%" }}>{Locale.label("sermons.publishDate")}</label>
                  <TextField fullWidth type="date" data-testid="publish-date-input" aria-label={Locale.label("sermons.sermonEdit.publishDateAria")} {...register("publishDate")} />
                </Grid>
              )}
              <Grid size={{ xs: 6 }}>
                <label style={{ width: "100%" }}>{Locale.label("sermons.sermonEdit.totalSermonDuration")}</label>
                <Duration totalSeconds={duration} updatedFunction={totalSeconds => setDuration(totalSeconds)} />
              </Grid>
            </Grid>

            <Grid container spacing={3}>
              <Grid size={{ xs: 3 }}>
                <a href="about:blank" onClick={(e) => { e.preventDefault(); setShowImageEditor(true); }} data-testid="edit-thumbnail-link" aria-label={Locale.label("sermons.sermonEdit.editThumbnailAria")}>
                  <img src={thumbnail || "/images/no-image.png"} className="img-fluid" style={{ marginTop: 20 }} alt={Locale.label("sermons.sermonEdit.thumbnailAlt")} data-testid="sermon-thumbnail"></img>
                </a>
              </Grid>
              <Grid size={{ xs: 9 }}>
                <TextField fullWidth label={Locale.label("sermons.sermonEdit.title")} data-testid="sermon-title-input" aria-label={Locale.label("sermons.sermonEdit.sermonTitleAria")} placeholder={Locale.label("placeholders.sermon.title")} {...register("title")} />
                <Box sx={{ mt: 2 }}>
                  <TextField fullWidth multiline label={Locale.label("sermons.sermonEdit.description")} data-testid="sermon-description-input" aria-label={Locale.label("sermons.sermonEdit.sermonDescriptionAria")} placeholder={Locale.label("placeholders.sermon.description")} {...register("description")} />
                </Box>
              </Grid>
            </Grid>

            {/* add to another playlist */}
            <div style={{ marginTop: 15 }}>
              <a href="about:blank" onClick={(e) => { e.preventDefault(); setShowOption(!showOption); }} data-testid="add-to-playlist-link" aria-label={Locale.label("sermons.sermonEdit.addToAnotherPlaylistAria")}>{Locale.label("sermons.sermonEdit.addToAnotherPlaylist")}</a>
              {showOption && (
                <FormControl fullWidth>
                  <InputLabel>{Locale.label("sermons.playlist")}</InputLabel>
                  <Select label={Locale.label("sermons.playlist")} name="additionalPlaylistId" value={additionalPlaylistId} onChange={(e) => { e.preventDefault(); setAdditionalPlaylistId(e.target.value as string); }}
                    endAdornment={<Button variant="contained" size="small" disabled={!additionalPlaylistId || additionalPlaylistId === ""} onClick={handleSubmit(handleAdd)} data-testid="add-to-playlist-button" aria-label={Locale.label("sermons.sermonEdit.addToSelectedPlaylistAria")}>{Locale.label("sermons.sermonEdit.add")}</Button>}
                    data-testid="additional-playlist-select"
                    aria-label={Locale.label("sermons.sermonEdit.selectAdditionalPlaylistAria")}
                  >
                    {getAdditionalPlaylists()}
                  </Select>
                </FormControl>
              )}
            </div>
          </>
        </FormCard>
      </>
    );
  }
};
