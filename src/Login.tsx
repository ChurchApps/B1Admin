import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { UserHelper, Permissions } from "@churchapps/apphelper";
import UserContext from "./UserContext";
import { LoginPage } from "@churchapps/apphelper-login";
import { Alert } from "@mui/material";

export const Login: React.FC = () => {
  const [errors] = React.useState<string[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const context = React.useContext(UserContext);
  const [cookies] = useCookies(["jwt"]);

  const search = new URLSearchParams(window.location.search);
  const defaultRedirect = UserHelper.checkAccess(Permissions.membershipApi.people.view) ? "/people" : "/profile";
  const returnUrl = search.get("returnUrl") || location.state?.from?.pathname || defaultRedirect;

  const handleRedirect = (url: string) => {
    navigate(url);
  };

  let jwt = search.get("jwt") || cookies.jwt;
  let auth = search.get("auth");
  if (!jwt) jwt = "";
  if (!auth) auth = "";

  return (
    <div style={{ marginTop: -50 }}>
      {process.env.REACT_APP_STAGE === "demo" && (
        <Alert severity="error" style={{ marginTop: 50 }}>
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
      />
    </div>
  );
};
