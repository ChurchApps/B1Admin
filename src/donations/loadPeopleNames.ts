import { ApiHelper } from "@churchapps/apphelper";
import type { PersonInterface } from "@churchapps/helpers";

const CHUNK = 200;

// One call returns display name and photo for every id. Callers that need address or phone stay on /people/ids.
export function loadPeopleNames(ids: string[]): Promise<PersonInterface[]> {
  const unique = [...new Set(ids.filter((id) => !!id))];
  if (unique.length === 0) return Promise.resolve([]);
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += CHUNK) chunks.push(unique.slice(i, i + CHUNK));
  return Promise.all(chunks.map((peopleIds) => ApiHelper.post("/people/names", { peopleIds }, "MembershipApi") as Promise<PersonInterface[]>)).then((batches) => batches.flat());
}
