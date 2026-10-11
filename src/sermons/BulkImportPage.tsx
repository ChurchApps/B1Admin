import React, { memo } from "react";
import { UserHelper, Permissions, Locale } from "@churchapps/apphelper";
import { Box, Stack, Typography } from "@mui/material";
import { YouTubeImport, VimeoImport } from "./components";
import { SermonChrome } from "./components/SermonChrome";
import { PillTabs, Surface, TextAction } from "../components/ui";

type ImportType = "youtube" | "vimeo" | "";

export const BulkImportPage = memo(() => {
  const [importType, setImportType] = React.useState<ImportType>("");

  if (!UserHelper.checkAccess(Permissions.contentApi.streamingServices.edit)) return <></>;

  const sources = [
    { key: "youtube" as const, title: Locale.label("sermons.bulkImport.youtube"), description: Locale.label("sermons.bulkImport.youtubeDescription"), action: Locale.label("sermons.bulkImport.importFromYouTube"), testId: "import-youtube-button" },
    { key: "vimeo" as const, title: Locale.label("sermons.bulkImport.vimeo"), description: Locale.label("sermons.bulkImport.vimeoDescription"), action: Locale.label("sermons.bulkImport.importFromVimeo"), testId: "import-vimeo-button" }
  ];

  return (
    <SermonChrome
      selected="bulk"
      actions={importType && (
        <TextAction onClick={() => setImportType("")} aria-label={Locale.label("common.back")} data-testid="bulk-import-back">{"← " + Locale.label("common.back")}</TextAction>
      )}>
      {importType
        ? (importType === "youtube"
          ? <YouTubeImport handleDone={() => setImportType("")} />
          : <VimeoImport handleDone={() => setImportType("")} />)
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
