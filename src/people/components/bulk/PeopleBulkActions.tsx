import React from "react";
import { Locale, Permissions, UserHelper } from "@churchapps/apphelper";
import { useCampuses } from "../../../hooks/useCampuses";
import { useTextingEnabled } from "../../../hooks/useTextingEnabled";
import { Button, Menu, MenuItem, Divider, ListItemIcon, ListItemText } from "@mui/material";
import { ExpandMore as ExpandMoreIcon, HowToReg as StatusIcon, Favorite as MaritalIcon, Wc as GenderIcon, MailLock as OptOutIcon, GroupAdd as GroupAddIcon, GroupRemove as GroupRemoveIcon, Delete as DeleteIcon, Business as CampusIcon, ViewKanban as WorkflowIcon, RuleFolder as CustomFieldIcon, MailOutline as MailIcon, ChatBubbleOutline as TextIcon } from "@mui/icons-material";
import { BulkFieldDialog, type BulkFieldOption, type BulkResult } from "./BulkFieldDialog";
import { BulkGroupDialog } from "./BulkGroupDialog";
import { BulkWorkflowDialog } from "./BulkWorkflowDialog";
import { BulkCustomFieldDialog } from "./BulkCustomFieldDialog";
import { SendEmailDialog } from "../../../groups/components/SendEmailDialog";
import { SendTextDialog } from "../../../groups/components/SendTextDialog";
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
  const [showWorkflow, setShowWorkflow] = React.useState(false);
  const [showCustomField, setShowCustomField] = React.useState(false);
  const [showEmail, setShowEmail] = React.useState(false);
  const [showText, setShowText] = React.useState(false);
  const canEmail = React.useMemo(() => UserHelper.checkAccess(Permissions.membershipApi.groupMembers.edit), []);
  const canText = React.useMemo(() => UserHelper.checkAccess(Permissions.messagingApi.texting.send), []);
  const textingEnabled = useTextingEnabled();
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
      ? [
        {
          field: "campusId" as const,
          titleKey: "people.bulk.campusTitle",
          fieldLabel: Locale.label("person.campus"),
          options: campusOptions
        }
      ]
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
    membershipStatus: "people.bulk.membershipStatusTitle",
    maritalStatus: "people.bulk.maritalStatusTitle",
    gender: "people.bulk.genderTitle",
    optedOut: "people.bulk.optedOutTitle",
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
        <MenuItem onClick={() => { setShowCustomField(true); closeMenu(); }} data-testid="bulk-action-custom-field">
          <ListItemIcon><CustomFieldIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{Locale.label("people.bulk.customFieldTitle")}</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => openGroup("add")} data-testid="bulk-action-add-group">
          <ListItemIcon><GroupAddIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{Locale.label("people.bulk.addToGroup")}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => openGroup("remove")} data-testid="bulk-action-remove-group">
          <ListItemIcon><GroupRemoveIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{Locale.label("people.bulk.removeFromGroup")}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setShowWorkflow(true); closeMenu(); }} data-testid="bulk-action-add-workflow">
          <ListItemIcon><WorkflowIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{Locale.label("people.bulk.addToWorkflow")}</ListItemText>
        </MenuItem>
        {(canEmail || (canText && textingEnabled)) && <Divider />}
        {canEmail && (
          <MenuItem onClick={() => { setShowEmail(true); closeMenu(); }} data-testid="bulk-action-email">
            <ListItemIcon><MailIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{Locale.label("people.bulk.email")}</ListItemText>
          </MenuItem>
        )}
        {canText && textingEnabled && (
          <MenuItem onClick={() => { setShowText(true); closeMenu(); }} data-testid="bulk-action-text">
            <ListItemIcon><TextIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{Locale.label("people.bulk.text")}</ListItemText>
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={handleDelete} data-testid="bulk-action-delete" sx={{ color: "error.main" }}>
          <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
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

      {showCustomField && (
        <BulkCustomFieldDialog
          open={showCustomField}
          personIds={props.selectedPersonIds}
          onClose={() => setShowCustomField(false)}
          onComplete={props.onComplete}
        />
      )}

      {showEmail && <SendEmailDialog personIds={props.selectedPersonIds} onClose={() => setShowEmail(false)} />}
      {showText && <SendTextDialog personIds={props.selectedPersonIds} onClose={() => setShowText(false)} />}

      {showWorkflow && (
        <BulkWorkflowDialog
          open={showWorkflow}
          personIds={props.selectedPersonIds}
          onClose={() => setShowWorkflow(false)}
          onComplete={props.onComplete}
        />
      )}
    </>
  );
};
