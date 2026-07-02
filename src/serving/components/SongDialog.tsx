import React, { useEffect } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, Grid, InputLabel, MenuItem, Select, type SelectChangeEvent } from "@mui/material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import type { LinkInterface } from "@churchapps/helpers";
import type { ArrangementInterface, ArrangementKeyInterface, SongDetailInterface } from "../../helpers/Interfaces";
import { SongDetails } from "./SongDetails";
import { ChordProHelper } from "../../helpers/ChordProHelper";
import { PraiseChartsHelper } from "../../helpers/PraiseChartsHelper";

interface PraiseChartsProduct {
  name: string;
  file_type: string;
  download: string;
}

interface Props {
  arrangementKeyId?: string;
  onClose: () => void;
}

export const SongDialog: React.FC<Props> = (props) => {
  const [arrangementKey, setArrangementKey] = React.useState<ArrangementKeyInterface>(null);
  const [arrangement, setArrangement] = React.useState<ArrangementInterface>(null);
  const [songDetail, setSongDetail] = React.useState<SongDetailInterface>(null);
  const [products, setProducts] = React.useState<PraiseChartsProduct[]>([]);
  const [links, setLinks] = React.useState<LinkInterface[]>([]);
  const [keyOffset, setKeyOffset] = React.useState(0);

  const loadData = async () => {
    if (!props.arrangementKeyId) return;
    const ak = await ApiHelper.get("/arrangementKeys/" + props.arrangementKeyId, "ContentApi");
    setArrangementKey(ak);
    const arr = await ApiHelper.get("/arrangements/" + ak.arrangementId, "ContentApi");
    setArrangement(arr);
    const sd = await ApiHelper.get("/songDetails/" + arr.songDetailId, "ContentApi");
    setSongDetail(sd);
  };

  const download = async (product: PraiseChartsProduct) => {
    const qs = product.download.split("?")[1].split("&");
    const skus = qs[0].split("=")[1];
    const keys = qs[1].split("=")[1];
    const url = await PraiseChartsHelper.download(skus, product.name + "." + product.file_type, keys);
    window.open(url, "_blank");
  };

  const listProducts = () => (
    <ul>
      {products.map((p, i) => (
        <li key={i}>
          <a href="about:blank" onClick={(e) => { e.preventDefault(); download(p); }}>
            {p.name}
          </a>
        </li>
      ))}
    </ul>
  );

  const listLinks = () => (
    <ul>
      {links.map((l) => (
        <li key={l.id}>
          <a href={l.url} target="_blank" rel="noreferrer">{l.text}</a>
        </li>
      ))}
    </ul>
  );

  const loadPraiseCharts = async () => {
    if (arrangementKey && songDetail?.praiseChartsId) {
      const data = await ApiHelper.get("/praiseCharts/arrangement/raw/" + songDetail.praiseChartsId + "?keys=" + arrangementKey.keySignature, "ContentApi");
      const prods = data[arrangementKey.keySignature];
      if (prods) setProducts(prods);
      else setProducts([]);
    }
  };

  const loadLinks = () => {
    if (arrangementKey) {
      ApiHelper.get("/links?category=arrangementKey_" + arrangementKey.id, "ContentApi").then((data: LinkInterface[]) => {
        setLinks(data);
      });
    }
  };

  useEffect(() => {
    loadData();
  }, [props.arrangementKeyId]);

  useEffect(() => {
    if (songDetail && arrangementKey) {
      loadPraiseCharts();
      loadLinks();
    }
  }, [arrangementKey, songDetail]);

  const getKeyOptions = (originalIndex: number) =>
    ChordProHelper.noteNames.map((note, index) => (
      <MenuItem key={note} value={(index - originalIndex).toString()}>{note}</MenuItem>
    ));

  const handleKeyChange = (e: SelectChangeEvent) => { setKeyOffset(parseInt(e.target.value)); };

  const getKeySelect = () => {
    const originalKey = songDetail?.keySignature;
    if (!originalKey) return null;
    const originalIndex = ChordProHelper.noteMap[originalKey];
    if (originalIndex === undefined) return null;
    return (
      <FormControl size="small" sx={{ minWidth: 120, mb: 1 }}>
        <InputLabel id="keySignature">{Locale.label("songs.oldArrangement.key")}</InputLabel>
        <Select name="keySignature" labelId="keySignature" label={Locale.label("songs.oldArrangement.key")} value={keyOffset.toString()} onChange={handleKeyChange}>
          {getKeyOptions(originalIndex)}
        </Select>
      </FormControl>
    );
  };

  return (
    <Dialog open={true} onClose={props.onClose} fullWidth maxWidth="lg">
      <DialogTitle>{songDetail?.title || Locale.label("plans.songDialog.fallbackTitle")}</DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 9 }}>
            {(products?.length > 0 || links.length > 0) && (
              <>
                <h3>{Locale.label("plans.songDialog.files")}</h3>
                {listProducts()}
                {listLinks()}
              </>
            )}

            {arrangement?.lyrics && (
              <>
                <h3>{Locale.label("plans.songDialog.lyrics")}</h3>
                {getKeySelect()}
                <div className="chordPro" dangerouslySetInnerHTML={{ __html: ChordProHelper.formatLyrics(arrangement?.lyrics, keyOffset) }} />
              </>
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <SongDetails songDetail={songDetail} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={props.onClose}>{Locale.label("plans.songDialog.close")}</Button>
      </DialogActions>
    </Dialog>
  );
};
