import { Routes, Route, Navigate } from "react-router-dom";
import { Login } from "./Login";
import { Pingback } from "./Pingback";

export const Unauthenticated = () => (
  <>
    <Routes>
      <Route path="/pingback" element={<Pingback />} />
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/login" />} />
    </Routes>
  </>
);
