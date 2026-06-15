import { useCallback, useEffect, useState } from "react";
import { ApiHelper, Loading, Locale, PageHeader, UserHelper } from "@churchapps/apphelper";
import { Permissions } from "@churchapps/helpers";
import { Box, Button, Chip, Menu, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, Label as LabelIcon, StarBorder as StarBorderIcon } from "@mui/icons-material";
import { PermissionDenied } from "../components";
import { EmptyState } from "../components/ui/EmptyState";
import { AppIconButton } from "../components/ui/AppIconButton";
import { LabelEditor, newBlockId, type LabelTemplateInterface } from "./components/LabelEditor";

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
  const [templates, setTemplates] = useState<LabelTemplateInterface[]>([]);
  const [editing, setEditing] = useState<LabelTemplateInterface | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    ApiHelper.get("/labeltemplates", "AttendanceApi").then((data) => {
      setTemplates(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleUpdated = () => {
    setEditing(null);
    loadData();
  };

  const startCreate = (template: LabelTemplateInterface) => {
    setMenuAnchor(null);
    setEditing(template);
  };

  const handleDelete = (t: LabelTemplateInterface) => {
    if (window.confirm(Locale.label("attendance.labels.confirmDelete"))) ApiHelper.delete("/labeltemplates/" + t.id, "AttendanceApi").then(loadData);
  };

  const handleSetDefault = (t: LabelTemplateInterface) => {
    ApiHelper.post("/labeltemplates", [{ ...t, isDefault: true }], "AttendanceApi").then(loadData);
  };

  if (!UserHelper.checkAccess(Permissions.attendanceApi.attendance.edit)) return <PermissionDenied permissions={[Permissions.attendanceApi.attendance.edit]} />;

  return (
    <>
      <PageHeader title={Locale.label("attendance.labels.title")} subtitle={Locale.label("attendance.labels.subtitle")}>
        {!editing && (
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.5)", "&:hover": { borderColor: "#FFF", backgroundColor: "rgba(255,255,255,0.1)" } }}
            data-testid="add-label"
          >
            {Locale.label("common.add")}
          </Button>
        )}
      </PageHeader>
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => startCreate(starterNametag())} data-testid="add-nametag-starter">{Locale.label("attendance.labels.starterNametag")}</MenuItem>
        <MenuItem onClick={() => startCreate(starterPickup())} data-testid="add-pickup-starter">{Locale.label("attendance.labels.starterPickup")}</MenuItem>
        <MenuItem onClick={() => startCreate({ name: "", labelType: "nametag", width: 3.5, height: 1.1, content: "[]" })} data-testid="add-blank">{Locale.label("attendance.labels.blank")}</MenuItem>
      </Menu>
      <Box sx={{ p: 3 }}>
        {editing
          ? <LabelEditor template={editing} updatedCallback={handleUpdated} />
          : loading
            ? <Loading />
            : templates.length === 0
              ? <EmptyState icon={<LabelIcon />} title={Locale.label("attendance.labels.noTemplates")} description={Locale.label("attendance.labels.noTemplatesDesc")} />
              : (
                <TableContainer component={Paper} variant="outlined">
                  <Table data-testid="labels-table">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, color: "text.secondary" }}>{Locale.label("attendance.labels.name")}</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: "text.secondary" }}>{Locale.label("attendance.labels.type")}</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: "text.secondary" }}>{Locale.label("attendance.labels.size")}</TableCell>
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
                            {t.isDefault
                              ? <Chip label={Locale.label("attendance.labels.default")} color="primary" size="small" sx={{ mr: 1 }} />
                              : <AppIconButton tone="card" label={Locale.label("attendance.labels.setDefault")} icon={<StarBorderIcon />} onClick={() => handleSetDefault(t)} data-testid={`default-label-${t.id}`} />}
                            <AppIconButton tone="card" label={Locale.label("common.edit")} icon={<EditIcon />} onClick={() => setEditing(t)} data-testid={`edit-label-${t.id}`} />
                            <AppIconButton tone="card" intent="remove" label={Locale.label("common.delete")} icon={<DeleteIcon />} onClick={() => handleDelete(t)} data-testid={`delete-label-${t.id}`} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
      </Box>
    </>
  );
};

export default LabelsPage;
