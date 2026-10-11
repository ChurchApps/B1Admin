import { UserHelper, Permissions } from "@churchapps/apphelper";
import { Tabs } from "./components";
import { SermonChrome } from "./components/SermonChrome";

export const StreamSettingsPage = () => {
  if (!UserHelper.checkAccess(Permissions.contentApi.streamingServices.edit)) return <></>;
  return (
    <SermonChrome selected="settings">
      <Tabs />
    </SermonChrome>
  );
};
