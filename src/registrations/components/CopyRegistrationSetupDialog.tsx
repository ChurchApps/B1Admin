import React, { useEffect, useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { formatDateSafe } from "../../helpers/DateFormatHelper";
import { type CommerceEventInterface, type RegistrationCouponInterface, type RegistrationSelectionInterface, type RegistrationTypeInterface } from "../registrationCommerce";

interface Props {
  event: CommerceEventInterface;
  onCopied: (updated: CommerceEventInterface, sourceTitle: string) => void;
  onClose: () => void;
}

const key = (v?: string) => (v || "").trim().toLowerCase();

// Copies another event's registration setup onto this one as new rows. Registrations are never copied, and
// an attendee type, selection, or discount code this event already has (same name or code) is left alone.
export const CopyRegistrationSetupDialog: React.FC<Props> = ({ event, onCopied, onClose }) => {
  const [sources, setSources] = useState<CommerceEventInterface[] | null>(null);
  const [sourceId, setSourceId] = useState("");
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ApiHelper.get("/events/registerable", "ContentApi").then((data: CommerceEventInterface[]) => {
      const others = (data || []).filter((e) => e.id !== event.id);
      others.sort((a, b) => new Date(b.start || 0).getTime() - new Date(a.start || 0).getTime());
      setSources(others);
    }).catch(() => setSources([]));
  }, [event.id]);

  const copy = async () => {
    const source = sources?.find((e) => e.id === sourceId);
    if (!source) return;
    setCopying(true);
    setError(null);
    try {
      const [srcTypes, srcSelections, srcCoupons, curTypes, curSelections, curCoupons] = await Promise.all([
        ApiHelper.get(`/registrations/types/event/${source.id}?churchId=${source.churchId}`, "ContentApi") as Promise<RegistrationTypeInterface[]>,
        ApiHelper.get(`/registrations/selections/event/${source.id}?churchId=${source.churchId}`, "ContentApi") as Promise<RegistrationSelectionInterface[]>,
        ApiHelper.get(`/registrations/coupons/event/${source.id}`, "ContentApi") as Promise<RegistrationCouponInterface[]>,
        ApiHelper.get(`/registrations/types/event/${event.id}?churchId=${event.churchId}`, "ContentApi") as Promise<RegistrationTypeInterface[]>,
        ApiHelper.get(`/registrations/selections/event/${event.id}?churchId=${event.churchId}`, "ContentApi") as Promise<RegistrationSelectionInterface[]>,
        ApiHelper.get(`/registrations/coupons/event/${event.id}`, "ContentApi") as Promise<RegistrationCouponInterface[]>
      ]);

      const typeNames = new Set((curTypes || []).map((t) => key(t.name)));
      const types = (srcTypes || []).filter((t) => !typeNames.has(key(t.name))).map((t) => ({
        eventId: event.id,
        name: t.name,
        description: t.description ?? null,
        price: t.price ?? null,
        capacity: t.capacity ?? null,
        minAgeYears: t.minAgeYears ?? null,
        maxAgeYears: t.maxAgeYears ?? null,
        formId: t.formId ?? null,
        sort: t.sort ?? null,
        active: t.active !== false
      }));
      const selectionNames = new Set((curSelections || []).map((s) => key(s.name)));
      const selections = (srcSelections || []).filter((s) => !selectionNames.has(key(s.name))).map((s) => ({
        eventId: event.id,
        name: s.name,
        description: s.description ?? null,
        price: s.price ?? null,
        capacity: s.capacity ?? null,
        maxQuantity: s.maxQuantity ?? null,
        sort: s.sort ?? null,
        active: s.active !== false
      }));
      const couponCodes = new Set((curCoupons || []).map((c) => key(c.code)));
      const coupons = (srcCoupons || []).filter((c) => !couponCodes.has(key(c.code))).map((c) => ({
        eventId: event.id,
        code: c.code,
        discountType: c.discountType || "percent",
        value: c.value ?? 0,
        startDate: c.startDate ?? null,
        endDate: c.endDate ?? null,
        minMembers: c.minMembers ?? null,
        maxUses: c.maxUses ?? null,
        active: c.active !== false
      }));

      const updated: CommerceEventInterface = {
        ...event,
        capacity: source.capacity ?? null,
        waitlistEnabled: !!source.waitlistEnabled,
        tags: source.tags || "",
        formId: source.formId || null
      };
      await ApiHelper.post("/events", [updated], "ContentApi");
      if (types.length > 0) await ApiHelper.post("/registrations/types", types, "ContentApi");
      if (selections.length > 0) await ApiHelper.post("/registrations/selections", selections, "ContentApi");
      if (coupons.length > 0) await ApiHelper.post("/registrations/coupons", coupons, "ContentApi");
      onCopied(updated, source.title || "");
    } catch (e) {
      setError((e as { message?: string } | null | undefined)?.message || Locale.label("common.saveError"));
    } finally {
      setCopying(false);
    }
  };

  return (
    <Dialog open onClose={copying ? undefined : onClose} maxWidth="sm" fullWidth data-testid="copy-registration-setup-dialog">
      <DialogTitle>{Locale.label("registrations.copySetup.title", "Copy setup from another event")}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {Locale.label("registrations.copySetup.description", "Copies capacity, waitlist, tags, registration questions, attendee types, selections, and discount codes onto this event. Registrations are not copied, and items this event already has with the same name or code are kept as they are.")}
          </Typography>
          {sources && sources.length === 0 ? (
            <Alert severity="info">{Locale.label("registrations.copySetup.noEvents", "No other events have registration turned on.")}</Alert>
          ) : (
            <TextField select fullWidth size="small" label={Locale.label("registrations.copySetup.source", "Copy from")} value={sourceId} onChange={(e) => setSourceId(e.target.value)} disabled={!sources} data-testid="copy-registration-setup-source">
              {(sources || []).map((e) => (
                <MenuItem key={e.id} value={e.id}>{e.title} ({formatDateSafe(e.start)})</MenuItem>
              ))}
            </TextField>
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={copying}>{Locale.label("common.cancel")}</Button>
        <Button variant="contained" onClick={copy} disabled={!sourceId || copying} data-testid="copy-registration-setup-confirm">
          {copying ? Locale.label("registrations.copySetup.copying", "Copying...") : Locale.label("registrations.copySetup.copy", "Copy Setup")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
