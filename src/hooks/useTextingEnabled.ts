import { useQuery } from "@tanstack/react-query";

// True when the church has an enabled texting provider, so "Text" options only show where texts can actually go out.
export const useTextingEnabled = (): boolean => {
  const query = useQuery<{ enabled?: boolean }>({ queryKey: ["/texting/status", "MessagingApi"], placeholderData: {} });
  return !!query.data?.enabled;
};
