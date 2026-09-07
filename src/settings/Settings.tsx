import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ManageChurch } from "./ManageChurch";
import { RolesPage } from "./RolesPage";
import { RolePage } from "./RolePage";
import { AuditLogPage } from "./AuditLogPage";
import { BatchesPage } from "./BatchesPage";
import { PageSkeleton } from "../components/ui/PageSkeleton";

const EmailTemplatesPage = React.lazy(() => import("./EmailTemplatesPage").then((module) => ({ default: module.EmailTemplatesPage })));

export const Settings: React.FC = () => (
  <Routes>
    <Route path="/roles" element={<RolesPage />} />
    <Route path="/role/:roleId" element={<RolePage />} />
    <Route path="/audit-log" element={<AuditLogPage />} />
    <Route path="/batches" element={<BatchesPage />} />
    <Route path="/campuses" element={<Navigate to="/settings#campuses" replace />} />
    <Route path="/custom-fields" element={<Navigate to="/settings#custom-fields" replace />} />
    <Route
      path="/email-templates"
      element={(
        <Suspense fallback={<PageSkeleton />}>
          <EmailTemplatesPage />
        </Suspense>
      )}
    />
    <Route path="/webhooks" element={<Navigate to="/settings#developer" replace />} />
    <Route path="/developer" element={<Navigate to="/settings#developer" replace />} />
    <Route path="/" element={<ManageChurch />} />
  </Routes>
);
