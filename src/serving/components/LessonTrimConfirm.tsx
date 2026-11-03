import React from "react";
import { Alert, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, List, ListItem, ListItemText, Typography } from "@mui/material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { type PlanInterface } from "../../helpers";

export interface LessonTrimKeep { section: string; sectionIndex: string; part?: string }
interface Preview { keep: LessonTrimKeep[]; upcoming: { planId: string; name: string }[] }
interface Applied { planId: string; name?: string; warning: string | null }

interface Props {
  plan: PlanInterface;
  planTypeName: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export const fillLabel = (text: string, ...values: (string | number)[]) => values.reduce<string>((acc, v) => acc.replace("{}", String(v)), text);

// Confirms saving the parts kept in this customized plan as its plan type's lesson trim (#1401).
export const LessonTrimConfirm: React.FC<Props> = ({ plan, planTypeName, onClose, onSaved }) => {
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [alsoTrim, setAlsoTrim] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    ApiHelper.post(`/planTypes/${plan.planTypeId}/lessonTrim`, { fromPlanId: plan.id, preview: true }, "DoingApi")
      .then((data: Preview) => {
        if (data?.keep) setPreview(data);
        else setError(Locale.label("plans.lessonTrim.nothingToSave"));
      })
      .catch(() => setError(Locale.label("plans.lessonTrim.nothingToSave")));
  }, [plan.id, plan.planTypeId]);

  const upcomingCount = preview?.upcoming.length || 0;

  const save = async () => {
    setLoading(true);
    try {
      const result: { applied: Applied[] } = await ApiHelper.post(`/planTypes/${plan.planTypeId}/lessonTrim`, { fromPlanId: plan.id, applyUpcoming: alsoTrim && upcomingCount > 0 }, "DoingApi");
      const warned = (result?.applied || []).filter((a) => a.warning).map((a) => a.name || "");
      onSaved(warned.length > 0
        ? fillLabel(Locale.label("plans.lessonTrim.savedWithWarnings"), warned.join(", "))
        : fillLabel(Locale.label("plans.lessonTrim.saved"), planTypeName));
    } catch {
      setError(Locale.label("plans.lessonTrim.error"));
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth data-testid="lesson-trim-dialog">
      <DialogTitle>{Locale.label("plans.lessonTrim.title")}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Typography variant="body2" color="text.secondary">{fillLabel(Locale.label("plans.lessonTrim.help"), planTypeName)}</Typography>
        {preview && (
          <>
            <Typography variant="subtitle2" sx={{ mt: 2 }}>{Locale.label("plans.lessonTrim.keeps")}</Typography>
            <List dense data-testid="lesson-trim-keeps">
              {preview.keep.map((k) => (
                <ListItem key={k.sectionIndex + "|" + (k.part || "")} disableGutters>
                  <ListItemText primary={k.part ? fillLabel(Locale.label("plans.lessonTrim.partIn"), k.part, k.section) : k.section} />
                </ListItem>
              ))}
            </List>
            {upcomingCount > 0 && (
              <>
                <FormControlLabel
                  control={<Checkbox checked={alsoTrim} onChange={(e) => setAlsoTrim(e.target.checked)} />}
                  label={upcomingCount === 1 ? Locale.label("plans.lessonTrim.alsoTrimUpcomingOne") : fillLabel(Locale.label("plans.lessonTrim.alsoTrimUpcoming"), upcomingCount)}
                />
                {alsoTrim && <Typography variant="body2" color="text.secondary">{Locale.label("plans.lessonTrim.replacesOrder")}</Typography>}
              </>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>{Locale.label("common.cancel")}</Button>
        <Button variant="contained" onClick={save} disabled={loading || !preview}>{Locale.label("common.save")}</Button>
      </DialogActions>
    </Dialog>
  );
};
