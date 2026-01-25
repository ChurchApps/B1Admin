import {
  FormControl, InputLabel, MenuItem, Select, TextField, Box, Card, CardContent, Typography, Button, type SelectChangeEvent
} from "@mui/material";
import React, { memo, useCallback, useRef, useEffect } from "react";
import { PersonAdd } from "../../components";
import { ApiHelper, DateHelper, PersonHelper, Locale } from "@churchapps/apphelper";
import { type DonationInterface, type FundDonationInterface, type FundInterface, type PersonInterface } from "@churchapps/helpers";

interface Props {
  batchId: string;
  batchDate?: Date;
  funds: FundInterface[];
  updatedFunction: () => void;
}

export const BulkDonationEntry = memo((props: Props) => {
  const [selectedPerson, setSelectedPerson] = React.useState<PersonInterface | null>(null);
  const [showPersonSearch, setShowPersonSearch] = React.useState(true);
  const [amount, setAmount] = React.useState("");
  const [methodDetails, setMethodDetails] = React.useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const [defaultValues, setDefaultValues] = React.useState({
    date: props.batchDate || new Date(),
    method: "Check" as string,
    fundId: props.funds?.[0]?.id || "",
    notes: "",
  });

  const handlePersonAdd = useCallback((p: PersonInterface) => {
    if (p === null) {
      setSelectedPerson(null);
      setShowPersonSearch(false);
      setTimeout(() => amountInputRef.current?.focus(), 100);
    } else {
      setSelectedPerson(p);
      setShowPersonSearch(false);
      setTimeout(() => amountInputRef.current?.focus(), 100);
    }
  }, []);

  const handleAnonymousSelect = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handlePersonAdd(null);
  }, [handlePersonAdd]);

  const handleDefaultChange = useCallback((field: string, value: any) => {
    setDefaultValues(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    const donation: DonationInterface = {
      batchId: props.batchId,
      personId: selectedPerson?.id || "",
      amount: parseFloat(amount),
      donationDate: DateHelper.formatHtml5Date(defaultValues.date),
      method: defaultValues.method,
      methodDetails: methodDetails || undefined,
      notes: defaultValues.notes || undefined,
    };

    const savedDonations = await ApiHelper.post("/donations", [donation], "GivingApi");
    const donationId = savedDonations[0].id;

    const fundDonation: FundDonationInterface = {
      donationId,
      fundId: defaultValues.fundId,
      amount: parseFloat(amount),
    };

    await ApiHelper.post("/funddonations", [fundDonation], "GivingApi");

    setSelectedPerson(null);
    setShowPersonSearch(true);
    setAmount("");
    setMethodDetails("");
    props.updatedFunction();

    setTimeout(() => searchInputRef.current?.focus(), 100);
  }, [amount, methodDetails, selectedPerson, defaultValues, props]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  }, [handleSave]);

  useEffect(() => {
    if (showPersonSearch) setTimeout(() => searchInputRef.current?.focus(), 100);
  }, [showPersonSearch]);

  useEffect(() => {
    if (props.funds?.[0]?.id && !defaultValues.fundId) setDefaultValues(prev => ({ ...prev, fundId: props.funds[0].id }));
  }, [props.funds, defaultValues.fundId]);

  const methodDetailsLabel = defaultValues.method === "Check" ? Locale.label("donations.donationEdit.checkNum") : Locale.label("donations.donationEdit.lastDig");

  if (showPersonSearch) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {Locale.label("donations.bulkEntry.selectPerson")}
          </Typography>
          <PersonAdd getPhotoUrl={PersonHelper.getPhotoUrl} addFunction={handlePersonAdd} inputRef={searchInputRef} autoSearch />
          <Box sx={{ mt: 2 }}>
            <button
              type="button"
              className="text-decoration"
              onClick={handleAnonymousSelect}
              style={{ background: "none", border: 0, padding: 0, color: "#1976d2", cursor: "pointer" }}>
              {Locale.label("donations.donationEdit.anon")}
            </button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6">
            {selectedPerson?.name?.display || Locale.label("donations.donationEdit.anon")}
          </Typography>
          <button
            type="button"
            onClick={() => setShowPersonSearch(true)}
            style={{
              background: "none", border: 0, padding: 0, color: "#1976d2", cursor: "pointer", textDecoration: "underline"
            }}>
            {Locale.label("common.change")}
          </button>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 3, opacity: 0.7 }}>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              fullWidth
              label={Locale.label("donations.donationEdit.date")}
              type="date"
              value={DateHelper.formatHtml5Date(defaultValues.date) || ""}
              onChange={(e) => handleDefaultChange("date", new Date(e.target.value))}
              onKeyDown={handleKeyDown}
              size="small"
              data-testid="bulk-donation-date"
            />
            <FormControl fullWidth size="small">
              <InputLabel>{Locale.label("donations.donationEdit.method")}</InputLabel>
              <Select
                value={defaultValues.method}
                label={Locale.label("donations.donationEdit.method")}
                onChange={(e: SelectChangeEvent) => handleDefaultChange("method", e.target.value)}
                onKeyDown={handleKeyDown}
                data-testid="bulk-donation-method">
                <MenuItem value="Check">{Locale.label("donations.donationEdit.check")}</MenuItem>
                <MenuItem value="Cash">{Locale.label("donations.donationEdit.cash")}</MenuItem>
                <MenuItem value="Card">{Locale.label("donations.donationEdit.card")}</MenuItem>
                <MenuItem value="In-Kind">{Locale.label("donations.donationEdit.inKind")}</MenuItem>
              </Select>
            </FormControl>
            {props.funds?.length > 1 && (
              <FormControl fullWidth size="small">
                <InputLabel>{Locale.label("donations.donationEdit.fund")}</InputLabel>
                <Select
                  value={defaultValues.fundId}
                  label={Locale.label("donations.donationEdit.fund")}
                  onChange={(e: SelectChangeEvent) => handleDefaultChange("fundId", e.target.value)}
                  onKeyDown={handleKeyDown}
                  data-testid="bulk-donation-fund">
                  {props.funds.map((fund) => (<MenuItem key={fund.id} value={fund.id}>{fund.name}</MenuItem>))}
                </Select>
              </FormControl>
            )}
          </Box>
          <TextField
            fullWidth
            label={Locale.label("common.notes")}
            value={defaultValues.notes}
            onChange={(e) => handleDefaultChange("notes", e.target.value)}
            onKeyDown={handleKeyDown}
            size="small"
            data-testid="bulk-donation-notes"
          />
        </Box>

        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
          <TextField
            inputRef={amountInputRef}
            label={Locale.label("common.amount")}
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={handleKeyDown}
            sx={{ flex: 1, "& .MuiInputBase-input": { fontSize: "1.5rem" } }}
            autoFocus
            data-testid="bulk-donation-amount"
          />
          {defaultValues.method !== "Cash" && (
            <TextField
              label={methodDetailsLabel}
              value={methodDetails}
              onChange={(e) => setMethodDetails(e.target.value)}
              onKeyDown={handleKeyDown}
              sx={{ flex: 1, "& .MuiInputBase-input": { fontSize: "1.5rem" } }}
              data-testid="bulk-donation-method-details"
            />
          )}
        </Box>

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {Locale.label("donations.bulkEntry.pressEnter")}
          </Typography>
          <Button variant="contained" onClick={handleSave} data-testid="add-donation-submit">
            {Locale.label("donations.bulkEntry.addDonation")}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
});