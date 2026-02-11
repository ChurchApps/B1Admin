import { type ApiListType } from "@churchapps/helpers";
import { ApiHelper } from "@churchapps/apphelper";
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const [path, apiListType] = queryKey;
        return ApiHelper.get(path as string, apiListType as ApiListType);
      }
    }
  }
});
