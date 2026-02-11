import { InputBox, Locale } from "@churchapps/apphelper";
import {
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  FormControl,
  Box,
  Stack,
  Typography,
  Chip,
  Divider,
  InputAdornment,
  Alert,
  type SelectChangeEvent
} from "@mui/material";
import {
  VideoCall as VideoCallIcon,
  Schedule as ScheduleIcon,
  Chat as ChatIcon,
  PlayCircle as PlayCircleIcon,
  MenuBook as MenuBookIcon,
  AccessTime as AccessTimeIcon
} from "@mui/icons-material";
import React from "react";
import { ApiHelper } from "@churchapps/apphelper";
import { DateHelper } from "@churchapps/apphelper";
import { UniqueIdHelper } from "@churchapps/apphelper";
import { Loading } from "@churchapps/apphelper";
import type { SermonInterface, StreamingServiceInterface } from "@churchapps/helpers";

interface Props { currentService: StreamingServiceInterface, updatedFunction?: () => void }

export const ServiceEdit: React.FC<Props> = (props) => {
  const [currentService, setCurrentService] = React.useState<StreamingServiceInterface>(null);
  const [sermons, setSermons] = React.useState<SermonInterface[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [validationErrors, setValidationErrors] = React.useState<string[]>([]);

  const checkDelete = () => { if (!UniqueIdHelper.isMissing(currentService?.id)) return handleDelete; else return null; };
  const handleCancel = () => { props.updatedFunction(); };

  const loadData = () => {
    ApiHelper.get("/sermons", "ContentApi").then((data: any) => {
      setSermons(data);
      setIsLoading(false);
    });
  };

  const handleDelete = () => {
    if (window.confirm(Locale.label("sermons.liveStreamTimes.serviceEdit.deleteConfirm"))) {
      ApiHelper.delete("/streamingServices/" + currentService.id, "ContentApi").then(() => { props.updatedFunction(); });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    const val = e.target.value;
    const s = { ...currentService };
    switch (e.target.name) {
      case "serviceLabel": s.label = val; break;
      case "serviceTime":
        s.serviceTime = new Date(val);
        break;
      case "chatBefore": s.chatBefore = parseInt(val) * 60; break;
      case "chatAfter": s.chatAfter = parseInt(val) * 60; break;
      case "earlyStart": s.earlyStart = parseInt(val) * 60; break;
      case "provider": s.provider = val; break;
      case "providerKey":
        s.providerKey = val;
        if (s.provider === "youtube_live" || s.provider === "youtube_watchparty") s.providerKey = getYouTubeKey(s.providerKey);
        else if (s.provider === "facebook_live") s.providerKey = getFacebookKey(s.providerKey);
        else if (s.provider === "vimeo_live" || s.provider === "vimeo_watchparty") s.providerKey = getVimeoKey(s.providerKey);
        break;
      case "recurs": s.recurring = val === "true"; break;
      case "sermonId": s.sermonId = val; break;
    }
    setCurrentService(s);
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

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!currentService?.label?.trim()) {
      errors.push(Locale.label("sermons.liveStreamTimes.serviceEdit.serviceNameRequired"));
    }

    if (!currentService?.serviceTime) {
      errors.push(Locale.label("sermons.liveStreamTimes.serviceEdit.serviceTimeRequired"));
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    setVideoUrl();
    ApiHelper.post("/streamingServices", [currentService], "ContentApi").then(props.updatedFunction);
  };

  const setVideoUrl = () => {
    let result = currentService?.providerKey;
    switch (currentService?.provider) {
      case "youtube_live":
      case "youtube_watchparty":
        result = "https://www.youtube.com/embed/" + currentService?.providerKey + "?autoplay=1&controls=0&showinfo=0&rel=0&modestbranding=1&disablekb=1";
        break;
      case "vimeo_live":
      case "vimeo_watchparty":
        result = "https://player.vimeo.com/video/" + currentService?.providerKey + "?autoplay=1";
        break;
      case "facebook_live":
        result = "https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Fvideo.php%3Fv%3D" + currentService?.providerKey + "&show_text=0&autoplay=1&allowFullScreen=1";
        break;
    }
    return currentService.videoUrl = result;
  };

  const getSermons = () => {
    const result: React.ReactElement[] = [];
    sermons.forEach(sermon => {
      if (sermon.permanentUrl) result.push(<MenuItem key={sermon.id} value={sermon.id}>{sermon.title}</MenuItem>);
    });
    result.push(<Divider key="divider" />);
    sermons.forEach(sermon => {
      if (!sermon.permanentUrl) result.push(<MenuItem key={sermon.id} value={sermon.id}>{sermon.title}</MenuItem>);
    });
    return result;
  };

  React.useEffect(() => { setCurrentService(props.currentService); loadData(); }, [props.currentService]);

  if (isLoading) return <Loading />;
  else {

    const localServiceTime = currentService?.serviceTime;
    const chatAndPrayerStartTime = currentService?.serviceTime?.getTime() - currentService?.chatBefore * 1000;
    const chatAndPrayerEndTime = currentService?.serviceTime?.getTime() + currentService?.chatAfter * 1000;
    const earlyStartTime = currentService?.serviceTime?.getTime() - currentService?.earlyStart * 1000;

    return (
      <InputBox
        headerIcon="video_settings"
        headerText={UniqueIdHelper.isMissing(currentService?.id) ? Locale.label("sermons.liveStreamTimes.serviceEdit.addNewService") : Locale.label("sermons.liveStreamTimes.serviceEdit.editService")}
        saveFunction={handleSave}
        cancelFunction={handleCancel}
        deleteFunction={checkDelete()}
        data-testid="edit-service-inputbox"
      >
        <Stack spacing={3}>
          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert severity="error">
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                {Locale.label("sermons.liveStreamTimes.serviceEdit.errorsCorrectionTitle")}
              </Typography>
              <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2 }}>
                {validationErrors.map((error, index) => (
                  <Typography key={index} component="li" variant="body2">
                    {error}
                  </Typography>
                ))}
              </Stack>
            </Alert>
          )}

          {/* Basic Information Section */}
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <VideoCallIcon sx={{ color: "primary.main", fontSize: 20 }} />
              <Typography variant="h6" sx={{ color: "primary.main" }}>
                {Locale.label("sermons.liveStreamTimes.serviceEdit.basicInformation")}
              </Typography>
            </Stack>

            <Stack spacing={2}>
              <TextField
                fullWidth
                label={Locale.label("sermons.liveStreamTimes.serviceEdit.serviceName")}
                name="serviceLabel"
                value={currentService?.label || ""}
                onChange={handleChange}
                data-testid="service-name-input"
                placeholder={Locale.label("sermons.liveStreamTimes.serviceEdit.serviceNamePlaceholder")}
                error={validationErrors.some(e => e.includes(Locale.label("sermons.liveStreamTimes.serviceEdit.serviceNameRequired")))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <VideoCallIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                    </InputAdornment>
                  )
                }}
              />

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label={Locale.label("sermons.liveStreamTimes.serviceEdit.serviceTime")}
                    type="datetime-local"
                    name="serviceTime"
                    InputLabelProps={{ shrink: !!DateHelper.formatHtml5DateTime(localServiceTime) }}
                    defaultValue={DateHelper.formatHtml5DateTime(localServiceTime)}
                    onChange={handleChange}
                    data-testid="service-time-input"
                    error={validationErrors.some(e => e.includes(Locale.label("sermons.liveStreamTimes.serviceEdit.serviceTimeRequired")))}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <ScheduleIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>{Locale.label("sermons.liveStreamTimes.serviceEdit.recursWeekly")}</InputLabel>
                    <Select
                      label={Locale.label("sermons.liveStreamTimes.serviceEdit.recursWeekly")}
                      name="recurs"
                      value={Boolean(currentService?.recurring).toString() || ""}
                      onChange={handleChange}
                      startAdornment={
                        <InputAdornment position="start">
                          <AccessTimeIcon sx={{ fontSize: 18, color: "text.secondary", mr: 1 }} />
                        </InputAdornment>
                      }
                    >
                      <MenuItem value="false">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography>{Locale.label("sermons.liveStreamTimes.serviceEdit.no")}</Typography>
                          <Chip label={Locale.label("sermons.liveStreamTimes.serviceEdit.oneTime")} size="small" sx={{ backgroundColor: "#fff3e0", color: "#f57c00" }} />
                        </Stack>
                      </MenuItem>
                      <MenuItem value="true">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography>{Locale.label("sermons.liveStreamTimes.serviceEdit.yes")}</Typography>
                          <Chip label={Locale.label("sermons.liveStreamTimes.serviceEdit.weekly")} size="small" sx={{ backgroundColor: "#e8f5e9", color: "#2e7d32" }} />
                        </Stack>
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Stack>
          </Box>

          <Divider />

          {/* Chat Settings Section */}
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <ChatIcon sx={{ color: "primary.main", fontSize: 20 }} />
              <Typography variant="h6" sx={{ color: "primary.main" }}>
                {Locale.label("sermons.liveStreamTimes.serviceEdit.chatSettings")}
              </Typography>
            </Stack>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label={Locale.label("sermons.liveStreamTimes.serviceEdit.enableChatMinutesBefore")}
                  type="number"
                  name="chatBefore"
                  value={currentService?.chatBefore / 60 || ""}
                  onChange={handleChange}
                  InputProps={{
                    inputProps: { min: 0, step: 1 },
                    startAdornment: (
                      <InputAdornment position="start">
                        <ChatIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <Chip
                          label={chatAndPrayerStartTime ? DateHelper.prettyTime(new Date(chatAndPrayerStartTime)) : "Time"}
                          size="small"
                          sx={{ backgroundColor: "rgba(25, 118, 210, 0.08)", color: "primary.main" }}
                        />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label={Locale.label("sermons.liveStreamTimes.serviceEdit.enableChatMinutesAfter")}
                  type="number"
                  name="chatAfter"
                  value={currentService?.chatAfter / 60 || ""}
                  onChange={handleChange}
                  InputProps={{
                    inputProps: { min: 0, step: 1 },
                    startAdornment: (
                      <InputAdornment position="start">
                        <ChatIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <Chip
                          label={chatAndPrayerEndTime ? DateHelper.prettyTime(new Date(chatAndPrayerEndTime)) : "Time"}
                          size="small"
                          sx={{ backgroundColor: "rgba(25, 118, 210, 0.08)", color: "primary.main" }}
                        />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Video Settings Section */}
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <PlayCircleIcon sx={{ color: "primary.main", fontSize: 20 }} />
              <Typography variant="h6" sx={{ color: "primary.main" }}>
                {Locale.label("sermons.liveStreamTimes.serviceEdit.videoSettings")}
              </Typography>
            </Stack>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label={Locale.label("sermons.liveStreamTimes.serviceEdit.startVideoEarly")}
                  type="number"
                  name="earlyStart"
                  value={currentService?.earlyStart / 60 || ""}
                  onChange={handleChange}
                  helperText={Locale.label("sermons.liveStreamTimes.serviceEdit.startVideoEarlyHelp")}
                  InputProps={{
                    inputProps: { min: 0, step: 1 },
                    startAdornment: (
                      <InputAdornment position="start">
                        <PlayCircleIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <Chip
                          label={earlyStartTime ? DateHelper.prettyTime(new Date(earlyStartTime)) : "Time"}
                          size="small"
                          sx={{ backgroundColor: "rgba(25, 118, 210, 0.08)", color: "primary.main" }}
                        />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>{Locale.label("sermons.liveStreamTimes.serviceEdit.sermon")}</InputLabel>
                  <Select
                    label={Locale.label("sermons.liveStreamTimes.serviceEdit.sermon")}
                    name="sermonId"
                    value={currentService?.sermonId || "latest"}
                    onChange={handleChange}
                    startAdornment={
                      <InputAdornment position="start">
                        <MenuBookIcon sx={{ fontSize: 18, color: "text.secondary", mr: 1 }} />
                      </InputAdornment>
                    }
                  >
                    <MenuItem value="latest">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography>{Locale.label("sermons.liveStreamTimes.serviceEdit.latestSermon")}</Typography>
                        <Chip label={Locale.label("sermons.liveStreamTimes.serviceEdit.auto")} size="small" sx={{ backgroundColor: "#e8f5e9", color: "#2e7d32" }} />
                      </Stack>
                    </MenuItem>
                    {getSermons()}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </Stack>
      </InputBox>
    );
  }
};
