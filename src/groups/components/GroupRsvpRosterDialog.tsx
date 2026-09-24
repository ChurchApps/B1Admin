import { useEffect, useState } from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { type EventInterface, type PersonInterface } from "@churchapps/helpers";
import { Box, CircularProgress, Dialog, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";

interface RsvpRow {
  personId: string;
  response: "yes" | "no" | "maybe";
}

interface OccurrenceRef {
  occurrenceStart: string | Date;
}

interface Props {
  event: EventInterface;
  occurrences: OccurrenceRef[];
  onClose: () => void;
}

const RESPONSES: ("yes" | "maybe" | "no")[] = ["yes", "maybe", "no"];

export const GroupRsvpRosterDialog = (props: Props) => {
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<{ occurrenceStart: string | Date; rows: RsvpRow[] }[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        props.occurrences.map(async (o) => {
          const iso = new Date(o.occurrenceStart).toISOString();
          const rows: RsvpRow[] = await ApiHelper.get(`/events/${props.event.id}/rsvps?occurrenceStart=${encodeURIComponent(iso)}`, "ContentApi");
          return { occurrenceStart: o.occurrenceStart, rows: rows || [] };
        })
      );
      const ids = Array.from(new Set(results.flatMap((r) => r.rows.map((x) => x.personId))));
      const map: Record<string, string> = {};
      if (ids.length > 0) {
        const people: PersonInterface[] = await ApiHelper.get(`/people/ids?ids=${ids.join(",")}`, "MembershipApi");
        people.forEach((p) => { if (p.id) map[p.id] = p.name?.display || `${p.name?.first || ""} ${p.name?.last || ""}`.trim(); });
      }
      if (!cancelled) { setNames(map); setSections(results); setLoading(false); }
    })().catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [props.event.id]);

  return (
    <Dialog open={true} onClose={props.onClose} fullWidth data-testid="rsvp-roster-dialog">
      <DialogTitle>{Locale.label("groups.groupCalendar.rosterTitle")}: {props.event.title}</DialogTitle>
      <DialogContent>
        {loading && <Box sx={{ textAlign: "center", py: 3 }}><CircularProgress size={28} /></Box>}
        {!loading && sections.every((s) => s.rows.length === 0) && (
          <Typography variant="body2" color="text.secondary">{Locale.label("groups.groupCalendar.noResponses")}</Typography>
        )}
        {!loading && sections.filter((s) => s.rows.length > 0).map((sec) => (
          <Box key={new Date(sec.occurrenceStart).getTime()} sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {new Date(sec.occurrenceStart).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              {RESPONSES.map((resp) => {
                const people = sec.rows.filter((r) => r.response === resp);
                return (
                  <Box key={resp} sx={{ flex: 1 }} data-testid={`rsvp-roster-${resp}`}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {Locale.label(`groups.groupCalendar.response_${resp}`)} ({people.length})
                    </Typography>
                    {people.map((r) => (
                      <Typography key={r.personId} variant="body2" color="text.secondary">
                        {names[r.personId] || r.personId}
                      </Typography>
                    ))}
                  </Box>
                );
              })}
            </Stack>
          </Box>
        ))}
      </DialogContent>
    </Dialog>
  );
};
