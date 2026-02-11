import React from "react";
import { Grid, InputLabel, MenuItem, Select, TextField, FormControl, Button, Box, type SelectChangeEvent } from "@mui/material";
import { Loading, Locale } from "@churchapps/apphelper";
import { InputBox } from "@churchapps/apphelper";
import { ErrorMessages } from "@churchapps/apphelper";
import { ApiHelper } from "@churchapps/apphelper";
import { UniqueIdHelper } from "@churchapps/apphelper";
import { DateHelper } from "@churchapps/apphelper";
import { UserHelper } from "@churchapps/apphelper";
import { ImageEditor } from "@churchapps/apphelper";
import { Permissions } from "@churchapps/helpers";
import type { SermonInterface, PlaylistInterface } from "@churchapps/helpers";
import { Duration } from "./Duration";

interface Props {
  currentSermon: SermonInterface,
  updatedFunction?: () => void
}

export const SermonEdit: React.FC<Props> = (props) => {

  const [errors, setErrors] = React.useState<string[]>([]);
  const [currentSermon, setCurrentSermon] = React.useState<SermonInterface>(null);
  const [playlists, setPlaylists] = React.useState<PlaylistInterface[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showImageEditor, setShowImageEditor] = React.useState(false);
  const [showOption, setShowOption] = React.useState(false);
  const [additionalPlaylistId, setAdditionalPlaylistId] = React.useState("");

  const loadData = () => {
    ApiHelper.get("/playlists", "ContentApi").then((data: any) => {
      setPlaylists(data);
      setIsLoading(false);
    });
  };

  const checkDelete = () => { if (!UniqueIdHelper.isMissing(currentSermon?.id)) return handleDelete; else return null; };
  const handleCancel = () => { props.updatedFunction(); };

  const handlePhotoUpdated = (dataUrl: string) => {
    const s = { ...currentSermon };
    s.thumbnail = dataUrl;
    setCurrentSermon(s);
    setShowImageEditor(false);
  };

  const handleDelete = () => {
    const errors = [];
    if (!UserHelper.checkAccess(Permissions.contentApi.streamingServices.edit)) errors.push(Locale.label("sermons.sermonEdit.unauthorizedDelete"));

    if (errors.length > 0) {
      setErrors(errors);
      return;
    }

    if (window.confirm(Locale.label("sermons.sermonEdit.deleteConfirm"))) {
      ApiHelper.delete("/sermons/" + currentSermon.id, "ContentApi").then(() => { setCurrentSermon(null); props.updatedFunction(); });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    const val = e.target.value;
    const v = { ...currentSermon };
    switch (e.target.name) {
      case "title": v.title = val; break;
      case "description": v.description = val; break;
      case "publishDate": v.publishDate = DateHelper.toDate(val); break;
      case "videoType": v.videoType = val; break;
      case "playlistId": v.playlistId = val; break;
      case "videoData":
        v.videoData = val;
        if (v.videoType === "youtube") v.videoData = getYouTubeKey(v.videoData);
        else if (v.videoType === "facebook") v.videoData = getFacebookKey(v.videoData);
        else if (v.videoType === "vimeo") v.videoData = getVimeoKey(v.videoData);
        break;
    }
    setCurrentSermon(v);
  };

  //auto fix common bad formats.
  const getVimeoKey = (facebookInput: string) => {
    let result = facebookInput.split("&")[0];
    result = result
      .replace("https://vimeo.com/", "")
      .replace("https://player.vimeo.com/video/", "");
    return result;
  };

  //auto fix common bad formats.
  const getFacebookKey = (facebookInput: string) => {
    let result = facebookInput.split("&")[0];
    result = result
      .replace("https://facebook.com/video.php?v=", "");
    return result;
  };

  //auto fix common bad formats.
  const getYouTubeKey = (youtubeInput: string) => {
    let result = youtubeInput.split("&")[0];
    result = result
      .replace("https://www.youtube.com/watch?v=", "")
      .replace("https://youtube.com/watch?v=", "")
      .replace("https://youtu.be/", "")
      .replace("https://www.youtube.com/embed/", "")
      .replace("https://studio.youtube.com/video/", "")
      .replace("/edit", "");
    return result;
  };

  const handleSave = () => {
    const errors: string[] = [];
    if (!UserHelper.checkAccess(Permissions.contentApi.streamingServices.edit)) errors.push(Locale.label("sermons.sermonEdit.unauthorized"));

    if (errors.length > 0) {
      setErrors(errors);
      return;
    }

    setSermonUrl();
    ApiHelper.post("/sermons", [currentSermon], "ContentApi").then(props.updatedFunction);
  };

  const handleAdd = () => {
    const errors: string[] = [];
    if (!UserHelper.checkAccess(Permissions.contentApi.streamingServices.edit)) errors.push(Locale.label("sermons.sermonEdit.unauthorized"));

    if (errors.length > 0) {
      setErrors(errors);
      return;
    }

    const sermon = { ...currentSermon };
    sermon.playlistId = additionalPlaylistId;
    sermon.id = null;

    ApiHelper.post("/sermons", [sermon], "ContentApi").then(() => {
      setShowOption(false);
      props.updatedFunction();
    });
  };

  const setSermonUrl = () => {
    let result = currentSermon?.videoData;
    switch (currentSermon?.videoType) {
      case "youtube_channel":
        result = "https://www.youtube.com/embed/live_stream?channel=" + currentSermon?.videoData;
        break;
      case "youtube":
        result = "https://www.youtube.com/embed/" + currentSermon?.videoData + "?autoplay=1&controls=0&showinfo=0&rel=0&modestbranding=1&disablekb=1";
        break;
      case "vimeo":
        result = "https://player.vimeo.com/video/" + currentSermon?.videoData + "?autoplay=1";
        break;
      case "facebook":
        result = "https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Fvideo.php%3Fv%3D" + currentSermon?.videoData + "&show_text=0&autoplay=1&allowFullScreen=1";
        break;
    }
    return currentSermon.videoUrl = result;
  };

  const fetchVideo = (videoType: "youtube" | "vimeo") => {
    ApiHelper.getAnonymous(`/sermons/lookup?videoType=${videoType}&videoData=${currentSermon.videoData}`, "ContentApi").then((d: any) => {
      const v = { ...currentSermon };
      v.title = d.title;
      v.description = d.description;
      v.thumbnail = d.thumbnail;
      v.duration = d.duration;
      v.publishDate = d.publishDate;
      setCurrentSermon(v);
    });
  };

  const getPlaylists = () => {
    const result: React.ReactElement[] = [];
    playlists.forEach((playlist: any) => {
      result.push(<MenuItem key={playlist.id} value={playlist.id} data-testid={`playlist-option-${playlist.id}`} aria-label={playlist.title}>{playlist.title}</MenuItem>);
    });
    return result;
  };

  const getAdditionalPlaylists = () => {
    const result: React.ReactElement[] = [];
    playlists.forEach((playlist: any) => {
      if (playlist.id !== currentSermon.playlistId) result.push(<MenuItem key={playlist.id} value={playlist.id} data-testid={`additional-playlist-option-${playlist.id}`} aria-label={playlist.title}>{playlist.title}</MenuItem>);
    });
    return result;
  };

  React.useEffect(() => { setCurrentSermon(props.currentSermon); loadData(); }, [props.currentSermon]);

  let keyLabel = <>{Locale.label("sermons.sermonEdit.sermonEmbedUrl")}</>;
  let keyPlaceholder = "https://yourprovider.com/yoururl/";
  let endAdornment = <></>;

  switch (currentSermon?.videoType) {
    case "youtube_channel":
      keyLabel = <>{Locale.label("sermons.sermonEdit.youtubeChannelId")} <span className="description" style={{ float: "right", marginTop: 3, paddingLeft: 5 }}><a target="blank" rel="noreferrer noopener" href="https://support.churchapps.org/b1/admin/youtube-channel-id.html">{Locale.label("sermons.sermonEdit.getYourChannelId")}</a></span></>;
      keyPlaceholder = "UCfiDl90gAfZMkgbeCqX1Wi0 - This is not your channel url";
      break;
    case "youtube":
      keyLabel = <>{Locale.label("sermons.sermonEdit.youtubeId")} <span className="description" style={{ float: "right", marginTop: 3, paddingLeft: 5 }}>https://youtube.com/watch?v=<b style={{ color: "#24b8ff" }}>abcd1234</b></span></>;
      keyPlaceholder = "abcd1234";
      endAdornment = <Button variant="contained" onClick={() => fetchVideo("youtube")} data-testid="fetch-youtube-button" aria-label="Fetch YouTube video details">{Locale.label("sermons.sermonEdit.fetch")}</Button>;
      break;
    case "vimeo":
      keyLabel = <>{Locale.label("sermons.sermonEdit.vimeoId")} <span className="description" style={{ float: "right", marginTop: 3, paddingLeft: 5 }}>https://vimeo.com/<b style={{ color: "#24b8ff" }}>123456789</b></span></>;
      keyPlaceholder = "123456789";
      endAdornment = <Button variant="contained" onClick={() => fetchVideo("vimeo")} data-testid="fetch-vimeo-button" aria-label="Fetch Vimeo video details">{Locale.label("sermons.sermonEdit.fetch")}</Button>;
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
        {showImageEditor && <ImageEditor aspectRatio={16 / 9} outputWidth={640} outputHeight={360} photoUrl={currentSermon?.thumbnail || ""} onCancel={() => setShowImageEditor(false)} onUpdate={handlePhotoUpdated} />}
        <InputBox headerIcon="calendar_month" headerText={(currentSermon?.permanentUrl) ? Locale.label("sermons.sermonEdit.editPermanentLiveUrl") : Locale.label("sermons.sermonEdit.editSermon")} saveFunction={handleSave} cancelFunction={handleCancel} deleteFunction={checkDelete()} help="b1Admin/streaming/sermons" data-testid="sermon-edit-box">
          <ErrorMessages errors={errors} data-testid="sermon-errors" />
          <>
            {!currentSermon?.permanentUrl && (
              <FormControl fullWidth>
                <InputLabel>{Locale.label("sermons.playlist")}</InputLabel>
                <Select label={Locale.label("sermons.playlist")} name="playlistId" value={currentSermon?.playlistId || ""} onChange={handleChange} data-testid="sermon-playlist-select" aria-label="Select playlist">
                  <MenuItem value="">{Locale.label("sermons.sermonEdit.none")}</MenuItem>
                  {getPlaylists()}
                </Select>
              </FormControl>
            )}

            <Grid container spacing={3}>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>{Locale.label("sermons.sermonEdit.videoProvider")}</InputLabel>
                  <Select label={Locale.label("sermons.sermonEdit.videoProvider")} name="videoType" value={currentSermon?.videoType || ""} onChange={handleChange} data-testid="video-provider-select" aria-label="Select video provider">
                    {currentSermon?.permanentUrl && (<MenuItem value="youtube_channel">{Locale.label("sermons.sermonEdit.currentYouTubeLiveStream")}</MenuItem>)}
                    <MenuItem value="youtube">{Locale.label("sermons.sermonEdit.youtube")}</MenuItem>
                    <MenuItem value="vimeo">{Locale.label("sermons.sermonEdit.vimeo")}</MenuItem>
                    <MenuItem value="facebook">{Locale.label("sermons.sermonEdit.facebook")}</MenuItem>
                    <MenuItem value="custom">{Locale.label("sermons.sermonEdit.customEmbedUrl")}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField fullWidth label={keyLabel} name="videoData" value={currentSermon?.videoData || ""} onChange={handleChange} placeholder={keyPlaceholder}
                  InputProps={{ endAdornment: endAdornment }}
                  data-testid="video-data-input"
                  aria-label="Video ID or URL"
                />
              </Grid>
            </Grid>
            <Grid container spacing={3}>
              {!currentSermon?.permanentUrl && (
                <Grid size={{ xs: 6 }}>
                  <label style={{ width: "100%" }}>{Locale.label("sermons.publishDate")}</label>
                  <TextField fullWidth type="date" name="publishDate" value={(currentSermon?.publishDate) ? DateHelper.formatHtml5Date(DateHelper.toDate(currentSermon?.publishDate)) : ""} onChange={handleChange} placeholder={keyPlaceholder} data-testid="publish-date-input" aria-label="Publish date" />
                </Grid>
              )}
              <Grid size={{ xs: 6 }}>
                <label style={{ width: "100%" }}>{Locale.label("sermons.sermonEdit.totalSermonDuration")}</label>
                <Duration totalSeconds={currentSermon?.duration || 0} updatedFunction={totalSeconds => { const s = { ...currentSermon }; s.duration = totalSeconds; setCurrentSermon(s); }} />
              </Grid>

            </Grid>

            <Grid container spacing={3}>
              <Grid size={{ xs: 3 }}>
                <a href="about:blank" onClick={(e) => { e.preventDefault(); setShowImageEditor(true); }} data-testid="edit-thumbnail-link" aria-label="Edit sermon thumbnail">
                  <img src={currentSermon?.thumbnail || "/images/no-image.png"} className="img-fluid" style={{ marginTop: 20 }} alt="Sermon thumbnail" data-testid="sermon-thumbnail"></img>
                </a>
              </Grid>
              <Grid size={{ xs: 9 }}>
                <TextField fullWidth label={Locale.label("sermons.sermonEdit.title")} name="title" value={currentSermon?.title || ""} onChange={handleChange} placeholder={Locale.label("placeholders.sermon.title")} data-testid="sermon-title-input" aria-label="Sermon title" />
                <Box sx={{ mt: 2 }}>
                  <TextField fullWidth multiline label={Locale.label("sermons.sermonEdit.description")} name="description" value={currentSermon?.description || ""} onChange={handleChange} placeholder={Locale.label("placeholders.sermon.description")} data-testid="sermon-description-input" aria-label="Sermon description" />
                </Box>
              </Grid>
            </Grid>

            {/* add to another playlist */}
            <div style={{ marginTop: 15 }}>
              <a href="about:blank" onClick={(e) => { e.preventDefault(); setShowOption(!showOption); }} data-testid="add-to-playlist-link" aria-label="Add sermon to another playlist">{Locale.label("sermons.sermonEdit.addToAnotherPlaylist")}</a>
              {showOption && (
                <FormControl fullWidth>
                  <InputLabel>{Locale.label("sermons.playlist")}</InputLabel>
                  <Select label={Locale.label("sermons.playlist")} name="additionalPlaylistId" value={additionalPlaylistId} onChange={(e) => { e.preventDefault(); setAdditionalPlaylistId(e.target.value); }}
                    endAdornment={<Button variant="contained" size="small" disabled={!additionalPlaylistId || additionalPlaylistId === ""} onClick={handleAdd} data-testid="add-to-playlist-button" aria-label="Add to selected playlist">{Locale.label("sermons.sermonEdit.add")}</Button>}
                    data-testid="additional-playlist-select"
                    aria-label="Select additional playlist"
                  >
                    {getAdditionalPlaylists()}
                  </Select>
                </FormControl>
              )}
            </div>
          </>
        </InputBox>
      </>
    );
  }
};
