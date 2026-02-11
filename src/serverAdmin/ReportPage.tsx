import React from "react";
import { useParams } from "react-router-dom";
import { ApiHelper, Locale, PageHeader } from "@churchapps/apphelper";
import { Box, Container, Card, CardContent, Skeleton, Chip } from "@mui/material";
import { AdminPanelSettings as AdminIcon, ArrowBack as BackIcon } from "@mui/icons-material";
import { ReportWithFilter } from "../components/reporting/ReportWithFilter";
import { type ReportInterface } from "@churchapps/helpers";

export const ReportPage = () => {
  const params = useParams();
  const [report, setReport] = React.useState<ReportInterface>(null);
  const [loading, setLoading] = React.useState(true);

  const loadData = React.useCallback(() => {
    if (params.keyName) {
      setLoading(true);
      ApiHelper.get("/reports/" + params.keyName, "ReportingApi")
        .then((data) => {
          setReport(data);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [params.keyName]);

  React.useEffect(loadData, [loadData]);

  return (
    <>
      <PageHeader
        icon={<AdminIcon />}
        title={loading ? <Skeleton width={300} /> : report?.displayName || Locale.label("serverAdmin.reportPage.report")}
        subtitle={!loading && report?.description ? report.description : undefined}
        breadcrumbs={[
          {
            href: "/admin",
            text: Locale.label("serverAdmin.reportPage.serverAdmin"),
            icon: <BackIcon />
          }
        ]}
        bgColor="error.main">
        <Chip
          label={Locale.label("serverAdmin.reportPage.adminOnly")}
          size="small"
          color="error"
          sx={{
            fontWeight: 600,
            fontSize: "0.75rem",
            backgroundColor: "#FFF",
            color: "error.main"
          }}
        />
      </PageHeader>

      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          {/* Report Content */}
          <Card
            elevation={2}
            sx={{
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              minHeight: 400
            }}>
            <CardContent sx={{ p: 0 }}>
              {loading ? (
                <Box sx={{ p: 4 }}>
                  <Stack spacing={3}>
                    <Skeleton variant="rectangular" height={60} />
                    <Skeleton variant="rectangular" height={200} />
                    <Stack direction="row" spacing={2}>
                      <Skeleton variant="rectangular" width={120} height={40} />
                      <Skeleton variant="rectangular" width={120} height={40} />
                    </Stack>
                  </Stack>
                </Box>
              ) : (
                <Box sx={{ "& .report-container": { p: 0 } }}>
                  <ReportWithFilter keyName={params.keyName} autoRun={false} />
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Container>
    </>
  );
};
