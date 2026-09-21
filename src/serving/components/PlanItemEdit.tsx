import React from "react";
import { Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText, FormControl, FormControlLabel, FormGroup, Grid, InputLabel, List, ListItem, ListItemText, MenuItem, OutlinedInput, Select, Stack, TextField, Typography } from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { type PlanItemInterface, type PlanItemTimeInterface, type SongDetailInterface } from "../../helpers";
import { type TimeInterface, type PositionInterface } from "@churchapps/helpers";
import { ApiHelper, ArrayHelper, Locale } from "@churchapps/apphelper";
import { shouldShowLabel, shouldShowDescription, shouldShowDuration, duplicatePlanItem } from "./planItemUtils";

interface Props {
  planItem: PlanItemInterface;
  positions?: PositionInterface[];
  onDone: () => void;
}

const keyLabel = (shortDescription?: string, keySignature?: string) => (keySignature ? `${shortDescription || ""} (${keySignature})` : shortDescription || "");

/** Per-service-time settings for one plan item: hide it, and/or show a different position for it. */
interface TimeSettings {
  excluded: boolean;
  positionId?: string;
}

const buildTimeSettings = (rows: PlanItemTimeInterface[]): Record<string, TimeSettings> => {
  const result: Record<string, TimeSettings> = {};
  rows.forEach((row) => {
    if (row.timeId) result[row.timeId] = { excluded: !!row.excluded, positionId: row.positionId || undefined };
  });
  return result;
};

/** Positions whose category is on this service time's team list come first, since that is the likely pick. */
const sortPositionsForTime = (positions: PositionInterface[], time: TimeInterface) => {
  const teams = (time.teams || "").split(",").map((t) => t.trim()).filter(Boolean);
  if (teams.length === 0) return positions;
  return [...positions].sort((a, b) => Number(teams.includes(b.categoryName || "")) - Number(teams.includes(a.categoryName || "")));
};

