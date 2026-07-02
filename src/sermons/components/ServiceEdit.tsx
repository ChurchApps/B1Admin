import { useForm, Controller, useFormState } from "react-hook-form";
import { Locale } from "@churchapps/apphelper";
import { FormCard } from "../../components/ui";
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
  Alert
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

type AnyRecord = Record<string, any>;

export const ServiceEdit: React.FC<Props> = (props) => {
  "use no memo"; // compiler caches register() results, breaking RHF field re-registration after reset()
  const [sermons, setSermons] = React.useState<SermonInterface[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const { control, register, handleSubmit, watch, reset } = useForm<AnyRecord>({
    defaultValues: {
      serviceLabel: props.currentService?.label ?? "",
      serviceTime: DateHelper.formatHtml5DateTime(props.currentService?.serviceTime) ?? "",
      chatBefore: props.currentService?.chatBefore ? props.currentService.chatBefore / 60 : "",
      chatAfter: props.currentService?.chatAfter ? props.currentService.chatAfter / 60 : "",
      earlyStart: props.currentService?.earlyStart ? props.currentService.earlyStart / 60 : "",
      provider: props.currentService?.provider ?? "",
      providerKey: props.currentService?.providerKey ?? "",
      recurs: Boolean(props.currentService?.recurring).toString(),
      sermonId: props.currentService?.sermonId ?? "latest"
    }
  });

  const { errors } = useFormState({ control });
  const e = errors as any;

  const summaryErrors: string[] = React.useMemo(() => {
    const errs: string[] = [];
    if (e.serviceLabel?.message) errs.push(e.serviceLabel.message);
    if (e.serviceTime?.message) errs.push(e.serviceTime.message);
    return errs;
  }, [errors]);

  const checkDelete = () => { if (!UniqueIdHelper.isMissing(props.currentService?.id)) return handleDelete; else return undefined; };
  const handleCancel = () => { props.updatedFunction(); };

  const loadData = () => {
    ApiHelper.get("/sermons", "ContentApi").then((data: any) => {
      setSermons(data);
      setIsLoading(false);
    });
  };

  const handleDelete = () => {
    if (window.confirm(Locale.label("sermons.liveStreamTimes.serviceEdit.deleteConfirm"))) {
      ApiHelper.delete("/streamingServices/" + props.currentService.id, "ContentApi").then(() => { props.updatedFunction(); });
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

  const buildVideoUrl = (provider: string, providerKey: string): string => {
    switch (provider) {
      case "youtube_live":
      case "youtube_watchparty":
        return "https://www.youtube.com/embed/" + providerKey + "?autoplay=1&controls=0&showinfo=0&rel=0&modestbranding=1&disablekb=1";
      case "vimeo_live":
      case "vimeo_watchparty":
        return "https://player.vimeo.com/video/" + providerKey + "?autoplay=1";
      case "facebook_live":
        return "https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Fvideo.php%3Fv%3D" + providerKey + "&show_text=0&autoplay=1&allowFullScreen=1";
      default:
        return providerKey;
    }
  };

  const normalizeProviderKey = (key: string, provider: string): string => {
    if (provider === "youtube_live" || provider === "youtube_watchparty") return getYouTubeKey(key);
    if (provider === "facebook_live") return getFacebookKey(key);
    if (provider === "vimeo_live" || provider === "vimeo_watchparty") return getVimeoKey(key);
    return key;
  };

  const onValid = (values: AnyRecord) => {
    const providerKey = normalizeProviderKey(values.providerKey, values.provider);
    const service: StreamingServiceInterface = {
      ...props.currentService,
      label: values.serviceLabel,
      serviceTime: values.serviceTime ? new Date(values.serviceTime) : undefined,
      chatBefore: values.chatBefore ? parseInt(values.chatBefore) * 60 : 0,
      chatAfter: values.chatAfter ? parseInt(values.chatAfter) * 60 : 0,
      earlyStart: values.earlyStart ? parseInt(values.earlyStart) * 60 : 0,
      provider: values.provider,
      providerKey,
      recurring: values.recurs === "true",
      sermonId: values.sermonId,
      videoUrl: buildVideoUrl(values.provider, providerKey)
    };
    ApiHelper.post("/streamingServices", [service], "ContentApi").then(props.updatedFunction);
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

  React.useEffect(() => {
    reset({
      serviceLabel: props.currentService?.label ?? "",
      serviceTime: DateHelper.formatHtml5DateTime(props.currentService?.serviceTime) ?? "",
      chatBefore: props.currentService?.chatBefore ? props.currentService.chatBefore / 60 : "",
      chatAfter: props.currentService?.chatAfter ? props.currentService.chatAfter / 60 : "",
      earlyStart: props.currentService?.earlyStart ? props.currentService.earlyStart / 60 : "",
      provider: props.currentService?.provider ?? "",
      providerKey: props.currentService?.providerKey ?? "",
      recurs: Boolean(props.currentService?.recurring).toString(),
      sermonId: props.currentService?.sermonId ?? "latest"
    });
    loadData();
  }, [props.currentService]);

  const watchedServiceTime = watch("serviceTime");
  const watchedChatBefore = watch("chatBefore");
  const watchedChatAfter = watch("chatAfter");
  const watchedEarlyStart = watch("earlyStart");

  const serviceTimeMs = watchedServiceTime ? new Date(watchedServiceTime).getTime() : null;
  const chatAndPrayerStartTime = serviceTimeMs && watchedChatBefore ? serviceTimeMs - parseInt(watchedChatBefore) * 60 * 1000 : null;
  const chatAndPrayerEndTime = serviceTimeMs && watchedChatAfter ? serviceTimeMs + parseInt(watchedChatAfter) * 60 * 1000 : null;
  const earlyStartTime = serviceTimeMs && watchedEarlyStart ? serviceTimeMs - parseInt(watchedEarlyStart) * 60 * 1000 : null;

  if (isLoading) return <Loading />;
  else {
    return (
      <FormCard
        icon="video_settings"
        title={UniqueIdHelper.isMissing(props.currentService?.id) ? Locale.label("sermons.liveStreamTimes.serviceEdit.addNewService") : Locale.label("sermons.liveStreamTimes.serviceEdit.editService")}
        onSave={handleSubmit(onValid)}
        onCancel={handleCancel}
        onDelete={checkDelete()}
        data-testid="edit-service-inputbox"
      >
        <Stack spacing={3}>
          {/* Validation Errors */}
          {summaryErrors.length > 0 && (
            <Alert severity="error">
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                {Locale.label("sermons.liveStreamTimes.serviceEdit.errorsCorrectionTitle")}
              </Typography>
              <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2 }}>
                {summaryErrors.map((error, index) => (
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
                data-testid="service-name-input"
                placeholder={Locale.label("sermons.liveStreamTimes.serviceEdit.serviceNamePlaceholder")}
                error={!!e.serviceLabel}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <VideoCallIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                    </InputAdornment>
                  )
                }}
                {...register("serviceLabel", { required: Locale.label("sermons.liveStreamTimes.serviceEdit.serviceNameRequired") })}
              />

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label={Locale.label("sermons.liveStreamTimes.serviceEdit.serviceTime")}
                    type="datetime-local"
                    InputLabelProps={{ shrink: true }}
                    data-testid="service-time-input"
                    error={!!e.serviceTime}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <ScheduleIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                        </InputAdornment>
                      )
                    }}
                    {...register("serviceTime", { required: Locale.label("sermons.liveStreamTimes.serviceEdit.serviceTimeRequired") })}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>{Locale.label("sermons.liveStreamTimes.serviceEdit.recursWeekly")}</InputLabel>
                    <Controller name="recurs" control={control} render={({ field }) => (
                      <Select {...field} value={field.value ?? "false"} label={Locale.label("sermons.liveStreamTimes.serviceEdit.recursWeekly")}
                        startAdornment={
                          <InputAdornment position="start">
                            <AccessTimeIcon sx={{ fontSize: 18, color: "text.secondary", mr: 1 }} />
                          </InputAdornment>
                        }
                      >
                        <MenuItem value="false">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography>{Locale.label("sermons.liveStreamTimes.serviceEdit.no")}</Typography>
                            <Chip label={Locale.label("sermons.liveStreamTimes.serviceEdit.oneTime")} size="small" sx={{ backgroundColor: "rgba(237, 108, 2, 0.08)", color: "warning.main" }} />
                          </Stack>
                        </MenuItem>
                        <MenuItem value="true">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography>{Locale.label("sermons.liveStreamTimes.serviceEdit.yes")}</Typography>
                            <Chip label={Locale.label("sermons.liveStreamTimes.serviceEdit.weekly")} size="small" sx={{ backgroundColor: "rgba(46, 125, 50, 0.08)", color: "success.main" }} />
                          </Stack>
                        </MenuItem>
                      </Select>
                    )} />
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
                          label={chatAndPrayerStartTime ? DateHelper.prettyTime(new Date(chatAndPrayerStartTime)) : Locale.label("sermons.liveStreamTimes.serviceEdit.timeChipFallback")}
                          size="small"
                          sx={{ backgroundColor: "rgba(25, 118, 210, 0.08)", color: "primary.main" }}
                        />
                      </InputAdornment>
                    )
                  }}
                  {...register("chatBefore")}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label={Locale.label("sermons.liveStreamTimes.serviceEdit.enableChatMinutesAfter")}
                  type="number"
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
                          label={chatAndPrayerEndTime ? DateHelper.prettyTime(new Date(chatAndPrayerEndTime)) : Locale.label("sermons.liveStreamTimes.serviceEdit.timeChipFallback")}
                          size="small"
                          sx={{ backgroundColor: "rgba(25, 118, 210, 0.08)", color: "primary.main" }}
                        />
                      </InputAdornment>
                    )
                  }}
                  {...register("chatAfter")}
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
                          label={earlyStartTime ? DateHelper.prettyTime(new Date(earlyStartTime)) : Locale.label("sermons.liveStreamTimes.serviceEdit.timeChipFallback")}
                          size="small"
                          sx={{ backgroundColor: "rgba(25, 118, 210, 0.08)", color: "primary.main" }}
                        />
                      </InputAdornment>
                    )
                  }}
                  {...register("earlyStart")}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>{Locale.label("sermons.liveStreamTimes.serviceEdit.sermon")}</InputLabel>
                  <Controller name="sermonId" control={control} render={({ field }) => (
                    <Select {...field} value={field.value ?? "latest"} label={Locale.label("sermons.liveStreamTimes.serviceEdit.sermon")}
                      startAdornment={
                        <InputAdornment position="start">
                          <MenuBookIcon sx={{ fontSize: 18, color: "text.secondary", mr: 1 }} />
                        </InputAdornment>
                      }
                    >
                      <MenuItem value="latest">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography>{Locale.label("sermons.liveStreamTimes.serviceEdit.latestSermon")}</Typography>
                          <Chip label={Locale.label("sermons.liveStreamTimes.serviceEdit.auto")} size="small" sx={{ backgroundColor: "rgba(46, 125, 50, 0.08)", color: "success.main" }} />
                        </Stack>
                      </MenuItem>
                      {getSermons()}
                    </Select>
                  )} />
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </Stack>
      </FormCard>
    );
  }
};
