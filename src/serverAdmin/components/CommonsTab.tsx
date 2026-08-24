import React from "react";
import { DisplayBox, DateHelper, ArrayHelper, Locale } from "@churchapps/apphelper";
import { Chip, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { useConfirmDelete } from "../../hooks";
import { CommonsApi } from "../commonsApi";

interface CommonsAsset {
  id: string;
  assetType: string;
  name: string;
  description?: string;
  tags?: string;
  language?: string;
  license?: string;
  publisherUserId?: string;
  publisherChurchId?: string;
  status: string;
  path?: string;
  files?: string;
  fileUrls?: Record<string, string>;
  contentHash?: string;
  version?: number;
  downloadCount?: number;
  likeCount?: number;
  featured?: boolean;
  createdAt: string;
}

interface CommonsReport {
  id: string;
  assetId?: string;
  contentText?: string;
  reporterRole?: string;
  details?: string;
  name?: string;
  email?: string;
  status: "open" | "resolved";
  createdAt: string;
}

export const CommonsTab = () => {
  const [pendingAssets, setPendingAssets] = React.useState<CommonsAsset[]>([]);
  const [reports, setReports] = React.useState<CommonsReport[]>([]);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const loadData = () => {
    CommonsApi.get("/admin/assets/pending").then((data: CommonsAsset[]) => setPendingAssets(data || []));
    CommonsApi.get("/admin/reports").then((data: CommonsReport[]) => setReports(data || []));
  };

  const handleApprove = async (asset: CommonsAsset) => {
    await CommonsApi.post(`/admin/assets/${asset.id}/approve`, {});
    setPendingAssets((prev) => prev.filter((a) => a.id !== asset.id));
  };

  const handleReject = async (asset: CommonsAsset) => {
    const msg = Locale.label("serverAdmin.commonsTab.rejectConfirm").replace("{name}", asset.name || "");
    if (!(await confirm(msg, { destructive: true, confirmLabel: Locale.label("serverAdmin.commonsTab.reject") }))) return;
    await CommonsApi.post(`/admin/assets/${asset.id}/reject`, {});
    setPendingAssets((prev) => prev.filter((a) => a.id !== asset.id));
  };

  const handleResolve = async (report: CommonsReport) => {
    await CommonsApi.post(`/admin/reports/${report.id}/resolve`, {});
    setReports((prev) => {
      const next = [...prev];
      const r = ArrayHelper.getOne(next, "id", report.id);
      if (r) r.status = "resolved";
      return next;
    });
  };

  React.useEffect(loadData, []);

  const openReports = reports.filter((r) => r.status === "open");
  const resolvedReports = reports.filter((r) => r.status !== "open");

  return (
    <>
      {ConfirmDialogElement}

      <DisplayBox headerIcon="inventory_2" headerText={Locale.label("serverAdmin.commonsTab.pendingAssetsTitle")}>
        {pendingAssets.length === 0 ? (
          <Typography variant="body2">{Locale.label("serverAdmin.commonsTab.noPendingAssets")}</Typography>
        ) : (
          <Table size="small" id="commonsPendingAssetsTable">
            <TableHead>
              <TableRow>
                <TableCell>{Locale.label("serverAdmin.commonsTab.name")}</TableCell>
                <TableCell>{Locale.label("serverAdmin.commonsTab.type")}</TableCell>
                <TableCell>{Locale.label("serverAdmin.commonsTab.publisher")}</TableCell>
                <TableCell>{Locale.label("serverAdmin.commonsTab.license")}</TableCell>
                <TableCell>{Locale.label("serverAdmin.commonsTab.submitted")}</TableCell>
                <TableCell align="right">{Locale.label("serverAdmin.adminPage.act")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendingAssets.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.name}</TableCell>
                  <TableCell>{a.assetType}</TableCell>
                  <TableCell>{a.publisherChurchId || a.publisherUserId || "-"}</TableCell>
                  <TableCell>{a.license || "-"}</TableCell>
                  <TableCell>{DateHelper.prettyDate(DateHelper.toDate(a.createdAt))}</TableCell>
                  <TableCell align="right">
                    <Chip
                      label={Locale.label("serverAdmin.commonsTab.approve")}
                      color="success"
                      size="small"
                      onClick={() => handleApprove(a)}
                      data-testid={`commons-approve-asset-${a.id}`}
                      sx={{ cursor: "pointer", mr: 1 }}
                    />
                    <Chip
                      label={Locale.label("serverAdmin.commonsTab.reject")}
                      color="error"
                      size="small"
                      onClick={() => handleReject(a)}
                      data-testid={`commons-reject-asset-${a.id}`}
                      sx={{ cursor: "pointer" }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DisplayBox>

      <DisplayBox headerIcon="flag" headerText={Locale.label("serverAdmin.commonsTab.reportsTitle")}>
        {reports.length === 0 ? (
          <Typography variant="body2">{Locale.label("serverAdmin.commonsTab.noReports")}</Typography>
        ) : (
          <Table size="small" id="commonsReportsTable">
            <TableHead>
              <TableRow>
                <TableCell>{Locale.label("serverAdmin.commonsTab.contentText")}</TableCell>
                <TableCell>{Locale.label("serverAdmin.commonsTab.reporterRole")}</TableCell>
                <TableCell>{Locale.label("serverAdmin.commonsTab.date")}</TableCell>
                <TableCell>{Locale.label("serverAdmin.commonsTab.status")}</TableCell>
                <TableCell align="right">{Locale.label("serverAdmin.adminPage.act")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[...openReports, ...resolvedReports].map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    {r.contentText || "-"}
                    {r.assetId && (
                      <>
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          {r.assetId}
                        </Typography>
                      </>
                    )}
                  </TableCell>
                  <TableCell>{r.reporterRole || "-"}</TableCell>
                  <TableCell>{DateHelper.prettyDate(DateHelper.toDate(r.createdAt))}</TableCell>
                  <TableCell>
                    <Chip
                      label={r.status === "open" ? Locale.label("serverAdmin.commonsTab.open") : Locale.label("serverAdmin.commonsTab.resolved")}
                      color={r.status === "open" ? "warning" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {r.status === "open" && (
                      <Chip
                        label={Locale.label("serverAdmin.commonsTab.resolve")}
                        color="primary"
                        size="small"
                        onClick={() => handleResolve(r)}
                        data-testid={`commons-resolve-report-${r.id}`}
                        sx={{ cursor: "pointer" }}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DisplayBox>
    </>
  );
};
