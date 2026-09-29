import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ApiHelper, Loading, Locale } from "@churchapps/apphelper";
import { Permissions } from "@churchapps/helpers";
import { Box, Menu, MenuItem, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import { Label as LabelIcon } from "@mui/icons-material";
import { EmptyState } from "../components/ui/EmptyState";
import { AddBar, StatusBadge, Surface, TextAction, VerbRow } from "../components/ui";
import { useConfirmDelete, useRequirePermission } from "../hooks";
import { LabelEditor, newBlockId, type LabelTemplateInterface } from "./components/LabelEditor";
import { MobileChrome } from "./components/MobileChrome";

// Starters mirror B1Checkin's bundled 1_1x3_5 / pickup_1_1x3_5 HTML labels.
const starterNametag = (): LabelTemplateInterface => ({
  name: Locale.label("attendance.labels.nametag"),
  labelType: "nametag",
  width: 3.5,
  height: 1.1,
  content: JSON.stringify([
    { id: newBlockId(), type: "field", field: "person.displayName", x: 2, y: 0, w: 70, h: 32, fontSize: 28, bold: true },
    { id: newBlockId(), type: "field", field: "sessions", x: 5, y: 37, w: 55, h: 25, fontSize: 10 },
    { id: newBlockId(), type: "field", field: "securityCode", x: 55, y: 52, w: 40, h: 22, fontSize: 18, bold: true, align: "right" },
    { id: newBlockId(), type: "field", field: "person.nametagNotes", x: 45, y: 78, w: 50, h: 20, fontSize: 14, bold: true, align: "right", condition: { field: "person.nametagNotes", operator: "notEmpty" } }
  ])
});

const starterPickup = (): LabelTemplateInterface => ({
  name: Locale.label("attendance.labels.pickup"),
  labelType: "pickup",
  width: 3.5,
  height: 1.1,
  content: JSON.stringify([
    { id: newBlockId(), type: "text", text: "Pickup Slip", x: 2, y: 0, w: 50, h: 26, fontSize: 20, bold: true },
    { id: newBlockId(), type: "field", field: "securityCode", x: 50, y: 7, w: 45, h: 32, fontSize: 28, bold: true, align: "right" },
    { id: newBlockId(), type: "field", field: "children", x: 5, y: 37, w: 90, h: 58, fontSize: 10 }
  ])
});

export const LabelsPage = () => {
  const [editing, setEditing] = useState<LabelTemplateInterface | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const addRef = useRef<HTMLElement>(null);
  const headerAddRef = useRef<HTMLElement>(null);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const templatesQuery = useQuery<LabelTemplateInterface[]>({ queryKey: ["/labeltemplates", "AttendanceApi"], placeholderData: [] });
  const templates = templatesQuery.data || [];

  const handleUpdated = () => {
    setEditing(null);
    templatesQuery.refetch();
  };

  const startCreate = (template: LabelTemplateInterface) => {
    setMenuAnchor(null);
    setEditing(template);
  };

  const handleDelete = async (t: LabelTemplateInterface) => {
    if (await confirm(Locale.label("attendance.labels.confirmDelete"))) ApiHelper.delete("/labeltemplates/" + t.id, "AttendanceApi").then(() => templatesQuery.refetch());
  };

  const handleSetDefault = (t: LabelTemplateInterface) => {
    ApiHelper.post("/labeltemplates", [{ ...t, isDefault: true }], "AttendanceApi").then(() => templatesQuery.refetch());
  };

  const denied = useRequirePermission(Permissions.attendanceApi.attendance.edit);
  if (denied) return denied;

  return (
    <>
      {ConfirmDialogElement}
      <MobileChrome
        title={Locale.label("attendance.labels.title")}
        subtitle={Locale.label("attendance.labels.subtitle")}
        verbs={!editing && <Box ref={headerAddRef} component="span"><TextAction onClick={() => setMenuAnchor(headerAddRef.current)} data-testid="add-label">{Locale.label("common.add")}</TextAction></Box>}>
        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
          <MenuItem onClick={() => startCreate(starterNametag())} data-testid="add-nametag-starter">{Locale.label("attendance.labels.starterNametag")}</MenuItem>
          <MenuItem onClick={() => startCreate(starterPickup())} data-testid="add-pickup-starter">{Locale.label("attendance.labels.starterPickup")}</MenuItem>
          <MenuItem onClick={() => startCreate({ name: "", labelType: "nametag", width: 3.5, height: 1.1, content: "[]" })} data-testid="add-blank">{Locale.label("attendance.labels.blank")}</MenuItem>
        </Menu>
        {editing
          ? <LabelEditor template={editing} updatedCallback={handleUpdated} />
          : templatesQuery.isLoading
            ? <Loading />
            : templates.length === 0
              ? <EmptyState icon={<LabelIcon />} title={Locale.label("attendance.labels.noTemplates")} description={Locale.label("attendance.labels.noTemplatesDesc")} />
              : (
                <Surface disablePadding sx={{ overflowX: "auto" }}>
                  <Table data-testid="labels-table">
                    <TableHead>
                      <TableRow>
                        <TableCell>{Locale.label("attendance.labels.name")}</TableCell>
                        <TableCell>{Locale.label("attendance.labels.type")}</TableCell>
                        <TableCell>{Locale.label("attendance.labels.size")}</TableCell>
                        <TableCell align="right" />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {templates.map((t) => (
                        <TableRow key={t.id} hover data-testid={`label-row-${t.id}`}>
                          <TableCell>{t.name}</TableCell>
                          <TableCell>{Locale.label(t.labelType === "pickup" ? "attendance.labels.pickup" : "attendance.labels.nametag")}</TableCell>
                          <TableCell>{`${Number(t.width)}" × ${Number(t.height)}"`}</TableCell>
                          <TableCell align="right">
                            <VerbRow sx={{ justifyContent: "flex-end", flexWrap: "nowrap" }}>
                              {t.isDefault
                                ? <StatusBadge tone="info">{Locale.label("attendance.labels.default")}</StatusBadge>
                                : <TextAction small onClick={() => handleSetDefault(t)} aria-label={Locale.label("attendance.labels.setDefault")} data-testid={`default-label-${t.id}`}>{Locale.label("attendance.labels.setDefault")}</TextAction>}
                              <TextAction small onClick={() => setEditing(t)} aria-label={Locale.label("common.edit")} data-testid={`edit-label-${t.id}`}>{Locale.label("common.edit")}</TextAction>
                              <TextAction small onClick={() => handleDelete(t)} aria-label={Locale.label("common.delete")} data-testid={`delete-label-${t.id}`}>{Locale.label("common.delete")}</TextAction>
                            </VerbRow>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Surface>
              )}
        {!editing && (
          <AddBar>
            <Box ref={addRef} component="span">
              <TextAction onClick={() => setMenuAnchor(addRef.current)} data-testid="add-label-bottom">{Locale.label("common.add")}</TextAction>
            </Box>
          </AddBar>
        )}
      </MobileChrome>
    </>
  );
};

export default LabelsPage;
