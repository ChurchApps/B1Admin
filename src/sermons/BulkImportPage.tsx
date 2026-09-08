import React, { memo } from "react";
import { UserHelper, Permissions, Locale } from "@churchapps/apphelper";
import { Box, Typography } from "@mui/material";
import { YouTubeImport, VimeoImport } from "./components";
import { SermonChrome } from "./components/SermonChrome";
import { Pills, Verb } from "./components/plate";

export const BulkImportPage = memo(() => {
  const [importType, setImportType] = React.useState<"youtube" | "vimeo" | "">();

  if (!UserHelper.checkAccess(Permissions.contentApi.streamingServices.edit)) return <></>;

  return (
    <SermonChrome
      selected="bulk"
      extraVerbs={importType ? <Verb onClick={() => setImportType("")}>{Locale.label("common.back")}</Verb> : undefined}>
      {importType
        ? (importType === "youtube"
          ? <YouTubeImport handleDone={() => setImportType("")} />
          : <VimeoImport handleDone={() => setImportType("")} />)
        : (
          <>
            <Typography sx={{ color: "text.secondary", mb: 2 }}>{Locale.label("sermons.bulkImport.chooseSource")}</Typography>
            <Pills
              items={[
                { label: Locale.label("sermons.bulkImport.youtube"), selected: false, onClick: () => setImportType("youtube"), testId: "import-youtube-button" },
                { label: Locale.label("sermons.bulkImport.vimeo"), selected: false, onClick: () => setImportType("vimeo"), testId: "import-vimeo-button" }
              ]}
            />
            <Box sx={{ display: "grid", gap: 2, mt: 1 }}>
              <Box>
                <Typography sx={{ fontWeight: 600 }}>{Locale.label("sermons.bulkImport.youtube")}</Typography>
                <Typography variant="body2" color="text.secondary">{Locale.label("sermons.bulkImport.youtubeDescription")}</Typography>
                <Box sx={{ mt: 1 }}>
                  <Verb onClick={() => setImportType("youtube")}>{Locale.label("sermons.bulkImport.importFromYouTube")}</Verb>
                </Box>
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 600 }}>{Locale.label("sermons.bulkImport.vimeo")}</Typography>
                <Typography variant="body2" color="text.secondary">{Locale.label("sermons.bulkImport.vimeoDescription")}</Typography>
                <Box sx={{ mt: 1 }}>
                  <Verb onClick={() => setImportType("vimeo")}>{Locale.label("sermons.bulkImport.importFromVimeo")}</Verb>
                </Box>
              </Box>
            </Box>
          </>
        )}
    </SermonChrome>
  );
});
