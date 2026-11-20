import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import updateLocale from "dayjs/plugin/updateLocale";
import { ApiHelper, UserHelper } from "@churchapps/apphelper";
import type { ChurchInterface } from "@churchapps/helpers";

dayjs.extend(updateLocale);

const clamp = (value: unknown) => {
  const day = Math.trunc(Number(value));
  return day >= 0 && day <= 6 ? day : 0;
};

// Sets the dayjs week start; call before constructing a dayjsLocalizer.
export const applyWeekStart = (firstDayOfWeek: unknown) => {
  dayjs.updateLocale("en", { weekStart: clamp(firstDayOfWeek) });
};

// Login omits firstDayOfWeek from the church payload, so fall back to the full church record.
export const useFirstDayOfWeek = (): number => {
  const church: (ChurchInterface & { firstDayOfWeek?: number }) | undefined = UserHelper.currentUserChurch?.church;
  const churchId = church?.id;
  const query = useQuery<ChurchInterface & { firstDayOfWeek?: number }>({
    queryKey: [`/churches/${churchId}?include=permissions`, "MembershipApi"],
    enabled: ApiHelper.isAuthenticated && !!churchId && church?.firstDayOfWeek === undefined
  });
  return clamp(church?.firstDayOfWeek ?? query.data?.firstDayOfWeek);
};