export const PlanItemEdit = (props: Props) => {
  const [planItem, setPlanItem] = React.useState<PlanItemInterface | null>(null);
  const [searchText, setSearchText] = React.useState("");
  const [songs, setSongs] = React.useState<SongDetailInterface[]>([]);
  const [, setErrors] = React.useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [searching, setSearching] = React.useState(false);
  const [searchError, setSearchError] = React.useState("");
  const [hasSearched, setHasSearched] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [serviceTimes, setServiceTimes] = React.useState<TimeInterface[]>([]);
  const [originalExclusions, setOriginalExclusions] = React.useState<PlanItemTimeInterface[]>([]);
  const [timeSettings, setTimeSettings] = React.useState<Record<string, TimeSettings>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setErrors([]);
    const pi = { ...planItem } as PlanItemInterface;
    if (pi.seconds === undefined || isNaN(pi.seconds)) pi.seconds = 0;
    const value = e.target.value;
    switch (e.target.name) {
      case "label": pi.label = value; break;
      case "description": pi.description = value; break;
      case "minutes": pi.seconds = parseInt(value) * 60 + ((pi.seconds || 0) % 60); break;
      case "seconds": pi.seconds = Math.floor((pi.seconds || 0) / 60) * 60 + parseInt(value); break;
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
    } catch {
      setServiceTimes([]);
    }
    if (props.planItem?.id) {
      try {
        const exs: PlanItemTimeInterface[] = await ApiHelper.get("/planItemTimes/planItem/" + props.planItem.id, "DoingApi");
        setOriginalExclusions(exs || []);
        setTimeSettings(buildTimeSettings(exs || []));
      } catch {
        setOriginalExclusions([]);
        setTimeSettings({});
      }
    } else {
      setOriginalExclusions([]);
      setTimeSettings({});
    }
  }, [props.planItem]);

  // A row exists for (planItem, time) only while that time is excluded or has a position override;
  // when the editor clears both, the row is deleted so the table stays sparse.
  const persistExclusions = async (planItemId: string) => {
    if (serviceTimes.length === 0) return;
    const toSave: PlanItemTimeInterface[] = [];
    const toDelete: PlanItemTimeInterface[] = [];
    serviceTimes.forEach((st) => {
      const timeId = st.id || "";
      if (!timeId) return;
      const desired = timeSettings[timeId] || { excluded: false };
      const existing = originalExclusions.find((e) => e.timeId === timeId);
      if (!desired.excluded && !desired.positionId) {
        if (existing?.id) toDelete.push(existing);
      } else if (!existing) {
        toSave.push({ planItemId, timeId, excluded: desired.excluded, positionId: desired.positionId });
      } else if (!!existing.excluded !== desired.excluded || (existing.positionId || undefined) !== desired.positionId) {
        toSave.push({ id: existing.id, planItemId, timeId, excluded: desired.excluded, positionId: desired.positionId });
      }
    });

    const ops: Promise<any>[] = [];
    if (toSave.length > 0) ops.push(ApiHelper.post("/planItemTimes", toSave, "DoingApi"));
    toDelete.forEach((e) => { if (e.id) ops.push(ApiHelper.delete("/planItemTimes/" + e.id, "DoingApi")); });
    await Promise.all(ops);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saved = await ApiHelper.post("/planItems", [planItem], "DoingApi");
      const savedId = (Array.isArray(saved) ? saved[0]?.id : saved?.id) || planItem?.id;
      if (savedId) {
        await persistExclusions(savedId);
      }
      props.onDone();
    } finally {
      setIsSaving(false);
    }
  };

  const toggleExclusion = (timeId: string) => {
    setTimeSettings((prev) => {
      const current = prev[timeId] || { excluded: false };
      return { ...prev, [timeId]: { ...current, excluded: !current.excluded } };
    });
  };

  const setTimePosition = (timeId: string, positionId: string) => {
    setTimeSettings((prev) => {
      const current = prev[timeId] || { excluded: false };
      return { ...prev, [timeId]: { ...current, positionId: positionId || undefined } };
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
      setHasSearched(true);
      setSearchError("");
      ApiHelper.get("/songs/search?q=" + encodeURIComponent(searchText), "ContentApi")
        .then((data: any) => {
          setSongs(data || []);
        })
        .catch(() => {
          // A slow or failed search used to leave the spinner running forever and
          // surface a global error toast, so report it inline and allow a retry.
          setSongs([]);
          setSearchError(Locale.label("plans.planItemEdit.searchFailed"));
        })
        .finally(() => {
          setSearching(false);
        });
    }
  };

  const handleDelete = async () => {
    if (!planItem) return;
    setIsDeleting(true);
    try {
      await ApiHelper.delete("/planItems/" + planItem.id, "DoingApi");
      props.onDone();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicate = async () => {
    if (!planItem) return;
    setIsSaving(true);
    try {
      await duplicatePlanItem(planItem);
      props.onDone();
    } finally {
      setIsSaving(false);
    }
  };

  const selectSong = (song: SongDetailInterface) => {
    const pi = {
      ...planItem,
      relatedId: song.arrangementKeyId,
      label: song.title,
      description: `${song.artist} - ${keyLabel(song.shortDescription, song.arrangementKeySignature)}`,
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
    if (searchError) {
      return (
        <Typography color="error" sx={{ textAlign: "center", py: 2 }} data-testid="song-search-error">
          {searchError}
        </Typography>
      );
    }
    if (hasSearched && songs.length === 0) {
      return (
        <Typography color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
          {Locale.label("songs.search.noResults") || "No results found"}
        </Typography>
      );
    }
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
                    label={keyLabel(k.shortDescription, k.arrangementKeySignature)}
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
              value={planItem?.label ?? ""}
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
              value={planItem?.description ?? ""}
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
                  value={Math.floor((planItem?.seconds || 0) / 60)}
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
                  value={(planItem?.seconds || 0) % 60}
                  onChange={handleChange}
                  placeholder="30"
                  data-testid="plan-item-seconds-input"
                  aria-label={Locale.label("plans.planItemEdit.durationSecondsAria")}
                />
              </Grid>
            </Grid>
          )}
          {(props.positions?.length || 0) > 0 && (
            <FormControl fullWidth>
              <InputLabel id="positionId-label">{Locale.label("plans.planItemEdit.position")}</InputLabel>
              <Select
                labelId="positionId-label"
                label={Locale.label("plans.planItemEdit.position")}
                value={(props.positions || []).some((p) => p.id === planItem?.positionId) ? planItem?.positionId || "" : ""}
                onChange={(e) => setPlanItem({ ...planItem, positionId: e.target.value || undefined } as PlanItemInterface)}
                data-testid="plan-item-position-select"
              >
                <MenuItem value="">{Locale.label("plans.planItemEdit.noPosition")}</MenuItem>
                {(props.positions || []).map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.categoryName ? `${p.categoryName} - ${p.name}` : p.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {serviceTimes.length > 1 && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                {Locale.label("plans.planItemEdit.includeInServices")}
              </Typography>
              <FormGroup>
                {serviceTimes.map((st) => {
                  const timeId = st.id || "";
                  const settings = timeSettings[timeId] || { excluded: false };
                  const checked = !settings.excluded;
                  const label = st.startTime ? `${st.displayName || ""} · ${new Date(st.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : (st.displayName || "");
                  const timePositions = sortPositionsForTime(props.positions || [], st);
                  return (
                    <Stack key={st.id} className="serviceTimeSettingRow" direction="row" alignItems="center" spacing={1}>
                      <FormControlLabel
                        sx={{ flex: 1, mr: 0 }}
                        control={<Checkbox checked={checked} onChange={() => toggleExclusion(timeId)} data-testid={`include-service-${timeId}`} />}
                        label={label}
                      />
                      {checked && timePositions.length > 0 && (
                        <FormControl size="small" sx={{ minWidth: 190 }}>
                          <InputLabel id={`positionFor-${timeId}-label`}>{Locale.label("plans.planItemEdit.positionForService")}</InputLabel>
                          <Select
                            labelId={`positionFor-${timeId}-label`}
                            label={Locale.label("plans.planItemEdit.positionForService")}
                            value={timePositions.some((pos) => pos.id === settings.positionId) ? settings.positionId || "" : ""}
                            onChange={(e) => setTimePosition(timeId, e.target.value)}
                            data-testid={`position-for-service-${timeId}`}
                          >
                            <MenuItem value="">{Locale.label("plans.planItemEdit.sameAsDefault")}</MenuItem>
                            {timePositions.map((pos) => (
                              <MenuItem key={pos.id} value={pos.id}>{pos.categoryName ? `${pos.categoryName} - ${pos.name}` : pos.name}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    </Stack>
                  );
                })}
              </FormGroup>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {planItem?.id && (
          <>
            <Button onClick={() => setShowDeleteConfirm(true)} disabled={isSaving} sx={{ mr: "auto" }}>
              {Locale.label("common.delete") || "Delete"}
            </Button>
            {planItem.itemType !== "header" && (
              <Button onClick={handleDuplicate} disabled={isSaving}>
                {Locale.label("common.duplicate") || "Duplicate"}
              </Button>
            )}
          </>
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
