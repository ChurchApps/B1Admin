import React, { useEffect } from "react";
import { ApiHelper } from "@churchapps/apphelper";
import { Stack } from "@mui/material";

interface SongDetailInterface {
  id?: string;
  praiseChartsId?: string;
  title?: string;
  artist?: string;
  album?: string;
  language?: string;
  thumbnail?: string;
  releaseDate?: Date;
  bpm?: number;
  keySignature?: string;
  seconds: number;
  meter?: string;
  tones?: string;
}

interface SongDetailLinkInterface {
  id?: string;
  songDetailId?: string;
  service?: string;
  serviceKey?: string;
  url?: string;
}

interface Props {
  songDetail: SongDetailInterface;
}

export const SongDetailLinks: React.FC<Props> = (props) => {
  const [songDetailLinks, setSongDetailLinks] = React.useState<SongDetailLinkInterface[]>([]);

  useEffect(() => {
    if (props.songDetail?.id) {
      ApiHelper.get("/songDetailLinks/songDetail/" + props.songDetail?.id, "ContentApi").then((data: SongDetailLinkInterface[]) => {
        setSongDetailLinks(data);
      });
    }
  }, [props.songDetail]);

  const getLink = (link: SongDetailLinkInterface) => {
    const logos: { [key: string]: string } = {
      PraiseCharts: "/images/praisecharts.png",
      Spotify: "https://upload.wikimedia.org/wikipedia/commons/2/26/Spotify_logo_with_text.svg",
      Apple: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/AppleMusic_2019.svg/300px-AppleMusic_2019.svg.png",
      YouTube: "https://upload.wikimedia.org/wikipedia/commons/b/b8/YouTube_Logo_2017.svg",
      CCLI: "https://upload.wikimedia.org/wikipedia/en/thumb/a/a6/Christian_Copyright_Licensing_International_logo.svg/330px-Christian_Copyright_Licensing_International_logo.svg.png",
      Genius: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Genius-Wordmark.svg/330px-Genius-Wordmark.svg.png",
      Hymnary: "https://upload.wikimedia.org/wikipedia/commons/6/6c/Hymnary_logo.png",
      MusicBrainz: "https://upload.wikimedia.org/wikipedia/commons/0/01/MusicBrainz_Logo_with_text_%282016%29.svg"
    };
    let result = <a href={link.url} target="_blank" rel="noreferrer">{link.service}</a>;
    const logo: string = logos[link.service] as string;
    if (logo) result = <a href={link.url} target="_blank" rel="noreferrer"><img src={logo} alt={link.service} style={{ minHeight: 20, maxHeight: 30, maxWidth: 100 }} /></a>;

    return result;
  };

  if (!songDetailLinks || songDetailLinks.length === 0) return null;
  return (
    <>
      <hr />
      <h4>Links</h4>
      <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: "wrap" }}>
        {songDetailLinks?.map((sd) => <React.Fragment key={sd.id}>{getLink(sd)}</React.Fragment>)}
        {props.songDetail?.praiseChartsId && (
          <React.Fragment key="praisecharts">
            {getLink({ service: "PraiseCharts", url: `https://www.praisecharts.com/songs/details/${props.songDetail?.praiseChartsId}?XID=churchapps` })}
          </React.Fragment>
        )}
      </Stack>
    </>
  );
};
