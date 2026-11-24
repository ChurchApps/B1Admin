import React, { useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Stack, Box, Divider, Table, TableBody, TableRow, TableCell, TableHead, TextField, MenuItem, Alert } from "@mui/material";
import { Delete as DeleteIcon, PersonAdd as PersonAddIcon } from "@mui/icons-material";
import { ApiHelper, Loading, Locale, CurrencyHelper, PersonHelper } from "@churchapps/apphelper";
import { type PersonInterface } from "@churchapps/helpers";
import { FormSubmission, PersonAdd } from "../../components";
import { StatusBadge } from "../../components/ui";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { formatDateSafe } from "../../helpers/DateFormatHelper";
import { type CommerceRegistrationInterface, type RegistrationTypeInterface, type RegistrationSelectionInterface, type RegistrationPaymentInterface, type LoadedSelectionChoice } from "../registrationCommerce";

interface Props {
  registrationId: string;
  typeMap: Map<string, RegistrationTypeInterface>;
  selMap: Map<string, RegistrationSelectionInterface>;
  registrantName?: string;
  canEdit?: boolean;
  onSaved?: () => void;
  onClose: () => void;
}

interface EditMember { personId?: string; firstName: string; lastName: string; registrationTypeId: string }

// ApiHelper exposes no PUT; compose one from its config + fetch wrapper.
const apiPut = (path: string, data: unknown, apiName: string): Promise<unknown> => {
  const config = ApiHelper.getConfig(apiName);
  return ApiHelper.fetchWithErrorHandling(config.url + path, {
    method: "PUT",
    headers: { Authorization: "Bearer " + config.jwt, "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
};

const editErrorMessage = (raw: string) => {
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.status === "type-full") return Locale.label("registrations.commerce.typeFull");
    if (parsed?.status === "selection-full") return Locale.label("registrations.commerce.selectionFull");
    return parsed?.error || Locale.label("registrations.commerce.editError");
  } catch {
    return Locale.label("registrations.commerce.editError");
  }
};

export const RegistrationDetailDialog: React.FC<Props> = ({ registrationId, typeMap, selMap, registrantName, canEdit, onSaved, onClose }) => {
  const [reg, setReg] = useState<(Omit<CommerceRegistrationInterface, "selectionChoices"> & { selectionChoices?: LoadedSelectionChoice[]; payments?: RegistrationPaymentInterface[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("usd");
  const [editing, setEditing] = useState(false);
  const [members, setMembers] = useState<EditMember[]>([]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => ApiHelper.get(`/registrations/${registrationId}`, "ContentApi").then((data) => setReg(data)).catch(() => setReg(null)).finally(() => setLoading(false));

  useEffect(() => { load(); }, [registrationId]);
  useEffect(() => { CurrencyHelper.loadCurrency().then(setCurrency); }, []);

  const money = (n: number | null | undefined) => CurrencyHelper.formatCurrencyWithLocale(Number(n) || 0, currency);

  const total = Number(reg?.totalAmount) || 0;
  const paid = Number(reg?.amountPaid) || 0;
  const balance = Math.max(0, total - paid);
  const types = Array.from(typeMap.values());
  const selections = Array.from(selMap.values());

  const initialMembers = (): EditMember[] => (reg?.members || []).map((m) => ({ personId: m.personId || undefined, firstName: m.firstName || "", lastName: m.lastName || "", registrationTypeId: m.registrationTypeId || "" }));
  const initialQty = (): Record<string, number> => {
    const q: Record<string, number> = {};
    (reg?.selectionChoices || []).forEach((c) => { q[c.selectionId] = (q[c.selectionId] || 0) + (Number(c.quantity) || 1); });
    return q;
  };

  const startEdit = () => {
    setMembers(initialMembers());
    setQty(initialQty());
    setEditError("");
    setShowAddPerson(false);
    setEditing(true);
  };

  const updateMember = (i: number, field: keyof EditMember, value: string) => setMembers(members.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)));

  const addPerson = (person: PersonInterface) => {
    setMembers([...members, { personId: person.id, firstName: person.name?.first || "", lastName: person.name?.last || "", registrationTypeId: types[0]?.id || "" }]);
    setShowAddPerson(false);
  };

  const save = async () => {
    setEditError("");
    if (members.some((m) => !m.firstName.trim() || !m.lastName.trim())) { setEditError(Locale.label("registrations.commerce.nameRequired")); return; }
    const body: Record<string, unknown> = {};
    if (JSON.stringify(members) !== JSON.stringify(initialMembers())) {
      body.members = members.map((m) => ({ personId: m.personId, firstName: m.firstName.trim(), lastName: m.lastName.trim(), registrationTypeId: m.registrationTypeId || undefined }));
    }
    const sameQty = (a: Record<string, number>, b: Record<string, number>) => [...new Set([...Object.keys(a), ...Object.keys(b)])].every((k) => (a[k] || 0) === (b[k] || 0));
    if (!sameQty(qty, initialQty())) {
      body.selections = Object.entries(qty).filter(([id, q]) => q > 0 && selMap.has(id)).map(([selectionId, quantity]) => ({ selectionId, quantity }));
    }
    if (Object.keys(body).length === 0) { setEditing(false); return; }
    setSaving(true);
    try {
      await apiPut(`/registrations/${registrationId}`, body, "ContentApi");
      await load();
      setEditing(false);
      onSaved?.();
    } catch (err) {
      setEditError(editErrorMessage((err as { message?: string } | null | undefined)?.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const editForm = (
    <Stack spacing={2} sx={{ mt: 1 }} data-testid="registration-edit-form">
      {editError && <Alert severity="error" data-testid="registration-edit-error">{editError}</Alert>}
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>{Locale.label("registrations.registrationDetailsPage.members")}</Typography>
        <Stack spacing={1}>
          {members.map((m, i) => (
            <Stack key={i} direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} data-testid="edit-member-row">
              <TextField size="small" label={Locale.label("person.firstName")} value={m.firstName} onChange={(e) => updateMember(i, "firstName", e.target.value)} data-testid={`edit-member-first-${i}`} sx={{ flex: 1 }} />
              <TextField size="small" label={Locale.label("person.lastName")} value={m.lastName} onChange={(e) => updateMember(i, "lastName", e.target.value)} data-testid={`edit-member-last-${i}`} sx={{ flex: 1 }} />
              {types.length > 0 && (
                <TextField select size="small" label={Locale.label("registrations.commerce.type")} value={m.registrationTypeId} onChange={(e) => updateMember(i, "registrationTypeId", e.target.value)} data-testid={`edit-member-type-${i}`} sx={{ minWidth: 160 }}>
                  <MenuItem value="">{Locale.label("registrations.commerce.noType")}</MenuItem>
                  {types.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}{Number(t.price) > 0 ? ` (${money(t.price)})` : ""}</MenuItem>)}
                </TextField>
              )}
              <AppIconButton intent="remove" label={Locale.label("registrations.commerce.removePerson")} icon={<DeleteIcon />} onClick={() => setMembers(members.filter((_, idx) => idx !== i))} data-testid={`edit-member-remove-${i}`} />
            </Stack>
          ))}
        </Stack>
        {showAddPerson ? (
          <Box sx={{ mt: 1 }}>
            <PersonAdd getPhotoUrl={PersonHelper.getPhotoUrl} addFunction={addPerson} filterList={members.map((m) => m.personId).filter(Boolean) as string[]} />
          </Box>
        ) : (
          <Button size="small" startIcon={<PersonAddIcon />} onClick={() => setShowAddPerson(true)} sx={{ mt: 1 }} data-testid="edit-add-person">{Locale.label("registrations.commerce.addPerson")}</Button>
        )}
      </Box>

      {selections.length > 0 && (
        <Box>
          <Divider sx={{ mb: 1 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>{Locale.label("registrations.commerce.selections")}</Typography>
          <Stack spacing={1}>
            {selections.map((sel) => (
              <Stack key={sel.id} direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                <Typography variant="body2">{sel.name}{Number(sel.price) > 0 ? ` (${money(sel.price)})` : ""}</Typography>
                <TextField
                  size="small"
                  type="number"
                  label={Locale.label("registrations.commerce.quantity")}
                  value={qty[sel.id as string] || 0}
                  onChange={(e) => setQty({ ...qty, [sel.id as string]: Math.min(Math.max(0, Math.floor(Number(e.target.value) || 0)), sel.maxQuantity ?? 99) })}
                  slotProps={{ htmlInput: { min: 0, max: sel.maxQuantity ?? 99 } }}
                  data-testid={`edit-selection-qty-${sel.id}`}
                  sx={{ width: 110 }}
                />
              </Stack>
            ))}
          </Stack>
        </Box>
      )}
      <Typography variant="caption" color="text.secondary">{Locale.label("registrations.commerce.editTotalHint")}</Typography>
    </Stack>
  );

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{Locale.label("registrations.commerce.registrationDetails")}</DialogTitle>
      <DialogContent>
        {loading ? <Loading size="sm" /> : editing ? editForm : (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{Locale.label("registrations.registrationDetailsPage.members")}</Typography>
              <Table size="small">
                <TableBody>
                  {registrantName && (
                    <TableRow>
                      <TableCell>{registrantName}</TableCell>
                      <TableCell />
                    </TableRow>
                  )}
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
                    {(reg?.selectionChoices || []).map((c, i: number) => {
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
                {balance > 0 && <StatusBadge tone="warning">{`${Locale.label("registrations.commerce.balance")}: ${money(balance)}`}</StatusBadge>}
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
        {editing ? (
          <>
            <Button onClick={() => setEditing(false)} disabled={saving}>{Locale.label("common.cancel")}</Button>
            <Button variant="contained" onClick={save} disabled={saving} data-testid="registration-edit-save">{Locale.label("common.save")}</Button>
          </>
        ) : (
          <>
            {canEdit && reg && reg.status !== "cancelled" && <Button onClick={startEdit} data-testid="registration-edit-button">{Locale.label("common.edit")}</Button>}
            <Button onClick={onClose}>{Locale.label("common.close")}</Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};
