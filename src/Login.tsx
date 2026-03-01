import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { UserHelper, Permissions } from "@churchapps/apphelper";
import UserContext from "./UserContext";
import { LoginPage } from "@churchapps/apphelper-login";
import { Alert } from "@mui/material";
import { LoginHeroPanel } from "./components/LoginHeroPanel";

export const Login: React.FC = () => {
  const [errors] = React.useState<string[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const context = React.useContext(UserContext);
  const [cookies, , removeCookie] = useCookies(["jwt"]);

  const search = new URLSearchParams(window.location.search);
  const forceLogin = search.get("forceLogin") === "1";
  const forceLoginCleared = React.useRef(false);

  React.useEffect(() => {
    if (forceLogin && !forceLoginCleared.current) {
      forceLoginCleared.current = true;
      // Clear JWT cookie to force fresh login
      removeCookie("jwt", { path: "/" });
      // Clear user context
      if (context) {
        context.setUser(null);
        context.setUserChurch(null);
        context.setUserChurches(null);
      }
    }
  }, [forceLogin, context, removeCookie]);

  const defaultRedirect = UserHelper.checkAccess(Permissions.membershipApi.people.view) ? "/people" : "/profile";
  const fromLocation = location.state?.from;
  const fromUrl = fromLocation ? (fromLocation.pathname + (fromLocation.search || "")) : null;
  const returnUrl = search.get("returnUrl") || fromUrl || defaultRedirect;

  const handleRedirect = (url: string) => {
    navigate(url);
  };

  let jwt = forceLogin ? "" : (search.get("jwt") || cookies.jwt);
  let auth = search.get("auth");
  if (!jwt) jwt = "";
  if (!auth) auth = "";

  return (
    <div className="split-login-page" style={{ display: "flex", minHeight: "100vh" }}>
      <LoginHeroPanel />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {process.env.REACT_APP_STAGE === "demo" && (
          <Alert severity="error" style={{ margin: "16px 16px 0" }}>
            <b>Demo:</b> This is the demo environment. All data is erased nightly.
            <br />
            You can log into a test church of "Grace Community Church"
            <br />
            Use the email "<b>demo@b1.church</b>" and password "<b>password</b>".
          </Alert>
        )}
        <LoginPage
          auth={auth}
          context={context}
          jwt={jwt}
          appName="B1Admin"
          appUrl={window.location.href}
          callbackErrors={errors}
          returnUrl={returnUrl}
          handleRedirect={handleRedirect}
          defaultEmail={process.env.REACT_APP_STAGE === "demo" ? "demo@b1.church" : undefined}
          defaultPassword={process.env.REACT_APP_STAGE === "demo" ? "password" : undefined}
          showFooter={true}
          containerStyle={{ minHeight: "auto", flex: 1 }}
        />
      </div>
    </div>
  );
};
