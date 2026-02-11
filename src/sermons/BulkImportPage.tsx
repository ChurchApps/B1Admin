import React, { memo } from "react";
import { UserHelper, Permissions, Locale } from "@churchapps/apphelper";
import { Box, Typography, Grid, Paper, Stack, Card, CardContent, Button } from "@mui/material";
import { CloudUpload as CloudUploadIcon, YouTube as YouTubeIcon, VideoLibrary as VimeoIcon, ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { PageHeader } from "@churchapps/apphelper";
import { YouTubeImport, VimeoImport } from "./components";

export const BulkImportPage = memo(() => {
  const [importType, setImportType] = React.useState<"youtube" | "vimeo" | "">();

  if (!UserHelper.checkAccess(Permissions.contentApi.streamingServices.edit)) return <></>;

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <PageHeader icon={<CloudUploadIcon />} title={Locale.label("sermons.bulkImport.title")} subtitle={Locale.label("sermons.bulkImport.subtitle")}>
          {importType && (
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => setImportType("")}
              sx={{
                color: "#FFF",
                borderColor: "rgba(255,255,255,0.5)",
                "&:hover": {
                  borderColor: "#FFF",
                  backgroundColor: "rgba(255,255,255,0.1)"
                }
              }}
            >
              {Locale.label("sermons.bulkImport.backToSelection")}
            </Button>
          )}
        </PageHeader>
      </Box>

      <Box sx={{ p: 3 }}>
        {importType
          ? (<>
            {importType === "youtube"
              ? (<YouTubeImport handleDone={() => setImportType("")} />)
              : (<VimeoImport handleDone={() => setImportType("")} />)
            }
          </>)
          : (
            <Box sx={{ maxWidth: 800, mx: "auto" }}>
              <Card sx={{
                borderRadius: 2,
                border: "1px solid",
                borderColor: "grey.200"
              }}>
                <Box sx={{ p: 3, borderBottom: 1, borderColor: "divider" }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CloudUploadIcon sx={{ color: "primary.main" }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
                      {Locale.label("sermons.bulkImport.chooseSource")}
                    </Typography>
                  </Stack>
                </Box>
                <CardContent sx={{ p: 4 }}>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 4,
                          textAlign: "center",
                          border: "2px dashed",
                          borderColor: "grey.300",
                          borderRadius: 2,
                          cursor: "pointer",
                          transition: "all 0.2s ease-in-out",
                          "&:hover": {
                            borderColor: "primary.main",
                            backgroundColor: "primary.50",
                            transform: "translateY(-2px)",
                            boxShadow: 2
                          }
                        }}
                        onClick={() => setImportType("youtube")}
                        data-testid="import-youtube-button"
                      >
                        <Stack spacing={2} alignItems="center">
                          <Box
                            sx={{
                              backgroundColor: "#FF0000",
                              borderRadius: "12px",
                              p: 2,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}
                          >
                            <YouTubeIcon sx={{ fontSize: 40, color: "#FFF" }} />
                          </Box>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: "text.primary" }}>
                            {Locale.label("sermons.bulkImport.youtube")}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200 }}>
                            {Locale.label("sermons.bulkImport.youtubeDescription")}
                          </Typography>
                          <Button
                            variant="contained"
                            size="large"
                            sx={{
                              backgroundColor: "#FF0000",
                              "&:hover": { backgroundColor: "#CC0000" },
                              textTransform: "none",
                              fontWeight: 600
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setImportType("youtube");
                            }}
                          >
                            {Locale.label("sermons.bulkImport.importFromYouTube")}
                          </Button>
                        </Stack>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 4,
                          textAlign: "center",
                          border: "2px dashed",
                          borderColor: "grey.300",
                          borderRadius: 2,
                          cursor: "pointer",
                          transition: "all 0.2s ease-in-out",
                          "&:hover": {
                            borderColor: "primary.main",
                            backgroundColor: "primary.50",
                            transform: "translateY(-2px)",
                            boxShadow: 2
                          }
                        }}
                        onClick={() => setImportType("vimeo")}
                        data-testid="import-vimeo-button"
                      >
                        <Stack spacing={2} alignItems="center">
                          <Box
                            sx={{
                              backgroundColor: "#1AB7EA",
                              borderRadius: "12px",
                              p: 2,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}
                          >
                            <VimeoIcon sx={{ fontSize: 40, color: "#FFF" }} />
                          </Box>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: "text.primary" }}>
                            {Locale.label("sermons.bulkImport.vimeo")}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200 }}>
                            {Locale.label("sermons.bulkImport.vimeoDescription")}
                          </Typography>
                          <Button
                            variant="contained"
                            size="large"
                            sx={{
                              backgroundColor: "#1AB7EA",
                              "&:hover": { backgroundColor: "#1593C4" },
                              textTransform: "none",
                              fontWeight: 600
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setImportType("vimeo");
                            }}
                          >
                            {Locale.label("sermons.bulkImport.importFromVimeo")}
                          </Button>
                        </Stack>
                      </Paper>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Box>
          )}
      </Box>
    </>
  );
});
