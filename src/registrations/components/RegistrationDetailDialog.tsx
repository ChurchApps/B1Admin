import React, { useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Stack, Box, Divider, Table, TableBody, TableRow, TableCell, TableHead, Chip } from "@mui/material";
import { ApiHelper, Loading, Locale, CurrencyHelper } from "@churchapps/apphelper";
import { FormSubmission } from "../../components";
import { formatDateSafe } from "../../helpers/DateFormatHelper";
import { type CommerceRegistrationInterface, type RegistrationTypeInterface, type RegistrationSelectionInterface, type RegistrationPaymentInterface } from "../registrationCommerce";

interface Props {
  registrationId: string;
  typeMap: Map<string, RegistrationTypeInterface>;
  selMap: Map<string, RegistrationSelectionInterface>;
  onClose: () => void;
}

export const RegistrationDetailDialog: React.FC<Props> = ({ registrationId, typeMap, selMap, onClose }) => {
  const [reg, setReg] = useState<(CommerceRegistrationInterface & { selectionChoices?: any[]; payments?: RegistrationPaymentInterface[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("usd");

  useEffect(() => {
    ApiHelper.get(`/registrations/${registrationId}`, "ContentApi").then((data) => { setReg(data); setLoading(false); });
  }, [registrationId]);
  useEffect(() => { CurrencyHelper.loadCurrency().then(setCurrency); }, []);

  const money = (n: number | null | undefined) => CurrencyHelper.formatCurrencyWithLocale(Number(n) || 0, currency);

  const total = Number(reg?.totalAmount) || 0;
  const paid = Number(reg?.amountPaid) || 0;
  const balance = Math.max(0, total - paid);

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{Locale.label("registrations.commerce.registrationDetails")}</DialogTitle>
      <DialogContent>
        {loading ? <Loading size="sm" /> : (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{Locale.label("registrations.registrationDetailsPage.members")}</Typography>
              <Table size="small">
                <TableBody>
                  {(reg?.members || []).map((m, i) => (
                    <TableRow key={m.id || i}>
                      <TableCell>{m.firstName} {m.lastName}</TableCell>
                      <TableCell>{m.registrationTypeId ? (typeMap.get(m.registrationTypeId)?.name || "") : ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            {(reg?.selectionChoices || []).length > 0 && (
              <Box>
                <Divider sx={{ mb: 1 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{Locale.label("registrations.commerce.selections")}</Typography>
                <Table size="small" data-testid="detail-selections">
                  <TableBody>
                    {(reg?.selectionChoices || []).map((c: any, i: number) => {
                      const sel = selMap.get(c.selectionId);
                      return (
                        <TableRow key={c.id || i}>
                          <TableCell>{sel?.name || c.selectionId}{(c.quantity || 1) > 1 ? ` ×${c.quantity}` : ""}</TableCell>
                          <TableCell align="right">{sel?.price != null ? money((sel.price || 0) * (c.quantity || 1)) : ""}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            )}

            <Box>
              <Divider sx={{ mb: 1 }} />
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="body2">{Locale.label("registrations.commerce.paid")}: {money(paid)} / {money(total)}</Typography>
                {balance > 0 && <Chip size="small" color="warning" label={`${Locale.label("registrations.commerce.balance")}: ${money(balance)}`} />}
              </Stack>
            </Box>

            <Box>
              <Divider sx={{ mb: 1 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{Locale.label("registrations.commerce.payments")}</Typography>
              {(reg?.payments || []).length === 0 ? (
                <Typography variant="body2" color="text.secondary">{Locale.label("registrations.commerce.noPayments")}</Typography>
              ) : (
                <Table size="small" data-testid="detail-payments">
                  <TableHead>
                    <TableRow>
                      <TableCell align="right">{Locale.label("registrations.commerce.amount")}</TableCell>
                      <TableCell>{Locale.label("registrations.commerce.method")}</TableCell>
                      <TableCell>{Locale.label("registrations.commerce.kind")}</TableCell>
                      <TableCell>{Locale.label("registrations.registrationDetailsPage.date")}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(reg?.payments || []).map((p, i) => (
                      <TableRow key={p.id || i}>
                        <TableCell align="right">{money(p.amount)}</TableCell>
                        <TableCell>{[p.method, p.provider].filter(Boolean).join(" / ")}</TableCell>
                        <TableCell>{p.kind}</TableCell>
                        <TableCell>{formatDateSafe(p.createdDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>

            {reg?.formSubmissionId && (
              <Box>
                <Divider sx={{ mb: 1 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{Locale.label("registrations.registrationDetailsPage.viewAnswers")}</Typography>
                <FormSubmission formSubmissionId={reg.formSubmissionId} editFunction={() => {}} />
              </Box>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{Locale.label("common.close")}</Button>
      </DialogActions>
    </Dialog>
  );
};
