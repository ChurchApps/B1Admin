import { Alert, FormControl, Grid, InputLabel, MenuItem, Select, TextField, Box } from "@mui/material";
import React, { memo, useCallback, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { PersonAdd } from "../../components";
import { ApiHelper, DateHelper, UniqueIdHelper, PersonHelper, Locale } from "@churchapps/apphelper";
import { FormCard } from "../../components/ui";
import { FundDonations } from "@churchapps/apphelper/donations";
import { type DonationInterface, type FundDonationInterface, type FundInterface, type PersonInterface } from "@churchapps/helpers";

interface Props {
  donationId: string;
  batchId: string;
  funds: FundInterface[];
  updatedFunction: () => void;
  currency?: string;
}

type AnyRecord = Record<string, any>;

export const DonationEdit = memo((props: Props) => {
  "use no memo"; // compiler caches register() results, breaking RHF field re-registration after reset()
  const [donation, setDonation] = React.useState<DonationInterface>({});
  const [fundDonations, setFundDonations] = React.useState<FundDonationInterface[]>([]);
  const [showSelectPerson, setShowSelectPerson] = React.useState(false);

  const { register, handleSubmit, reset, control, watch } = useForm<AnyRecord>({ defaultValues: { date: "", method: "Check", methodDetails: "", notes: "" } });
  const method = watch("method");
  const methodDetails = watch("methodDetails");
  const summaryErrors: string[] = [];

  const handleCancel = useCallback(() => props.updatedFunction(), [props.updatedFunction]);

  const handleDelete = useCallback(() => {
    ApiHelper.delete("/donations/" + donation.id, "GivingApi").then(() => props.updatedFunction());
  }, [donation.id, props.updatedFunction]);

  const getDeleteFunction = useCallback(() => (UniqueIdHelper.isMissing(props.donationId) ? undefined : handleDelete), [props.donationId, handleDelete]);

  const onValid = (values: AnyRecord) => {
    const donationToSave: DonationInterface = {
      ...donation,
      donationDate: values.date ? DateHelper.formatHtml5Date(values.date) : null,
      method: values.method,
      methodDetails: values.methodDetails,
      notes: values.notes
    };
    ApiHelper.post("/donations", [donationToSave], "GivingApi").then((data: any) => {
      const id = data[0].id;
      const promises = [];
      const fDonations = [...fundDonations];
      for (let i = fDonations.length - 1; i >= 0; i--) {
        const fd = fundDonations[i];
        if (fd.amount === undefined || fd.amount === 0) {
          if (!UniqueIdHelper.isMissing(fd.id)) promises.push(ApiHelper.delete("/funddonations/" + fd.id, "GivingApi"));
          fDonations.splice(i, 1);
        } else fd.donationId = id;
      }
      if (fDonations.length > 0) promises.push(ApiHelper.post("/funddonations", fDonations, "GivingApi"));
      Promise.all(promises).then(() => props.updatedFunction());
    });
  };

  const loadData = useCallback(() => {
    if (UniqueIdHelper.isMissing(props.donationId)) {
      const initial = { donationDate: DateHelper.formatHtml5Date(new Date()), batchId: props.batchId, amount: 0, method: "Check" };
      setDonation(initial);
      reset({ date: initial.donationDate, method: "Check", methodDetails: "", notes: "" });
      const fd: FundDonationInterface = { amount: 0, fundId: props.funds[0]?.id };
      setFundDonations([fd]);
    } else {
      ApiHelper.get("/donations/" + props.donationId, "GivingApi").then(async (data: DonationInterface) => {
        if (!UniqueIdHelper.isMissing(data.personId)) data.person = await ApiHelper.get("/people/" + data.personId.toString(), "MembershipApi");
        if (data.donationDate) data.donationDate = DateHelper.formatHtml5Date(data.donationDate);
        setDonation(data);
        reset({ date: (data.donationDate as string) || "", method: data.method || "Check", methodDetails: data.methodDetails || "", notes: data.notes || "" });
      });
      ApiHelper.get("/funddonations?donationId=" + props.donationId, "GivingApi").then((data: any) => setFundDonations(data));
    }
  }, [props.donationId, props.batchId, props.funds, reset]);

  const methodDetailsField = useMemo(() => {
    if (method === "Cash") return null;
    const label = method === "Check" ? Locale.label("donations.donationEdit.checkNum") : Locale.label("donations.donationEdit.lastDig");
    const placeholder = method === "Check" ? Locale.label("placeholders.donation.checkNumber") : Locale.label("placeholders.donation.lastDigits");
    return <TextField fullWidth label={label} InputLabelProps={{ shrink: !!methodDetails }} placeholder={placeholder} {...register("methodDetails")} />;
  }, [method, methodDetails, register]);

  const handlePersonAdd = useCallback((p: PersonInterface) => {
    const d = { ...donation } as DonationInterface;
    if (p === null) { d.person = null; d.personId = ""; } else { d.person = p; d.personId = p.id; }
    setDonation(d);
    setShowSelectPerson(false);
  }, [donation]);

  const handleFundDonationsChange = useCallback((fd: FundDonationInterface[]) => {
    setFundDonations(fd);
    let totalAmount = 0;
    for (let i = 0; i < fd.length; i++) totalAmount += fd[i].amount;
    if (totalAmount !== donation.amount) setDonation({ ...donation, amount: totalAmount });
  }, [donation]);

  const handlePersonSelect = useCallback((ev: React.MouseEvent) => { ev.preventDefault(); setShowSelectPerson(true); }, []);
  const handleAnonymousSelect = useCallback((ev: React.MouseEvent) => { ev.preventDefault(); handlePersonAdd(null); }, [handlePersonAdd]);

  const personSection = useMemo(() => {
    if (showSelectPerson) {
      return (
        <>
          <PersonAdd getPhotoUrl={PersonHelper.getPhotoUrl} addFunction={handlePersonAdd} />
          <hr />
          <button type="button" className="text-decoration" onClick={handleAnonymousSelect} style={{ background: "none", border: 0, padding: 0, color: "var(--link)", cursor: "pointer" }}>
            {Locale.label("donations.donationEdit.anon")}
          </button>
        </>
      );
    }
    const personText = donation.person === undefined || donation.person === null ? Locale.label("donations.donationEdit.anon") : (donation.person.name?.display || Locale.label("donations.donationEdit.anon"));
    return (
      <div>
        <button type="button" className="text-decoration" data-cy="donating-person" onClick={handlePersonSelect} style={{ background: "none", border: 0, padding: 0, color: "var(--link)", cursor: "pointer" }}>
          {personText}
        </button>
      </div>
    );
  }, [showSelectPerson, donation.person, handlePersonAdd, handlePersonSelect, handleAnonymousSelect]);

  React.useEffect(loadData, [loadData]);

  return (
    <FormCard id="donationBox" icon="volunteer_activism" title={Locale.label("common.edit")} onCancel={handleCancel} onDelete={getDeleteFunction()} onSave={handleSubmit(onValid)} help="docs/b1-admin/donations/">
      {summaryErrors.length > 0 && <Alert severity="error" sx={{ mb: 2 }}>{summaryErrors.map((msg) => <div key={msg}>{msg}</div>)}</Alert>}
      <Box>
        <label>{Locale.label("common.person")}</label>
        {personSection}
      </Box>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth label={Locale.label("donations.donationEdit.date")} type="date" data-testid="donation-date-input" aria-label={Locale.label("donations.donationEdit.ariaDate")} {...register("date")} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller
            control={control}
            name="method"
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel id="method">{Locale.label("donations.donationEdit.method")}</InputLabel>
                <Select {...field} labelId="method" label={Locale.label("donations.donationEdit.method")} data-testid="payment-method-select" aria-label={Locale.label("donations.donationEdit.ariaMethod")}>
                  <MenuItem value="Check">{Locale.label("donations.donationEdit.check")}</MenuItem>
                  <MenuItem value="Cash">{Locale.label("donations.donationEdit.cash")}</MenuItem>
                  <MenuItem value="Card">{Locale.label("donations.donationEdit.card")}</MenuItem>
                </Select>
              </FormControl>
            )}
          />
        </Grid>
      </Grid>
      {methodDetailsField}
      <FundDonations fundDonations={fundDonations} funds={props.funds} updatedFunction={handleFundDonationsChange} currency={props?.currency} />
      <TextField fullWidth label={Locale.label("common.notes")} data-cy="note" multiline placeholder={Locale.label("placeholders.donation.notes")} data-testid="donation-notes-input" aria-label={Locale.label("donations.donationEdit.ariaNotes")} {...register("notes")} />
    </FormCard>
  );
});
