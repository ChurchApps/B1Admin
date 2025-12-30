import React from "react";
import { FormEdit, EnvironmentHelper } from "./components";
import { type FormInterface } from "@churchapps/helpers";
import { ApiHelper, UserHelper, Permissions, Loading, Locale } from "@churchapps/apphelper";
import { Link } from "react-router-dom";
import {
  Icon, Table, TableBody, TableCell, TableRow, TableHead, Box, Typography, Stack, Button, Card
} from "@mui/material";
import { Description as DescriptionIcon, Add as AddIcon, Archive as ArchiveIcon } from "@mui/icons-material";
import { SmallButton } from "@churchapps/apphelper";
import { PageHeader } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { SmartTabs } from "../components/ui";

export const FormsPage = () => {
  const [selectedFormId, setSelectedFormId] = React.useState("notset");
  const [selectedTab, setSelectedTab] = React.useState("forms");
  const formPermission = UserHelper.checkAccess(Permissions.membershipApi.forms.admin) || UserHelper.checkAccess(Permissions.membershipApi.forms.edit);

  const forms = useQuery<FormInterface[]>({
    queryKey: ["/forms", "MembershipApi"],
    placeholderData: [],
  });

  const archivedForms = useQuery<FormInterface[]>({
    queryKey: ["/forms/archived", "MembershipApi"],
    placeholderData: [],
  });

  const getRows = (isArchived: boolean) => {
    const result: JSX.Element[] = [];
    // Filter forms based on archived status since the API may return all forms
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
          <SmallButton
            icon="edit"
            text="Edit"
            onClick={() => {
              setSelectedFormId(form.id);
            }}
            data-testid={`edit-form-button-${form.id}`}
            ariaLabel={`Edit form ${form.name}`}
          />
        ) : null;
      const formUrl = EnvironmentHelper.B1Url.replace("{key}", UserHelper.currentUserChurch.church.subDomain) + "/forms/" + form.id;
      const formLink = form.contentType === "form" ? <a href={formUrl}>{formUrl}</a> : null;
      const archiveLink =
        canEdit && !isArchived ? (
          <SmallButton
            icon="delete"
            text="Archive"
            color="error"
            onClick={() => {
              handleArchiveChange(form, true);
            }}
            data-testid={`archive-form-button-${form.id}`}
            ariaLabel={`Archive form ${form.name}`}
          />
        ) : null;
      const unarchiveLink =
        canEdit && isArchived ? (
          <SmallButton
            icon="undo"
            text="Restore"
            color="success"
            onClick={() => {
              handleArchiveChange(form, false);
            }}
            data-testid={`restore-form-button-${form.id}`}
            ariaLabel={`Restore form ${form.name}`}
          />
        ) : null;
      result.push(
        <TableRow key={form.id}>
          <TableCell>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Icon sx={{ fontSize: 20, marginRight: "5px" }}>format_align_left</Icon> <Link to={"/forms/" + form.id}>{form.name}</Link>
            </Box>
          </TableCell>
          <TableCell>{formLink}</TableCell>
          <TableCell style={{ textAlign: "right" }}>
            {archiveLink || unarchiveLink} {editLink}
          </TableCell>
        </TableRow>
      );
    });
    return result;
  };

  const handleArchiveChange = (form: FormInterface, archive: boolean) => {
    const conf = archive ? window.confirm(Locale.label("forms.formsPage.confirmMsg1")) : window.confirm(Locale.label("forms.formsPage.confirmMsg2"));
    if (!conf) return;
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
        <th colSpan={3}>{Locale.label("common.name")}</th>
      </TableRow>
    );
    return rows;
  };

  const handleUpdate = () => {
    forms.refetch();
    archivedForms.refetch();
    setSelectedFormId("notset");
  };

  const getSidebar = () => {
    if (selectedFormId === "notset" || selectedTab === "archived") return <></>;
    if (selectedTab === "forms") return <FormEdit formId={selectedFormId} updatedFunction={handleUpdate}></FormEdit>;
  };

  if (forms.isLoading || archivedForms.isLoading) return <Loading />;

  const renderTable = (rows: JSX.Element[], isArchived: boolean) => (
    <Table>
      <TableHead>{getTableHeader(isArchived)}</TableHead>
      <TableBody>{rows}</TableBody>
    </Table>
  );

  // Filter counts to match actual displayed forms
  const formsCount = forms.data?.filter(form => !form.archived)?.length || 0;
  const archivedCount = archivedForms.data?.filter(form => form.archived === true)?.length || 0;

  const formsCard = (
    <Card sx={{ mt: getSidebar() ? 2 : 0 }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <DescriptionIcon />
            <Typography variant="h6">{Locale.label("forms.formsPage.forms")}</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {`${formsCount} ${formsCount === 1 ? "form" : "forms"}`}
          </Typography>
        </Stack>
      </Box>
      <Box sx={{ p: 0 }}>{renderTable(getRows(false), false)}</Box>
    </Card>
  );

  const archivedCard = (
    <Card>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <ArchiveIcon />
            <Typography variant="h6">{Locale.label("forms.formsPage.archForms")}</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {`${archivedCount} archived ${archivedCount === 1 ? "form" : "forms"}`}
          </Typography>
        </Stack>
      </Box>
      <Box sx={{ p: 0 }}>{renderTable(getArchivedRows(), true)}</Box>
    </Card>
  );

  const tabs = [
    {
      key: "forms",
      label: Locale.label("forms.formsPage.forms"),
      content: (
        <>
          {getSidebar()}
          {formsCard}
        </>
      )
    },
    { key: "archived", label: Locale.label("forms.formsPage.archForms"), content: archivedCard, hidden: archivedCount === 0 },
  ];

  return (
    <>
      <PageHeader icon={<DescriptionIcon />} title={Locale.label("forms.formsPage.forms")} subtitle={Locale.label("forms.formsPage.subtitleManage")}>
        {formPermission && selectedTab !== "archived" && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setSelectedFormId("");
            }}
            sx={{
              backgroundColor: "#FFF",
              color: "var(--c1l2)",
              "&:hover": { backgroundColor: "rgba(255,255,255,0.9)" },
            }}
            data-testid="add-form-button">
            {Locale.label("forms.formsPage.addForm") || "Add Form"}
          </Button>
        )}
      </PageHeader>
      {/* Tab Content */}
      <Box sx={{ p: 3 }}>
        <SmartTabs tabs={tabs} value={selectedTab} onChange={setSelectedTab} ariaLabel="forms-tabs" />
      </Box>
    </>
  );
};
