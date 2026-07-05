import React from "react";
import { Permissions, Locale, PageHeader } from "@churchapps/apphelper";
import { Box } from "@mui/material";
import { DynamicForm as DynamicFormIcon } from "@mui/icons-material";
import { CustomFieldsSection } from "./components/CustomFieldsSection";
import { useRequirePermission } from "../hooks";

export const CustomFieldsPage: React.FC = () => {
  const denied = useRequirePermission(Permissions.membershipApi.settings.edit);
  if (denied) return denied;

  return (
    <>
      <PageHeader icon={<DynamicFormIcon />} title={Locale.label("settings.customFields.customFields")} subtitle={Locale.label("settings.customFields.subtitle")} />
      <Box sx={{ p: 3 }}>
        <CustomFieldsSection />
      </Box>
    </>
  );
};
