import React from "react";
import { DonationEdit, Donations, BatchEdit, BulkDonationEntry } from "./components";
import { UserHelper, Permissions, DateHelper, Locale, CurrencyHelper } from "@churchapps/apphelper";
import { type DonationBatchInterface, type FundInterface, type DonationInterface } from "@churchapps/helpers";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, Grid, Stack } from "@mui/material";
import { Add as AddIcon, EditOutlined as EditIcon } from "@mui/icons-material";
import { PageHeader, PageContainer, Breadcrumbs, type BreadcrumbItem, Surface, HeaderPrimaryButton, HeaderTextButton } from "../components/ui";
import { useRequirePermission } from "../hooks";

export const DonationBatchPage = () => {
  const params = useParams();
  const [editDonationId, setEditDonationId] = React.useState("notset");
  const [editBatch, setEditBatch] = React.useState(false);
  const [donationsKey, setDonationsKey] = React.useState(0);
  const [currency, setCurrency] = React.useState<string>("usd");

  // totalAmount arrives already converted into the church currency by the Api (server-side exchange rates).
  const batch = useQuery<DonationBatchInterface & { isConverted?: boolean }>({ queryKey: ["/donationbatches/" + params.id, "GivingApi"] });

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

  const getEditModules = () => {
    const result = [];
    if (editDonationId !== "notset") result.push(<DonationEdit key="donationEdit" donationId={editDonationId} updatedFunction={donationUpdated} funds={funds.data || []} batchId={batch.data?.id || ""} currency={currency} />);
    if (editBatch && batch.data?.id) result.push(<BatchEdit key="batchEdit" batch={batch.data} updatedFunction={batchUpdated} />);
    return result;
  };


  React.useEffect(() => {
    CurrencyHelper.loadCurrency().then((result) => {
      setCurrency(result);
    });
  }, []);

  const denied = useRequirePermission(Permissions.givingApi.donations.view);
  if (denied) return denied;

  const canEdit = UserHelper.checkAccess(Permissions.givingApi.donations.edit);
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
        breadcrumbs={<Breadcrumbs items={breadcrumbItems} showHome={true} />}>
        {canEdit && (
          <HeaderTextButton startIcon={<EditIcon />} onClick={() => setEditBatch(true)} data-testid="edit-batch-button">{Locale.label("donations.donationBatchPage.editBatch")}</HeaderTextButton>
        )}
        {canEdit && hasFunds && (
          <HeaderPrimaryButton startIcon={<AddIcon />} onClick={startAdd} data-testid="batch-add-donation-button">{Locale.label("donations.bulkEntry.addDonation")}</HeaderPrimaryButton>
        )}
      </PageHeader>

      <PageContainer>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: showSide ? 8 : 12 }} sx={{ order: { xs: 2, lg: 1 } }}>
            <Surface>
              <Donations key={donationsKey} batch={batch.data || {}} editFunction={showEditDonation} funds={funds.data || []} currency={currency} />
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
    </>
  );
};
