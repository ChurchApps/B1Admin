import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { MobileAppSettingsPage } from "../settings/MobileAppSettingsPage";
import { AppThemePage } from "./AppThemePage";
import { B1MobilePage } from "./B1MobilePage";
import { CheckInPage } from "./CheckInPage";

export const Mobile: React.FC = () => (
  <Routes>
    <Route path="/navigation" element={<MobileAppSettingsPage />} />
    <Route path="/theme" element={<AppThemePage />} />
    <Route path="/b1-mobile" element={<B1MobilePage />} />
    <Route path="/checkin" element={<CheckInPage />} />
    <Route path="/" element={<Navigate to="navigation" replace />} />
  </Routes>
);
