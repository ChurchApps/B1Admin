import React from "react";
import { Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText, FormControl, FormControlLabel, FormGroup, Grid, InputLabel, List, ListItem, ListItemText, OutlinedInput, Stack, TextField, Typography } from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { type PlanItemInterface, type SongDetailInterface } from "../../helpers";
import { type TimeInterface, type PlanItemTimeInterface } from "@churchapps/helpers";
import { ApiHelper, ArrayHelper, Locale } from "@churchapps/apphelper";
import { shouldShowLabel, shouldShowDescription, shouldShowDuration } from "./planItemUtils";

interface Props {
  planItem: PlanItemInterface;
  onDone: () => void;
}

export const PlanItemEdit = (props: Props) => {
  const [planItem, setPlanItem] = React.useState<PlanItemInterface | null>(null);
  const [searchText, setSearchText] = React.useState("");
  const [songs, setSongs] = React.useState<SongDetailInterface[]>([]);
  const [, setErrors] = React.useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [searching, setSearching] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [serviceTimes, setServiceTimes] = React.useState<TimeInterface[]>([]);
  const [originalExclusions, setOriginalExclusions] = React.useState<PlanItemTimeInterface[]>([]);
  const [excludedTimeIds, setExcludedTimeIds] = React.useState<Set<string>>(new Set());

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setErrors([]);
    const pi = { ...planItem } as PlanItemInterface;
    if (isNaN(pi.seconds)) pi.seconds = 0;
    const value = e.target.value;
    switch (e.target.name) {
      case "label": pi.label = value; break;
      case "description": pi.description = value; break;
      case "minutes": pi.seconds = parseInt(value) * 60 + (pi.seconds % 60); break;
      case "seconds": pi.seconds = Math.floor(pi.seconds / 60) * 60 + parseInt(value); break;
    }
    setPlanItem(pi);
  };

  const loadData = React.useCallback(async () => {
    setPlanItem(props.planItem);
    if (!props.planItem?.planId) return;
    try {
      const times: TimeInterface[] = await ApiHelper.get("/times/plan/" + props.planItem.planId, "DoingApi");
      const services = (times || []).filter((t) => (t.serviceTimeType ?? "service") === "service");
      services.sort((a, b) => new Date(a.startTime || 0).getTime() - new Date(b.startTime || 0).getTime());
      setServiceTimes(services);
    } catch (e) {
      setServiceTimes([]);
    }
    if (props.planItem?.id) {
      try {
        const exs: PlanItemTimeInterface[] = await ApiHelper.get("/planItemTimes/planItem/" + props.planItem.id, "DoingApi");
        setOriginalExclusions(exs || []);
        setExcludedTimeIds(new Set((exs || []).filter((e) => e.excluded).map((e) => e.timeId || "")));
      } catch (e) {
        setOriginalExclusions([]);
        setExcludedTimeIds(new Set());
      }
    } else {
      setOriginalExclusions([]);
      setExcludedTimeIds(new Set());
    }
  }, [props.planItem]);

  const persistExclusions = async (planItemId: string) => {
    if (serviceTimes.length === 0) return;
    const originalExcludedTimeIds = new Set(originalExclusions.filter((e) => e.excluded).map((e) => e.timeId || ""));
    const toAdd: PlanItemTimeInterface[] = [];
    excludedTimeIds.forEach((tid) => {
      if (!originalExcludedTimeIds.has(tid)) toAdd.push({ planItemId, timeId: tid, excluded: true });
    });
    const toDelete: PlanItemTimeInterface[] = originalExclusions.filter((e) => e.excluded && !excludedTimeIds.has(e.timeId || ""));

    const ops: Promise<any>[] = [];
    if (toAdd.length > 0) ops.push(ApiHelper.post("/planItemTimes", toAdd, "DoingApi"));
    toDelete.forEach((e) => { if (e.id) ops.push(ApiHelper.delete("/planItemTimes/" + e.id, "DoingApi")); });
    await Promise.all(ops);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saved = await ApiHelper.post("/planItems", [planItem], "DoingApi");
      const savedId = (Array.isArray(saved) ? saved[0]?.id : saved?.id) || planItem?.id;
      if (savedId && planItem?.itemType !== "header") {
        await persistExclusions(savedId);
      }
      props.onDone();
    } finally {
      setIsSaving(false);
    }
  };

  const toggleExclusion = (timeId: string) => {
    setExcludedTimeIds((prev) => {
      const next = new Set(prev);
      if (next.has(timeId)) next.delete(timeId); else next.add(timeId);
      return next;
    });
  };

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const getHeaderText = () => {
    if (planItem?.itemType === "header") return Locale.label("plans.planItemEdit.editHeader");
    else if (planItem?.itemType === "arrangementKey") return Locale.label("plans.planItemEdit.editSong");
    else if (planItem?.itemType === "lessonAddOn" || planItem?.itemType === "addon" || planItem?.itemType === "providerFile") return Locale.label("plans.planItemEdit.editAddOn") || "Edit Add-On";
    return Locale.label("plans.planItemEdit.edit");
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.currentTarget.value);
  };

  const handleSearch = () => {
    setErrors([]);
    if (searchText === "") {
      setErrors([Locale.label("plans.planItemEdit.enterSearch")]);
      return;
    } else {
      setSearching(true);
      ApiHelper.get("/songs/search?q=" + encodeURIComponent(searchText), "ContentApi").then((data) => {
        setSongs(data);
        setSearching(false);
      });
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await ApiHelper.delete("/planItems/" + planItem.id, "DoingApi");
      props.onDone();
    } finally {
      setIsDeleting(false);
    }
  };

  const selectSong = (song: SongDetailInterface) => {
    const pi = {
      ...planItem,
      relatedId: song.arrangementKeyId,
      label: song.title,
      description: `${song.artist} - ${song.shortDescription || ""} (${song.arrangementKeySignature || ""})`,
      seconds: song.seconds,
      thumbnailUrl: song.thumbnail
    };
    setPlanItem(pi);
    setSongs([]);
    ApiHelper.post("/planItems", [pi], "DoingApi").then(() => {
      props.onDone();
    });
  };

  const getSongs = () => {
    if (searching) return <CircularProgress size={24} sx={{ display: "block", mx: "auto", my: 2 }} />;
    const songDetails: SongDetailInterface[] = [];
    songs.forEach((song) => {
      if (songDetails.findIndex((sd) => sd.id === song.id) === -1) {
        songDetails.push(song);
      }
    });
    return (
      <List dense>
        {songDetails.map((sd) => {
          const keys = ArrayHelper.getAll(songs, "id", sd.id);
          return (
            <ListItem key={sd.id} sx={{ flexDirection: "column", alignItems: "flex-start" }}>
              <ListItemText primary={`${sd.title} - ${sd.artist}`} />
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 0.5 }}>
                {keys.map((k: any) => (
                  <Chip
                    key={k.arrangementKeyId}
                    label={`${k.shortDescription} (${k.arrangementKeySignature})`}
                    size="small"
                    clickable
                    onClick={() => selectSong(k)}
                  />
                ))}
              </Stack>
            </ListItem>
          );
        })}
      </List>
    );
  };

  const getSongFields = () => {
    return (
      <>
        <FormControl fullWidth variant="outlined">
          <InputLabel htmlFor="searchText">{Locale.label("common.search")}</InputLabel>
          <OutlinedInput
            id="searchText"
            aria-label={Locale.label("plans.planItemEdit.searchBoxAria")}
            name="searchText"
            type="text"
            label={Locale.label("common.name")}
            value={searchText}
            onChange={handleSearchChange}
            data-testid="song-search-input"
            endAdornment={
              <AppIconButton label={Locale.label("common.search")} icon={<SearchIcon />} edge="end" onClick={handleSearch} data-testid="song-search-button" />
            }
          />
        </FormControl>
        {getSongs()}
      </>
    );
  };

  const showLabel = shouldShowLabel(planItem?.itemType, !!planItem?.relatedId);
  const showDesc = shouldShowDescription(planItem?.itemType, !!planItem?.relatedId);
  const showDuration = shouldShowDuration(planItem?.itemType, !!planItem?.relatedId);

  return (
    <Dialog open={true} onClose={props.onDone} maxWidth="sm" fullWidth>
      <DialogTitle>{getHeaderText()}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {planItem?.itemType === "arrangementKey" && getSongFields()}
          {showLabel && (
            <TextField
              fullWidth
              label={Locale.label("common.name")}
              id="label"
              name="label"
              type="text"
              value={planItem?.label}
              onChange={handleChange}
              placeholder={Locale.label("placeholders.planItem.label")}
              data-testid="plan-item-name-input"
              aria-label={Locale.label("plans.planItemEdit.planItemNameAria")}
            />
          )}
          {showDesc && (
            <TextField
              multiline
              fullWidth
              label={Locale.label("plans.planItemEdit.description")}
              id="description"
              name="description"
              type="text"
              value={planItem?.description}
              onChange={handleChange}
              placeholder={Locale.label("placeholders.planItem.description")}
              data-testid="plan-item-description-input"
              aria-label={Locale.label("plans.planItemEdit.planItemDescriptionAria")}
            />
          )}
          {showDuration && (
            <Grid container>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label={Locale.label("plans.planItemEdit.minutes")}
                  name="minutes"
                  type="number"
                  value={Math.floor(planItem?.seconds / 60)}
                  onChange={handleChange}
                  placeholder="5"
                  data-testid="plan-item-minutes-input"
                  aria-label={Locale.label("plans.planItemEdit.durationMinutesAria")}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label={Locale.label("plans.planItemEdit.seconds")}
                  name="seconds"
                  type="number"
                  value={planItem?.seconds % 60}
                  onChange={handleChange}
                  placeholder="30"
                  data-testid="plan-item-seconds-input"
                  aria-label={Locale.label("plans.planItemEdit.durationSecondsAria")}
                />
              </Grid>
            </Grid>
          )}
          {planItem?.itemType !== "header" && serviceTimes.length > 1 && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                {Locale.label("plans.planItemEdit.includeInServices")}
              </Typography>
              <FormGroup>
                {serviceTimes.map((st) => {
                  const checked = !excludedTimeIds.has(st.id || "");
                  const label = st.startTime ? `${st.displayName || ""} · ${new Date(st.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : (st.displayName || "");
                  return (
                    <FormControlLabel
                      key={st.id}
                      control={<Checkbox checked={checked} onChange={() => toggleExclusion(st.id || "")} data-testid={`include-service-${st.id}`} />}
                      label={label}
                    />
                  );
                })}
              </FormGroup>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {planItem?.id && (
          <Button onClick={() => setShowDeleteConfirm(true)} color="error" sx={{ mr: "auto" }} disabled={isSaving}>
            {Locale.label("common.delete") || "Delete"}
          </Button>
        )}
        <Button onClick={props.onDone} variant="outlined" disabled={isSaving}>{Locale.label("common.cancel") || "Cancel"}</Button>
        <Button onClick={handleSave} variant="contained" disabled={isSaving} startIcon={isSaving ? <CircularProgress size={16} /> : null}>
          {Locale.label("common.save") || "Save"}
        </Button>
      </DialogActions>

      <Dialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} maxWidth="xs">
        <DialogTitle>{Locale.label("plans.planItemEdit.confirmDelete") || "Confirm Delete"}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {Locale.label("plans.planItemEdit.confirmDeleteMessage") || "Are you sure you want to delete this item?"}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteConfirm(false)} variant="outlined" disabled={isDeleting}>{Locale.label("common.cancel") || "Cancel"}</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={isDeleting} startIcon={isDeleting ? <CircularProgress size={16} /> : null}>
            {Locale.label("common.delete") || "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};
