import { useEffect, useState } from "react";
import type { SelectChangeEvent } from "@mui/material";
import { Checkbox, FormControl, FormControlLabel, FormGroup, InputLabel, ListItemText, MenuItem, OutlinedInput, Select, Typography } from "@mui/material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import type { FundInterface } from "@churchapps/helpers";

type Props = {
  parsedData: any;
  onRealtimeChange: (parsedData: any) => void;
};

export function DonationEdit({ parsedData, onRealtimeChange }: Props) {
  const [funds, setFunds] = useState<FundInterface[]>([]);

  const allowSingleGift = parsedData.allowSingleGift !== false;
  const allowRecurring = parsedData.allowRecurring !== false;
  const showFundSelector = parsedData.showFundSelector !== false;
  const allowedFundIds: string[] = Array.isArray(parsedData.allowedFundIds) ? parsedData.allowedFundIds : [];
  const defaultFundId: string = parsedData.defaultFundId || "";

  const update = (changes: any) => {
    onRealtimeChange({ ...parsedData, ...changes });
  };

  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    update({ [e.target.name]: e.target.checked });
  };

  const handleAllowedFundsChange = (e: SelectChangeEvent<string[]>) => {
    const value = e.target.value;
    const next = typeof value === "string" ? value.split(",") : value;
    const changes: any = { allowedFundIds: next };
    if (defaultFundId && next.length > 0 && !next.includes(defaultFundId)) {
      changes.defaultFundId = "";
    }
    update(changes);
  };

  const handleDefaultFundChange = (e: SelectChangeEvent<string>) => {
    update({ defaultFundId: e.target.value });
  };

  useEffect(() => {
    ApiHelper.get("/funds", "GivingApi").then((data: FundInterface[]) => setFunds(data || []));
  }, []);

  const selectableFunds = allowedFundIds.length > 0
    ? funds.filter((f) => allowedFundIds.includes(f.id))
    : funds;

  return (
    <>
      <Typography fontWeight="bold" marginTop={1}>{Locale.label("site.donationEdit.giftOptions")}</Typography>
      <FormGroup>
        <FormControlLabel
          control={<Checkbox checked={allowSingleGift} onChange={handleToggle} name="allowSingleGift" />}
          label={Locale.label("site.donationEdit.allowSingleGift")}
        />
        <FormControlLabel
          control={<Checkbox checked={allowRecurring} onChange={handleToggle} name="allowRecurring" />}
          label={Locale.label("site.donationEdit.allowRecurring")}
        />
      </FormGroup>

      <Typography fontWeight="bold" marginTop={2}>{Locale.label("site.donationEdit.fundOptions")}</Typography>
      <FormGroup>
        <FormControlLabel
          control={<Checkbox checked={showFundSelector} onChange={handleToggle} name="showFundSelector" />}
          label={Locale.label("site.donationEdit.showFundSelector")}
        />
      </FormGroup>

      {(!funds || funds.length === 0)
        ? (<Typography fontStyle="italic" fontSize={12.5}>{Locale.label("site.donateLink.noFunds")}</Typography>)
        : (
          <>
            <FormControl fullWidth size="small" sx={{ marginTop: 1 }}>
              <InputLabel>{Locale.label("site.donationEdit.allowedFunds")}</InputLabel>
              <Select
                multiple
                value={allowedFundIds}
                onChange={handleAllowedFundsChange}
                input={<OutlinedInput label={Locale.label("site.donationEdit.allowedFunds")} />}
                renderValue={(selected) => funds.filter((f) => selected.includes(f.id)).map((f) => f.name).join(", ")}
              >
                {funds.map((f) => (
                  <MenuItem key={f.id} value={f.id}>
                    <Checkbox checked={allowedFundIds.includes(f.id)} />
                    <ListItemText primary={f.name} />
                  </MenuItem>
                ))}
              </Select>
              <Typography fontSize={12.5} fontStyle="italic" marginTop={0.5}>{Locale.label("site.donationEdit.allowedFundsHelper")}</Typography>
            </FormControl>

            <FormControl fullWidth size="small" sx={{ marginTop: 2 }}>
              <InputLabel>{Locale.label("site.donationEdit.defaultFund")}</InputLabel>
              <Select
                value={defaultFundId}
                label={Locale.label("site.donationEdit.defaultFund")}
                onChange={handleDefaultFundChange}
              >
                <MenuItem value=""><em>{Locale.label("site.donationEdit.noDefaultFund")}</em></MenuItem>
                {selectableFunds.map((f) => (
                  <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
                ))}
              </Select>
              <Typography fontSize={12.5} fontStyle="italic" marginTop={0.5}>{Locale.label("site.donationEdit.defaultFundHelper")}</Typography>
            </FormControl>
          </>
        )}
    </>
  );
}
