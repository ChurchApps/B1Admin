import { UserHelper, Permissions, Locale } from "@churchapps/apphelper";
import { PageHeader, PageContainer } from "../components/ui";
import { FilesManager } from "./components";
import { PermissionDenied } from "../components";

export const FilesPage = () => {
  if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) return <PermissionDenied permissions={[Permissions.contentApi.content.edit]} />;

  return (
    <>
      <PageHeader
        title={Locale.label("site.filesPage.title")}
        subtitle={Locale.label("site.filesPage.subtitle")}
      />
      <PageContainer>
        {UserHelper.currentUserChurch && <FilesManager />}
      </PageContainer>
    </>
  );
};
