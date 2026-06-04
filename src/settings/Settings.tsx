import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ManageChurch } from "./ManageChurch";
import { RolePage } from "./RolePage";
import { AuditLogPage } from "./AuditLogPage";
import { DeveloperPage } from "./DeveloperPage";
import { CampusesPage } from "./CampusesPage";

export const Settings: React.FC = () => (
  <Routes>
    <Route path="/role/:roleId" element={<RolePage />} />
    <Route path="/audit-log" element={<AuditLogPage />} />
    <Route path="/campuses" element={<CampusesPage />} />
    <Route path="/webhooks" element={<Navigate to="/settings/developer" replace />} />
    <Route path="/developer" element={<DeveloperPage />} />
    <Route path="/" element={<ManageChurch />} />
  </Routes>
);
