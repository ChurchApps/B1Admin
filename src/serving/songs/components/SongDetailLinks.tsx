import React, { useEffect, memo, useMemo } from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { type SongDetailInterface, type SongDetailLinkInterface } from "../../../helpers";
import { Stack, Box, Card, CardContent, Typography, Avatar, Button } from "@mui/material";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Link as LinkIcon, Add as AddIcon, Edit as EditIcon } from "@mui/icons-material";
import { AppIconButton } from "../../../components/ui/AppIconButton";

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

  const serviceColors: { [key: string]: string } = useMemo(
    () => ({
      PraiseCharts: "#4f46e5",
      Spotify: "#1db954",
      Apple: "#fc3c44",
      YouTube: "#ff0000",
      CCLI: "#2563eb",
      Genius: "#ffff64",
      Hymnary: "#8b5cf6",
      MusicBrainz: "#ba68c8"
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
      const logo = serviceLogos[link.service];
      const color = serviceColors[link.service] || "primary.main";

      return (
        <Card
          key={link.id || index}
          sx={{
            flex: "0 0 calc(50% - 8px)",
            minHeight: 64,
            maxHeight: 64,
            transition: "all 0.2s ease-in-out",
            cursor: "pointer",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: 2
            }
          }}
          component="a"
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "none" }}>
          <CardContent sx={{ p: 2, textAlign: "center", "&:last-child": { pb: 2 }, display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
            {logo ? (
              <img
                src={logo}
                alt={link.service}
                style={{
                  maxHeight: 40,
                  maxWidth: 40,
                  objectFit: "contain"
                }}
              />
            ) : (
              <Avatar
                sx={{
                  bgcolor: color,
                  width: 40,
                  height: 40
                }}>
                <LinkIcon sx={{ color: "white", fontSize: 24 }} />
              </Avatar>
            )}
          </CardContent>
        </Card>
      );
    });
  }, [allLinks, serviceLogos, serviceColors]);

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <LinkIcon sx={{ color: "primary.main", fontSize: 20 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
            {Locale.label("songs.songDetailLinks.externalLinks")}
          </Typography>
        </Stack>
        {props.onEdit && (
          <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon />} tone="card" onClick={props.onEdit} />
        )}
      </Stack>

      {!allLinks || allLinks.length === 0 ? (
        <EmptyState
          icon={<LinkIcon />}
          title={Locale.label("songs.songDetailLinks.noLinksYet")}
          action={props.onEdit && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={props.onEdit} size="small">
              {Locale.label("songs.songDetailLinks.addFirstLink")}
            </Button>
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
