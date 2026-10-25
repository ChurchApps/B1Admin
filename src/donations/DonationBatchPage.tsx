import React from "react";
import { DonationEdit, Donations, BatchEdit, BulkDonationEntry, CsvImportDialog } from "./components";
import { ApiHelper, Permissions, DateHelper, Locale, CurrencyHelper } from "@churchapps/apphelper";
import { type FundInterface, type DonationInterface } from "@churchapps/helpers";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Alert, Box, Grid, Stack } from "@mui/material";
import { Add as AddIcon, EditOutlined as EditIcon, LockOutlined as LockIcon, LockOpenOutlined as LockOpenIcon, UploadFile as UploadIcon } from "@mui/icons-material";
import { PageHeader, PageContainer, Breadcrumbs, type BreadcrumbItem, Surface, HeaderPrimaryButton, HeaderTextButton, StatusChip } from "../components/ui";
import { useRequirePermission } from "../hooks";
import { type BatchWithStatus, canChangeBatch, canEditDonations, isBatchClosed } from "./batchAccess";

export const DonationBatchPage = () => {
  const params = useParams();
  const [editDonationId, setEditDonationId] = React.useState("notset");
  const [editBatch, setEditBatch] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [donationsKey, setDonationsKey] = React.useState(0);
  const [currency, setCurrency] = React.useState<string>("usd");

  // totalAmount arrives already converted into the church currency by the Api (server-side exchange rates).
  const batch = useQuery<BatchWithStatus & { isConverted?: boolean }>({ queryKey: ["/donationbatches/" + params.id, "GivingApi"] });

  const funds = useQuery<FundInterface[]>({
    queryKey: ["/funds", "GivingApi"],
    placeholderData: []
  });

  const donations = useQuery<DonationInterface[]>({
    queryKey: ["/donations?batchId=" + params.id, "GivingApi"],
    placeholderData: []
  });

  const showEditDonation = (id: string) => {
    setEditDonationId(id);
  };
  const donationUpdated = () => {
    setEditDonationId("notset");
    batch.refetch();
    donations.refetch();
    setDonationsKey(prev => prev + 1);
  };

  const batchUpdated = () => {
    setEditBatch(false);
    batch.refetch();
  };

  const [statusSaving, setStatusSaving] = React.useState(false);
  const setBatchStatus = async (action: "close" | "reopen") => {
    setStatusSaving(true);
    try {
      await ApiHelper.post("/donationbatches/" + params.id + "/" + action, {}, "GivingApi");
      setEditDonationId("notset");
      setEditBatch(false);
      await batch.refetch();
    } finally {
      setStatusSaving(false);
    }
  };

  const getEditModules = () => {
    const result = [];
    if (editDonationId !== "notset") result.push(<DonationEdit key="donationEdit" donationId={editDonationId} updatedFunction={donationUpdated} funds={funds.data || []} batchId={batch.data?.id || ""} currency={currency} />);
    if (editBatch && batch.data?.id) result.push(<BatchEdit key="batchEdit" batch={batch.data} updatedFunction={batchUpdated} canDelete={canEditDonations()} />);
    return result;
  };


  React.useEffect(() => {
    CurrencyHelper.loadCurrency().then((result) => {
      setCurrency(result);
    });
  }, []);

  const denied = useRequirePermission(Permissions.givingApi.donations.view);
  if (denied) return denied;

  // Enter Donations can work in an open batch; once it is closed only Edit Donations can change it.
  const canEdit = canChangeBatch(batch.data);
  const canSetStatus = canEditDonations() && !!batch.data?.id;
  const closed = isBatchClosed(batch.data);
  const giftCount = donations.data?.length || 0;
  const dateLabel = batch.data?.batchDate ? DateHelper.prettyDate(new Date(batch.data.batchDate.split("T")[0] + "T00:00:00")) : "";
  // totalAmount is the Api's converted total; summing donation amounts would mix currencies.
  const lede = batch.data ? (
    <>
      {dateLabel && <>{dateLabel} · </>}
      {Locale.label("donations.donationBatchPage.giftCount", "{count} gifts").replace("{count}", giftCount.toString())}
      {" · "}
      <span data-testid="batch-total-amount">{CurrencyHelper.formatCurrencyWithLocale(batch.data.totalAmount || 0, currency, 0)}</span>
      {batch.data.isConverted && " (" + Locale.label("donations.donations.convertedNote") + ")"}
    </>
  ) : Locale.label("donations.donationBatchPage.subtitle");

  const hasFunds = (funds.data?.length ?? 0) > 0;
  const showBulk = editDonationId === "notset" && canEdit && hasFunds;
  const showSide = showBulk || editDonationId !== "notset" || editBatch;
  const startAdd = () => {
    if (!showBulk) { showEditDonation(""); return; }
    const entry = document.getElementById("batch-entry");
    entry?.scrollIntoView({ behavior: "smooth", block: "start" });
    (entry?.querySelector("input") as HTMLElement | null)?.focus();
  };

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: Locale.label("components.wrapper.don"), path: "/donations" },
    { label: Locale.label("donations.donationBatchesPage.batches"), path: "/donations/batches" },
    { label: batch.data?.name || Locale.label("donations.donationBatchPage.title") }
  ];

  return (
    <>
      <PageHeader
        title={batch.data?.name || Locale.label("donations.donationBatchPage.title")}
        subtitle={lede}
        breadcrumbs={<Breadcrumbs items={breadcrumbItems} showHome={true} />}
        chips={batch.data && (
          <Box component="span" data-testid="batch-status">
            <StatusChip variant="header" status={closed ? Locale.label("donations.donationBatchPage.closed", "Closed") : Locale.label("donations.donationBatchPage.open", "Open")} />
          </Box>
        )}>
        {canSetStatus && (closed
          ? <HeaderTextButton startIcon={<LockOpenIcon />} onClick={() => setBatchStatus("reopen")} disabled={statusSaving} data-testid="reopen-batch-button">{Locale.label("donations.donationBatchPage.reopenBatch", "Reopen Batch")}</HeaderTextButton>
          : <HeaderTextButton startIcon={<LockIcon />} onClick={() => setBatchStatus("close")} disabled={statusSaving} data-testid="close-batch-button">{Locale.label("donations.donationBatchPage.closeBatch", "Close Batch")}</HeaderTextButton>
        )}
        {canEdit && (
          <HeaderTextButton startIcon={<EditIcon />} onClick={() => setEditBatch(true)} data-testid="edit-batch-button">{Locale.label("donations.donationBatchPage.editBatch")}</HeaderTextButton>
        )}
        {canEdit && hasFunds && (
          <HeaderTextButton startIcon={<UploadIcon />} onClick={() => setImportOpen(true)} data-testid="batch-import-csv-button">{Locale.label("donations.csvImport.button", "Import CSV")}</HeaderTextButton>
        )}
        {canEdit && hasFunds && (
          <HeaderPrimaryButton startIcon={<AddIcon />} onClick={startAdd} data-testid="batch-add-donation-button">{Locale.label("donations.bulkEntry.addDonation")}</HeaderPrimaryButton>
        )}
      </PageHeader>

      <PageContainer>
        {closed && (
          <Alert severity="info" icon={<LockIcon />} sx={{ mb: 3 }} data-testid="batch-closed-notice">
            {canEditDonations()
              ? Locale.label("donations.donationBatchPage.closedNoticeEdit", "This batch is closed. Only people with Edit Donations can change it; reopen it to let others enter donations again.")
              : Locale.label("donations.donationBatchPage.closedNotice", "This batch is closed, so its donations can no longer be changed. Ask someone with Edit Donations to reopen it.")}
          </Alert>
        )}
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: showSide ? 8 : 12 }} sx={{ order: { xs: 2, lg: 1 } }}>
            <Surface>
              <Donations key={donationsKey} batch={batch.data || {}} canEdit={canEdit} editFunction={showEditDonation} funds={funds.data || []} currency={currency} />
            </Surface>
          </Grid>
          {showSide && (
            <Grid size={{ xs: 12, lg: 4 }} sx={{ order: { xs: 1, lg: 2 } }} id="batch-entry">
              <Stack spacing={3}>
                {showBulk && (
                  <BulkDonationEntry
                    batchId={batch.data?.id || ""}
                    batchDate={batch.data?.batchDate ? new Date(batch.data.batchDate.split("T")[0] + "T00:00:00") : new Date()}
                    funds={funds.data || []}
                    updatedFunction={donationUpdated}
                    onOpenFullEditor={() => showEditDonation("")}
                  />
                )}
                {(editDonationId !== "notset" || editBatch) && <Box>{getEditModules()}</Box>}
              </Stack>
            </Grid>
          )}
        </Grid>
      </PageContainer>
      {importOpen && batch.data?.id && (
        <CsvImportDialog
          open={importOpen}
          batchId={batch.data.id}
          batchDate={batch.data.batchDate ? new Date(batch.data.batchDate.split("T")[0] + "T00:00:00") : new Date()}
          funds={funds.data || []}
          currency={currency}
          onClose={() => setImportOpen(false)}
          onImported={() => { setImportOpen(false); donationUpdated(); }}
        />
      )}
    </>
  );
};
