import React, { useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { ApiHelper, CurrencyHelper, Locale } from "@churchapps/apphelper";
import { LoadingButton } from "../../components/ui";
import { type CommerceRegistrationInterface, type OfflinePaymentMethod, type RegistrationPaymentInterface } from "../registrationCommerce";

export type PaymentDialogMode = "payment" | "refund" | "gatewayRefund";

export interface PaymentSaveResult {
  registration: CommerceRegistrationInterface;
  payments: RegistrationPaymentInterface[];
}

interface Props {
  mode: PaymentDialogMode;
  registrationId: string;
  // The online charge being refunded (gatewayRefund only).
  payment?: RegistrationPaymentInterface;
  maxAmount: number;
  currency: string;
  onSaved: (result: PaymentSaveResult) => void;
  onClose: () => void;
}

const TITLES: Record<PaymentDialogMode, string> = {
  payment: "registrations.commerce.recordPayment",
  refund: "registrations.commerce.recordRefund",
  gatewayRefund: "registrations.commerce.refundPayment"
};

// ApiHelper rethrows the raw JSON body as the message, so dig the server's error out of it.
const errorMessage = (e: unknown) => {
  const raw = e instanceof Error ? e.message : "";
  try { return JSON.parse(raw).error || raw; } catch { return raw; }
};

export const RegistrationPaymentDialog: React.FC<Props> = ({ mode, registrationId, payment, maxAmount, currency, onSaved, onClose }) => {
  const [amount, setAmount] = useState(mode === "refund" ? "" : maxAmount.toFixed(2));
  const [method, setMethod] = useState<OfflinePaymentMethod>("cash");
  const [checkNumber, setCheckNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const money = (n: number) => CurrencyHelper.formatCurrencyWithLocale(n, currency);
  const value = Number(amount);
  const amountValid = amount.trim() !== "" && Number.isFinite(value) && value > 0 && Math.round(value * 100) / 100 === value && value <= maxAmount + 1e-9;

  const handleSave = async () => {
    if (!amountValid || saving) return;
    setSaving(true);
    setError("");
    try {
      const result: PaymentSaveResult = mode === "gatewayRefund"
        ? await ApiHelper.post(`/registrations/payments/${payment?.id}/refund`, { amount: value }, "ContentApi")
        : await ApiHelper.post(`/registrations/${registrationId}/${mode === "payment" ? "payments" : "refunds"}`, { amount: value, method, checkNumber: method === "check" ? checkNumber : undefined }, "ContentApi");
      onSaved(result);
    } catch (e) {
      setError(errorMessage(e) || Locale.label("registrations.commerce.paymentFailed"));
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth data-testid="registration-payment-dialog">
      <DialogTitle>{Locale.label(TITLES[mode])}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error" data-testid="registration-payment-error">{error}</Alert>}
          {mode === "gatewayRefund" && (
            <Typography variant="body2" color="text.secondary">{Locale.label("registrations.commerce.gatewayRefundHint")}</Typography>
          )}
          <TextField
            label={Locale.label("registrations.commerce.amount")}
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={amount !== "" && !amountValid}
            helperText={`${Locale.label("registrations.commerce.upTo")} ${money(maxAmount)}`}
            slotProps={{ htmlInput: { min: 0.01, step: 0.01, max: maxAmount } }}
            data-testid="registration-payment-amount"
            autoFocus
          />
          {mode !== "gatewayRefund" && (
            <TextField select label={Locale.label("registrations.commerce.method")} value={method} onChange={(e) => setMethod(e.target.value as OfflinePaymentMethod)} data-testid="registration-payment-method">
              <MenuItem value="cash">{Locale.label("registrations.commerce.cash")}</MenuItem>
              <MenuItem value="check">{Locale.label("registrations.commerce.check")}</MenuItem>
              <MenuItem value="other">{Locale.label("registrations.commerce.other")}</MenuItem>
            </TextField>
          )}
          {mode !== "gatewayRefund" && method === "check" && (
            <TextField label={Locale.label("registrations.commerce.checkNumber")} value={checkNumber} onChange={(e) => setCheckNumber(e.target.value)} slotProps={{ htmlInput: { maxLength: 100 } }} data-testid="registration-payment-check-number" />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>{Locale.label("common.cancel")}</Button>
        <LoadingButton variant="contained" color={mode === "payment" ? "primary" : "warning"} loading={saving} disabled={!amountValid} onClick={handleSave} data-testid="registration-payment-save">
          {Locale.label(mode === "payment" ? "registrations.commerce.recordPayment" : mode === "refund" ? "registrations.commerce.recordRefund" : "registrations.commerce.refund")}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
};
