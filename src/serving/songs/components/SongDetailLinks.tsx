import React, { useEffect, memo, useMemo } from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { type SongDetailInterface, type SongDetailLinkInterface } from "../../../helpers";
import { Stack, Box, Avatar } from "@mui/material";
import { EmptyState, RecordHeading, TextAction } from "../../../components/ui";
import { Link as LinkIcon } from "@mui/icons-material";

interface Props {
  songDetail: SongDetailInterface;
  onEdit?: () => void;
}

export const SongDetailLinks = memo((props: Props) => {
  const [songDetailLinks, setSongDetailLinks] = React.useState<SongDetailLinkInterface[]>([]);

  useEffect(() => {
    if (props.songDetail?.id) {
      ApiHelper.get("/songDetailLinks/songDetail/" + props.songDetail?.id, "ContentApi").then((data: any) => {
        setSongDetailLinks(data);
      });
    }
  }, [props.songDetail]);

  const serviceLogos: { [key: string]: string } = useMemo(
    () => ({
      PraiseCharts: "/images/praisecharts.png",
      Spotify: "https://upload.wikimedia.org/wikipedia/commons/2/26/Spotify_logo_with_text.svg",
      Apple: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/AppleMusic_2019.svg/300px-AppleMusic_2019.svg.png",
      YouTube: "https://upload.wikimedia.org/wikipedia/commons/b/b8/YouTube_Logo_2017.svg",
      CCLI: "https://upload.wikimedia.org/wikipedia/en/thumb/a/a6/Christian_Copyright_Licensing_International_logo.svg/330px-Christian_Copyright_Licensing_International_logo.svg.png",
      Genius: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Genius-Wordmark.svg/330px-Genius-Wordmark.svg.png",
      Hymnary: "https://upload.wikimedia.org/wikipedia/commons/6/6c/Hymnary_logo.png",
      MusicBrainz: "https://upload.wikimedia.org/wikipedia/commons/0/01/MusicBrainz_Logo_with_text_%282016%29.svg"
    }),
    []
  );

  const allLinks = useMemo(() => {
    const links = [...songDetailLinks];

    // Add PraiseCharts link if available
    if (props.songDetail?.praiseChartsId) {
      links.push({
        service: "PraiseCharts",
        url: `https://www.praisecharts.com/songs/details/${props.songDetail.praiseChartsId}?XID=churchapps`
      });
    }

    return links;
  }, [songDetailLinks, props.songDetail?.praiseChartsId]);

  const linkCards = useMemo(() => {
    return allLinks.map((link, index) => {
      const logo = serviceLogos[link.service ?? ""];

      return (
        <Box
          key={link.id || index}
          component="a"
          href={/^https?:\/\//i.test(link.url || "") || /^mailto:/i.test(link.url || "") ? link.url : "#"}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.service}
          sx={{ flex: "0 0 calc(50% - 8px)", minHeight: 64, display: "flex", alignItems: "center", justifyContent: "center", border: 1, borderColor: "divider", borderRadius: "var(--b1-radius-control)", bgcolor: "common.white", textDecoration: "none", "&:hover": { borderColor: "var(--b1-control-border)" } }}>
          {logo ? (
            <img src={logo} alt={link.service} style={{ maxHeight: 40, maxWidth: 60, objectFit: "contain" }} />
          ) : (
            <Avatar sx={{ bgcolor: "var(--b1-neutral)", width: 40, height: 40 }}>
              <LinkIcon />
            </Avatar>
          )}
        </Box>
      );
    });
  }, [allLinks, serviceLogos]);

  return (
    <Box>
      <RecordHeading label={Locale.label("songs.songDetailLinks.externalLinks")}>
        {props.onEdit && allLinks.length > 0 && <TextAction small onClick={props.onEdit} data-testid="song-links-edit">{Locale.label("common.edit")}</TextAction>}
      </RecordHeading>

      {!allLinks || allLinks.length === 0 ? (
        <EmptyState
          variant="plain"
          icon={<LinkIcon />}
          title={Locale.label("songs.songDetailLinks.noLinksYet")}
          action={props.onEdit && (
            <TextAction small onClick={props.onEdit}>{Locale.label("songs.songDetailLinks.addFirstLink")}</TextAction>
          )}
        />
      ) : (
        <Stack
          direction="row"
          spacing={2}
          useFlexGap
          sx={{
            flexWrap: "wrap",
            justifyContent: { xs: "center", sm: "flex-start" }
          }}>
          {linkCards}
        </Stack>
      )}
    </Box>
  );
});
