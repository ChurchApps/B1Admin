import React from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Radio, RadioGroup, Typography } from "@mui/material";
import { DateHelper, Locale } from "@churchapps/apphelper";
import { type PlanInterface } from "../../helpers";

interface Props {
  plans: PlanInterface[];
  onCopy: (sourcePlanId: string) => Promise<void>;
  onClose: () => void;
}

/** Picks an earlier plan whose order of service is added to the current plan (ChurchAppsSupport#1678). */
export const CopyServiceOrderDialog: React.FC<Props> = ({ plans, onCopy, onClose }) => {
  const [sourceId, setSourceId] = React.useState(plans[0]?.id || "");
  const [copying, setCopying] = React.useState(false);

  const copy = async () => {
    if (!sourceId) return;
    setCopying(true);
    try {
      await onCopy(sourceId);
      onClose();
    } finally {
      setCopying(false);
    }
  };

  return (
    <Dialog open={true} onClose={copying ? undefined : onClose} maxWidth="sm" fullWidth data-testid="copy-service-order-dialog">
      <DialogTitle>{Locale.label("plans.planEdit.copyPrevious") || "Copy from Previous Plan"}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {Locale.label("plans.serviceOrder.copyHint") || "The chosen plan's sections and items are added after this plan's current order of service."}
        </Typography>
        <RadioGroup value={sourceId} onChange={(e) => setSourceId(e.target.value)} sx={{ maxHeight: 320, overflowY: "auto", flexWrap: "nowrap" }}>
          {plans.map((p) => (
            <FormControlLabel
              key={p.id}
              value={p.id}
              control={<Radio size="small" />}
              label={`${p.name || ""} · ${p.serviceDate ? DateHelper.prettyDate(DateHelper.toDate(p.serviceDate)) : ""}`}
            />
          ))}
        </RadioGroup>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={copying}>{Locale.label("common.cancel")}</Button>
        <Button variant="contained" onClick={copy} disabled={copying || !sourceId}>{Locale.label("plans.serviceOrder.copy") || "Copy"}</Button>
      </DialogActions>
    </Dialog>
  );
};
