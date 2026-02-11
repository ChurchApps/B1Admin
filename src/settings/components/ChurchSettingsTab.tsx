import React, { useState } from "react";
import { ChurchSettingsEdit } from "./";
import { type ChurchInterface } from "@churchapps/helpers";
import { ApiHelper, UserHelper, Permissions } from "@churchapps/apphelper";
import { Navigate } from "react-router-dom";

export const ChurchSettingsTab = () => {
  const [church, setChurch] = useState<ChurchInterface>(null);
  const [redirectUrl, setRedirectUrl] = useState<string>("");
  const churchId = UserHelper.currentUserChurch.church.id;

  const loadData = () => {
    //const churchId = params.id;
    if (!UserHelper.checkAccess(Permissions.membershipApi.settings.edit)) setRedirectUrl("/");
    ApiHelper.get("/churches/" + churchId + "?include=permissions", "MembershipApi").then((data) => setChurch(data));
  };

  React.useEffect(loadData, [UserHelper.currentUserChurch.church.id]);

  if (redirectUrl !== "") return <Navigate to={redirectUrl}></Navigate>;
  else {
    return (
      <>
        <ChurchSettingsEdit church={church} updatedFunction={loadData} />
      </>
    );
  }
};
