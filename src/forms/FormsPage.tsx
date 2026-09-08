import React from "react";
import { FormEdit, EnvironmentHelper } from "./components";
import { type FormInterface } from "@churchapps/helpers";
import { ApiHelper, UserHelper, Permissions, Loading, Locale } from "@churchapps/apphelper";
import { Link } from "react-router-dom";
import { Table, TableBody, TableCell, TableRow, TableHead, Box, Typography, Snackbar } from "@mui/material";
import { PermissionDenied } from "../components";
import { useQuery } from "@tanstack/react-query";
import { AppIconButton } from "../components/ui/AppIconButton";
import { useConfirmDelete } from "../hooks";
import { Plate, h1Sx, ledeSx, pillSx, addBarSx, verbSx, findSx, DUST } from "./plated";
import { Edit as EditIcon } from "@mui/icons-material";

export const FormsPage = () => {
  const [selectedFormId, setSelectedFormId] = React.useState("notset");
  const [selectedTab, setSelectedTab] = React.useState("forms");
  const [showDuplicated, setShowDuplicated] = React.useState(false);
  const [query, setQuery] = React.useState("");
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
    const q = query.trim().toLowerCase();
    const formData = rawData?.filter(form => (isArchived ? form.archived === true : !form.archived) && (!q || (form.name || "").toLowerCase().includes(q)));

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
      const formLink = form.contentType === "form" ? <a href={formUrl}>{formUrl}</a> : <Typography variant="body2" color="text.secondary">{Locale.label("forms.formsPage.personProfileForm")}</Typography>;
      const duplicateLink =
        canEdit && !isArchived ? (
          <Box component="button" type="button" onClick={() => handleDuplicate(form.id || "")} data-testid={`duplicate-form-button-${form.id}`} sx={verbSx}>{Locale.label("forms.formsPage.duplicate")}</Box>
        ) : null;
      const archiveLink =
        canEdit && !isArchived ? (
          <Box component="button" type="button" onClick={() => handleArchiveChange(form, true)} data-testid={`archive-form-button-${form.id}`} aria-label={Locale.label("forms.formsPage.archiveFormAria").replace("{name}", form.name || "")} sx={verbSx}>{Locale.label("forms.formsPage.archive")}</Box>
        ) : null;
      const unarchiveLink =
        canEdit && isArchived ? (
          <Box component="button" type="button" onClick={() => handleArchiveChange(form, false)} data-testid={`restore-form-button-${form.id}`} aria-label={Locale.label("forms.formsPage.restoreFormAria").replace("{name}", form.name || "")} sx={verbSx}>{Locale.label("forms.formsPage.restore")}</Box>
        ) : null;
      result.push(
        <TableRow key={form.id}>
          <TableCell>
            <Link to={"/forms/" + form.id} style={{ textDecoration: "none", color: "var(--link)", fontWeight: 500 }}>{form.name}</Link>
          </TableCell>
          <TableCell>{formLink}</TableCell>
          <TableCell align="right" className="rowActions">
            <Box sx={{ display: "flex", gap: 1.75, justifyContent: "flex-end", flexWrap: "wrap" }}>
              {archiveLink || unarchiveLink} {duplicateLink} {editLink}
            </Box>
          </TableCell>
        </TableRow>
      );
    });
    return result;
  };

  const handleDuplicate = async (formId: string) => {
    if (!(await confirm(Locale.label("forms.formsPage.confirmDuplicate"), { destructive: false, confirmLabel: Locale.label("forms.formsPage.duplicate") }))) return;
    ApiHelper.post("/forms/duplicate/" + formId, {}, "MembershipApi").then(() => {
      forms.refetch();
      setShowDuplicated(true);
    });
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

  const formsCount = forms.data?.filter(form => !form.archived)?.length || 0;
  const archivedCount = archivedForms.data?.filter(form => form.archived === true)?.length || 0;

  React.useEffect(() => {
    if (selectedTab === "archived" && archivedCount === 0) setSelectedTab("forms");
  }, [selectedTab, archivedCount]);

  if (!formPermission) return <PermissionDenied permissions={[Permissions.membershipApi.forms.admin, Permissions.membershipApi.forms.edit]} />;
  if (forms.isLoading || archivedForms.isLoading) return <Loading />;

  const isArchived = selectedTab === "archived";

  return (
    <>
      {ConfirmDialogElement}
      <Plate directory>
        <Box component="h1" sx={h1Sx}>{Locale.label("forms.formsPage.forms")}</Box>
        <Box sx={ledeSx}>{Locale.label("forms.formsPage.subtitleManage")}</Box>

        <Box sx={{ display: "flex", gap: 1, flexWrap: { xs: "nowrap", sm: "wrap" }, overflowX: { xs: "auto", sm: "visible" }, mb: 2.5 }}>
          <Box component="button" type="button" onClick={() => setSelectedTab("forms")} sx={pillSx(selectedTab === "forms")}>{Locale.label("forms.formsPage.forms")}</Box>
          {archivedCount > 0 && (
            <Box component="button" type="button" onClick={() => setSelectedTab("archived")} sx={pillSx(selectedTab === "archived")}>{Locale.label("forms.formsPage.archForms")}</Box>
          )}
        </Box>

        <Box
          component="input"
          value={query}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          placeholder={Locale.label("common.search", "Find")}
          sx={findSx}
        />
        <Box sx={{ color: DUST, fontSize: "0.8rem", mb: 3 }}>{formsCount} {Locale.label("forms.formsPage.forms").toLowerCase()}</Box>

        {selectedFormId !== "notset" && selectedTab === "forms" && (
          <Box sx={{ mb: 3 }}>
            <FormEdit formId={selectedFormId} updatedFunction={handleUpdate} />
          </Box>
        )}

        <Table>
          <TableHead>{getTableHeader(isArchived)}</TableHead>
          <TableBody>{getRows(isArchived)}</TableBody>
        </Table>

        {formPermission && selectedTab !== "archived" && selectedFormId === "notset" && (
          <Box sx={addBarSx}>
            <Box component="button" type="button" onClick={() => setSelectedFormId("")} data-testid="add-form-button" sx={verbSx}>
              {Locale.label("forms.formsPage.addForm")}
            </Box>
          </Box>
        )}
      </Plate>
      <Snackbar
        open={showDuplicated}
        onClose={() => setShowDuplicated(false)}
        autoHideDuration={3000}
        message={Locale.label("forms.formsPage.duplicated")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </>
  );
};
