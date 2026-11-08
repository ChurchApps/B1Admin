import { useQuery } from "@tanstack/react-query";
import { ApiHelper, Permissions, UserHelper } from "@churchapps/apphelper";

// Mirrors apphelper's DeletedNoteInterface (Notes `deletedNotes` prop).
export interface DeletedNote {
  messageId?: string;
  displayName?: string;
  timeSent?: string;
  deletedAt?: string;
}

interface NoteAuditRow {
  action: string;
  details: string;
  created: string;
}

export const noteHistoryLink = (contentId: string) => "/settings/audit-log?module=messaging&entityType=note&entityId=" + encodeURIComponent(contentId);

// Keeps the note_deleted rows for one notes box. A person has two boxes (person, personConfidential) under the same entityId.
export const toDeletedNotes = (rows: NoteAuditRow[], contentType: string): DeletedNote[] => {
  const result: DeletedNote[] = [];
  (rows || []).forEach((row) => {
    if (row.action !== "note_deleted") return;
    let details: any;
    try { details = JSON.parse(row.details); } catch { return; }
    if (details?.contentType !== contentType) return;
    result.push({ messageId: details.messageId, displayName: details.before?.displayName, timeSent: details.before?.timeSent, deletedAt: row.created });
  });
  return result;
};

// Note history for a person, group or event, only for users who can already open the audit log (Settings → Edit).
export const useNoteAudit = (contentType?: string, contentId?: string) => {
  const canView = UserHelper.checkAccess(Permissions.membershipApi.settings.edit);
  const enabled = canView && !!contentType && !!contentId;
  const query = useQuery<NoteAuditRow[]>({
    queryKey: ["note-audit", contentType, contentId],
    queryFn: async () => {
      const data = await ApiHelper.get("/auditlogs?module=messaging&entityType=note&entityId=" + encodeURIComponent(contentId!) + "&limit=200", "MembershipApi");
      return data?.logs || [];
    },
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: true
  });
  if (!enabled) return { deletedNotes: undefined as DeletedNote[] | undefined, historyLink: undefined as string | undefined };
  return { deletedNotes: toDeletedNotes(query.data || [], contentType!), historyLink: noteHistoryLink(contentId!) };
};
