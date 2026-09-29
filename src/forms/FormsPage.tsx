import React from "react";
import { FormEdit, FormPrintDialog, EnvironmentHelper } from "./components";
import { type FormInterface } from "@churchapps/helpers";
import { ApiHelper, UserHelper, Permissions, Loading, Locale } from "@churchapps/apphelper";
import { Link } from "react-router-dom";
import { Table, TableBody, TableCell, TableRow, TableHead, Box, Typography, Snackbar, Link as MuiLink } from "@mui/material";
import { PermissionDenied } from "../components";
import { useQuery } from "@tanstack/react-query";
import { AddBar, PageHeader, PageContainer, PillTabs, SearchField, Surface, TextAction, VerbRow, tableScrollSx } from "../components/ui";
import { useConfirmDelete } from "../hooks";

export const FormsPage = () => {
  const [selectedFormId, setSelectedFormId] = React.useState("notset");
  const [selectedTab, setSelectedTab] = React.useState("forms");
  const [showDuplicated, setShowDuplicated] = React.useState(false);
  const [printFormId, setPrintFormId] = React.useState("");
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

  const listFor = (isArchived: boolean) => {
    const rawData = isArchived ? archivedForms.data : forms.data;
    return rawData?.filter(form => isArchived ? form.archived === true : !form.archived) || [];
  };

  const getRows = (isArchived: boolean) => {
    const result: JSX.Element[] = [];
    const term = query.trim().toLowerCase();
    const formData = listFor(isArchived).filter((form) => !term || (form.name || "").toLowerCase().includes(term));

    if (!formData.length) {
      const empty = term
        ? Locale.label("forms.formsPage.noMatches", "No forms match your search.")
        : isArchived ? Locale.label("forms.formsPage.noArch") : Locale.label("forms.formsPage.noCustomMsg");
      result.push(
        <TableRow key="0">
          <TableCell colSpan={3}>{empty}</TableCell>
        </TableRow>
      );
      return result;
    }
    formData.forEach((form: FormInterface) => {
      const canEdit =
        UserHelper.checkAccess(Permissions.membershipApi.forms.admin) || (UserHelper.checkAccess(Permissions.membershipApi.forms.edit) && form.contentType !== "form") || form?.action === "admin";
      const editable = canEdit && !isArchived;
      const formUrl = EnvironmentHelper.B1Url.replace("{subdomain}", UserHelper.currentUserChurch.church.subDomain || "") + "/forms/" + form.id;
      const formLink = form.contentType === "form"
        ? <MuiLink href={formUrl} underline="hover" sx={{ overflowWrap: "anywhere" }}>{formUrl}</MuiLink>
        : <Typography variant="body2" color="text.secondary">{Locale.label("forms.formsPage.personProfileForm")}</Typography>;
      result.push(
        <TableRow key={form.id}>
          <TableCell>
            <MuiLink component={Link} to={"/forms/" + form.id} underline="hover" sx={{ fontWeight: 600 }}>{form.name}</MuiLink>
          </TableCell>
          <TableCell>{formLink}</TableCell>
          <TableCell align="right" className="rowActions">
            <VerbRow sx={{ justifyContent: "flex-end" }}>
              {editable && <TextAction small onClick={() => setSelectedFormId(form.id || "")} data-testid={`edit-form-button-${form.id}`}>{Locale.label("common.edit")}</TextAction>}
              <TextAction small onClick={() => setPrintFormId(form.id || "")} data-testid={`print-form-button-${form.id}`}>{Locale.label("common.print")}</TextAction>
              {editable && <TextAction small onClick={() => handleDuplicate(form.id || "")} data-testid={`duplicate-form-button-${form.id}`}>{Locale.label("forms.formsPage.duplicate")}</TextAction>}
              {editable && (
                <TextAction small onClick={() => handleArchiveChange(form, true)} data-testid={`archive-form-button-${form.id}`} aria-label={Locale.label("forms.formsPage.archiveFormAria").replace("{name}", form.name || "")}>
                  {Locale.label("forms.formsPage.archive")}
                </TextAction>
              )}
              {canEdit && isArchived && (
                <TextAction small onClick={() => handleArchiveChange(form, false)} data-testid={`restore-form-button-${form.id}`} aria-label={Locale.label("forms.formsPage.restoreFormAria").replace("{name}", form.name || "")}>
                  {Locale.label("forms.formsPage.restore")}
                </TextAction>
              )}
            </VerbRow>
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
    ApiHelper.post("/forms", [{ ...form, archived: archive }], "MembershipApi").then(() => {
      forms.refetch();
      archivedForms.refetch();
    });
  };

  const getTableHeader = (isArchived: boolean) => {
    if (!listFor(isArchived).length) return null;
    return (
      <TableRow>
        <TableCell>{Locale.label("common.name")}</TableCell>
        <TableCell>{Locale.label("forms.formsPage.url")}</TableCell>
        <TableCell></TableCell>
      </TableRow>
    );
  };

  const handleUpdate = () => {
    forms.refetch();
    archivedForms.refetch();
    setSelectedFormId("notset");
  };

  const formsCount = listFor(false).length;
  const archivedCount = listFor(true).length;

  React.useEffect(() => {
    if (selectedTab === "archived" && archivedCount === 0) setSelectedTab("forms");
  }, [selectedTab, archivedCount]);

  if (!formPermission) return <PermissionDenied permissions={[Permissions.membershipApi.forms.admin, Permissions.membershipApi.forms.edit]} />;
  if (forms.isLoading || archivedForms.isLoading) return <Loading />;

  const isArchived = selectedTab === "archived" && archivedCount > 0;
  const editing = selectedFormId !== "notset" && !isArchived;
  const adding = editing && selectedFormId === "";
  const listLabel = isArchived ? Locale.label("forms.formsPage.archForms") : Locale.label("forms.formsPage.forms");

  const pills = [{ value: "forms", label: Locale.label("forms.formsPage.forms"), "data-testid": "pill-forms" }];
  if (archivedCount > 0) pills.push({ value: "archived", label: Locale.label("forms.formsPage.archForms"), "data-testid": "pill-archived-forms" });

  return (
    <>
      {ConfirmDialogElement}
      {printFormId && <FormPrintDialog formId={printFormId} onClose={() => setPrintFormId("")} />}
      <PageHeader
        title={Locale.label("forms.formsPage.forms")}
        subtitle={Locale.label("forms.formsPage.subtitleManage")}
        tabs={pills.length > 1 && (
          <PillTabs
            tabs
            options={pills}
            value={isArchived ? "archived" : "forms"}
            onChange={(v) => { setSelectedTab(v); setSelectedFormId("notset"); }}
            aria-label={Locale.label("forms.formsPage.forms")}
          />
        )}
      />
      <PageContainer>
        {editing && !adding && (
          <Box sx={{ mb: 3 }}>
            <FormEdit formId={selectedFormId} updatedFunction={handleUpdate} />
          </Box>
        )}
        <Surface disablePadding>
          <Box sx={{ p: { xs: 2, md: 3 }, pb: { xs: 1, md: 2 } }}>
            <SearchField value={query} onChange={setQuery} label={Locale.label("forms.formsPage.find", "Find a form")} data-testid="forms-find" sx={{ maxWidth: 420 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }} data-testid="forms-count">
              {(isArchived ? archivedCount : formsCount) + " " + listLabel.toLowerCase()}
            </Typography>
          </Box>
          <Box sx={tableScrollSx} role="region" aria-label={listLabel} tabIndex={0}>
            <Table>
              <TableHead>{getTableHeader(isArchived)}</TableHead>
              <TableBody>{getRows(isArchived)}</TableBody>
            </Table>
          </Box>
        </Surface>
        {!isArchived && (!editing || adding) && (
          <AddBar>
            {adding
              ? <FormEdit formId="" updatedFunction={handleUpdate} />
              : <TextAction onClick={() => setSelectedFormId("")} data-testid="add-form-button">{Locale.label("forms.formsPage.addForm")}</TextAction>}
          </AddBar>
        )}
      </PageContainer>
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
