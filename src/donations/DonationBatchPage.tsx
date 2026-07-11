import React from "react";
import { DonationEdit, Donations, BatchEdit, BulkDonationEntry } from "./components";
import { UserHelper, Permissions, DateHelper, PageHeader, Locale, CurrencyHelper } from "@churchapps/apphelper";
import { type DonationBatchInterface, type FundInterface, type DonationInterface } from "@churchapps/helpers";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, Stack } from "@mui/material";
import { Receipt as ReceiptIcon, Edit as EditIcon } from "@mui/icons-material";
import { Breadcrumbs, type BreadcrumbItem, HeaderSecondaryButton, PageHeaderStats } from "../components/ui";

export const DonationBatchPage = () => {
  const params = useParams();
  const [editDonationId, setEditDonationId] = React.useState("notset");
  const [editBatch, setEditBatch] = React.useState(false);
  const [donationsKey, setDonationsKey] = React.useState(0);
  const [currency, setCurrency] = React.useState<string>("usd");

  const batch = useQuery<DonationBatchInterface>({ queryKey: ["/donationbatches/" + params.id, "GivingApi"] });

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
    if (editBatch && batch.data?.id) result.push(<BatchEdit key="batchEdit" batchId={batch.data.id} updatedFunction={batchUpdated} />);
    return result;
  };

  const [stats, setStats] = React.useState({
    totalDonations: 0,
    totalAmount: 0
  });

  React.useEffect(() => {
    if (donations.data) {
      const totalDonations = donations.data.length;
      const totalAmount = donations.data.reduce((sum, donation) => sum + (donation.amount || 0), 0);

      setStats({
        totalDonations,
        totalAmount
      });
    }
  }, [donations.data]);

  React.useEffect(() => {
    CurrencyHelper.loadCurrency().then((result) => {
      setCurrency(result);
    });
  }, []);

  if (!UserHelper.checkAccess(Permissions.givingApi.donations.view)) return <></>;

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: Locale.label("components.wrapper.don"), path: "/donations" },
    { label: batch.data?.name || Locale.label("donations.donationBatchPage.title") }
  ];

  return (
    <>
      <PageHeader
        icon={<ReceiptIcon />}
        title={batch.data?.name || Locale.label("donations.donationBatchPage.title")}
        subtitle={batch.data?.batchDate ? `${Locale.label("donations.donationBatchPage.batchDate")} ${DateHelper.prettyDate(new Date(batch.data.batchDate.split("T")[0] + "T00:00:00"))}` : Locale.label("donations.donationBatchPage.subtitle")}
        breadcrumbs={<Breadcrumbs items={breadcrumbItems} showHome={true} />}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }} 
          spacing={{ xs: 2 }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent={{ sm: "space-between" }}
          width="100%"
        >
          {stats.totalDonations > 0 && (
            <PageHeaderStats
              items={[
                { icon: <ReceiptIcon sx={{ color: "#FFF", fontSize: 24 }} />, value: stats.totalDonations, label: Locale.label("donations.donationBatchPage.donations"), minWidth: 80 },
                { value: CurrencyHelper.formatCurrencyWithLocale(stats.totalAmount, currency, 0), label: Locale.label("donations.donationBatchPage.totalAmount") }
              ]}
            />
          )}
          {UserHelper.checkAccess(Permissions.givingApi.donations.edit) && (
            <HeaderSecondaryButton
              startIcon={<EditIcon />}
              onClick={() => setEditBatch(true)}
              data-testid="edit-batch-button"
              sx={{ position: { md: "relative" }, ml: { md: "auto" }, zIndex: 1 }}>
              {Locale.label("donations.donationBatchPage.editBatch")}
            </HeaderSecondaryButton>
          )}
        </Stack>
      </PageHeader>

      <Box sx={{ p: 3 }}>
        {editDonationId === "notset" && UserHelper.checkAccess(Permissions.givingApi.donations.edit) && (funds.data?.length ?? 0) > 0 && (
          <BulkDonationEntry
            batchId={batch.data?.id || ""}
            batchDate={batch.data?.batchDate ? new Date(batch.data.batchDate.split("T")[0] + "T00:00:00") : new Date()}
            funds={funds.data || []}
            updatedFunction={donationUpdated}
          />
        )}

        {(editDonationId !== "notset" || editBatch) && <Box sx={{ mb: 3 }}>{getEditModules()}</Box>}

        <Donations key={donationsKey} batch={batch.data || {}} editFunction={showEditDonation} funds={funds.data || []} currency={currency} />
      </Box>
    </>
  );
};
