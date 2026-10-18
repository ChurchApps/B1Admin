import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ManageChurch } from "./ManageChurch";
import { RolesPage } from "./RolesPage";
import { RolePage } from "./RolePage";
import { AuditLogPage } from "./AuditLogPage";
import { BatchesPage } from "./BatchesPage";
import { SettingsPage } from "./components/SettingsPage";
import { PageSkeleton } from "../components/ui/PageSkeleton";
import { Permissions, UserHelper } from "@churchapps/apphelper";

const EmailTemplatesPage = React.lazy(() => import("./EmailTemplatesPage").then((module) => ({ default: module.EmailTemplatesPage })));

// Matches the settings menu item and the Api rule for saving templates.
const canManageEmailTemplates = () => UserHelper.checkAccess(Permissions.membershipApi.settings.edit) || UserHelper.checkAccess(Permissions.membershipApi.groupMembers.edit);

export const Settings: React.FC = () => (
  <SettingsPage><Routes>
    <Route path="/roles" element={<RolesPage />} />
    <Route path="/role/:roleId" element={<RolePage />} />
    <Route path="/audit-log" element={<AuditLogPage />} />
    <Route path="/batches" element={<BatchesPage />} />
    <Route path="/campuses" element={<Navigate to="/settings#campuses" replace />} />
    <Route path="/custom-fields" element={<Navigate to="/settings#custom-fields" replace />} />
    <Route
      path="/email-templates"
      element={canManageEmailTemplates() ? (
        <Suspense fallback={<PageSkeleton />}>
          <EmailTemplatesPage />
        </Suspense>
      ) : <Navigate to="/" replace />}
    />
    <Route path="/webhooks" element={<Navigate to="/settings#developer" replace />} />
    <Route path="/developer" element={<Navigate to="/settings#developer" replace />} />
    <Route path="/" element={<ManageChurch />} />
  </Routes></SettingsPage>
);
