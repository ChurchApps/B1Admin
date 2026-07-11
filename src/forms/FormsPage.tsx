import React from "react";
import { FormEdit, EnvironmentHelper } from "./components";
import { type FormInterface } from "@churchapps/helpers";
import { ApiHelper, UserHelper, Permissions, Loading, Locale } from "@churchapps/apphelper";
import { Link } from "react-router-dom";
import { Icon, Table, TableBody, TableCell, TableRow, TableHead, Box, Typography, Stack, Button, Card } from "@mui/material";
import { Description as DescriptionIcon, Add as AddIcon, Archive as ArchiveIcon, Edit as EditIcon, Delete as DeleteIcon, Undo as UndoIcon, ContentCopy as CopyIcon } from "@mui/icons-material";
import { PageHeader } from "@churchapps/apphelper";
import { PermissionDenied } from "../components";
import { useQuery } from "@tanstack/react-query";
import { CountChip, NavigationTabs, HeaderPrimaryButton, type NavigationTab } from "../components/ui";
import { AppIconButton } from "../components/ui/AppIconButton";
import { useConfirmDelete } from "../hooks";

export const FormsPage = () => {
  const [selectedFormId, setSelectedFormId] = React.useState("notset");
  const [selectedTab, setSelectedTab] = React.useState("forms");
  const { confirm, ConfirmDialogElement } = useConfirmDelete();
  const formPermission = UserHelper.checkAccess(Permissions.membershipApi.forms.admin) || UserHelper.checkAccess(Permissions.membershipApi.forms.edit);

  const forms = useQuery<FormInterface[]>({
    queryKey: ["/forms", "MembershipApi"],
    placeholderData: []
  });

  const archivedForms = useQuery<FormInterface[]>({
    queryKey: ["/forms/archived", "MembershipApi"],
    placeholderData: []
  });

  const getRows = (isArchived: boolean) => {
    const result: JSX.Element[] = [];
    const rawData = isArchived ? archivedForms.data : forms.data;
    const formData = rawData?.filter(form => isArchived ? form.archived === true : !form.archived);

    if (!formData?.length) {
      result.push(
        <TableRow key="0">
          <TableCell>{isArchived ? Locale.label("forms.formsPage.noArch") : Locale.label("forms.formsPage.noCustomMsg")}</TableCell>
        </TableRow>
      );
      return result;
    }
    formData.forEach((form: FormInterface) => {
      const canEdit =
        UserHelper.checkAccess(Permissions.membershipApi.forms.admin) || (UserHelper.checkAccess(Permissions.membershipApi.forms.edit) && form.contentType !== "form") || form?.action === "admin";
      const editLink =
        canEdit && !isArchived ? (
          <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon />} onClick={() => setSelectedFormId(form.id || "")} data-testid={`edit-form-button-${form.id}`} />
        ) : null;
      const formUrl = EnvironmentHelper.B1Url.replace("{subdomain}", UserHelper.currentUserChurch.church.subDomain || "") + "/forms/" + form.id;
      const formLink = form.contentType === "form" ? <a href={formUrl}>{formUrl}</a> : null;
      const duplicateLink =
        canEdit && !isArchived ? (
          <AppIconButton label={Locale.label("forms.formsPage.duplicate")} icon={<CopyIcon />} onClick={() => handleDuplicate(form.id || "")} data-testid={`duplicate-form-button-${form.id}`} />
        ) : null;
      const archiveLink =
        canEdit && !isArchived ? (
          <Button size="small" variant="outlined" startIcon={<DeleteIcon />} onClick={() => handleArchiveChange(form, true)} data-testid={`archive-form-button-${form.id}`} aria-label={Locale.label("forms.formsPage.archiveFormAria").replace("{name}", form.name || "")}>{Locale.label("forms.formsPage.archive")}</Button>
        ) : null;
      const unarchiveLink =
        canEdit && isArchived ? (
          <Button size="small" variant="outlined" color="success" startIcon={<UndoIcon />} onClick={() => handleArchiveChange(form, false)} data-testid={`restore-form-button-${form.id}`} aria-label={Locale.label("forms.formsPage.restoreFormAria").replace("{name}", form.name || "")}>{Locale.label("forms.formsPage.restore")}</Button>
        ) : null;
      result.push(
        <TableRow key={form.id}>
          <TableCell>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Icon sx={{ color: "primary.main", fontSize: 20, marginRight: "5px" }}>format_align_left</Icon>{" "}
              <Link to={"/forms/" + form.id} style={{ textDecoration: "none", color: "var(--link)", fontWeight: 500 }}>{form.name}</Link>
            </Box>
          </TableCell>
          <TableCell>{formLink}</TableCell>
          <TableCell align="right" className="rowActions">
            {archiveLink || unarchiveLink} {duplicateLink} {editLink}
          </TableCell>
        </TableRow>
      );
    });
    return result;
  };

  const handleDuplicate = (formId: string) => {
    ApiHelper.post("/forms/duplicate/" + formId, {}, "MembershipApi").then(() => { forms.refetch(); });
  };

  const handleArchiveChange = async (form: FormInterface, archive: boolean) => {
    const message = archive ? Locale.label("forms.formsPage.confirmMsg1") : Locale.label("forms.formsPage.confirmMsg2");
    if (!(await confirm(message, { destructive: false, confirmLabel: Locale.label("common.confirm", "Confirm") }))) return;
    form.archived = archive;
    ApiHelper.post("/forms", [form], "MembershipApi").then(() => {
      forms.refetch();
      archivedForms.refetch();
    });
  };

  const getArchivedRows = () => getRows(true);

  const getTableHeader = (isArchived: boolean) => {
    const rows: JSX.Element[] = [];
    const rawData = isArchived ? archivedForms.data : forms.data;
    const formData = rawData?.filter(form => isArchived ? form.archived === true : !form.archived);
    if (!formData?.length) {
      return rows;
    }
    rows.push(
      <TableRow key="header">
        <TableCell>{Locale.label("common.name")}</TableCell>
        <TableCell>{Locale.label("forms.formsPage.url")}</TableCell>
        <TableCell></TableCell>
      </TableRow>
    );
    return rows;
  };

  const handleUpdate = () => {
    forms.refetch();
    archivedForms.refetch();
    setSelectedFormId("notset");
  };

  const getEditSlot = () => {
    if (selectedFormId === "notset" || selectedTab === "archived") return <></>;
    if (selectedTab === "forms") return <FormEdit formId={selectedFormId} updatedFunction={handleUpdate}></FormEdit>;
  };

  const formsCount = forms.data?.filter(form => !form.archived)?.length || 0;
  const archivedCount = archivedForms.data?.filter(form => form.archived === true)?.length || 0;

  React.useEffect(() => {
    if (selectedTab === "archived" && archivedCount === 0) setSelectedTab("forms");
  }, [selectedTab, archivedCount]);

  if (!formPermission) return <PermissionDenied permissions={[Permissions.membershipApi.forms.admin, Permissions.membershipApi.forms.edit]} />;
  if (forms.isLoading || archivedForms.isLoading) return <Loading />;

  const renderTable = (rows: JSX.Element[], isArchived: boolean) => (
    <Table>
      <TableHead>{getTableHeader(isArchived)}</TableHead>
      <TableBody>{rows}</TableBody>
    </Table>
  );

  const formsCard = (
    <Card sx={{ mt: getEditSlot() ? 2 : 0 }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "var(--border-light)" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <DescriptionIcon sx={{ color: "primary.main", fontSize: 20 }} />
            <Typography variant="h6">{Locale.label("forms.formsPage.forms")}</Typography>
            {formsCount > 0 && <CountChip count={formsCount} />}
          </Stack>
        </Stack>
      </Box>
      <Box sx={{ p: 0 }}>{renderTable(getRows(false), false)}</Box>
    </Card>
  );

  const archivedCard = (
    <Card>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "var(--border-light)" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <ArchiveIcon sx={{ color: "primary.main", fontSize: 20 }} />
            <Typography variant="h6">{Locale.label("forms.formsPage.archForms")}</Typography>
            {archivedCount > 0 && <CountChip count={archivedCount} />}
          </Stack>
        </Stack>
      </Box>
      <Box sx={{ p: 0 }}>{renderTable(getArchivedRows(), true)}</Box>
    </Card>
  );

  const headerTabs: NavigationTab[] = [{ value: "forms", label: Locale.label("forms.formsPage.forms") }];
  if (archivedCount > 0) headerTabs.push({ value: "archived", label: Locale.label("forms.formsPage.archForms") });

  return (
    <>
      {ConfirmDialogElement}
      <PageHeader
        icon={<DescriptionIcon />}
        title={Locale.label("forms.formsPage.forms")}
        subtitle={Locale.label("forms.formsPage.subtitleManage")}
        tabs={<NavigationTabs selectedTab={selectedTab} onTabChange={setSelectedTab} tabs={headerTabs} onHeader />}>
        {formPermission && selectedTab !== "archived" && (
          <HeaderPrimaryButton startIcon={<AddIcon />} onClick={() => setSelectedFormId("")} data-testid="add-form-button">
            {Locale.label("forms.formsPage.addForm")}
          </HeaderPrimaryButton>
        )}
      </PageHeader>
      <Box sx={{ p: 3 }}>
        {selectedTab === "archived" && archivedCount > 0 ? archivedCard : (
          <>
            {getEditSlot()}
            {formsCard}
          </>
        )}
      </Box>
    </>
  );
};
