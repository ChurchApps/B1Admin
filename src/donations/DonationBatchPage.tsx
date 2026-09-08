import React from "react";
import { DonationEdit, Donations, BatchEdit, BulkDonationEntry } from "./components";
import { UserHelper, Permissions, DateHelper, Locale, CurrencyHelper } from "@churchapps/apphelper";
import { type DonationBatchInterface, type FundInterface, type DonationInterface } from "@churchapps/helpers";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box } from "@mui/material";
import { useRequirePermission } from "../hooks";
import { Verb, VerbRow, SectionTitle, plateSx, mutedSx } from "./components/plate";

export const DonationBatchPage = () => {
  const params = useParams();
  const [editDonationId, setEditDonationId] = React.useState("notset");
  const [editBatch, setEditBatch] = React.useState(false);
  const [donationsKey, setDonationsKey] = React.useState(0);
  const [currency, setCurrency] = React.useState<string>("usd");
  const [logOpen, setLogOpen] = React.useState(true);

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
    if (id === "") setLogOpen(false);
  };
  const donationUpdated = () => {
    setEditDonationId("notset");
    setLogOpen(true);
    batch.refetch();
    donations.refetch();
    setDonationsKey(prev => prev + 1);
  };

  const batchUpdated = () => {
    setEditBatch(false);
    batch.refetch();
  };

  React.useEffect(() => {
    CurrencyHelper.loadCurrency().then((result) => setCurrency(result));
  }, []);

  const denied = useRequirePermission(Permissions.givingApi.donations.view);
  if (denied) return denied;

  const totalDonations = donations.data?.length || 0;
  const totalAmount = (donations.data || []).reduce((sum, donation) => sum + (donation.amount || 0), 0);
  const canEdit = UserHelper.checkAccess(Permissions.givingApi.donations.edit);
  const dateLabel = batch.data?.batchDate ? DateHelper.prettyDate(new Date(batch.data.batchDate.split("T")[0] + "T00:00:00")) : "";

  return (
    <Box sx={plateSx}>
      <SectionTitle sx={{ mt: 0 }}>{batch.data?.name || Locale.label("donations.donationBatchPage.title")}</SectionTitle>
      <Box sx={mutedSx}>
        {dateLabel}{dateLabel ? " · " : ""}{totalDonations} {Locale.label("donations.donationBatchPage.donations")?.toLowerCase() || "gifts"} · {CurrencyHelper.formatCurrencyWithLocale(totalAmount, currency, 0)}
      </Box>
      <VerbRow>
        {canEdit && <Verb onClick={() => setEditBatch(true)} data-testid="edit-batch-button">{Locale.label("donations.donationBatchPage.editBatch")}</Verb>}
        {canEdit && <Verb onClick={() => { setLogOpen(true); setEditDonationId("notset"); }}>Log a gift</Verb>}
      </VerbRow>

      {logOpen && editDonationId === "notset" && canEdit && (funds.data?.length ?? 0) > 0 && (
        <Box sx={{ mt: 2 }}>
          <BulkDonationEntry
            batchId={batch.data?.id || ""}
            batchDate={batch.data?.batchDate ? new Date(batch.data.batchDate.split("T")[0] + "T00:00:00") : new Date()}
            funds={funds.data || []}
            updatedFunction={donationUpdated}
            onOpenFullEditor={() => showEditDonation("")}
          />
        </Box>
      )}

      {(editDonationId !== "notset" || editBatch) && (
        <Box sx={{ mt: 2 }}>
          {editDonationId !== "notset" && <DonationEdit key="donationEdit" donationId={editDonationId} updatedFunction={donationUpdated} funds={funds.data || []} batchId={batch.data?.id || ""} currency={currency} />}
          {editBatch && batch.data?.id && <BatchEdit key="batchEdit" batch={batch.data} updatedFunction={batchUpdated} />}
        </Box>
      )}

      <Box sx={{ mt: 2 }}>
        <Donations key={donationsKey} batch={batch.data || {}} editFunction={showEditDonation} funds={funds.data || []} currency={currency} />
      </Box>
    </Box>
  );
};
