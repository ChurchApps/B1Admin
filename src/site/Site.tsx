import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { PagesPage } from "./PagesPage";
import { BlogPage } from "./BlogPage";
import { PagePreview } from "./PagePreview";
import { PageEdit } from "./PageEdit";
import { BlocksPage } from "./BlocksPage";
import { BlockEditPage } from "./BlockEditPage";
import { AppearancePage } from "./AppearancePage";
import { FilesPage } from "./FilesPage";

export const Site: React.FC = () => (
  <Routes>
    <Route path="/pages/:id" element={<PageEdit />} />
    <Route path="/pages/preview/:id" element={<PagePreview />} />
    <Route path="/pages" element={<PagesPage />} />
    <Route path="/blog" element={<BlogPage />} />
    <Route path="/blocks/:id" element={<BlockEditPage />} />
    <Route path="/blocks" element={<BlocksPage />} />
    <Route path="/appearance" element={<AppearancePage />} />
    <Route path="/files" element={<FilesPage />} />
    <Route path="/" element={<Navigate to="pages" replace />} />
  </Routes>
);
