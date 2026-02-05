import React, { useEffect } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid } from "@mui/material";
import { ApiHelper } from "@churchapps/apphelper";
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
  }, [props.arrangementKeyId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (songDetail && arrangementKey) {
      loadPraiseCharts();
      loadLinks();
    }
  }, [arrangementKey, songDetail]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog open={true} onClose={props.onClose} fullWidth maxWidth="lg">
      <DialogTitle>{songDetail?.title || "Song Details"}</DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 9 }}>
            {(products?.length > 0 || links.length > 0) && (
              <>
                <h3>Files</h3>
                {listProducts()}
                {listLinks()}
              </>
            )}

            {arrangement?.lyrics && (
              <>
                <h3>Lyrics</h3>
                <div className="chordPro" dangerouslySetInnerHTML={{ __html: ChordProHelper.formatLyrics(arrangement?.lyrics, 0) }} />
              </>
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <SongDetails songDetail={songDetail} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={props.onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
