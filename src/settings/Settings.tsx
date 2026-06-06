import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ManageChurch } from "./ManageChurch";
import { RolesPage } from "./RolesPage";
import { RolePage } from "./RolePage";
import { AuditLogPage } from "./AuditLogPage";
import { CampusesPage } from "./CampusesPage";

export const Settings: React.FC = () => (
  <Routes>
    <Route path="/roles" element={<RolesPage />} />
    <Route path="/role/:roleId" element={<RolePage />} />
    <Route path="/audit-log" element={<AuditLogPage />} />
    <Route path="/campuses" element={<CampusesPage />} />
    <Route path="/webhooks" element={<Navigate to="/settings#developer" replace />} />
    <Route path="/developer" element={<Navigate to="/settings#developer" replace />} />
    <Route path="/" element={<ManageChurch />} />
  </Routes>
);
