import React from "react";
import { Routes, Route } from "react-router-dom";
import { ManageChurch } from "./ManageChurch";
import { RolePage } from "./RolePage";
import { AuditLogPage } from "./AuditLogPage";
import { WebhooksPage } from "./WebhooksPage";

export const Settings: React.FC = () => (
  <Routes>
    <Route path="/role/:roleId" element={<RolePage />} />
    <Route path="/audit-log" element={<AuditLogPage />} />
    <Route path="/webhooks" element={<WebhooksPage />} />
    <Route path="/" element={<ManageChurch />} />
  </Routes>
);
