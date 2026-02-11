import React from "react";
import { DonationEdit, Donations, BatchEdit, BulkDonationEntry } from "./components";
import { UserHelper, Permissions, DateHelper, PageHeader, Locale } from "@churchapps/apphelper";
import { type DonationBatchInterface, type FundInterface, type DonationInterface } from "@churchapps/helpers";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, Card, Stack, Button, Typography } from "@mui/material";
import { VolunteerActivism as DonationIcon, Receipt as ReceiptIcon, AttachMoney as MoneyIcon, Edit as EditIcon } from "@mui/icons-material";

export const DonationBatchPage = () => {
  const params = useParams();
  const [editDonationId, setEditDonationId] = React.useState("notset");
  const [editBatch, setEditBatch] = React.useState(false);
  const [donationsKey, setDonationsKey] = React.useState(0);

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
    if (editDonationId !== "notset") result.push(<DonationEdit key="donationEdit" donationId={editDonationId} updatedFunction={donationUpdated} funds={funds.data} batchId={batch.data.id} />);
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

  if (!UserHelper.checkAccess(Permissions.givingApi.donations.view)) return <></>;

  return (
    <>
      <PageHeader
        icon={<DonationIcon />}
        title={batch.data?.name || Locale.label("donations.donationBatchPage.title")}
        subtitle={batch.data?.batchDate ? `${Locale.label("donations.donationBatchPage.batchDate")} ${DateHelper.prettyDate(new Date(batch.data.batchDate.split("T")[0] + "T00:00:00"))}` : Locale.label("donations.donationBatchPage.subtitle")}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "flex-start", md: "center" }}
          sx={{ width: "100%" }}
        >
          {stats.totalDonations > 0 && (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={{ xs: 2, sm: 4, md: 5 }}
              sx={{
                position: { xs: "static", md: "absolute" },
                left: { md: "50%" },
                top: { md: "50%" },
                transform: { md: "translateY(-50%)" },
                flexWrap: "wrap"
              }}
            >
              <Stack spacing={0.5} alignItems="center" sx={{ minWidth: 80 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <ReceiptIcon sx={{ color: "#FFF", fontSize: 24 }} />
                  <Typography variant="h5" sx={{ color: "#FFF", fontWeight: 700 }}>{stats.totalDonations}</Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5 }}>Donations</Typography>
              </Stack>
              <Stack spacing={0.5} alignItems="center" sx={{ minWidth: 100 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <MoneyIcon sx={{ color: "#FFF", fontSize: 24 }} />
                  <Typography variant="h5" sx={{ color: "#FFF", fontWeight: 700 }}>{stats.totalAmount.toLocaleString("en-US", { style: "decimal", minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5 }}>Total Amount</Typography>
              </Stack>
            </Stack>
          )}
          {UserHelper.checkAccess(Permissions.givingApi.donations.edit) && (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => setEditBatch(true)}
              data-testid="edit-batch-button"
              sx={{
                color: "#FFF",
                borderColor: "rgba(255,255,255,0.5)",
                "&:hover": {
                  borderColor: "#FFF",
                  backgroundColor: "rgba(255,255,255,0.1)"
                },
                position: { md: "relative" },
                ml: { md: "auto" },
                zIndex: 1
              }}>
              Edit Batch
            </Button>
          )}
        </Stack>
      </PageHeader>

      {/* Main Content */}
      <Box sx={{ p: 3 }}>
        {/* Bulk entry form - always visible when not editing existing donation */}
        {editDonationId === "notset" && UserHelper.checkAccess(Permissions.givingApi.donations.edit) && funds.data?.length > 0 && (
          <BulkDonationEntry
            batchId={batch.data?.id}
            batchDate={batch.data?.batchDate ? new Date(batch.data.batchDate.split("T")[0] + "T00:00:00") : new Date()}
            funds={funds.data}
            updatedFunction={donationUpdated}
          />
        )}

        {/* Edit content appears when editing existing donation or batch */}
        {(editDonationId !== "notset" || editBatch) && <Box sx={{ mb: 3 }}>{getEditModules()}</Box>}

        {/* Main donations table */}
        <Card>
          <Donations key={donationsKey} batch={batch.data} editFunction={showEditDonation} funds={funds.data} />
        </Card>
      </Box>
    </>
  );
};
