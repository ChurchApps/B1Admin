import React from "react";
import { Button, FormControl, Grid, InputLabel, OutlinedInput, TextField } from "@mui/material";
import { type PlanItemInterface, type SongDetailInterface } from "../../helpers";
import { ApiHelper, ArrayHelper, DisplayBox, InputBox, Locale } from "@churchapps/apphelper";


interface Props {
  planItem: PlanItemInterface
  onDone: () => void
}

export const PlanItemEdit = (props: Props) => {
  const [planItem, setPlanItem] = React.useState<PlanItemInterface>(null);
  const [searchText, setSearchText] = React.useState("");
  const [songs, setSongs] = React.useState<SongDetailInterface[]>([]);
  const [errors, setErrors] = React.useState<string[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setErrors([]);
    const pi = { ...planItem } as PlanItemInterface;
    if (isNaN(pi.seconds)) pi.seconds = 0;
    const value = e.target.value;
    console.log(e.target.name, value, (parseInt(value) * 60), (pi.seconds % 60));
    switch (e.target.name) {
      case "label": pi.label = value; break;
      case "description": pi.description = value; break;
      case "minutes": pi.seconds = (parseInt(value) * 60) + (pi.seconds % 60); break;
      case "seconds": pi.seconds = (Math.floor(pi.seconds / 60) * 60) + parseInt(value); break;
    }
    setPlanItem(pi);
  }

  const loadData = async () => {
    setPlanItem(props.planItem);
  }

  const handleSave = () => {
    ApiHelper.post("/planItems", [planItem], "DoingApi").then(() => { props.onDone(); });
  }

  React.useEffect(() => { loadData(); }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const getHeaderText = () => {
    let result = "Edit";
    if (planItem?.itemType === "header") result += " Header";
    else if (planItem?.itemType === "arrangementKey") result += " Song";
    return result;
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.currentTarget.value);
  }

  const handleSearch = () => {
    setErrors([]);
    if (searchText === "") {
      setErrors(["Please enter a search term."]);
      return;
    }
    else {
      ApiHelper.get("/songs/search?q=" + encodeURIComponent(searchText), "ContentApi").then(data => setSongs(data));
    }
  }

  const handleDelete = () => {
    ApiHelper.delete("/planItems/" + planItem.id, "DoingApi").then(() => { props.onDone(); });
  }

  const selectSong = (song: SongDetailInterface) => {
    const pi = {
      ...planItem,
      relatedId: (song as any).arrangementKeyId,
      label: song.title,
      description: song.artist + " - " + (song as any).shortDescription + " (" + (song as any).arrangementKeySignature + ")",
      seconds: song.seconds
    }
    setPlanItem(pi);
    setSongs([]);
    ApiHelper.post("/planItems", [pi], "DoingApi").then(() => { props.onDone(); });
  }

  const getSongs = () => {
    const songDetails: SongDetailInterface[] = [];
    songs.forEach((song) => {
      if (songDetails.findIndex(sd => sd.id === song.id) === -1) {
        songDetails.push(song);
      }
    });
    const result: JSX.Element[] = [];
    songDetails.forEach((sd) => {

      const keys = ArrayHelper.getAll(songs, "id", sd.id);
      const links: JSX.Element[] = []
      keys.forEach(k => {
        links.push(<span style={{ paddingRight: 10 }}><a href="about:blank" onClick={e => { e.preventDefault(); selectSong(k) }}>{k.shortDescription} ({k.arrangementKeySignature})</a></span>)
      })


      result.push(<tr><td>
        {sd.title} - {sd.artist}
        <div style={{ paddingLeft: 15 }}><b>Key:</b> {links}</div>
      </td></tr>)
    });
    return <table>{result}</table>
  }

  const getSongFields = () => {
    const a = 1;
    return <>
      <FormControl fullWidth variant="outlined">
        <InputLabel htmlFor="searchText">{Locale.label("common.search")}</InputLabel>
        <OutlinedInput id="searchText" aria-label="searchBox" name="searchText" type="text" label={Locale.label("common.name")} value={searchText} onChange={handleSearchChange} data-testid="song-search-input"
          endAdornment={<Button variant="contained" onClick={handleSearch} data-testid="song-search-button" aria-label="Search songs">{Locale.label("common.search")}</Button>}
        />
      </FormControl>
      {getSongs()}
    </>
  }

  const showLabel = planItem?.itemType === "header" || planItem?.itemType === "item" || (planItem?.itemType === "arrangementKey" && planItem?.relatedId);
  const showDesc = planItem?.itemType === "item" || (planItem?.itemType === "arrangementKey" && planItem?.relatedId);
  const showDuration = planItem?.itemType === "item" || (planItem?.itemType === "arrangementKey" && planItem?.relatedId);

  return (<InputBox headerText={getHeaderText()} headerIcon="album" saveFunction={handleSave} cancelFunction={props.onDone} deleteFunction={planItem?.id && handleDelete}>
    {planItem?.itemType === "arrangementKey" && getSongFields()}
    {(showLabel) && <TextField fullWidth label={Locale.label("common.name")} id="label" name="label" type="text" value={planItem?.label} onChange={handleChange} data-testid="plan-item-name-input" aria-label="Plan item name" />}
    {(showDesc) && <TextField multiline fullWidth label="Description" id="description" name="description" type="text" value={planItem?.description} onChange={handleChange} data-testid="plan-item-description-input" aria-label="Plan item description" />}
    {(showDuration) && <Grid container>
      <Grid item xs={6}>
        <TextField fullWidth label="Minutes" name="minutes" type="number" value={Math.floor(planItem?.seconds / 60)} onChange={handleChange} data-testid="plan-item-minutes-input" aria-label="Duration minutes" />
      </Grid>
      <Grid item xs={6}>
        <TextField fullWidth label="Seconds" name="seconds" type="number" value={planItem?.seconds % 60} onChange={handleChange} data-testid="plan-item-seconds-input" aria-label="Duration seconds" />
      </Grid>
    </Grid>}
  </InputBox>)
};

