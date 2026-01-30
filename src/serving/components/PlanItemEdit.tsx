import React from "react";
import { Button, FormControl, Grid, InputLabel, OutlinedInput, TextField } from "@mui/material";
import { type PlanItemInterface, type SongDetailInterface } from "../../helpers";
import { ApiHelper, ArrayHelper, InputBox, Locale } from "@churchapps/apphelper";

interface Props {
  planItem: PlanItemInterface;
  onDone: () => void;
}

export const PlanItemEdit = (props: Props) => {
  const [planItem, setPlanItem] = React.useState<PlanItemInterface>(null);
  const [searchText, setSearchText] = React.useState("");
  const [songs, setSongs] = React.useState<SongDetailInterface[]>([]);
  const [, setErrors] = React.useState<string[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setErrors([]);
    const pi = { ...planItem } as PlanItemInterface;
    if (isNaN(pi.seconds)) pi.seconds = 0;
    const value = e.target.value;
    switch (e.target.name) {
      case "label":
        pi.label = value;
        break;
      case "description":
        pi.description = value;
        break;
      case "minutes":
        pi.seconds = parseInt(value) * 60 + (pi.seconds % 60);
        break;
      case "seconds":
        pi.seconds = Math.floor(pi.seconds / 60) * 60 + parseInt(value);
        break;
    }
    setPlanItem(pi);
  };

  const loadData = async () => {
    setPlanItem(props.planItem);
  };

  const handleSave = () => {
    ApiHelper.post("/planItems", [planItem], "DoingApi").then(() => {
      props.onDone();
    });
  };

  React.useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      ApiHelper.get("/songs/search?q=" + encodeURIComponent(searchText), "ContentApi").then((data) => setSongs(data));
    }
  };

  const handleDelete = () => {
    ApiHelper.delete("/planItems/" + planItem.id, "DoingApi").then(() => {
      props.onDone();
    });
  };

  const selectSong = (song: SongDetailInterface) => {
    const pi = {
      ...planItem,
      relatedId: (song as any).arrangementKeyId,
      label: song.title,
      description: song.artist + " - " + (song as any).shortDescription + " (" + (song as any).arrangementKeySignature + ")",
      seconds: song.seconds,
    };
    setPlanItem(pi);
    setSongs([]);
    ApiHelper.post("/planItems", [pi], "DoingApi").then(() => {
      props.onDone();
    });
  };

  const getSongs = () => {
    const songDetails: SongDetailInterface[] = [];
    songs.forEach((song) => {
      if (songDetails.findIndex((sd) => sd.id === song.id) === -1) {
        songDetails.push(song);
      }
    });
    const result: JSX.Element[] = [];
    songDetails.forEach((sd) => {
      const keys = ArrayHelper.getAll(songs, "id", sd.id);
      const links: JSX.Element[] = [];
      keys.forEach((k) => {
        links.push(
          <span style={{ paddingRight: 10 }}>
            <button
              type="button"
              onClick={() => selectSong(k)}
              style={{ background: "none", border: 0, padding: 0, color: "#1976d2", cursor: "pointer" }}>
              {k.shortDescription} ({k.arrangementKeySignature})
            </button>
          </span>
        );
      });

      result.push(
        <tr>
          <td>
            {sd.title} - {sd.artist}
            <div style={{ paddingLeft: 15 }}>
              <b>{Locale.label("plans.planItemEdit.key")}:</b> {links}
            </div>
          </td>
        </tr>
      );
    });
    return <table>{result}</table>;
  };

  const getSongFields = () => {
    return (
      <>
        <FormControl fullWidth variant="outlined">
          <InputLabel htmlFor="searchText">{Locale.label("common.search")}</InputLabel>
          <OutlinedInput
            id="searchText"
            aria-label="searchBox"
            name="searchText"
            type="text"
            label={Locale.label("common.name")}
            value={searchText}
            onChange={handleSearchChange}
            data-testid="song-search-input"
            endAdornment={
              <Button variant="contained" onClick={handleSearch} data-testid="song-search-button" aria-label="Search songs">
                {Locale.label("common.search")}
              </Button>
            }
          />
        </FormControl>
        {getSongs()}
      </>
    );
  };

  const showLabel = planItem?.itemType === "header" || planItem?.itemType === "item" || planItem?.itemType === "lessonAction" || planItem?.itemType === "lessonSection" || planItem?.itemType === "lessonAddOn" || planItem?.itemType === "action" || planItem?.itemType === "section" || planItem?.itemType === "addon" || planItem?.itemType === "providerPresentation" || planItem?.itemType === "providerSection" || planItem?.itemType === "providerFile" || (planItem?.itemType === "arrangementKey" && planItem?.relatedId);
  const showDesc = planItem?.itemType === "item" || planItem?.itemType === "lessonAction" || planItem?.itemType === "lessonSection" || planItem?.itemType === "lessonAddOn" || planItem?.itemType === "action" || planItem?.itemType === "section" || planItem?.itemType === "addon" || planItem?.itemType === "providerPresentation" || planItem?.itemType === "providerSection" || planItem?.itemType === "providerFile" || (planItem?.itemType === "arrangementKey" && planItem?.relatedId);
  const showDuration = planItem?.itemType === "item" || planItem?.itemType === "lessonAction" || planItem?.itemType === "lessonSection" || planItem?.itemType === "action" || planItem?.itemType === "section" || planItem?.itemType === "providerPresentation" || planItem?.itemType === "providerSection" || (planItem?.itemType === "arrangementKey" && planItem?.relatedId);

  return (
    <InputBox headerText={getHeaderText()} headerIcon="album" saveFunction={handleSave} cancelFunction={props.onDone} deleteFunction={planItem?.id && handleDelete}>
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
          aria-label="Plan item name"
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
          aria-label="Plan item description"
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
              aria-label="Duration minutes"
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
              aria-label="Duration seconds"
            />
          </Grid>
        </Grid>
      )}
    </InputBox>
  );
};
