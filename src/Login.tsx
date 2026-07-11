import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { UserHelper, Permissions, Locale } from "@churchapps/apphelper";
import { type UserInterface, type LoginUserChurchInterface } from "@churchapps/helpers";
import UserContext from "./UserContext";
import { LoginPage } from "@churchapps/apphelper/login";
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
        context.setUser(null as unknown as UserInterface);
        context.setUserChurch(null as unknown as LoginUserChurchInterface);
        context.setUserChurches(null as unknown as LoginUserChurchInterface[]);
      }
    }
  }, [forceLogin, context, removeCookie]);

  const defaultRedirect = UserHelper.checkAccess(Permissions.membershipApi.people.view) ? "/people" : "/";
  const fromLocation = location.state?.from;
  const fromUrl = fromLocation ? (fromLocation.pathname + (fromLocation.search || "")) : null;
  const returnUrl = search.get("returnUrl") || fromUrl || defaultRedirect;

  const handleRedirect = (url: string) => {
    navigate(url);
  };

  let jwt = forceLogin ? "" : (search.get("jwt") || cookies.jwt);
  let auth = search.get("auth");

  React.useEffect(() => {
    if (search.get("jwt")) {
      search.delete("jwt");
      const newUrl = window.location.pathname + (search.toString() ? "?" + search.toString() : "") + window.location.hash;
      window.history.replaceState(null, "", newUrl);
    }
  }, []);
  if (!jwt) jwt = "";
  if (!auth) auth = "";

  return (
    <div className="split-login-page" style={{ display: "flex", minHeight: "100vh" }}>
      <LoginHeroPanel />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", backgroundColor: "white" }}>
        {process.env.REACT_APP_STAGE === "demo" && (
          <Alert severity="error" style={{ margin: "16px 16px 0" }}>
            <b>{Locale.label("app.login.demoLabel")}</b> {Locale.label("app.login.demoMessage")}
            <br />
            {Locale.label("app.login.demoTestChurch")}
            <br />
            <span dangerouslySetInnerHTML={{ __html: Locale.label("app.login.demoCredentials").replace("{email}", "<b>demo@b1.church</b>").replace("{password}", "<b>password</b>") }} />
          </Alert>
        )}
        <LoginPage
          auth={auth}
          context={context!}
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
