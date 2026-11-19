import React, { memo } from "react";
import { Permissions, Locale } from "@churchapps/apphelper";
import { Box, Stack, Typography } from "@mui/material";
import { YouTubeImport, VimeoImport, PodcastImport } from "./components";
import { SermonChrome } from "./components/SermonChrome";
import { useRequirePermission } from "../hooks";
import { PillTabs, Surface, TextAction } from "../components/ui";

type ImportType = "youtube" | "vimeo" | "podcast" | "";

export const BulkImportPage = memo(() => {
  const [importType, setImportType] = React.useState<ImportType>("");

  const denied = useRequirePermission(Permissions.contentApi.streamingServices.edit);
  if (denied) return denied;

  const sources = [
    { key: "youtube" as const, title: Locale.label("sermons.bulkImport.youtube"), description: Locale.label("sermons.bulkImport.youtubeDescription"), action: Locale.label("sermons.bulkImport.importFromYouTube"), testId: "import-youtube-button" },
    { key: "vimeo" as const, title: Locale.label("sermons.bulkImport.vimeo"), description: Locale.label("sermons.bulkImport.vimeoDescription"), action: Locale.label("sermons.bulkImport.importFromVimeo"), testId: "import-vimeo-button" },
    { key: "podcast" as const, title: Locale.label("sermons.bulkImport.podcast"), description: Locale.label("sermons.bulkImport.podcastDescription"), action: Locale.label("sermons.bulkImport.importFromPodcast"), testId: "import-podcast-button" }
  ];

  const renderImport = () => {
    const handleDone = () => setImportType("");
    switch (importType) {
      case "youtube": return <YouTubeImport handleDone={handleDone} />;
      case "vimeo": return <VimeoImport handleDone={handleDone} />;
      case "podcast": return <PodcastImport handleDone={handleDone} />;
      default: return null;
    }
  };

  return (
    <SermonChrome
      selected="bulk"
      actions={importType && (
        <TextAction onClick={() => setImportType("")} aria-label={Locale.label("common.back")} data-testid="bulk-import-back">{"← " + Locale.label("common.back")}</TextAction>
      )}>
      {importType
        ? renderImport()
        : (
          <Surface sx={{ maxWidth: 720 }}>
            <Typography variant="h3" component="h2" sx={{ mb: 2 }}>{Locale.label("sermons.bulkImport.chooseSource")}</Typography>
            <PillTabs
              options={sources.map((s) => ({ value: s.key, label: s.title, "data-testid": s.testId }))}
              value=""
              onChange={(v) => setImportType(v as ImportType)}
              aria-label={Locale.label("sermons.bulkImport.chooseSource")}
            />
            <Stack spacing={3} sx={{ mt: 3 }}>
              {sources.map((s) => (
                <Box key={s.key}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{s.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{s.description}</Typography>
                  <Box sx={{ mt: 1 }}>
                    <TextAction small onClick={() => setImportType(s.key)}>{s.action}</TextAction>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Surface>
        )}
    </SermonChrome>
  );
});
