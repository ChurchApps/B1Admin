import { memo } from "react";
import { Permissions } from "@churchapps/apphelper";
import { Sermons } from "./components/Sermons";
import { useRequirePermission } from "../hooks";

export const SermonsPage = memo(() => {
  const denied = useRequirePermission(Permissions.contentApi.streamingServices.edit);
  if (denied) return denied;

  return (
    <Sermons />
  );
});
