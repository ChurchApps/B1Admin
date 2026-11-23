import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { type PersonInterface } from "@churchapps/helpers";
import { DateHelper, Loading, Locale, PersonAvatar } from "@churchapps/apphelper";
import { Alert, Box, Button, Link, Stack, Typography } from "@mui/material";
import { EmptyState } from "../../components/ui";
import UserContext from "../../UserContext";
import { MergeModal } from "./modals/MergeModal";
import { mergePeople } from "./mergePeople";

interface DuplicatePair {
  person1: PersonInterface;
  person2: PersonInterface;
  matchedOn: string[];
}

interface Props {
  onMerged: () => void;
}

const matchLabelKeys: Record<string, string> = {
  email: "people.possibleDuplicates.matchEmail",
  phone: "people.possibleDuplicates.matchPhone",
  nameBirthDate: "people.possibleDuplicates.matchNameBirthDate"
};

const addedTime = (p: PersonInterface) => (p.dateAdded ? new Date(p.dateAdded).getTime() : Number.MAX_SAFE_INTEGER);

const PersonSummary = ({ person }: { person: PersonInterface }) => {
  const details = [
    person.contactInfo?.email,
    person.contactInfo?.mobilePhone || person.contactInfo?.homePhone || person.contactInfo?.workPhone,
    person.birthDate ? DateHelper.prettyDate(new Date(person.birthDate)) : null
  ].filter(Boolean).join(" · ");
  return (
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
      <PersonAvatar person={person} sx={{ width: 40, height: 40 }} />
      <Box sx={{ minWidth: 0 }}>
        <Link component={RouterLink} to={"/people/" + person.id} sx={{ fontWeight: 600 }}>{person.name?.display}</Link>
        {details && <Typography variant="body2" color="text.secondary" noWrap>{details}</Typography>}
        {person.dateAdded && <Typography variant="caption" color="text.secondary">{Locale.label("people.possibleDuplicates.added").replace("{date}", DateHelper.prettyDate(new Date(person.dateAdded)))}</Typography>}
      </Box>
    </Stack>
  );
};

export const PossibleDuplicates: React.FC<Props> = ({ onMerged }) => {
  const context = React.useContext(UserContext);
  const { data: pairs, isLoading, refetch } = useQuery<DuplicatePair[]>({ queryKey: ["/people/possibleDuplicates", "MembershipApi"] });
  const [mergePair, setMergePair] = React.useState<{ keep: PersonInterface; remove: PersonInterface } | null>(null);
  const [mergeInProgress, setMergeInProgress] = React.useState(false);
  const [error, setError] = React.useState("");

  // Keep the record added first, unless the other one is the signed-in user's own record.
  const openMerge = (pair: DuplicatePair) => {
    const [older, newer] = addedTime(pair.person1) <= addedTime(pair.person2) ? [pair.person1, pair.person2] : [pair.person2, pair.person1];
    const keepNewer = older.id === context?.person?.id;
    setError("");
    setMergePair({ keep: { ...(keepNewer ? newer : older) }, remove: { ...(keepNewer ? older : newer) } });
  };

  const merge = async (person: PersonInterface, personToRemove: PersonInterface) => {
    setMergeInProgress(true);
    try {
      await mergePeople(person, personToRemove);
      setMergePair(null);
      await refetch();
      onMerged();
    } catch {
      setMergePair(null);
      setError(Locale.label("common.saveError"));
    }
    setMergeInProgress(false);
  };

  if (isLoading || !pairs) return <Loading size="sm" />;

  return (
    <Stack spacing={2} data-testid="possible-duplicates">
      {error && <Alert severity="error">{error}</Alert>}
      {pairs.length === 0
        ? <EmptyState variant="plain" title={Locale.label("people.possibleDuplicates.none")} description={Locale.label("people.possibleDuplicates.noneHint")} />
        : (
          <>
            <Typography variant="body2" color="text.secondary">
              {Locale.label(pairs.length === 1 ? "people.possibleDuplicates.countOne" : "people.possibleDuplicates.count").replace("{count}", pairs.length.toString())} {Locale.label("people.possibleDuplicates.hint")}
            </Typography>
            <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
              {pairs.map((pair) => (
                <Box component="li" key={pair.person1.id + "-" + pair.person2.id} sx={{ py: 1.5, borderBottom: 1, borderColor: "divider" }} data-testid="possible-duplicate-row">
                  <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }}>
                    <PersonSummary person={pair.person1} />
                    <PersonSummary person={pair.person2} />
                    <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ flexShrink: 0 }}>
                      <Typography variant="caption" color="text.secondary">
                        {Locale.label("people.possibleDuplicates.matchedOn").replace("{fields}", pair.matchedOn.map((m) => Locale.label(matchLabelKeys[m] || m)).join(", "))}
                      </Typography>
                      <Button size="small" variant="outlined" onClick={() => openMerge(pair)} data-testid={`possible-duplicate-merge-${pair.person1.id}-${pair.person2.id}`}>
                        {Locale.label("people.merge.merge")}
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              ))}
            </Box>
          </>
        )}
      {mergePair && (
        <MergeModal show onHide={() => setMergePair(null)} person1={mergePair.keep} person2={mergePair.remove} merge={merge} mergeInProgress={mergeInProgress} />
      )}
    </Stack>
  );
};
