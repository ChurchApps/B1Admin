import { Permissions } from "@churchapps/apphelper";
import { Tabs } from "./components";
import { SermonChrome } from "./components/SermonChrome";
import { useRequirePermission } from "../hooks";

export const StreamSettingsPage = () => {
  const denied = useRequirePermission(Permissions.contentApi.streamingServices.edit);
  if (denied) return denied;
  return (
    <SermonChrome selected="settings">
      <Tabs />
    </SermonChrome>
  );
};
