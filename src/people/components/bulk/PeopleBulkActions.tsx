import React from "react";
import { Locale } from "@churchapps/apphelper";
import { useCampuses } from "../../../hooks/useCampuses";
import { Button, Menu, MenuItem, Divider, ListItemIcon, ListItemText } from "@mui/material";
import { ExpandMore as ExpandMoreIcon, HowToReg as StatusIcon, Favorite as MaritalIcon, Wc as GenderIcon, MailLock as OptOutIcon, GroupAdd as GroupAddIcon, GroupRemove as GroupRemoveIcon, Delete as DeleteIcon, Business as CampusIcon } from "@mui/icons-material";
import { BulkFieldDialog, type BulkFieldOption, type BulkResult } from "./BulkFieldDialog";
import { BulkGroupDialog } from "./BulkGroupDialog";
import { getMembershipStatusOptions } from "../../helpers/MembershipStatusOptions";

interface FieldConfig {
  field: "membershipStatus" | "maritalStatus" | "gender" | "optedOut" | "campusId";
  titleKey: string;
  fieldLabel: string;
  isBoolean?: boolean;
  options: BulkFieldOption[];
}

interface Props {
  selectedPersonIds: string[];
  onComplete: (result: BulkResult) => void;
  onDeleteClick: () => void;
}

export const PeopleBulkActions: React.FC<Props> = (props) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [fieldConfig, setFieldConfig] = React.useState<FieldConfig | null>(null);
  const [groupMode, setGroupMode] = React.useState<"add" | "remove" | null>(null);
  const campuses = useCampuses();
  const campusOptions: BulkFieldOption[] = React.useMemo(
    () => campuses.filter((c) => c.id).map((c) => ({ value: c.id as string, label: c.name || "" })),
    [campuses]
  );

  const fieldConfigs: FieldConfig[] = [
    {
      field: "membershipStatus",
      titleKey: "people.bulk.membershipStatusTitle",
      fieldLabel: Locale.label("person.membershipStatus"),
      options: getMembershipStatusOptions()
    },
    {
      field: "maritalStatus",
      titleKey: "people.bulk.maritalStatusTitle",
      fieldLabel: Locale.label("person.maritalStatus"),
      options: [
        { value: "Unknown", label: Locale.label("person.unknown") },
        { value: "Single", label: Locale.label("person.single") },
        { value: "Married", label: Locale.label("person.married") },
        { value: "Divorced", label: Locale.label("person.divorced") },
        { value: "Widowed", label: Locale.label("person.widowed") }
      ]
    },
    {
      field: "gender",
      titleKey: "people.bulk.genderTitle",
      fieldLabel: Locale.label("person.gender"),
      options: [
        { value: "Unspecified", label: Locale.label("person.unspecified") },
        { value: "Male", label: Locale.label("person.male") },
        { value: "Female", label: Locale.label("person.female") }
      ]
    },
    {
      field: "optedOut",
      titleKey: "people.bulk.optedOutTitle",
      fieldLabel: Locale.label("people.bulk.optedOutField"),
      isBoolean: true,
      options: [
        { value: "false", label: Locale.label("people.bulk.optedOutNo") },
        { value: "true", label: Locale.label("people.bulk.optedOutYes") }
      ]
    },
    ...(campusOptions.length > 0
      ? [{
        field: "campusId" as const,
        titleKey: "people.bulk.campusTitle",
        fieldLabel: Locale.label("person.campus"),
        options: campusOptions
      }]
      : [])
  ];

  const fieldIcons: Record<string, JSX.Element> = {
    membershipStatus: <StatusIcon fontSize="small" />,
    maritalStatus: <MaritalIcon fontSize="small" />,
    gender: <GenderIcon fontSize="small" />,
    optedOut: <OptOutIcon fontSize="small" />,
    campusId: <CampusIcon fontSize="small" />
  };
  const menuLabels: Record<string, string> = {
    membershipStatus: "people.bulk.setMembershipStatus",
    maritalStatus: "people.bulk.setMaritalStatus",
    gender: "people.bulk.setGender",
    optedOut: "people.bulk.setOptedOut",
    campusId: "people.bulk.setCampus"
  };

  const closeMenu = () => setAnchorEl(null);

  const openField = (config: FieldConfig) => { setFieldConfig(config); closeMenu(); };
  const openGroup = (mode: "add" | "remove") => { setGroupMode(mode); closeMenu(); };
  const handleDelete = () => { closeMenu(); props.onDeleteClick(); };

  return (
    <>
      <Button size="small" variant="contained" endIcon={<ExpandMoreIcon />} onClick={(e) => setAnchorEl(e.currentTarget)} data-testid="bulk-actions-button">
        {Locale.label("people.bulk.actions")}
      </Button>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={closeMenu}>
        {fieldConfigs.map((config) => (
          <MenuItem key={config.field} onClick={() => openField(config)} data-testid={`bulk-action-${config.field}`}>
            <ListItemIcon>{fieldIcons[config.field]}</ListItemIcon>
            <ListItemText>{Locale.label(menuLabels[config.field])}</ListItemText>
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={() => openGroup("add")} data-testid="bulk-action-add-group">
          <ListItemIcon><GroupAddIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{Locale.label("people.bulk.addToGroup")}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => openGroup("remove")} data-testid="bulk-action-remove-group">
          <ListItemIcon><GroupRemoveIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{Locale.label("people.bulk.removeFromGroup")}</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDelete} data-testid="bulk-action-delete" sx={{ color: "error.main" }}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>{Locale.label("people.bulk.delete")}</ListItemText>
        </MenuItem>
      </Menu>

      {fieldConfig && (
        <BulkFieldDialog
          open={Boolean(fieldConfig)}
          field={fieldConfig.field}
          title={Locale.label(fieldConfig.titleKey)}
          fieldLabel={fieldConfig.fieldLabel}
          isBoolean={fieldConfig.isBoolean}
          options={fieldConfig.options}
          personIds={props.selectedPersonIds}
          onClose={() => setFieldConfig(null)}
          onComplete={props.onComplete}
        />
      )}

      {groupMode && (
        <BulkGroupDialog
          open={Boolean(groupMode)}
          mode={groupMode}
          personIds={props.selectedPersonIds}
          onClose={() => setGroupMode(null)}
          onComplete={props.onComplete}
        />
      )}
    </>
  );
};
