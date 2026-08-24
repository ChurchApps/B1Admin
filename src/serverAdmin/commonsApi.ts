import { ApiHelper } from "@churchapps/apphelper";

// @churchapps/helpers' ApiListType union doesn't know about the commons module yet.
// Isolate the cast here rather than scattering "as any" through CommonsTab.
export const CommonsApi = {
  get: (path: string): Promise<any> => ApiHelper.get(path, "CommonsApi" as any),
  post: (path: string, data: any[] | Record<string, unknown>): Promise<any> => ApiHelper.post(path, data, "CommonsApi" as any)
};
