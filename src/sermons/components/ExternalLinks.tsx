import React from "react";
import { Icon } from "@mui/material";
import { DisplayBox, UserHelper, CommonEnvironmentHelper, Locale } from "@churchapps/apphelper";
import { Permissions } from "@churchapps/helpers";
import { Link } from "react-router-dom";
import { TableList } from "./TableList";

interface Props { updatedFunction?: () => void, churchId:string }

export const ExternalLinks: React.FC<Props> = (props) => {

  const getChurchEditSettingRows = (): React.ReactElement[] => {
    if (!Permissions.membershipApi.settings.edit) return [];
    const streamUrl = CommonEnvironmentHelper.B1Root.replace("{key}", UserHelper.currentUserChurch.church.subDomain) + "/stream";
    return [
      <tr key="appearance"><td><Link to="/settings/branding" style={{ display: "flex", alignItems: "center" }}><Icon sx={{ marginRight: "5px" }}>edit</Icon>{Locale.label("sermons.liveStreamTimes.externalLinks.customizeAppearance")}</Link></td></tr>,
      <tr key="users"><td><Link to={`/settings`} style={{ display: "flex", alignItems: "center" }}><Icon sx={{ marginRight: "5px" }}>edit</Icon>{Locale.label("sermons.liveStreamTimes.externalLinks.editUsers")}</Link></td></tr>,
      <tr key="stream"><td><a href={streamUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center" }}><Icon sx={{ marginRight: "5px" }}>live_tv</Icon>{Locale.label("sermons.liveStreamTimes.externalLinks.viewYourStream")}</a></td></tr>
    ];
  };

  return (
    <DisplayBox headerIcon="link" headerText={Locale.label("sermons.liveStreamTimes.externalLinks.title")} editContent={false}>
      <TableList rows={getChurchEditSettingRows()} />
    </DisplayBox>
  );
};
