import { memo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Link, Stack, Typography } from "@mui/material";
import { StickyNote2Outlined as NoteIcon } from "@mui/icons-material";
import { ApiHelper, DateHelper, Loading, Locale } from "@churchapps/apphelper";
import { EmptyState, NavigationTabs, PageContainer, PageHeader, StatusBadge, Surface } from "../components/ui";

type Section = "people" | "groups" | "events" | "workflows";

interface FeedNote {
  messageId: string;
  contentType: string;
  contentId: string;
  displayName?: string;
  timeSent: string;
  content?: string;
  sourceName?: string;
  parentId?: string;
}

interface FeedPage { notes: FeedNote[]; cursor: string | null }

const SECTIONS: { key: Section; empty: string }[] = [
  { key: "people", empty: "emptyPeople" },
  { key: "groups", empty: "emptyGroups" },
  { key: "events", empty: "emptyEvents" },
  { key: "workflows", empty: "emptyWorkflows" }
];

// Where each note is read and edited: the person's or group's notes view, the event's group calendar, the card's board.
const sourceLink = (note: FeedNote): string | null => {
  switch (note.contentType) {
    case "person":
    case "personConfidential": return `/people/${note.contentId}?view=notes`;
    case "groupNote": return `/groups/${note.contentId}?view=notes`;
    case "eventNote": return note.parentId ? `/groups/${note.parentId}?view=calendar` : null;
    case "workflowCard": return note.parentId ? `/serving/tasks/workflows/${note.parentId}` : `/serving/tasks/${note.contentId}`;
    default: return null;
  }
};

const NoteRow = ({ note }: { note: FeedNote }) => {
  const link = sourceLink(note);
  const name = note.sourceName || Locale.label("people.notesPage.unknownSource");
  return (
    <Box component="li" data-testid={"notes-row-" + note.messageId} sx={{ py: 1.5, borderBottom: 1, borderColor: "divider", "&:last-of-type": { borderBottom: 0 } }}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        {link
          ? <Link component={RouterLink} to={link} fontWeight={600} data-testid="notes-source-link">{name}</Link>
          : <Typography fontWeight={600}>{name}</Typography>}
        {note.contentType === "personConfidential" && <StatusBadge tone="warning">{Locale.label("people.notesPage.confidential")}</StatusBadge>}
        <Typography variant="body2" color="text.secondary">
          {Locale.label("people.notesPage.author").replace("{name}", note.displayName || "")} · {DateHelper.prettyDateTime(new Date(note.timeSent))}
        </Typography>
      </Stack>
      <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{note.content}</Typography>
    </Box>
  );
};

const NotesFeed = ({ section, empty }: { section: Section; empty: string }) => {
  const feed = useInfiniteQuery<FeedPage>({
    queryKey: ["/conversations/notes/feed", section],
    queryFn: ({ pageParam }) => ApiHelper.get(`/conversations/notes/feed?section=${section}` + (pageParam ? "&before=" + encodeURIComponent(pageParam as string) : ""), "MessagingApi"),
    initialPageParam: "",
    getNextPageParam: (last) => last?.cursor || undefined
  });
  if (feed.isLoading) return <Loading />;
  const notes = feed.data?.pages.flatMap((p) => p?.notes || []) || [];
  if (notes.length === 0) return <EmptyState icon={<NoteIcon />} title={Locale.label("people.notesPage." + empty)} />;
  return (
    <Surface data-testid={"notes-list-" + section}>
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
        {notes.map((n) => <NoteRow key={n.messageId} note={n} />)}
      </Box>
      {feed.hasNextPage && (
        <Button onClick={() => feed.fetchNextPage()} disabled={feed.isFetchingNextPage} sx={{ mt: 1 }} data-testid="notes-load-more">
          {Locale.label("people.notesPage.loadMore")}
        </Button>
      )}
    </Surface>
  );
};

// Read-only overview of notes across records (ChurchAppsSupport#1334). The Api applies each note type's own visibility rule.
export const NotesPage = memo(() => {
  const [section, setSection] = useState<Section>("people");
  const current = SECTIONS.find((s) => s.key === section) || SECTIONS[0];
  const tabs = SECTIONS.map((s) => ({ value: s.key, label: Locale.label("people.notesPage." + s.key), testId: "notes-tab-" + s.key }));
  return (
    <>
      <PageHeader
        title={Locale.label("people.notesPage.title")}
        subtitle={Locale.label("people.notesPage.subtitle")}
        tabs={<NavigationTabs onHeader selectedTab={section} onTabChange={(t) => setSection(t as Section)} tabs={tabs} testId="notes-tabs" />} />
      <PageContainer>
        <NotesFeed key={current.key} section={current.key} empty={current.empty} />
      </PageContainer>
    </>
  );
});
