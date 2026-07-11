import React from "react";
import UserContext from "./UserContext";

import { ApiHelper, ErrorMessages, Locale } from "@churchapps/apphelper";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Login } from "./Login";
import { OAuthCallback } from "./oauth/OAuthCallback";

import { Authenticated } from "./Authenticated";
import { Logout } from "./Logout";
import { type ErrorLogInterface, type ErrorAppDataInterface } from "@churchapps/helpers";
import { AnalyticsHelper } from "./helpers";
import { UserHelper, ErrorHelper } from "@churchapps/apphelper";
import { Pingback } from "./Pingback";

const isSessionExpired = () => {
  try {
    const jwt = ApiHelper.getConfig("MembershipApi")?.jwt;
    if (!jwt) return true;
    const payload = JSON.parse(atob(jwt.split(".")[1]));
    return typeof payload.exp === "number" && payload.exp * 1000 < Date.now();
  } catch {
    return false;
  }
};

export const ControlPanel = () => {
  const [errors, setErrors] = React.useState<string[]>([]);
  const location = useLocation();
  const navigate = useNavigate();

  const navigateRef = React.useRef(navigate);
  navigateRef.current = navigate;
  const pathRef = React.useRef(location.pathname);
  pathRef.current = location.pathname;
  // Dedupe identical errors within a short window so a failing page effect that
  // refires can't spin the handler into an infinite loop.
  const lastErrorRef = React.useRef<{ key: string; time: number }>({ key: "", time: 0 });
  const redirectingRef = React.useRef(false);

  AnalyticsHelper.init();
  React.useEffect(() => {
    AnalyticsHelper.logPageView();
  }, [location]);

  // Re-arm the 401 redirect guard once the user lands back on the login screen.
  React.useEffect(() => {
    if (location.pathname.startsWith("/login")) redirectingRef.current = false;
  }, [location.pathname]);

  const getErrorAppData = React.useCallback((): ErrorAppDataInterface => ({
    churchId: UserHelper.currentUserChurch?.church?.id || "",
    userId: UserHelper.user?.id || "",
    originUrl: typeof window === "undefined" ? "" : window.location.toString(),
    application: "B1Admin"
  }), []);

  React.useEffect(() => {
    const handler = (error: ErrorLogInterface) => {
      try {
        const type = error.errorType || "";
        const key = type + "|" + (error.message || "");
        const now = Date.now();
        if (lastErrorRef.current.key === key && now - lastErrorRef.current.time < 5000) return;
        lastErrorRef.current = { key, time: now };

        if (type === "401") {
          // APIs also return 401 for permission denials on a live session; only an
          // expired/missing session token means the user actually needs to re-login.
          if (!isSessionExpired()) return;
          if (redirectingRef.current) return;
          const p = pathRef.current || "";
          if (p.startsWith("/login") || p.startsWith("/logout") || p.startsWith("/oauth")) return;
          redirectingRef.current = true;
          navigateRef.current("/logout");
          return;
        }
        if (type.startsWith("5")) setErrors([Locale.label("controlPanel.serverError")]);
      } catch {
        // Never let the error handler throw — that would re-enter error logging.
      }
    };
    ErrorHelper.init(getErrorAppData, handler);
    return () => { ErrorHelper.init(getErrorAppData, () => {}); };
  }, [getErrorAppData]);

  React.useContext(UserContext); //to force rerender on login
  return (
    <>
      <ErrorMessages errors={errors} />
      <Routes>
        <Route path="/pingback" element={<Pingback />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/login" element={<Login />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <Authenticated />
            </RequireAuth>
          }
        />
      </Routes>
    </>
  );
};

const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const location = useLocation();
  if (!ApiHelper.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};
