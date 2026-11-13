import { type BlockoutDateInterface } from "@churchapps/helpers";
import { ApiHelper, DateHelper } from "@churchapps/apphelper";

// Blockouts are calendar dates; read them as local days so a US browser doesn't shift them back.
const dayRange = (b: BlockoutDateInterface) => {
  const start = DateHelper.toDate(b.startDate || 0);
  start.setHours(0, 0, 0, 0);
  const end = DateHelper.toDate(b.endDate || b.startDate || 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

export const findBlockout = (blockouts: BlockoutDateInterface[] | undefined, personId: string | undefined, date: Date | string | undefined): BlockoutDateInterface | undefined => {
  if (!blockouts?.length || !personId || !date) return undefined;
  const day = DateHelper.toDate(date);
  day.setHours(12, 0, 0, 0);
  return blockouts.find((b) => {
    if (b.personId !== personId) return false;
    const { start, end } = dayRange(b);
    return start <= day && day <= end;
  });
};

export const isBlockedOut = (blockouts: BlockoutDateInterface[] | undefined, personId: string | undefined, date: Date | string | undefined) => !!findBlockout(blockouts, personId, date);

export const formatBlockoutRange = (b: BlockoutDateInterface) => {
  const start = DateHelper.prettyDate(DateHelper.toDate(b.startDate || 0));
  const end = DateHelper.prettyDate(DateHelper.toDate(b.endDate || b.startDate || 0));
  return start === end ? start : start + " – " + end;
};

export const loadUpcomingBlockouts = async (): Promise<BlockoutDateInterface[]> => (await ApiHelper.get("/blockoutDates/upcoming", "DoingApi")) || [];
