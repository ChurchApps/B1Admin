import React, { memo, useCallback, useMemo } from "react";
import { Locale, DateHelper } from "@churchapps/apphelper";
import { type SongDetailInterface } from "../../../helpers";
import { Box, Typography, Stack, Avatar, List, ListItem, ListItemIcon, ListItemText, Divider } from "@mui/material";
import { EmptyState, StatusBadge, Surface } from "../../../components/ui";
import { AppIconButton } from "../../../components/ui/AppIconButton";
import {
  Edit as EditIcon,
  Album as AlbumIcon,
  Person as ArtistIcon,
  Schedule as TimeIcon,
  MusicNote as KeyIcon,
  Speed as BpmIcon,
  Language as LanguageIcon,
  DateRange as DateIcon,
  Timer as TimerIcon
} from "@mui/icons-material";
import { SongDetailsEdit } from "./SongDetailsEdit";
import { SongDetailLinks } from "./SongDetailLinks";

interface Props {
  songDetail: SongDetailInterface;
  reload: () => void;
}

export const SongDetails = memo((props: Props) => {
  const [editMode, setEditMode] = React.useState(false);

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.style.display = "none";
  }, []);

  const formatSeconds = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins + ":" + (secs < 10 ? "0" : "") + secs;
  }, []);

  const songDetailItems = useMemo(() => {
    const items: any[] = [];
    if (!props.songDetail) return items;

    if (props.songDetail.artist) {
      items.push({
        icon: <ArtistIcon />,
        label: Locale.label("songs.details.artist") || "Artist",
        value: props.songDetail.artist,
        color: "text.secondary"
      });
    }

    if (props.songDetail.album) {
      items.push({
        icon: <AlbumIcon />,
        label: Locale.label("songs.details.album") || "Album",
        value: props.songDetail.album,
        color: "text.secondary"
      });
    }

    if (props.songDetail.releaseDate) {
      const d = new Date(props.songDetail.releaseDate);
      items.push({
        icon: <DateIcon />,
        label: Locale.label("songs.details.releaseDate") || "Release Date",
        value: d.toLocaleDateString(DateHelper.locale),
        color: "text.secondary"
      });
    }

    if (props.songDetail.language) {
      items.push({
        icon: <LanguageIcon />,
        label: Locale.label("songs.details.language") || "Language",
        value: props.songDetail.language,
        color: "text.secondary"
      });
    }

    if (props.songDetail.bpm) {
      items.push({
        icon: <BpmIcon />,
        label: Locale.label("songs.details.bpm") || "BPM",
        value: props.songDetail.bpm.toString(),
        color: "text.secondary"
      });
    }

    if (props.songDetail.keySignature) {
      items.push({
        icon: <KeyIcon />,
        label: Locale.label("songs.details.keySignature") || "Key Signature",
        value: props.songDetail.keySignature,
        color: "text.secondary"
      });
    }

    if (props.songDetail.tones) {
      items.push({
        icon: <KeyIcon />,
        label: Locale.label("songs.details.keys") || "Keys",
        value: props.songDetail.tones,
        color: "text.secondary"
      });
    }

    if (props.songDetail.meter) {
      items.push({
        icon: <TimeIcon />,
        label: Locale.label("songs.details.meter") || "Meter",
        value: props.songDetail.meter,
        color: "text.secondary"
      });
    }

    if (props.songDetail.seconds) {
      items.push({
        icon: <TimerIcon />,
        label: Locale.label("songs.details.length") || "Length",
        value: formatSeconds(props.songDetail.seconds),
        color: "text.secondary"
      });
    }

    return items;
  }, [props.songDetail, formatSeconds]);

  const handleSave = useCallback(() => {
    props.reload();
    setEditMode(false);
  }, [props.reload]);

  const handleCancel = useCallback(() => {
    setEditMode(false);
  }, []);

  const handleEdit = useCallback(() => {
    setEditMode(true);
  }, []);

  if (editMode) return <SongDetailsEdit songDetail={props.songDetail} onCancel={handleCancel} onSave={handleSave} reload={props.reload} />;

  return (
    <Surface>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h2">
          {props.songDetail?.title || Locale.label("songs.songDetails.fallbackTitle")}
        </Typography>
        <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon />} tone="card" onClick={handleEdit} />
      </Stack>

      {props.songDetail?.thumbnail && (
        <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
          <Avatar
            src={props.songDetail.thumbnail}
            sx={{ width: 120, height: 120, bgcolor: "var(--b1-canvas)", border: 1, borderColor: "divider" }}
            onError={handleImageError}>
            <AlbumIcon color="action" />
          </Avatar>
        </Box>
      )}

      {songDetailItems.length > 0 ? (
        <List sx={{ p: 0 }}>
          {songDetailItems.map((item, index) => (
            <Box key={index}>
              <ListItem sx={{ px: 0, py: 1 }}>
                <ListItemIcon sx={{ minWidth: 40 }}>{React.cloneElement(item.icon, { sx: { color: item.color, fontSize: 20 } })}</ListItemIcon>
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, minWidth: 100 }}>
                        {item.label}:
                      </Typography>
                      <StatusBadge tone="neutral">{item.value}</StatusBadge>
                    </Stack>
                  }
                  slotProps={{ primary: { component: "div" } }}
                />
              </ListItem>
              {index < songDetailItems.length - 1 && <Divider />}
            </Box>
          ))}
        </List>
      ) : (
        <EmptyState variant="plain" icon={<AlbumIcon />} title={Locale.label("songs.songDetails.noDetails")} />
      )}

      <Box sx={{ mt: 3 }}>
        <SongDetailLinks songDetail={props.songDetail} />
      </Box>
    </Surface>
  );
});
